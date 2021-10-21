import program from 'commander';
import fs from 'fs';
import { optimize } from 'Z64Lib/API/zzoptimize';

program.option("-i, --input <file>", "zobj");
program.option("-o, --offsets <string>", "list of offsets");
program.option("-s, --start_offset <number>", "Offset output by this much");
program.option("-f, --fileout <string>", "output file");
program.allowUnknownOption(true);
program.parse(process.argv);

if (program.input !== undefined) {
    if (program.offsets !== undefined) {
        let j: number[] = [];
        let fuck = program.offsets.split(/(\s+)/);
        for (let i = 0; i < fuck.length; i++){
            j.push(parseInt(fuck[i]));
        }
        let r = 0;
        if (program.start_offset !== undefined){
            r = parseInt(program.start_offset);
        }
        let op = optimize(fs.readFileSync(program.input), j, r);
        if (program.fileout !== undefined) {
            fs.writeFileSync(program.fileout, op.zobj);
        } else {
            console.log(op.zobj.toString('hex'));
        }
        op.oldOffs2NewOffs.forEach((n: number, o: number) => {
            console.log(`${o.toString(16)} -> ${n.toString(16)}`);
        });
    }
}