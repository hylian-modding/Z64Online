import { IWorldEvent } from "../WorldEvents";
import { Z64LibSupportedGames } from 'Z64Lib/API/Z64LibSupportedGames';
import { Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import path from 'path';
import { zzstatic } from 'Z64Lib/API/zzstatic';
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { bus, EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { OotOnlineEvents, OotOnline_Emote } from "@OotOnline/OotoAPI/OotoAPI";
import zip from 'adm-zip';
import { FlipFlags, Texture } from "modloader64_api/Sylvain/Gfx";
import fs from 'fs';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { onCreateResources, onTick, onViUpdate, Preinit } from "modloader64_api/PluginLifecycle";
import { rgba, vec4, xywh } from "modloader64_api/Sylvain/vec";
import { IOOTCore, IOvlPayloadResult, LinkState, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { PatchTypes } from "modloader64_api/Patchers/PatchManager";
import { Heap } from 'modloader64_api/heap';
import crypto from 'crypto';
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IActor } from "modloader64_api/OOT/IActor";
import { addToKillFeedQueue } from "modloader64_api/Announcements";
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { NetworkHandler } from "modloader64_api/NetworkHandler";

class HeapAsset {
    name: string;
    slot: number;
    asset: Buffer;

    constructor(name: string, slot: number, asset: Buffer) {
        this.name = name;
        this.slot = slot;
        this.asset = asset;
    }
}

export class Halloween implements IWorldEvent {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    assets: Map<string, Buffer> = new Map<string, Buffer>();
    resourceLoad: boolean = false;
    titleScreen!: Texture;
    icon!: Texture;
    fadeIn: vec4 = rgba(255, 255, 255, 0);
    heap!: Heap;
    heap_assets: HeapAsset[] = [];
    curSlot: number = 0;
    costumesAdult: Buffer[] = [];
    costumesChild: Buffer[] = [];
    darkLink!: Buffer;
    darkLinkCostume!: Buffer;
    tableStart: number = 0x80700070;
    currentDarkLink: IActor | undefined;
    dlc: number = 0;

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        let rom: Buffer = evt.rom;
        try {
            let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
            tools.noCRC(rom);

            let files: Map<number, Buffer> = new Map<number, Buffer>();

            this.assets.forEach((value: Buffer, key: string) => {
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
                        // Patch
                        this.ModLoader.logger.info("Executing Halloween patch: " + parse.name);
                        let str = value.toString();
                        let index = str.indexOf("BEEFDEAD");
                        if (index > -1) {
                            str = str.replace("BEEFDEAD", this.assets.get("assets/ROM/" + parent + "/" + parse.name + ".bin")!.toString('hex'));
                            value = Buffer.from(str);
                        }
                        PatchTypes.get(".txt")!.patch(buf, value);
                    } else if (parse.ext === ".zobj") {
                        let target = buf.indexOf(Buffer.from("DEADBEEF", 'hex'));
                        if (target > -1) {
                            buf.writeUInt32BE(this.tableStart + (this.curSlot * 0x8), target);
                        }
                        this.heap_assets.push(new HeapAsset(parse.name, this.curSlot, value));
                        this.curSlot++;
                    }
                } else if (key.startsWith("assets/emotes")) {
                    let parse = path.parse(key);
                    if (parse.ext === ".bin") {
                        this.ModLoader.logger.info("Loading Halloween emote: " + parse.name);
                        let anim: Buffer = value;
                        let sound: Buffer = this.assets.get("assets/emotes/" + parse.name + ".ogg")!;
                        bus.emit(OotOnlineEvents.ON_REGISTER_EMOTE, { name: parse.name, buf: anim, sound: sound, builtIn: true } as OotOnline_Emote);
                    }
                }
            });

            let b: Buffer = tools.decompressDMAFileFromRom(rom, 70);
            b.writeUInt16BE(0x8070, 0x5E);
            b.writeUInt16BE(0x0000, 0x6E);
            b.writeUInt8(0x0001, 0x2039);
            files.set(70, b);
            this.darkLink = b;

            files.forEach((value: Buffer, key: number) => {
                if (!tools.recompressDMAFileIntoRom(rom, key, value)) {
                    tools.relocateFileToExtendedRom(rom, key, value);
                }
            });

            this.setupAssets();
        } catch (err) {
            this.ModLoader.logger.error(err.stack);
        }
    }

    private setupAssets() {
        this.ModLoader.utils.setTimeoutFrames(() => {
            let zz: zzstatic = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
            this.heap = new Heap(this.ModLoader.emulator, this.tableStart + 0x100, 1 * 1024 * 1024);
            this.heap_assets.forEach((value: HeapAsset) => {
                this.ModLoader.logger.info("Loading Halloween asset: " + value.name);
                let pointer = this.heap.malloc(value.asset.byteLength);
                this.ModLoader.emulator.rdramWriteBuffer(pointer, zz.doRepoint(value.asset, 0, false, pointer));
                this.ModLoader.emulator.rdramWrite32(this.tableStart + (value.slot * 0x8), 0xDE010000);
                this.ModLoader.emulator.rdramWrite32(this.tableStart + (value.slot * 0x8) + 0x4, pointer + 0x10);
                this.ModLoader.logger.info("Asset " + value.name + " allocated at " + pointer.toString(16) + ".");
            });
        }, 20);
    }

    private changeDarkLinkCostume() {
        let zz: zzstatic = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
        this.darkLinkCostume = Buffer.alloc(0x37800);
        if (this.dlc === 0) {
            this.dlc = this.heap.malloc(this.darkLinkCostume.byteLength);
        }
        let id = this.getRandomInt(0, this.costumesAdult.length - 1);
        this.costumesAdult[id].copy(this.darkLinkCostume);
        this.darkLinkCostume.writeUInt32BE(0x06005380, 0x500C);
        this.changeHierarchyPointer(15, 0x20);
        this.changeHierarchyPointer(18, 0x48);
        this.ModLoader.emulator.rdramWriteBuffer(this.dlc, zz.doRepoint(this.darkLinkCostume, 0, false, this.dlc));
        this.ModLoader.emulator.rdramWriteBuffer(0x80700000 + 0x0, this.ModLoader.emulator.rdramReadBuffer(this.dlc + 0x5380, 0x10));
        this.ModLoader.emulator.rdramWriteBuffer(0x80700000 + 0x10, Buffer.from("00334600C50046000000000000000000", 'hex'));
        // Fix Dark Link's sword.
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x20, 0xE7000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x24, 0x00000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x28, 0xDE000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x2C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x513C));
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x30, 0xDE000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x34, this.ModLoader.emulator.rdramRead32(this.dlc + 0x5144));
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x38, 0xDE000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x3C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x5114));
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x40, 0xDF000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x44, 0x00000000);
        // Fix Dark Link's shield.
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x48, 0xE7000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x4C, 0x00000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x50, 0xDE000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x54, this.ModLoader.emulator.rdramRead32(this.dlc + 0x5164));
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x58, 0xDE000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x5C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x512C));
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x60, 0xDF000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x64, 0x00000000);
    }

    private changeHierarchyPointer(limb: number, offset: number) {
        let hp = this.darkLinkCostume.readUInt32BE(0x500C);
        hp = this.darkLinkCostume.readUInt32BE(hp - 0x06000000) + (limb * 4);
        hp = this.darkLinkCostume.readUInt32BE((hp - 0x06000000)) - 0x06000000;
        hp += 8;
        this.darkLinkCostume.writeUInt32BE(0x80700000 + offset, hp);
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_POST)
    onSoftReset() {
        this.setupAssets();
    }

    @EventHandler(OotEvents.ON_LOADING_ZONE)
    onSceneChangePre() {
        this.currentDarkLink = undefined;
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
    }

    @onCreateResources()
    onLoadAssets() {
        if (!this.resourceLoad) {
            this.titleScreen = this.ModLoader.Gfx.createTexture();
            fs.writeFileSync(path.resolve(__dirname, "Halloween.png"), this.assets.get("assets/Halloween.png")!);
            this.titleScreen.loadFromFile(path.resolve(__dirname, "Halloween.png"));
            this.icon = this.ModLoader.Gfx.createTexture();
            this.icon.loadFromFile(path.resolve(__dirname, "../", "../", "icon.png"));
            this.resourceLoad = true;
        }
    }

    getRandomInt(min: number, max: number) {
        return this.cryptoRandomNumber(min, max);
    }

    private cryptoRandomNumber(minimum: number, maximum: number) {
        let maxBytes = 6;
        let maxDec = 281474976710656;

        let randbytes = parseInt(crypto.randomBytes(maxBytes).toString('hex'), 16);
        let result = Math.floor(randbytes / maxDec * (maximum - minimum + 1) + minimum);

        if (result > maximum) {
            result = maximum;
        }
        return result;
    }

    @Preinit()
    preinit(): void {
        let assets: zip = new zip(fs.readFileSync(path.resolve(__dirname, "assets.zip")).swap32());
        for (let i = 0; i < assets.getEntries().length; i++) {
            let e = assets.getEntries()[i];
            if (!e.isDirectory) {
                this.assets.set(e.entryName, e.getData());
            }
        }
        this.assets.forEach((value: Buffer, key: string) => {
            if (key.indexOf("costumes/adult") > -1) {
                this.costumesAdult.push(this.assets.get(key)!);
            } else if (key.indexOf("costumes/child") > -1) {
                this.costumesChild.push(this.assets.get(key)!);
            }
        });
        let choice = this.costumesAdult[this.getRandomInt(0, this.costumesAdult.length - 1)];
        bus.emit(OotOnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT, choice);
        let choice2 = this.costumesChild[this.getRandomInt(0, this.costumesChild.length - 1)];
        bus.emit(OotOnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD, choice2);
    }

    @onViUpdate()
    onVi() {
        if (!this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()) {
            this.fadeIn.w = 0;
            return;
        }
        if (this.fadeIn.w < 1.0) {
            this.fadeIn.w += 0.001;
        }
        this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.icon, xywh(0, 0, this.icon.width, this.icon.height), xywh(0, 0, this.icon.width / 4, this.icon.width / 4), this.fadeIn, FlipFlags.None);
        this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.titleScreen, xywh(0, 0, this.titleScreen.width, this.titleScreen.height), xywh(0, 0, this.ModLoader.ImGui.getMainViewport().size.x, this.ModLoader.ImGui.getMainViewport().size.y), this.fadeIn, FlipFlags.None);
    }

    injectDarkLink(buf: Buffer) {
        let p = path.resolve(__dirname, "s.ovl");
        let j = path.resolve(__dirname, "s.json");
        fs.writeFileSync(p, buf);
        fs.writeFileSync(j, JSON.stringify({ init: "00330900" }))
        return this.ModLoader.payloadManager.parseFile(p);
    }

    @onTick()
    onTick(frame: number) {
        if (this.currentDarkLink !== undefined) {
            if (this.core.link.position.y - 1000 > this.currentDarkLink.position.y || Math.abs(this.core.link.position.x) - 1000 > Math.abs(this.currentDarkLink.position.x) || Math.abs(this.core.link.position.z) - 1000 > Math.abs(this.currentDarkLink.position.z)) {
                this.currentDarkLink.position.setRawPos(this.core.link.position.getRawPos());
                this.currentDarkLink.rotation.setRawRot(this.core.link.rotation.getRawRot());
            }
            if (this.currentDarkLink.rdramRead32(0x130) === 0) {
                this.currentDarkLink = undefined;
            }
        }
    }

    @NetworkHandler('OotO_HalloweenPacket')
    onTimerTick(packet: OotO_HalloweenPacket) {
        this.currentDarkLink = undefined;
        if (this.core.helper.isTitleScreen() && !this.core.helper.isSceneNumberValid()) {
            return;
        }
        this.ModLoader.utils.setTimeoutFrames(() => {
            let roll = this.getRandomInt(1, 100);
            if (roll <= 25) {
                this.changeDarkLinkCostume();
                addToKillFeedQueue("An invader approaches...");
                if (this.core.link.state === LinkState.STANDING && !this.core.helper.isLinkEnteringLoadingZone() && this.core.helper.isInterfaceShown()) {
                    this.core.commandBuffer.runCommand(Command.SPAWN_ACTOR, 0x80700000 + 0x10, (success: boolean, result: number) => {
                        if (success) {
                            let a = this.core.actorManager.createIActorFromPointer(result);
                            a.position.setRawPos(this.core.link.position.getRawPos());
                            a.room = 0xFF;
                            this.currentDarkLink = a;
                        }
                    });
                }
            }
        }, 50);
    }
}

export class OotO_HalloweenPacket extends Packet {
    constructor() {
        super('OotO_HalloweenPacket', 'OotOnline', "__GLOBAL__", false);
    }
}

export class Halloween_Server {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    @Preinit()
    preinit(): void {
        this.ModLoader.logger.info("Setting up Halloween server side...");
        setInterval(() => {
            this.ModLoader.serverSide.sendPacket(new OotO_HalloweenPacket());
        }, 15 * 60 * 1000);
    }
}