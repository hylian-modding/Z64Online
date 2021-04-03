import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ContentBundle } from "./ContentBundle";
import fs from 'fs';
import path from 'path';

export class AssetContainer{

    ModLoader!: IModLoaderAPI;
    core: any;
    readonly cacheDir: string = global.ModLoader.startdir + "/cache";
    url!: string;
    bundle!: ContentBundle;
    callback: ()=>void;

    constructor(ModLoader: IModLoaderAPI, core: any, callback: ()=>void) {
        this.ModLoader = ModLoader;
        this.core = core;
        this.callback = callback;
    }

    stream(file: string): void {
        this.ModLoader.logger.info("Streaming data...");
        var fetchUrl = require("fetch").fetchUrl;
        global.ModLoader.startupDelay++;
        this.ModLoader.logger.debug("Current ML startup delay level: " + global.ModLoader.startupDelay + ".");
        fetchUrl(this.url, (error: any, meta: any, body: any) => {
            fs.writeFileSync(file, body.toString());
            this.bundle = new ContentBundle(file, this.ModLoader);
            global.ModLoader.startupDelay--;
            this.callback();
        });
    }

    preinit(){
        try {
            let cache = path.resolve(this.cacheDir, path.parse(this.url).base);
            if (!fs.existsSync(cache)) {
                this.stream(cache);
            } else {
                this.bundle = new ContentBundle(cache, this.ModLoader);
                this.callback();
            }
        } catch (err) {
            this.ModLoader.logger.error(err.stack);
        }
    }
}