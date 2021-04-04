import { setupLifecycle } from "modloader64_api/PluginLifecycle";
import path from 'path';
import fs from 'fs';
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ContentBundle } from "./ContentBundle";
import { setupMLInjects } from "modloader64_api/ModLoaderAPIInjector";
import { setupCoreInject } from "modloader64_api/CoreInjection";
import { bus, markPrototypeProcessed, setupEventHandlers, setupPrivateEventHandlers } from "modloader64_api/EventHandler";
import { setupNetworkHandlers } from "modloader64_api/NetworkHandler";
import { setupBindVar } from 'modloader64_api/BindVar';

interface EventMeta {
    main: string;
    server: string;
}

export class EventController {

    ModLoader!: IModLoaderAPI;
    core: any;
    readonly cacheDir: string = global.ModLoader.startdir + "/cache";
    url!: string;
    bundle!: ContentBundle;
    client: any;
    server: any;

    constructor(ModLoader: IModLoaderAPI, core: any) {
        this.ModLoader = ModLoader;
        this.core = core;
    }

    stream(file: string): void {
        this.ModLoader.logger.info("Streaming data...");
        var fetchUrl = require("fetch").fetchUrl;
        global.ModLoader.startupDelay++;
        this.ModLoader.logger.debug("Current ML startup delay level: " + global.ModLoader.startupDelay + ".");
        fetchUrl(this.url, (error: any, meta: any, body: any) => {
            fs.writeFileSync(file, body.toString());
            this.bundle = new ContentBundle(file, this.ModLoader);
            this.setupEventPlugin();
            global.ModLoader.startupDelay--;
        });
    }

    preinit() {
        try {
            let cache = path.resolve(this.cacheDir, path.parse(this.url).base);
            if (!fs.existsSync(this.cacheDir)){
                fs.mkdirSync(this.cacheDir);
            }
            if (!fs.existsSync(cache)) {
                this.stream(cache);
            } else {
                this.bundle = new ContentBundle(cache, this.ModLoader);
                this.setupEventPlugin();
            }
        } catch (err) {
            this.ModLoader.logger.error(err.stack);
        }
    }

    setupEventPlugin() {
        let temp = fs.mkdtempSync('ModLoader64_temp_');
        this.bundle.zip.extractAllTo(temp);
        let meta: EventMeta = JSON.parse(fs.readFileSync(path.resolve(temp, "package.json")).toString());
        if (this.ModLoader.isClient) {
            let plugin: any = require(path.resolve(temp, meta.main));
            this.client = new plugin[path.parse(meta.main).name]();
            setupMLInjects(this.client, this.ModLoader);
            setupCoreInject(this.client, this.core);
            setupEventHandlers(this.client, bus);
            setupPrivateEventHandlers(this.client, this.ModLoader.privateBus);
            setupNetworkHandlers(this.client);
            setupLifecycle(this.client);
            setupBindVar(this.client, this.ModLoader.emulator);
            markPrototypeProcessed(this.client);
        }
        if (this.ModLoader.isServer) {
            let plugin: any = require(path.resolve(temp, meta.server));
            this.server = new plugin[path.parse(meta.server).name]();
            setupMLInjects(this.server, this.ModLoader);
            setupCoreInject(this.server, this.core);
            setupEventHandlers(this.server, bus);
            setupPrivateEventHandlers(this.server, this.ModLoader.privateBus);
            setupNetworkHandlers(this.server);
            setupLifecycle(this.server);
            setupBindVar(this.server, this.ModLoader.emulator);
            markPrototypeProcessed(this.server);
        }
    }

}