import fs from 'fs';
import zlib from 'zlib';

export class CrashParser {
  constructor() {}

  parse() {
    let dump: Buffer = zlib.inflateSync(fs.readFileSync('./crash_dump.bin'));
    fs.writeFileSync('./crash_dump_inflate.bin', dump);

    let gc = 0x1c84a0;
    let actor_array_offset = 0x001c30;
    let actor_next_offset = 0x124;
    let actor_names: any = JSON.parse(
      fs.readFileSync(__dirname + '/ACTOR_NAMES.json').toString()
    );
    let output: string[][] = new Array<string[]>();
    for (let i = 0; i < 12 * 8; i += 8) {
      let actors: number[] = new Array<number>();
      let addr: number = gc + actor_array_offset + i;
      let count = dump.readUInt32BE(addr);
      if (count > 0) {
        let pointer: number = dump.readUInt32BE(addr + 4) & 0x00ffffff;
        actors.push(pointer);
        let next: number =
          dump.readUInt32BE(pointer + actor_next_offset) & 0x00ffffff;
        while (next > 0) {
          actors.push(next);
          next = dump.readUInt32BE(next + actor_next_offset) & 0x00ffffff;
        }
      }
      let str: string[] = new Array<string>();
      if (!fs.existsSync('./actors')) {
        fs.mkdirSync('./actors');
      }
      for (let i = 0; i < actors.length; i++) {
        let p: number = actors[i];
        let id: number = dump.readUInt16BE(p);
        let _id: string = '0x' + id.toString(16).toUpperCase();
        let actor_name: string = "unknown";
        if (actor_names.hasOwnProperty(_id)){
          actor_name = actor_names[_id].trim();
        }
        str.push(actor_name);
        let a: Buffer = Buffer.alloc(0x300);
        dump.copy(a, 0, p, p + 0x300);
        try {
          fs.writeFileSync(
            './actors/' + actor_name.replace('/', '-') + '.bin',
            a
          );
        } catch (err) {}
      }
      output.push(str);
    }
    fs.writeFileSync(
      './crash_dump_actors.json',
      JSON.stringify(output, null, 2)
    );
  }
}
