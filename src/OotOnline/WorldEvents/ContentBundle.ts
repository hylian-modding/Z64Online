import fs from 'fs';
import zip from 'adm-zip';
import crypto from 'crypto';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { publicKey } from './publicKey';

export class ContentBundle {

    files: Map<string, Buffer> = new Map<string, Buffer>();
    zip!: zip;

    constructor(file: string, ModLoader: IModLoaderAPI) {
        let raw = fs.readFileSync(file);
        let json = JSON.parse(raw.toString());
        let content = json.data;
        const public_key = publicKey;
        const verifier = crypto.createVerify('sha256');
        verifier.update(content);
        verifier.end();
        const verified = verifier.verify(public_key, json.sig);
        if (!verified){
            ModLoader.logger.error("ASSET BUNDLE CORRUPT");
            return;
        }else{
            ModLoader.logger.info("Asset bundle signature verified.");
        }
        this.zip = new zip(content.swap32());
        this.zip.getEntries().forEach((value: zip.IZipEntry) => {
            if (!value.isDirectory) {
                this.files.set(value.entryName, value.getData());
            }
        });
    }

}