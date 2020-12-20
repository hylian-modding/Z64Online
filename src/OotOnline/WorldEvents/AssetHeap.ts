import { Heap } from "modloader64_api/heap";
import { ILogger, IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import fse from 'fs-extra';
import path from 'path';
import zip from 'adm-zip';
import url from 'url';
import { PatchTypes } from "modloader64_api/Patchers/PatchManager";
import { HeapAsset } from "./HeapAsset";
import { bus } from "modloader64_api/EventHandler";
import { Z64OnlineEvents, Z64Emote_Emote } from "@OotOnline/Z64API/OotoAPI";
import { Z64RomTools } from "Z64Lib/API/Z64RomTools";
import { Z64LibSupportedGames } from "Z64Lib/API/Z64LibSupportedGames";
import { Age } from "modloader64_api/OOT/OOTAPI";
import { Z64_EventReward, Z64_RewardEvents } from "./WorldEvents";
import { zzstatic } from "Z64Lib/API/zzstatic";
import { SmartBuffer } from 'smart-buffer';
import { CostumeHelper } from "./CostumeHelper";

export class AssetHeap {

    private ModLoader: IModLoaderAPI;
    heap!: Heap | undefined;
    private name: string;
    private headerStart: number = 0x80700040;
    private tableStart: number = 0x80700070;
    private assetZip!: zip;
    private logger: ILogger;
    private assetUrl: string | undefined;
    private assetPath: string | undefined;
    private cacheDir: string = path.resolve(".", "cache");
    private curLookupSlot: number = 0;
    private silence: boolean = false;
    assets!: Map<string, Buffer>;
    heapAssets!: HeapAsset[];
    costumes!: Map<Age, Buffer[]>;
    equipment!: Map<string, Buffer[]>;

    constructor(ModLoader: IModLoaderAPI, name: string, assetUrl?: string, assetPath?: string) {
        this.ModLoader = ModLoader;
        this.name = name;
        this.logger = this.ModLoader.logger.getLogger(name);
        if (assetUrl !== undefined) {
            this.assetUrl = assetUrl;
        }
        if (assetPath !== undefined) {
            this.assetPath = assetPath;
        }
    }

    makeSilent(bool: boolean) {
        this.silence = bool;
    }

    stream(url: string): Buffer {
        if (!this.silence) {
            this.logger.debug("Streaming data...");
        }
        const fetch = require('sync-fetch')
        const response = fetch(url);
        return (response.json().data as Buffer);
    }

    padNumber(num: number) {
        while (num % 0x10 !== 0) {
            num++;
        }
        return num;
    }

    pad(buf: Buffer) {
        let size = buf.byteLength;
        size = this.padNumber(size);
        let b = Buffer.alloc(size);
        buf.copy(b);
        return b;
    }

    preinit() {
        this.costumes = new Map<Age, Buffer[]>();
        this.equipment = new Map<string, Buffer[]>();
        this.heapAssets = [];
        this.assets = new Map<string, Buffer>();
        this.curLookupSlot = 0;
        (() => {
            if (this.assetUrl !== undefined && this.assetPath === undefined) {
                let p = url.parse(this.assetUrl);
                this.assetPath = path.resolve(this.cacheDir, path.basename(p.pathname as string));
                if (fse.existsSync(this.assetPath)) {
                    return;
                }
                let data = this.stream(this.assetUrl);
                if (!fse.existsSync(this.cacheDir)) {
                    fse.mkdirSync(this.cacheDir);
                }
                fse.writeFileSync(this.assetPath, JSON.stringify({ data: data }));
            }
        })();
        if (this.assetPath === undefined) {
            return;
        }
        if (fse.existsSync(this.assetPath)) {
            if (fse.lstatSync(this.assetPath).isDirectory()) {
                if (!this.silence) {
                    this.logger.debug("Creating in memory asset bundle from folder...");
                }
                this.assetZip = new zip();
                this.assetZip.addLocalFolder(this.assetPath, "assets");
            } else {
                let p = path.parse(this.assetPath);
                switch (p.ext) {
                    case ".content":
                        if (!this.silence) {
                            this.logger.debug("Loading asset bundle...");
                        }
                        let buf = JSON.parse(fse.readFileSync(this.assetPath).toString()).data;
                        buf = buf.swap32();
                        this.assetZip = new zip(buf);
                        break;
                }
            }
            for (let i = 0; i < this.assetZip.getEntries().length; i++) {
                let e = this.assetZip.getEntries()[i];
                if (!e.isDirectory) {
                    this.assets.set(e.entryName, e.getData());
                }
            }
        }
    }

    // This only supports scenes with one room for now.
    injectScene(rom: Buffer, code: Buffer, scene: Buffer, room: Buffer, sceneDMA: number, roomDMA: number, sceneTableIndex: number) {
        let tools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
        tools.noCRC(rom);
        let _mapFiles: Buffer[] = [];
        _mapFiles.push(room);
        let buf = new SmartBuffer();
        let roomListOffset = 0;
        if (!this.silence) {
            this.ModLoader.logger.debug("Parsing scene file...");
        }
        for (let i = 0; i < scene.byteLength; i += 8) {
            if (scene.readUInt8(i) === 0x04) {
                if (!this.silence) {
                    this.ModLoader.logger.debug("Found room list.");
                }
                roomListOffset = i;
            }
            if (scene.readUInt32BE(i) === 0x14000000) {
                if (!this.silence) {
                    this.ModLoader.logger.debug("Hit end of scene header.");
                }
                break;
            }
        }
        if (!this.silence) {
            this.ModLoader.logger.debug("Creating alias table...");
        }
        buf.writeBuffer(scene);
        buf.writeBuffer(Buffer.from("MODLOADER64"));
        buf.writeUInt8(0x70);
        buf.writeUInt32BE(scene.readUInt8(roomListOffset + 0x01));
        let start = scene.readUInt32BE(roomListOffset + 0x4);
        let offset = start;
        for (let i = 0; i < scene.readUInt8(roomListOffset + 0x01); i++) {
            buf.writeUInt32BE(offset + (i * 0x8));
        }
        while (buf.length % 0x10 !== 0) {
            buf.writeUInt8(0x0);
        }
        let final = buf.toBuffer();

        if (!this.silence) {
            this.ModLoader.logger.debug("Parsing alias table...");
        }
        let header = final.indexOf(Buffer.from("MODLOADER64"));
        let list_start = header + 0x10;
        let num = final.readUInt32BE(header + 0xC);
        for (let i = 0; i < num; i++) {
            let offset = list_start + (i * 0x4);
            let data = final.readUInt32BE(offset) - 0x02000000;
            let room = _mapFiles[i];
            tools.injectNewFile(rom, roomDMA, room);
            let dma = tools.getStartEndOfDMAEntry(rom, roomDMA);
            if (!this.silence) {
                this.ModLoader.logger.info("Injected room. " + JSON.stringify(dma));
            }
            final.writeUInt32BE(dma.vrom_start, data);
            final.writeUInt32BE(dma.vrom_end, data + 0x4);
        }
        tools.injectNewFile(rom, sceneDMA, final);
        let scene_dma = tools.getStartEndOfDMAEntry(rom, sceneDMA);
        if (!this.silence) {
            this.ModLoader.logger.debug("Injecting scene. " + scene_dma.vrom_start.toString(16) + " | " + scene_dma.vrom_end.toString(16));
            this.ModLoader.logger.info("Writing to scene table... " + (0x0EA440 + (sceneTableIndex * 0x14)).toString(16));
        }
        code.writeUInt32BE(scene_dma.vrom_start, (0x0EA440 + (sceneTableIndex * 0x14)));
        code.writeUInt32BE(scene_dma.vrom_end, (0x0EA440 + (sceneTableIndex * 0x14) + 0x4));
    }

    init() {
    }

    onRomPatched(evt: any) {
        let rom: Buffer = evt.rom;
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
        let zz = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
        let files: Map<number, Buffer> = new Map<number, Buffer>();
        this.costumes.set(Age.CHILD, []);
        this.costumes.set(Age.ADULT, []);
        // Shove code in here first.
        files.set(27, tools.decompressDMAFileFromRom(rom, 27));
        // Load asset replacements
        let equipment_name_header = Buffer.from('45515549504D454E544E414D45000000', 'hex');
        this.assets.forEach((value: Buffer, key: string) => {
            // Give free stuff.
            if (key.indexOf("freebies/adult") > -1 && key.indexOf(".txt") === -1) {
                Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                bus.emit(Z64_RewardEvents.UNLOCK_PLAYAS, { event: "Christmas 2020", name: CostumeHelper.getCostumeName(value), data: value, age: Age.ADULT } as Z64_EventReward);
            } else if (key.indexOf("freebies/child") > -1 && key.indexOf(".txt") === -1) {
                Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                bus.emit(Z64_RewardEvents.UNLOCK_PLAYAS, { event: "Christmas 2020", name: CostumeHelper.getCostumeName(value), data: value, age: Age.CHILD } as Z64_EventReward);
            }
            if (key.indexOf("freebies/equipment") > -1 && key.indexOf(".txt") === -1) {
                let index = value.indexOf(equipment_name_header);
                index += 0x10;
                Buffer.from(path.parse(key).name).copy(value, index);
                bus.emit(Z64_RewardEvents.UNLOCK_PLAYAS, { event: "Christmas 2020", name: CostumeHelper.getCostumeName(value), data: value, age: 0x69, equipmentCategory: CostumeHelper.getEquipmentCategory(value) } as Z64_EventReward);
            }
            // Load costumes.
            if (key.indexOf("costumes/adult") > -1) {
                Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                this.costumes.get(Age.ADULT)!.push(this.assets.get(key)!);
            } else if (key.indexOf("costumes/child") > -1) {
                Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                this.costumes.get(Age.CHILD)!.push(this.assets.get(key)!);
            } else if (key.indexOf("costumes/equipment") > -1) {
                let index = value.indexOf(equipment_name_header);
                index += 0x10;
                Buffer.from(path.parse(key).name).copy(value, index);
                let cat = CostumeHelper.getEquipmentCategory(value);
                if (!this.equipment.has(cat)) {
                    this.equipment.set(cat, []);
                }
                this.equipment.get(cat)!.push(value);
            }
            // Start injecting stuff.
            if (key.startsWith("assets/ROM")) {
                let parse = path.parse(key);
                let parent = path.basename(path.dirname(key));
                let id = parseInt(parent.split("-")[0].trim());
                let buf: Buffer;
                if (!files.has(id)) {
                    files.set(id, tools.decompressDMAFileFromRom(rom, id));
                }
                buf = files.get(id)!;
                if (parse.ext === ".txt") {
                    // This is a cloudmax patch.
                    // These patches are generally used to redirect display lists.
                    let str = value.toString();
                    let index = str.indexOf("BEEFDEAD");
                    if (index > -1) {
                        str = str.replace("BEEFDEAD", this.assets.get("assets/ROM/" + parent + "/" + parse.name + ".bin")!.toString('hex'));
                        value = Buffer.from(str);
                    }
                    if (!this.silence) {
                        this.ModLoader.logger.info("Executing patch: " + parse.name);
                    }
                    buf = PatchTypes.get(".txt")!.patch(buf, value);
                } else if (parse.ext === ".zobj") {
                    // This is a model of some sort that needs written to the jump table.
                    let target = buf.indexOf(Buffer.from("DEADBEEF", 'hex'));
                    if (target > -1) {
                        buf.writeUInt32BE(this.tableStart + (this.curLookupSlot * 0x8), target);
                    }
                    this.heapAssets.push(new HeapAsset(parse.name, this.curLookupSlot, value));
                    this.curLookupSlot++;
                } else if (parse.ext === ".zscene") {
                    // This is a scene. Replace these outright.
                    let room = this.assets.get("assets/ROM/" + parent + "/" + parse.name + ".zmap")!;
                    let room_id = room.readUInt32BE(room.byteLength - 0x4);
                    let scene_id = value.readUInt32BE(value.byteLength - 0x4);
                    this.injectScene(evt.rom, files.get(27)!, value, room, id, room_id, scene_id);
                }
            } else if (key.startsWith("assets/emotes")) {
                let parse = path.parse(key);
                if (parse.ext === ".bin") {
                    if (!this.silence) {
                        this.ModLoader.logger.info("Loading emote: " + parse.name);
                    }
                    let anim: Buffer = value;
                    let sound: Buffer = this.assets.get("assets/emotes/" + parse.name + ".ogg")!;
                    bus.emit(Z64OnlineEvents.ON_REGISTER_EMOTE, { name: parse.name, buf: anim, sound: sound, builtIn: true } as Z64Emote_Emote);
                }
            } else if (key.startsWith("assets/zzcache")) {
                // These are precomputed zzstatic calculations.
                let parse = path.parse(key);
                if (parse.ext === ".zzcache") {
                    zz.addToCache(JSON.parse(value.toString()));
                }
            }
        });
        files.forEach((value: Buffer, key: number) => {
            if (!this.silence) {
                this.ModLoader.logger.debug("Compressing file " + key + ".");
            }
            if (!tools.recompressDMAFileIntoRom(rom, key, value)) {
                tools.relocateFileToExtendedRom(rom, key, value);
            }
        });
        tools.noCRC(rom);
    }

    postinit() {
        this.ModLoader.emulator.rdramWriteBuffer(0x80700000, this.ModLoader.utils.clearBuffer(this.ModLoader.emulator.rdramReadBuffer(0x80700000, 1 * 1024 * 1024)));
        this.ModLoader.utils.setTimeoutFrames(() => {
            // Create the heap.
            this.heap = new Heap(this.ModLoader.emulator, 0x80700000, 1 * 1024 * 1024);
            // Alloc header space.
            this.headerStart = this.heap.malloc(this.padNumber(0x4));
            // Malloc 0x100 space for asset jump table.
            this.tableStart = this.heap.malloc(this.padNumber(this.heapAssets.length * 0x8));
            // Allocate all the assets and index them in the jump table.
            let zz: zzstatic = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
            this.heapAssets.forEach((value: HeapAsset) => {
                if (!this.silence) {
                    this.logger.info("Loading asset: " + value.name);
                }
                let pointer = this.heap!.malloc(value.asset.byteLength);
                //let c = zz.generateCache(value.asset);
                //fse.writeFileSync(path.resolve(global.ModLoader.startdir, "cache", path.parse(value.name).name + ".zzcache"), JSON.stringify(c));
                let buf = zz.doRepoint(value.asset, 0, false, pointer);
                let header = Buffer.from('MODLOADER64');
                let target = buf.indexOf(header);
                this.ModLoader.emulator.rdramWriteBuffer(pointer, buf);
                this.ModLoader.emulator.rdramWrite32(this.tableStart + (value.slot * 0x8), 0xDE010000);
                this.ModLoader.emulator.rdramWrite32(this.tableStart + (value.slot * 0x8) + 0x4, pointer + target + 0x10);
                if (!this.silence) {
                    this.logger.info("Asset " + value.name + " allocated at " + pointer.toString(16) + " to " + (pointer + value.asset.byteLength).toString(16) + ".");
                }
                value.pointer = pointer;
                if (value.callback !== undefined) {
                    value.callback();
                }
            });
        }, 20);
    }

    get header(): number {
        return this.headerStart;
    }

    pre_reset() {
        this.heap = undefined;
    }

    post_reset() {
        this.postinit();
    }

    findAsset(name: string): HeapAsset | undefined {
        for (let i = 0; i < this.heapAssets.length; i++) {
            if (this.heapAssets[i].name === name) {
                return this.heapAssets[i];
            }
        }
        return undefined;
    }

    findRawAsset(name: string): Buffer | undefined {
        if (this.assets.has(name)) {
            return this.assets.get(name);
        } else {
            return undefined;
        }
    }

    getSlotAddress(asset: HeapAsset): number {
        return this.tableStart + (0x8 * asset.slot);
    }

}