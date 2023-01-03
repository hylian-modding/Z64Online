import fs from 'fs';

const horse = fs.readFileSync("./object_horse.zobj");
const skel = 0x06009d74;

const output: string[] = [];

output.push(`typedef struct{`);

// Read skeleton header
let p = horse.readUInt32BE(skel & 0x00FFFFFF); // 06 00 9C B8
let c = horse.readUInt8((skel + 0x4) & 0x00FFFFFF); // 2F

for (let i = 0; i < c; i++){
    let p1 = p + (i * 0x4); // index 0, 06 00 9C B8
    let p2 = horse.readUInt32BE(p1 & 0x00FFFFFF); // index 0, 06 00 99 C8

    let p3 = p2 + 0xC;
    let p4 = horse.readUInt32BE(p3 & 0x00FFFFFF); // index 0, 00 00 00 00
    console.log(`Starting limb ${i} ${p1.toString(16)} ${p2.toString(16)} ${p3.toString(16)} ${p4.toString(16)}`);
    if (p4 === 0){
        console.log("pointer is null, skipping");
        continue;
    }
    let p5 = p2 + 0x8;
    let s2 = horse.readInt32BE(p5 & 0x00FFFFFF);
    if (s2 !== 4){
        console.log(`type is ${s2}, skipping`);
        continue;
    };
    
    // p4 index 5, 06 00 99 BC
    let s1 = horse.readUInt16BE(p4 & 0x00FFFFFF); // index 5, 01 76

    output.push(`   Vtx limb_${i}[${s1}];`);

    console.log(`limb ${i} ${p4.toString(16)} ${s1.toString(16)} ${s1.toString(16)}`);

    //Vtx

}

output.push(`} EponaLimbBuffers;`);

console.log(output.join("\n"));