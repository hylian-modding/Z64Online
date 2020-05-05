import { fork, ForkOptions } from 'child_process';
import path from 'path';
import { zzstatic } from './zzstatic/src/zzstatic';
import fs from 'fs';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { BufferEnc } from '../BufferEnc';

export class ModelThreadQueued {
  filename: string;
  key: string;
  thread: any;

  constructor(filename: string, key: string) {
    this.filename = filename;
    this.key = key;
  }
}

export class ModelThreadManager {

  private max_threads = 2;
  private running_threads = 0;
  private stack: Array<ModelThreadQueued> = [];

  addThreadToQueue(filename: string, key: string) {
    this.stack.push(new ModelThreadQueued(filename, key));
  }

  hasQueue(): boolean {
    return this.stack.length > 0;
  }

  popThreadFromQueue(): ModelThreadQueued {
    return this.stack.pop()!;
  }

  startQueuedThread(): void {
    if (this.hasQueue() && this.running_threads < this.max_threads) {
      let mt: ModelThreadQueued = this.popThreadFromQueue();
      let dest: string = path.join(
        __dirname,
        path.parse(mt.filename).name + '.zzcache'
      );
      const options = {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      };
      this.running_threads++;
      mt.thread = fork(
        path.resolve(path.join(__dirname, 'ModelThreadWorker.js')),
        [mt.filename, mt.key],
        options as ForkOptions
      );
      let encryptor: BufferEnc = new BufferEnc();
      encryptor.key = Buffer.from(mt.key, 'base64');
      mt.thread.on('exit', (code: any, signal: any) => {
        if (fs.existsSync(dest)) {
          let zz: zzstatic = new zzstatic();
          zz.addToCache(JSON.parse(fs.readFileSync(dest).toString()));
          this.running_threads--;
        }
      });
    }
  }
}

export const MODEL_THREAD_MANAGER = new ModelThreadManager();

setInterval(()=>{
  MODEL_THREAD_MANAGER.startQueuedThread();
}, 100);

export class ModelThread {
  model: Buffer;
  ModLoader: IModLoaderAPI;
  encryptor: BufferEnc;

  constructor(model: Buffer, ModLoader: IModLoaderAPI) {
    this.model = model;
    this.ModLoader = ModLoader;
    this.encryptor = new BufferEnc();
  }

  startThread() {
    let filename: string = this.ModLoader.utils.hashBuffer(this.model) + '.zobj';
    let key: string = this.encryptor.key.toString('base64');
    filename = path.join(__dirname, filename);
    fs.writeFileSync(filename, this.encryptor.encrypt(this.model));
    MODEL_THREAD_MANAGER.addThreadToQueue(filename, key);
  }
}
