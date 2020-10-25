import { IWorldEvent, OotO_EventReward, OotO_RewardEvents } from "../WorldEvents";
import { Z64LibSupportedGames } from 'Z64Lib/API/Z64LibSupportedGames';
import { Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import path from 'path';
import { zzstatic } from 'Z64Lib/API/zzstatic';
import { ILogger, IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { OotOnlineEvents, OotOnline_Emote } from "@OotOnline/OotoAPI/OotoAPI";
import zip from 'adm-zip';
import { FlipFlags, Texture } from "modloader64_api/Sylvain/Gfx";
import fs from 'fs';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Init, onCreateResources, onTick, onViUpdate, Postinit, Preinit } from "modloader64_api/PluginLifecycle";
import { rgba, vec4, xy, xywh } from "modloader64_api/Sylvain/vec";
import { Age, IOOTCore, LinkState, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { PatchTypes } from "modloader64_api/Patchers/PatchManager";
import { Heap } from 'modloader64_api/heap';
import crypto from 'crypto';
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IActor } from "modloader64_api/OOT/IActor";
import { addToKillFeedQueue } from "modloader64_api/Announcements";
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { IPosition } from "modloader64_api/OOT/IPosition";
import { Music, SoundSourceStatus } from "modloader64_api/Sound/sfml_audio";
import { checkServerIdentity } from "tls";
import child_process from 'child_process';

class HeapAsset {
    name: string;
    slot: number;
    asset: Buffer;
    callback: Function | undefined;
    pointer: number = 0;

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
    darkLinkAge: Age = Age.ADULT;
    darkLinkSelection: number = 0;
    darkLink!: Buffer;
    darkLinkCostume!: Buffer;
    seekingTicks: number = 0;
    tableStart: number = 0x80700070;
    currentDarkLink: IActor | undefined;
    dlc: number = 0;
    arc: number = 0;
    chance: number = 25;
    pendingLoadingZoneTraversal: boolean = false;
    pendingSpawn: boolean = false;
    lastRespawnPos!: IPosition;
    titleMusic!: Music;
    onTitleScreen: boolean = false;
    config!: OotO_HalloweenConfig;
    fogScenes: Array<number> = [];
    playingCredits: boolean = false;
    playedCredits: boolean = false;
    creditsMusic!: Music;
    creditsLoops: number = 0;
    currentCreditsSlide!: Texture;
    totalSlidesShown: number = 0;
    needsSlideChange: boolean = false;
    logger!: ILogger;
    cacheDir: string = path.resolve(".", "cache");
    erroredOut: boolean = false;
    creditsInterval: any;

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        if (this.erroredOut) {
            return;
        }
        this.logger.debug("Patching virtual rom...");
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
                        buf = PatchTypes.get(".txt")!.patch(buf, value);
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
            b.writeUInt8(0x01, 0x2039);
            files.set(70, b);
            this.darkLink = b;

            files.forEach((value: Buffer, key: number) => {
                this.ModLoader.logger.debug("Compressing file " + key + ".");
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
        if (this.erroredOut) {
            return;
        }
        this.ModLoader.utils.setTimeoutFrames(() => {
            let zz: zzstatic = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
            if (this.heap === undefined) {
                this.heap = new Heap(this.ModLoader.emulator, this.tableStart + 0x100, 1 * 1024 * 1024);
                this.heap_assets.forEach((value: HeapAsset) => {
                    this.logger.info("Loading Halloween asset: " + value.name);
                    let pointer = this.heap.malloc(value.asset.byteLength);
                    let buf = zz.doRepoint(value.asset, 0, false, pointer);
                    let header = Buffer.from('MODLOADER64');
                    let target = buf.indexOf(header);
                    this.ModLoader.emulator.rdramWriteBuffer(pointer, buf);
                    this.ModLoader.emulator.rdramWrite32(this.tableStart + (value.slot * 0x8), 0xDE010000);
                    this.ModLoader.emulator.rdramWrite32(this.tableStart + (value.slot * 0x8) + 0x4, pointer + target + 0x10);
                    this.logger.info("Asset " + value.name + " allocated at " + pointer.toString(16) + ".");
                    value.pointer = pointer;
                    if (value.callback !== undefined) {
                        value.callback();
                    }
                });
                this.changeDarkLinkCostume();
            }
        }, 20);
    }

    private changeDarkLinkCostume() {
        if (this.erroredOut) {
            return;
        }
        let zz: zzstatic = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
        this.darkLinkCostume = Buffer.alloc(0x37800);
        if (this.dlc === 0) {
            this.dlc = this.heap.malloc(this.darkLinkCostume.byteLength);
        }
        if (this.core.save.age > 0) {
            let id = this.getRandomInt(0, this.costumesChild.length - 1);
            this.costumesChild[id].copy(this.darkLinkCostume);
            this.darkLinkCostume.writeUInt32BE(0x060053A8, 0x500C);
            this.darkLinkAge = Age.CHILD;
            this.darkLinkSelection = id;
        } else {
            let id = this.getRandomInt(0, this.costumesAdult.length - 1);
            this.costumesAdult[id].copy(this.darkLinkCostume);
            this.darkLinkCostume.writeUInt32BE(0x06005380, 0x500C);
            this.darkLinkAge = Age.ADULT;
            this.darkLinkSelection = id;
        }
        this.changeHierarchyPointer(15, 0x20);
        this.changeHierarchyPointer(18, 0x48);
        this.ModLoader.emulator.rdramWriteBuffer(this.dlc, zz.doRepoint(this.darkLinkCostume, 0, true, this.dlc));
        this.ModLoader.emulator.rdramWriteBuffer(0x80700000 + 0x0, this.ModLoader.emulator.rdramReadBuffer(this.darkLinkCostume.readUInt32BE(0x500C), 0x10));
        this.ModLoader.emulator.rdramWriteBuffer(0x80700000 + 0x10, Buffer.from("00334600C50046000000000000000000", 'hex'));
        // Fix Dark Link's sword.
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x20, 0xE7000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x24, 0x00000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x28, 0xDE000000);
        if (this.core.save.age > 0) {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x2C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x52E4));
        } else {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x2C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x513C));
        }
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x30, 0xDE000000);
        if (this.core.save.age > 0) {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x34, this.ModLoader.emulator.rdramRead32(this.dlc + 0x52EC));
        } else {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x34, this.ModLoader.emulator.rdramRead32(this.dlc + 0x5144));
        }
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x38, 0xDE000000);
        if (this.core.save.age > 0) {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x3C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x52F4));
        } else {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x3C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x5114));
        }
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x40, 0xDF000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x44, 0x00000000);
        // Fix Dark Link's shield.
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x48, 0xE7000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x4C, 0x00000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x50, 0xDE000000);
        if (this.core.save.age > 0) {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x54, this.ModLoader.emulator.rdramRead32(this.dlc + 0x5334));
        } else {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x54, this.ModLoader.emulator.rdramRead32(this.dlc + 0x5164));
        }
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x58, 0xDE000000);
        if (this.core.save.age > 0) {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x5C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x533C));
        } else {
            this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x5C, this.ModLoader.emulator.rdramRead32(this.dlc + 0x512C));
        }
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x60, 0xDF000000);
        this.ModLoader.emulator.rdramWrite32(0x80700000 + 0x64, 0x00000000);
    }

    private changeHierarchyPointer(limb: number, offset: number) {
        if (this.erroredOut) {
            return;
        }
        let hp = this.darkLinkCostume.readUInt32BE(0x500C);
        hp = this.darkLinkCostume.readUInt32BE(hp - 0x06000000) + (limb * 4);
        hp = this.darkLinkCostume.readUInt32BE((hp - 0x06000000)) - 0x06000000;
        hp += 8;
        this.darkLinkCostume.writeUInt32BE(0x80700000 + offset, hp);
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onSoftReset2() {
        if (this.erroredOut) {
            return;
        }
        this.currentDarkLink = undefined;
        //@ts-ignore
        this.heap = undefined;
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_POST)
    onSoftReset() {
        if (this.erroredOut) {
            return;
        }
        this.logger.debug("Reloading assets...");
        this.setupAssets();
        this.currentDarkLink = undefined;
    }

    @EventHandler(OotEvents.ON_LOADING_ZONE)
    onSceneChangePre() {
        if (this.erroredOut) {
            return;
        }
        this.logger.debug("Dealing with loading zone transition...");
        if (this.currentDarkLink !== undefined) {
            this.pendingLoadingZoneTraversal = true;
        }
        this.currentDarkLink = undefined;
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        if (this.erroredOut) {
            return;
        }
        this.logger.debug("Dealing with scene change...");
        if (this.currentDarkLink !== undefined) {
            this.currentDarkLink = undefined;
            addToKillFeedQueue("The shadows have deemed you unworthy.");
        }
        this.lastRespawnPos = JSON.parse(JSON.stringify(this.core.link.position));
        if (this.pendingLoadingZoneTraversal) {
            if (this.core.save.age === this.darkLinkAge) {
                this.pendingLoadingZoneTraversal = false;
                this.spawnDarkLink(100, true);
            } else {
                addToKillFeedQueue("The shadows are lost in time...");
            }
        }
        this.pendingLoadingZoneTraversal = false;
        if (this.fogScenes.indexOf(scene) > -1 && this.config.fog) {
            this.core.commandBuffer.runCommand(Command.SPAWN_ACTOR, 0x806001A2, () => {
                this.ModLoader.logger.debug("Bring the fog.");
            });
        }
    }

    @onCreateResources()
    onLoadAssets() {
        if (this.erroredOut) {
            return;
        }
        if (!this.resourceLoad) {
            this.logger.debug("Creating resources...");
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
        if (this.erroredOut) {
            return;
        }
        try {
            this.logger = this.ModLoader.logger.getLogger("OotO_Halloween");
            this.logger.debug("Doing preinit...");
            this.logger.debug("Streaming data...");
            let stream = (): Buffer => {
                const fetch = require('sync-fetch')
                const response = fetch('https://repo.modloader64.com/mods/Ooto/events/halloween/halloween2020.content');
                return response.json().data;
            };
            let buf = stream().swap32();
            let assets: zip = new zip(buf);
            for (let i = 0; i < assets.getEntries().length; i++) {
                let e = assets.getEntries()[i];
                if (!e.isDirectory) {
                    this.assets.set(e.entryName, e.getData());
                }
            }
            this.assets.forEach((value: Buffer, key: string) => {
                if (key.indexOf("costumes/adult") > -1) {
                    Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                    this.costumesAdult.push(this.assets.get(key)!);
                } else if (key.indexOf("costumes/child") > -1) {
                    Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                    this.costumesChild.push(this.assets.get(key)!);
                }
            });

            this.assets.forEach((value: Buffer, key: string) => {
                if (key.indexOf("freebies/adult") > -1 && key.indexOf(".txt") === -1) {
                    Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                    this.darkLinkCostume = value;
                    bus.emit(OotO_RewardEvents.UNLOCK_PLAYAS, { name: this.getDarkLinkCostumeName(), data: value, age: Age.ADULT } as OotO_EventReward);
                } else if (key.indexOf("freebies/child") > -1 && key.indexOf(".txt") === -1) {
                    Buffer.from(path.parse(key).name).copy(value, 0x53C0);
                    this.darkLinkCostume = value;
                    bus.emit(OotO_RewardEvents.UNLOCK_PLAYAS, { name: this.getDarkLinkCostumeName(), data: value, age: Age.CHILD } as OotO_EventReward);
                }
            });

            let shuffle = (array: Array<Buffer>) => {
                let currentIndex = array.length, temporaryValue, randomIndex;
                while (0 !== currentIndex) {

                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;
                    temporaryValue = array[currentIndex];
                    array[currentIndex] = array[randomIndex];
                    array[randomIndex] = temporaryValue;
                }
                return array;
            }
            this.costumesAdult = shuffle(this.costumesAdult);
            this.costumesChild = shuffle(this.costumesChild);

            this.config = this.ModLoader.config.registerConfigCategory("OotO_Halloween") as OotO_HalloweenConfig;
            this.ModLoader.config.setData("OotO_Halloween", "textures", true);
            this.ModLoader.config.setData("OotO_Halloween", "fog", true);
            this.fogScenes = JSON.parse(this.assets.get("assets/fog.json")!.toString())["scenes"];
        } catch (err) {
            this.erroredOut = true;
            return;
        }
        if (!this.erroredOut) {
            let tcWrap = (fn: Function) => {
                try {
                    fn();
                } catch (err) {
                    console.log(err);
                }
            };
            let tex = path.resolve(__dirname, "cache");
            tcWrap(() => { fs.mkdirSync(tex); });
            if (this.config.textures) {
                bus.emit(ModLoaderEvents.OVERRIDE_TEXTURE_PATH, tex);
            }
            this.assets.forEach((value: Buffer, key: string) => {
                if (key.indexOf("cache/THE LEGEND OF ZELDA_HIRESTEXTURES.htc") > -1) {
                    let parse = path.parse(key);
                    fs.writeFileSync(path.resolve(tex, parse.base), value);
                }
            });
        }
    }

    @Init()
    init() {
        if (this.erroredOut) {
            return;
        }
        this.logger.debug("Doing init...");
        this.titleMusic = this.ModLoader.sound.initMusic(this.assets.get("assets/music/titlescreen.ogg")!);
        this.creditsMusic = this.ModLoader.sound.initMusic(this.assets.get("assets/music/credits.ogg")!);
    }

    @Postinit()
    onPost() {
        if (this.erroredOut) {
            return;
        }
        this.logger.debug("Doing postinit...");
        this.titleMusic.volume = global.ModLoader["GLOBAL_VOLUME"];
    }

    @onViUpdate()
    onVi() {
        if (this.erroredOut) {
            return;
        }
        if (this.playingCredits) {
            if (this.creditsMusic.status !== SoundSourceStatus.Playing && this.creditsLoops < 4) {
                this.core.commandBuffer.runCommand(Command.PLAY_MUSIC, 0);
                this.creditsMusic.stop();
                this.creditsMusic.play();
                this.creditsLoops++;
                this.needsSlideChange = true;
            }
            if (this.needsSlideChange) {
                if (this.assets.has("assets/credits/" + "slide" + this.totalSlidesShown + ".png")) {
                    this.currentCreditsSlide = this.ModLoader.Gfx.createTexture();
                    fs.writeFileSync(path.resolve(__dirname, "slide" + this.totalSlidesShown + ".png"), this.assets.get("assets/credits/" + "slide" + this.totalSlidesShown + ".png")!);
                    this.currentCreditsSlide.loadFromFile(path.resolve(__dirname, "slide" + this.totalSlidesShown + ".png"));
                    this.totalSlidesShown++;
                } else {
                    // ran out of slides?
                    clearInterval(this.creditsInterval);
                    this.creditsInterval = undefined;
                }
                this.needsSlideChange = false;
            }
            this.ModLoader.ImGui.getWindowDrawList().addRectFilled(xy(0, 0), xy(this.ModLoader.ImGui.getWindowWidth(), this.ModLoader.ImGui.getWindowHeight()), rgba(0, 0, 0, 0xFF));
            if (this.currentCreditsSlide !== undefined) {
                this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.currentCreditsSlide, xywh(0, 0, this.currentCreditsSlide.width, this.currentCreditsSlide.height), xywh(0, 0, this.ModLoader.ImGui.getMainViewport().size.x, this.ModLoader.ImGui.getMainViewport().size.y), rgba(255, 255, 255, 255), FlipFlags.None);
            }
            return;
        }
        if (this.core.save.entrance_index === 0x0000006B && this.core.save.cutscene_number === 0x0000FFF2 && !this.playingCredits && !this.playedCredits) {
            this.playingCredits = true;
            this.creditsInterval = setInterval(() => {
                if (this.playingCredits) {
                    this.needsSlideChange = true;
                    this.playedCredits = true;
                }
            }, 10 * 1000);
        }
        if (!this.onTitleScreen) {
            this.fadeIn.w = 0;
            if (this.titleMusic.status !== SoundSourceStatus.Stopped) {
                this.titleMusic.stop();
            }
            return;
        }
        if (this.titleMusic.status !== SoundSourceStatus.Playing) {
            this.core.commandBuffer.runCommand(Command.PLAY_MUSIC, 0);
            this.titleMusic.play();
        }
        if (this.fadeIn.w < 1.0) {
            this.fadeIn.w += 0.001;
        }
        this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.icon, xywh(0, 0, this.icon.width, this.icon.height), xywh(0, 0, this.icon.width / 4, this.icon.width / 4), this.fadeIn, FlipFlags.None);
        this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.titleScreen, xywh(0, 0, this.titleScreen.width, this.titleScreen.height), xywh(0, 0, this.ModLoader.ImGui.getMainViewport().size.x, this.ModLoader.ImGui.getMainViewport().size.y), this.fadeIn, FlipFlags.None);
    }

    @onTick()
    onTick(frame: number) {
        if (this.erroredOut) {
            return;
        }
        if (this.playingCredits) {
            this.core.commandBuffer.runCommand(Command.PLAY_MUSIC, 0);
        }
        this.onTitleScreen = this.core.helper.isTitleScreen() && this.core.helper.isSceneNumberValid();
        if (this.core.helper.isTitleScreen() && !this.core.helper.isSceneNumberValid() && !this.core.helper.isPaused()) {
            return;
        }
        if (this.core.helper.isLinkEnteringLoadingZone()) {
            return;
        }
        if (this.currentDarkLink !== undefined) {
            let isSeeking = false;
            let bubble = 250;
            if (Math.abs(this.core.link.position.x - this.currentDarkLink.position.x) > bubble) {
                isSeeking = true;
                let dist = Math.floor(Math.abs(this.core.link.position.x - this.currentDarkLink.position.x) / 20);
                let dir = this.core.link.position.x > this.currentDarkLink.position.x;
                if (dir) {
                    this.currentDarkLink.position.x += dist;
                } else {
                    this.currentDarkLink.position.x -= dist;
                }
                this.currentDarkLink.position.y = this.core.link.position.y + this.arc;
            }
            if (Math.abs(this.core.link.position.y - this.currentDarkLink.position.y) > bubble) {
                isSeeking = true;
                this.currentDarkLink.position.y = this.core.link.position.y + this.arc;
            }
            if (Math.abs(this.core.link.position.z - this.currentDarkLink.position.z) > bubble) {
                isSeeking = true;
                let dist = Math.floor(Math.abs(this.core.link.position.z - this.currentDarkLink.position.z) / 20);
                let dir = this.core.link.position.z > this.currentDarkLink.position.z;
                if (dir) {
                    this.currentDarkLink.position.z += dist;
                } else {
                    this.currentDarkLink.position.z -= dist;
                }
                this.currentDarkLink.position.y = this.core.link.position.y + this.arc;
            }
            if (isSeeking) {
                this.arc++;
                if (this.arc > 100) {
                    this.arc = 100;
                }
                this.seekingTicks++;
            } else {
                this.arc = 0;
            }
            if (this.currentDarkLink.rdramRead32(0x130) === 0) {
                this.currentDarkLink = undefined;
                let check = { name: this.getDarkLinkCostumeName(), data: this.costumesChild[this.darkLinkSelection], age: Age.CHILD } as OotO_EventReward;
                bus.emit(OotO_RewardEvents.CHECK_REWARD, check);
                if (check.checked !== undefined) {
                    if (check.checked) {
                        return;
                    }
                }
                addToKillFeedQueue("Unlocked: " + this.getDarkLinkCostumeName());
                if (this.darkLinkAge > 0) {
                    bus.emit(OotO_RewardEvents.UNLOCK_PLAYAS, { name: this.getDarkLinkCostumeName(), data: this.costumesChild[this.darkLinkSelection], age: Age.CHILD } as OotO_EventReward);
                } else {
                    bus.emit(OotO_RewardEvents.UNLOCK_PLAYAS, { name: this.getDarkLinkCostumeName(), data: this.costumesAdult[this.darkLinkSelection], age: Age.ADULT } as OotO_EventReward);
                }
            } else {
                if (this.currentDarkLink.rdramRead32(0x654) === 0) {
                    this.currentDarkLink.rdramWrite32(0x654, 0x801DAA30);
                }
            }
        }
        if (this.pendingSpawn) {
            this.ModLoader.emulator.rdramWrite16(0x80700000 + 0x10 + 0x2, Math.floor(this.lastRespawnPos.x));
            this.ModLoader.emulator.rdramWrite16(0x80700000 + 0x10 + 0x4, Math.floor(this.lastRespawnPos.y));
            this.ModLoader.emulator.rdramWrite16(0x80700000 + 0x10 + 0x6, Math.floor(this.lastRespawnPos.z));
            if ((this.core.link.state === LinkState.STANDING || this.core.link.state === LinkState.Z_TARGETING) && !this.core.helper.isLinkEnteringLoadingZone() && !this.core.helper.isPaused() && this.core.helper.isInterfaceShown()) {
                this.pendingSpawn = false;
                this.core.commandBuffer.runCommand(Command.SPAWN_ACTOR, 0x80700000 + 0x10, (success: boolean, result: number) => {
                    if (success) {
                        let a = this.core.actorManager.createIActorFromPointer(result);
                        a.room = 0xFF;
                        this.currentDarkLink = a;
                        this.currentDarkLink.position.setRawPos(this.core.link.position.getRawPos());
                        this.chance = 25;
                        if (this.core.save.age > 0) {
                            a.health = Math.floor(a.health / 2);
                        }
                    }
                });
            }
        }
    }

    private getDarkLinkCostumeName(): string {
        let str = "";
        let cur = -1;
        let o = 0x53C0;
        while (cur !== 0) {
            cur = this.darkLinkCostume.readUInt8(o);
            str += this.darkLinkCostume.slice(o, o + 1).toString();
            o++;
        }
        return str.substring(0, str.length - 1).trim();
    }

    private gainPower() {
        this.logger.debug("Gaining power...");
        addToKillFeedQueue("The shadows gain power...");
        this.chance += 25;
    }

    private spawnDarkLink(chance = 25, noCostumeChange = false) {
        if (this.pendingLoadingZoneTraversal) {
            return;
        }
        if (this.currentDarkLink !== undefined) {
            this.gainPower();
            return;
        }
        if (this.core.helper.isTitleScreen() && !this.core.helper.isSceneNumberValid() && !this.core.helper.isPaused()) {
            this.gainPower();
            return;
        }
        // Don't spawn Dark Link in water temple.
        if (this.core.global.scene === 0x0005) {
            this.gainPower();
            return;
        }
        this.ModLoader.utils.setTimeoutFrames(() => {
            let roll = this.getRandomInt(1, 100);
            if (roll <= chance) {
                if (!noCostumeChange) {
                    this.changeDarkLinkCostume();
                }
                if (noCostumeChange) {
                    addToKillFeedQueue("There is no escape...");
                } else {
                    addToKillFeedQueue("An invader approaches...");
                }
                this.pendingSpawn = true;
            } else {
                this.gainPower();
            }
        }, 50);
    }

    @NetworkHandler('OotO_HalloweenPacket')
    onTimerTick(packet: OotO_HalloweenPacket) {
        if (this.erroredOut) {
            return;
        }
        this.spawnDarkLink(this.chance);
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

interface OotO_HalloweenConfig {
    textures: boolean;
    fog: boolean;
}