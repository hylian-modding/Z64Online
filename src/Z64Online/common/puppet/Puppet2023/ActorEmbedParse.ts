export default class ActorEmbedParse {

    static findOffsetMap(buf: Buffer, offset: number) {
        const ovl = buf;
        let name = ovl.subarray(offset, offset + 0x10);
        let str = "";
        for (let i = 0; i < 0x10; i++) {
            if (name[i] !== 0xFF) {
                str += name.subarray(i, i + 1).toString();
            }
        }
        let INDEX: number = offset + 0x10;
        const COUNT: number = ovl.readUInt32BE(INDEX);
        INDEX += 4;

        const st = new CustomActorStruct(str);

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

            st.members.set(str, { offset, size });
        }

        st.size = totalSize;

        return st;
    }

    static findMainTable(buf: Buffer) {
        const ovl = buf;
        const TARGET_TAG: Buffer = Buffer.from("DEBUGINDEX");
        let INDEX: number = ovl.indexOf(TARGET_TAG) + 0x10;
        const COUNT: number = ovl.readUInt32BE(INDEX);
        INDEX += 4;

        const map: Map<string, CustomActorStruct> = new Map();

        for (let i = 0; i < COUNT; i++) {
            let pointer = ovl.readUInt32BE(INDEX + (i * 4)) - 0x80800000;
            let st = this.findOffsetMap(buf, pointer);
            map.set(st.name, st);
        }

        return map;
    }
}

export class CustomActorStruct {

    name: string;
    members: Map<string, { offset: number, size: number }> = new Map();
    size: number = 0;

    constructor(name: string) {
        this.name = name;
    }

}