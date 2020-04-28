import { fork, ForkOptions } from 'child_process';
import path from 'path';
import { zzstatic_cache, zzstatic } from './zzstatic/src/zzstatic';
import fs from 'fs';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { BufferEnc } from '../BufferEnc';

export class ModelThread {
  model: Buffer;
  child: any;
  ModLoader: IModLoaderAPI;
  encryptor: BufferEnc;

  constructor(model: Buffer, ModLoader: IModLoaderAPI) {
    this.model = model;
    this.ModLoader = ModLoader;
    this.encryptor = new BufferEnc();
  }

  startThread() {
    const options = {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    };
    let filename: string = this.ModLoader.utils.hashBuffer(this.model) + '.zobj';
    let dest: string = path.join(
      __dirname,
      path.parse(filename).name + '.zzcache'
    );
    filename = path.join(__dirname, filename);
    fs.writeFileSync(filename, this.encryptor.encrypt(this.model));
    this.ModLoader.logger.debug('Starting worker thread for custom model.');
    this.child = fork(
      path.resolve(path.join(__dirname, 'ModelThreadWorker.js')),
      [filename, this.encryptor.key.toString('base64')],
      options as ForkOptions
    );
    this.child.on('exit', (code: any, signal: any) => {
      if (fs.existsSync(dest)){
        let zz: zzstatic = new zzstatic();
        zz.addToCache(JSON.parse(this.encryptor.decrypt(fs.readFileSync(dest)).toString()));
      }
      this.ModLoader.logger.debug('Worker thread ended.');
    });
  }
}
