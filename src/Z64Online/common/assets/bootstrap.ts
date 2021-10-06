import { gear } from '@Z64Online/mm/models/zobjs/gear';
import { object_link_deity } from '@Z64Online/mm/models/zobjs/object_link_deity';
import { object_link_goron } from '@Z64Online/mm/models/zobjs/object_link_goron';
import { object_link_human } from '@Z64Online/mm/models/zobjs/object_link_human';
import { object_link_nuts } from '@Z64Online/mm/models/zobjs/object_link_nuts';
import { object_link_zora } from '@Z64Online/mm/models/zobjs/object_link_zora';
import { object_link_boy } from '@Z64Online/oot/models/zobjs/object_link_boy';
import { object_link_child } from '@Z64Online/oot/models/zobjs/object_link_child';
import fs from 'fs';
import path from 'path';
import { decodeAsset } from './decoder';
import { proxy_universal } from './proxy_universal';

export default class AssetBootstrap {

    constructor(){
        this.extract();
    }

    extract() {
        try {
            fs.mkdirSync("./cache");
        } catch (err: any) { }
        let extractIfMissing = (p: string, buf: Buffer) => {
            if (fs.existsSync(p)) return;
            fs.writeFileSync(p, decodeAsset(buf));
        };
        extractIfMissing(path.join("./cache", "human.zobj"), object_link_human);
        extractIfMissing(path.join("./cache", "zora.zobj"), object_link_zora);
        extractIfMissing(path.join("./cache", "nuts.zobj"), object_link_nuts);
        extractIfMissing(path.join("./cache", "fd.zobj"), object_link_deity);
        extractIfMissing(path.join("./cache", "goron.zobj"), object_link_goron);
        extractIfMissing(path.join("./cache", "gear.zobj"), gear);
        extractIfMissing(path.join("./cache", "proxy_universal.zobj"), proxy_universal);
        extractIfMissing(path.join("./cache", "adult.zobj"), object_link_boy);
        extractIfMissing(path.join("./cache", "child.zobj"), object_link_child);
    }

}