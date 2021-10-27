import fs from 'fs';
import { Anim2Link } from '../src/Z64Online/common/cosmetics/animation/Anim2Link';
import program from 'commander';

program.option("-i, --input <file>", ".anim");
program.option("-a, --anim <name>", "anim name");
program.option("-o, --out <file>", ".bin");
program.allowUnknownOption(true);
program.parse(process.argv);

let a = new Anim2Link(program.anim, program.input);
let out = a.GetRaw();
fs.writeFileSync(program.out, out);