import fs from 'fs';

const FILE: string = "./bin/Puppet_oot10.ovl";

function findOffsetMap(offset: number) {
    const ovl = fs.readFileSync(FILE);
    let name = ovl.subarray(offset, offset + 0x10);
    let str = "";
    for (let i = 0; i < 0x10; i++){
        if (name[i] !== 0xFF){
            str += name.subarray(i, i + 1).toString();
        }
    }
    console.log(str);
    let INDEX: number = offset + 0x10;
    const COUNT: number = ovl.readUInt32BE(INDEX);
    INDEX += 4;

    let totalSize: number = 0;
    for (let i = 0; i < COUNT; i++) {
        let str = "";
        let b = ovl.subarray(INDEX, INDEX + 16);
        for (let i = 0; i < b.byteLength; i++) {
            if (b[i] !== 0xFF) str += b.subarray(i, i + 1).toString();
        }
        INDEX += 16;
        const offset = ovl.subarray(INDEX, INDEX + 4).readUInt32BE();
        INDEX += 4;
        const size = ovl.subarray(INDEX, INDEX + 4).readUInt32BE();
        totalSize += size;
        INDEX += 4;

        console.log(`Member: ${str}, offset: 0x${offset.toString(16)}, size: 0x${size.toString(16)}`);
    }
    console.log(`Total size: 0x${totalSize.toString(16)}`);
}

function findMainTable(){
    const ovl = fs.readFileSync(FILE);
    const TARGET_TAG: Buffer = Buffer.from("DEBUGINDEX");
    let INDEX: number = ovl.indexOf(TARGET_TAG) + 0x10;
    const COUNT: number = ovl.readUInt32BE(INDEX);
    INDEX += 4;
    for (let i = 0; i < COUNT; i++) {
        let pointer = ovl.readUInt32BE(INDEX + (i * 4)) - 0x80800000;
        findOffsetMap(pointer);
    }
}

findMainTable();