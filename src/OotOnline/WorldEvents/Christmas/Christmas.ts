import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Init, onCreateResources, onTick, onViUpdate, Postinit, Preinit } from "modloader64_api/PluginLifecycle";
import { AssetHeap } from "../AssetHeap";
import { IWorldEvent, Z64_EventReward, Z64_RewardEvents } from "../WorldEvents";
import path from 'path';
import { bus, EventHandler, EventsClient, EventsServer } from "modloader64_api/EventHandler";
import { LobbyData } from "modloader64_api/NetworkHandler";
import { Age, InventoryItem, IOOTCore, IOvlPayloadResult, OotEvents, UpgradeCountLookup } from "modloader64_api/OOT/OOTAPI";
import fs from 'fs';
import { InjectCore } from "modloader64_api/CoreInjection";
import { SmartBuffer } from 'smart-buffer';
import crypto from 'crypto';
import { addToKillFeedQueue } from "modloader64_api/Announcements";
import { StorageContainer } from "modloader64_api/Storage";
import { bool_ref, number_ref } from "modloader64_api/Sylvain/ImGui";
import { ActorCategory } from "modloader64_api/OOT/ActorCategory";
import { FlipFlags, Texture } from "modloader64_api/Sylvain/Gfx";
import { rgba, vec4, xywh } from "modloader64_api/Sylvain/vec";
import { Music, SoundSourceStatus } from "modloader64_api/Sound/sfml_audio";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation } from "@OotOnline/Z64API/OotoAPI";
import { CostumeHelper } from "../CostumeHelper";
import { CreditsController } from "../CreditsController";
import { ProxySide, SidedProxy } from "modloader64_api/SidedProxy/SidedProxy";

class ChristmasGuiStuff {
    showTree: bool_ref = [true];
    snow: bool_ref = [false];
    boxVariant: number_ref = [0];
}

class TitleScreenData {
    tex!: Texture;
    icon!: Texture;
    fadeIn: vec4 = rgba(255, 255, 255, 0);
    onTitleScreen: boolean = false;
    titleMusic!: Music;
    creditsMusic!: Music;
}

interface OotO_Christmas_Config {
    textures: boolean;
    disableEvent: boolean;
}

interface IChristmasReward {
    msg: string;
    trigger: number;
    run(client: ChristmasClient): void;
}

class ChristmasReward implements IChristmasReward {

    msg: string;
    trigger: number;
    ModLoader: IModLoaderAPI;
    core: IOOTCore;
    callback: Function;

    constructor(msg: string, trigger: number, ModLoader: IModLoaderAPI, core: IOOTCore, callback: (ModLoader: IModLoaderAPI, core: IOOTCore, client: ChristmasClient) => void) {
        this.ModLoader = ModLoader;
        this.core = core;
        this.callback = callback;
        this.trigger = trigger;
        this.msg = msg;
    }

    run(client: ChristmasClient): void {
        this.callback(this.ModLoader, this.core, client);
    }
}

class ChristmasBombReward extends ChristmasReward {
    constructor(trigger: number, ModLoader: IModLoaderAPI, core: IOOTCore) {
        super("You got a present full of bombs.", trigger, ModLoader, core, (ModLoader: IModLoaderAPI, core: IOOTCore, client: ChristmasClient) => {
            this.core.save.inventory.bombsCount = UpgradeCountLookup(InventoryItem.BOMB, this.core.save.inventory.bombBag);
        });
    }
}

class ChristmasRNGReward extends ChristmasReward {
    constructor(trigger: number, ModLoader: IModLoaderAPI, core: IOOTCore, override?: number) {
        super("If you see this message yell at den for fucking up", trigger, ModLoader, core, (ModLoader: IModLoaderAPI, core: IOOTCore, client: ChristmasClient) => {
            let rng = client.getRandomInt(0, 100);
            if (rng <= client.currentProc || override !== undefined) {
                // Winner.
                client.cleanRewards();
                client.currentProc = 30;
                if (client.rewardsMap.length > 0) {
                    let data = client.rewardsMap.shift()!;
                    this.msg = "Costume: " + data;
                    if (client.costumesChild.has(data)) {
                        new ChristmasChildCostumeReward(data, "Costume: " + data, this.trigger, this.ModLoader, this.core).run(client);
                    } else if (client.costumesAdult.has(data)) {
                        new ChristmasAdultCostumeReward(data, "Costume: " + data, this.trigger, this.ModLoader, this.core).run(client);
                    } else if (client.costumesGear.has(data)) {
                        new ChristmasEquipmentCostumeReward(data, "Costume: " + data, this.trigger, this.ModLoader, this.core).run(client);
                    }
                    if (override !== undefined) {
                        addToKillFeedQueue("Winner!");
                    }
                    if (client.rewardsMap.length === 0) {
                        addToKillFeedQueue("All rewards found today!");
                    }
                } else {
                    this.doFail(client);
                }
            } else {
                this.doFail(client);
            }
        });
    }

    doFail(client: ChristmasClient) {
        // Loser.
        client.currentProc += 30;
        console.log(client.currentProc);
        // What do we give? Lets see.
        // Rupees, Bombs, Arrows, Bombchus, Sticks, Nuts.
        let spin = client.getRandomInt(0, 5);
        if (spin === 1 && this.core.save.inventory.bombBag === 0) {
            spin = 0;
        }
        if (spin === 2 && (this.core.save.age === Age.ADULT && this.core.save.inventory.quiver === 0)) {
            spin = 0;
        }
        if (spin === 2 && (this.core.save.age === Age.CHILD && this.core.save.inventory.bulletBag === 0)) {
            spin = 0;
        }
        if (spin === 4 && this.core.save.inventory.dekuSticksCapacity === 0) {
            spin = 0;
        }
        if (spin === 5 && this.core.save.inventory.dekuNutsCapacity === 0) {
            spin = 0;
        }
        switch (spin) {
            case 0:
                this.msg = "Money? Money. (Rupees)";
                this.core.save.rupee_count = this.core.save.inventory.getMaxRupeeCount();
                break;
            case 1:
                this.msg = "More explosions. (Bombs)";
                this.core.save.inventory.bombsCount = UpgradeCountLookup(InventoryItem.BOMB, this.core.save.inventory.bombBag);
                break;
            case 2:
                this.msg = "Like getting socks for Christmas. (Ammo refill)";
                if (this.core.save.age === Age.ADULT) {
                    this.core.save.inventory.arrows = UpgradeCountLookup(InventoryItem.FAIRY_BOW, this.core.save.inventory.quiver);
                } else {
                    this.core.save.inventory.dekuSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, this.core.save.inventory.bulletBag);
                }
                break;
            case 3:
                this.msg = "Careful now. These are dangerous. (Bombchus)";
                this.core.save.inventory.bombchuCount = this.core.save.inventory.bombchuCount + 5;
                break;
            case 4:
                this.msg = "More sticks for bonking. (Deku Sticks)"
                this.core.save.inventory.dekuSticksCount = UpgradeCountLookup(InventoryItem.DEKU_STICK, this.core.save.inventory.dekuSticksCapacity);
                break;
            case 5:
                this.msg = "Aw nuts. (Deku Nuts, obviously)";
                this.core.save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, this.core.save.inventory.dekuNutsCapacity);
                break;
        }
    }
}

class ChristmasChildCostumeReward extends ChristmasReward {

    private key: string;

    constructor(key: string, msg: string, trigger: number, ModLoader: IModLoaderAPI, core: IOOTCore) {
        super(msg, trigger, ModLoader, core, (ModLoader: IModLoaderAPI, core: IOOTCore, client: ChristmasClient) => {
            let data = client.costumesChild.get(this.key)!;
            let name = CostumeHelper.getCostumeName(data);
            bus.emit(Z64_RewardEvents.UNLOCK_PLAYAS, { name: name, age: Age.CHILD, data: data, event: "Christmas 2020" } as Z64_EventReward)
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, new Z64Online_ModelAllocation(data, Age.CHILD));
        });
        this.key = key;
    }
}

class ChristmasAdultCostumeReward extends ChristmasReward {

    private key: string;

    constructor(key: string, msg: string, trigger: number, ModLoader: IModLoaderAPI, core: IOOTCore) {
        super(msg, trigger, ModLoader, core, (ModLoader: IModLoaderAPI, core: IOOTCore, client: ChristmasClient) => {
            let data = client.costumesAdult.get(this.key)!;
            let name = CostumeHelper.getCostumeName(data);
            bus.emit(Z64_RewardEvents.UNLOCK_PLAYAS, { name: name, age: Age.ADULT, data: data, event: "Christmas 2020" } as Z64_EventReward)
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, new Z64Online_ModelAllocation(data, Age.ADULT));
        });
        this.key = key;
    }
}

class ChristmasEquipmentCostumeReward extends ChristmasReward {

    private key: string;

    constructor(key: string, msg: string, trigger: number, ModLoader: IModLoaderAPI, core: IOOTCore) {
        super(msg, trigger, ModLoader, core, (ModLoader: IModLoaderAPI, core: IOOTCore, client: ChristmasClient) => {
            let data = client.costumesGear.get(this.key)!;
            let name = CostumeHelper.getCostumeName(data);
            bus.emit(Z64_RewardEvents.UNLOCK_PLAYAS, { name: name, age: 0x69, data: data, event: "Christmas 2020", equipmentCategory: CostumeHelper.getEquipmentCategory(data) } as Z64_EventReward)
            bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, new Z64Online_EquipmentPak(name, data));
            bus.emit(Z64OnlineEvents.REFRESH_EQUIPMENT, {});
        });
        this.key = key;
    }
}

export class ChristmasClient implements IWorldEvent {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    heap!: AssetHeap;
    rewardChecks: any = {};
    treePointer: number = 0;
    presentParams: number = 0;
    present!: IOvlPayloadResult;
    @InjectCore()
    core!: IOOTCore;
    collectionFlags!: Buffer[];
    url: string = "https://repo.modloader64.com/mods/Ooto/events/christmas/Christmas_2020_final.content";
    GuiVariables: ChristmasGuiStuff = new ChristmasGuiStuff();
    resourceLoad: boolean = false;
    title!: TitleScreenData;
    config!: OotO_Christmas_Config;
    //
    snowList: number = 0;
    snowHeap: number = 0;
    onlyOneSnow: boolean = false;
    rewardsToday: Array<IChristmasReward> = [];
    treeDay: number = 0;
    rewardsMap: Array<string> = [];
    costumesChild: Map<string, Buffer> = new Map<string, Buffer>();
    costumesAdult: Map<string, Buffer> = new Map<string, Buffer>();
    costumesGear: Map<string, Buffer> = new Map<string, Buffer>();
    christmasSpawnLocations!: Array<number>;
    currentProc: number = 30;
    treeProc: string = "";
    eventDisabled: boolean = false;
    @SidedProxy(ProxySide.CLIENT, CreditsController)
    credits!: CreditsController;
    alreadyUnlocked: Array<string> = [];

    @Preinit()
    preinit() {
        if (this.eventDisabled) {
            return;
        }
        this.config = this.ModLoader.config.registerConfigCategory("OotO_Christmas") as OotO_Christmas_Config;
        this.ModLoader.config.setData("OotO_Christmas", "textures", true);
        this.ModLoader.config.setData("OotO_Christmas", "disableEvent", false);
        this.eventDisabled = this.config.disableEvent;
        this.title = new TitleScreenData();
        //this.heap = new AssetHeap(this.ModLoader, "Christmas", undefined, path.resolve(global.ModLoader.startdir, "Christmas"));
        this.heap = new AssetHeap(this.ModLoader, "Christmas", this.url, undefined);
        this.collectionFlags = [];
        for (let i = 0; i < 31; i++) {
            this.collectionFlags.push(Buffer.alloc(100));
        }
        //this.rewardsToday.push(new ChristmasEquipmentCostumeReward("Ice Sword", "An icey blade.", 43, this.ModLoader, this.core));
    }

    @onCreateResources()
    onLoadAssets() {
        if (!this.resourceLoad) {
            if (this.eventDisabled) {
                return;
            }
            this.ModLoader.logger.debug("Creating resources...");
            this.title.tex = this.ModLoader.Gfx.createTexture();
            fs.writeFileSync(path.resolve(__dirname, "Christmas.png"), this.heap.assets.get("assets/Christmas.png")!);
            this.title.tex.loadFromFile(path.resolve(__dirname, "Christmas.png"));
            this.title.icon = this.ModLoader.Gfx.createTexture();
            this.title.icon.loadFromFile(path.resolve(__dirname, "../", "../", "icon.png"));
            // Sounds
            this.title.titleMusic = this.ModLoader.sound.initMusic(this.heap.assets.get("assets/music/titlescreen.ogg")!);
            this.title.creditsMusic = this.ModLoader.sound.initMusic(this.heap.assets.get("assets/music/credits.ogg")!);
            this.resourceLoad = true;
        }
    }

    @Init()
    init() {
        if (this.eventDisabled) {
            return;
        }
        this.heap.init();
        let tcWrap = (fn: Function) => {
            try {
                fn();
            } catch (err) {
            }
        };
        let tex = path.resolve(__dirname, "cache");
        tcWrap(() => { fs.mkdirSync(tex) });
        tcWrap(() => {
            let p = path.resolve(".", "saves", this.ModLoader.clientLobby, "christmas_flags_oot.json");
            if (fs.existsSync(p)) {
                this.collectionFlags = JSON.parse(fs.readFileSync(p).toString());
            }
        });
        if (this.config.textures) {
            bus.emit(ModLoaderEvents.OVERRIDE_TEXTURE_PATH, tex);
        }
        this.heap.assets.forEach((value: Buffer, key: string) => {
            let parse = path.parse(key);
            if (parse.ext === ".htc") {
                fs.writeFileSync(path.resolve(tex, parse.base), value);
            }
        });
    }

    cleanRewards() {
        this.alreadyUnlocked = [];
        this.heap.costumes.get(Age.CHILD)!.forEach((value: Buffer, index: number) => {
            let name = CostumeHelper.getCostumeName(value);
            let e = { name: name, age: Age.CHILD, data: value, event: "Christmas 2020", checked: false } as Z64_EventReward;
            bus.emit(Z64_RewardEvents.CHECK_REWARD, e);
            if (e.checked === true) {
                this.alreadyUnlocked.push(name);
            }
        });
        this.heap.costumes.get(Age.ADULT)!.forEach((value: Buffer, index: number) => {
            let name = CostumeHelper.getCostumeName(value);
            let e = { name: name, age: Age.ADULT, data: value, event: "Christmas 2020", checked: false } as Z64_EventReward;
            bus.emit(Z64_RewardEvents.CHECK_REWARD, e);
            if (e.checked === true) {
                this.alreadyUnlocked.push(name);
            }
        });
        this.heap.equipment!.forEach((value: Buffer[], key: string) => {
            for (let i = 0; i < value.length; i++) {
                let name = CostumeHelper.getCostumeName(value[i]);
                let e = { name: name, age: 0x69, data: value[i], event: "Christmas 2020", checked: false, equipmentCategory: CostumeHelper.getEquipmentCategory(value[i]) } as Z64_EventReward;
                bus.emit(Z64_RewardEvents.CHECK_REWARD, e);
                if (e.checked === true) {
                    this.alreadyUnlocked.push(name);
                }
            }
        });
        for (let i = 0; i < this.alreadyUnlocked.length; i++) {
            if (this.rewardsMap.indexOf(this.alreadyUnlocked[i]) > -1) {
                this.ModLoader.logger.debug(this.alreadyUnlocked[i] + " already unlocked. Removing from item pool.");
                this.rewardsMap.splice(this.rewardsMap.indexOf(this.alreadyUnlocked[i]), 1);
            }
        }
    }

    @Postinit()
    postinit() {
        if (this.eventDisabled) {
            return;
        }
        this.heap.postinit();
        let items: Array<string> = [];
        this.heap.costumes.get(Age.CHILD)!.forEach((value: Buffer, index: number) => {
            let name = CostumeHelper.getCostumeName(value);
            this.costumesChild.set(name, value);
            let e = { name: name, age: Age.CHILD, data: value, event: "Christmas 2020", checked: false } as Z64_EventReward;
            bus.emit(Z64_RewardEvents.CHECK_REWARD, e);
            if (e.checked === true) {
                this.alreadyUnlocked.push(name);
            }
            items.push(name);
        });
        this.heap.costumes.get(Age.ADULT)!.forEach((value: Buffer, index: number) => {
            let name = CostumeHelper.getCostumeName(value);
            this.costumesAdult.set(name, value);
            let e = { name: name, age: Age.ADULT, data: value, event: "Christmas 2020", checked: false } as Z64_EventReward;
            bus.emit(Z64_RewardEvents.CHECK_REWARD, e);
            if (e.checked === true) {
                this.alreadyUnlocked.push(name);
            }
            items.push(name);
        });
        this.heap.equipment!.forEach((value: Buffer[], key: string) => {
            for (let i = 0; i < value.length; i++) {
                let name = CostumeHelper.getCostumeName(value[i]);
                this.costumesGear.set(name, value[i]);
                let e = { name: name, age: 0x69, data: value[i], event: "Christmas 2020", checked: false, equipmentCategory: CostumeHelper.getEquipmentCategory(value[i]) } as Z64_EventReward;
                bus.emit(Z64_RewardEvents.CHECK_REWARD, e);
                if (e.checked === true) {
                    this.alreadyUnlocked.push(name);
                }
                items.push(name);
            }
        });
        for (let i = 0; i < this.alreadyUnlocked.length; i++) {
            if (this.rewardsMap.indexOf(this.alreadyUnlocked[i]) > -1) {
                this.ModLoader.logger.debug(this.alreadyUnlocked[i] + " already unlocked. Removing from item pool.");
            }
        }
        let generate: boolean = false;
        if (generate) {
            let dist: any = {};
            for (let i = 1; i < 32; i++) {
                dist[i.toString()] = [];
            }
            let curDay = 20;
            let shuffle = (array: Array<string>) => {
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
            let copy = (array: Array<string>) => {
                let arr = [];
                for (let i = 0; i < array.length; i++) {
                    arr.push(array[i]);
                }
                return arr;
            }
            items = shuffle(items);
            let c = copy(items);
            let c2 = copy(items);
            console.log(JSON.stringify(dist, null, 2));
            while (items.length > 0) {
                console.log(curDay);
                dist[curDay.toString()].push(items.shift());
                curDay++;
                if (curDay > 31) {
                    curDay = 20;
                }
            }
            dist["1"] = shuffle(c);
            dist["2"] = shuffle(c2);
            console.log(JSON.stringify(dist, null, 2));
        }
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        if (this.eventDisabled) {
            return;
        }
        this.heap.onRomPatched(evt);
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onSoftReset1() {
        if (this.eventDisabled) {
            return;
        }
        this.heap.pre_reset();
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_POST)
    onSoftReset2() {
        if (this.eventDisabled) {
            return;
        }
        this.heap.post_reset();
    }

    @EventHandler(EventsClient.CONFIGURE_LOBBY)
    onLobbySetup(lobby: LobbyData): void {
        lobby.data['OotOnline:christmas'] = !this.config.disableEvent;
        if (!this.eventDisabled) {
            this.heap.preinit();
            let pos: any[] = JSON.parse(this.heap.findRawAsset("assets/PresentLocations.json")!.toString()).locations;
            let clone: any[] = JSON.parse(JSON.stringify(pos));
            let days: any[] = [];
            for (let i = 0; i < 1; i++) {
                let used: number[] = [];
                let trees: number[] = [];
                for (let j = 0; j < 80; j++) {
                    let c = this.getRandomInt(0, clone.length);
                    while (used.indexOf(c) === -1) {
                        c = this.getRandomInt(0, clone.length);
                        used.push(c);
                        trees.push(c);
                    }

                }
                days[i] = trees;
            }
            lobby.data['OotOnline:christmas_spawns'] = days[0];
            let winner = days[0][this.getRandomInt(0, days[0].length - 1)];
            lobby.data["OotOnline:christmas_winner"] = winner;
        }
    }

    @EventHandler(EventsClient.ON_LOBBY_JOIN)
    onJoinedLobby(lobby: LobbyData): void {
        if (this.eventDisabled) {
            return;
        }
        this.eventDisabled = !lobby.data['OotOnline:christmas'];
        this.credits.eventDisabled = this.eventDisabled;
        if (lobby.data['OotOnline:christmas']) {
            this.christmasSpawnLocations = lobby.data['OotOnline:christmas_spawns'];
            let rewardArrs: any = lobby.data["OotOnline:ChristmasRewardMap"];
            let rewardDay: number = lobby.data["OotOnline:ChristmasProgress"];
            let rewardArr: Array<string> = rewardArrs[rewardDay];
            this.rewardsMap = rewardArr;
            for (let i = 0; i < rewardArr.length; i++) {
                this.rewardsToday.push(new ChristmasRNGReward(lobby.data["OotOnline:christmas_winner"], this.ModLoader, this.core, 1));
            }
            for (let i = 0; i < this.christmasSpawnLocations.length; i++) {
                if (this.christmasSpawnLocations[i] !== lobby.data["OotOnline:christmas_winner"]) {
                    this.rewardsToday.push(new ChristmasRNGReward(this.christmasSpawnLocations[i], this.ModLoader, this.core));
                }
            }
            this.treeDay = lobby.data["OotOnline:ChristmasProgress"];
            this.credits.assets = this.heap.assets;
        }
    }

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onPayload() {
        if (this.eventDisabled) {
            return;
        }
        fs.writeFileSync(path.resolve(__dirname, "present.ovl"), this.heap.assets.get("assets/payloads/E0/present.ovl")!);
        fs.writeFileSync(path.resolve(__dirname, "present.json"), this.heap.assets.get("assets/payloads/E0/present.json")!);
        let evt = { result: this.ModLoader.payloadManager.parseFile(path.resolve(__dirname, "present.ovl")) };
        this.ModLoader.utils.setTimeoutFrames(() => {
            let result: IOvlPayloadResult = evt.result;
            this.treePointer = this.heap.header;
            this.presentParams = this.heap.heap!.malloc(0x30);
            this.snowList = 0;
            this.snowHeap = 0;
            this.ModLoader.emulator.rdramWrite32(this.presentParams, result.params);
            this.present = result;
            let tss = JSON.parse("{\"present\":{\"type\":\"Buffer\",\"data\":\"base64:AAAAUUCVNlOAAAAARLAwKQAAC08AAAAAAAEAAAAAAAAAAQ==\"}}");
            let ps = [tss.present];
            this.spawnTree(ps, []);
        }, 21);
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

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onScene(scene: number) {
        if (this.eventDisabled) {
            return;
        }
        this.onlyOneSnow = false;
        if (this.heap.findRawAsset("assets/PresentLocations.json") === undefined) {
            this.ModLoader.logger.error("Can't load tree locations. Something is mega fucked.");
            return;
        }
        let pos: any[] = JSON.parse(this.heap.findRawAsset("assets/PresentLocations.json")!.toString()).locations;
        let treeList: Buffer[] = [];
        let possibleSpawns: Buffer[] = [];
        for (let i = 0; i < pos.length; i++) {
            let p: Buffer = pos[i].present;
            treeList.push(p);
            let _scene = p.readUInt32BE(0);
            if (_scene === scene) {
                possibleSpawns.push(p);
            }
        }
        this.spawnTree(possibleSpawns, treeList);
    }

    private spawnTree(possibleSpawns: Array<Buffer>, treeList: Array<Buffer>) {
        if (possibleSpawns.length === 0) {
            return;
        }
        if (this.treeProc !== "") {
            this.ModLoader.utils.clearIntervalFrames(this.treeProc);
            this.treeProc = "";
        }
        this.treeProc = this.ModLoader.utils.setIntervalFrames(() => {
            if (!this.core.helper.isInterfaceShown() && !this.core.helper.isTitleScreen()) {
                return;
            }
            this.ModLoader.utils.clearIntervalFrames(this.treeProc);
            this.treeProc = "";
            for (let i = 0; i < possibleSpawns.length; i++) {
                let valid: boolean = false;
                let treeIndex = treeList.indexOf(possibleSpawns[i]);
                for (let j = 0; j < this.rewardsToday.length; j++) {
                    let index = this.rewardsToday[j].trigger;
                    if (index === treeIndex) {
                        valid = true;
                    }
                }
                if (valid) {
                    if (this.collectionFlags[this.treeDay].readUInt8(treeIndex) > 0) {
                        valid = false;
                    }
                }
                let p = possibleSpawns[i];
                this.ModLoader.utils.setTimeoutFrames(() => {
                    // Slots used:
                    // XXXXXXXX XXXXXXXX XXXXXXXX XXXXXXXX
                    // XXXXXXXX XXXXXXXX XXXXXXXX XXXXXXXX
                    // XXXXXXXX XXXXXXXX XXXXXXXX 00000000
                    this.ModLoader.emulator.rdramWrite32(this.treePointer, this.presentParams);
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x4, this.heap.getSlotAddress(this.heap.findAsset("PresentPsi")!));
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x8, this.heap.getSlotAddress(this.heap.findAsset("TreePsi")!));
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0xC, this.heap.getSlotAddress(this.heap.findAsset("PsiTopper")!));
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x10, valid ? 1 : 0);
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x14, p.readUInt32BE(0x16));
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x18, p.readUInt32BE(0x1A));
                    let snow = p.readUInt32BE(0x1E) === 1 ? true : false;
                    if (this.onlyOneSnow) {
                        snow = false;
                    }
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x1C, snow ? 1 : 0);
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x20, this.snowList);
                    this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x28, treeIndex);
                    if (snow) {
                        this.onlyOneSnow = snow;
                        let cats = [ActorCategory.MISC, ActorCategory.ITEM_ACTION];
                        Object.keys(cats).forEach((key: any) => {
                            let cat = this.core.actorManager.getActors(cats[key]);
                            for (let i = 0; i < cat.length; i++) {
                                if (cat[i].actorID === 0x97 || cat[i].actorID === 0x165) {
                                    this.ModLoader.logger.debug("Found existing weather to erase.");
                                    cat[i].destroy();
                                }
                            }
                        });
                    }
                    this.present.spawn(this.present, (success: boolean, result: number) => {
                        if (success) {
                            let a = this.core.actorManager.createIActorFromPointer(result);
                            a.position.setRawPos(p.slice(0x4, 0x4 + 0xC));
                            a.rotation.setRawRot(p.slice(0x10, 0x10 + 0x6));
                            a.room = 0xFF;
                        }
                        return {};
                    });
                }, 20 + (i * 2));
            }
        }, 1);
    }

    @onTick()
    onTick() {
        if (this.eventDisabled) {
            return;
        }
        this.title.onTitleScreen = this.core.helper.isTitleScreen() && this.core.helper.isSceneNumberValid();
        if (this.ModLoader.emulator.rdramRead32(this.presentParams + 0x24) > 0 && this.ModLoader.emulator.rdramRead32(this.presentParams + 0x24) < 255) {
            let treeId = this.ModLoader.emulator.rdramRead32(this.presentParams + 0x24);
            // Someone touched a present.
            this.ModLoader.emulator.rdramWrite32(this.presentParams + 0x24, 0x0);
            for (let i = 0; i < this.rewardsToday.length; i++) {
                if (treeId === this.rewardsToday[i].trigger) {
                    this.rewardsToday[i].run(this);
                    addToKillFeedQueue(this.rewardsToday[i].msg);
                    break;
                }
            }
            this.collectionFlags[this.treeDay].writeUInt8(1, treeId);
            let p = path.resolve(".", "saves", this.ModLoader.clientLobby, "christmas_flags_oot.json");
            fs.writeFileSync(p, JSON.stringify(this.collectionFlags));
        }
    }

    @onViUpdate()
    onVi() {
        if (this.eventDisabled) {
            return;
        }
        if (!this.title.onTitleScreen) {
            this.title.fadeIn.w = 0;
            try {
                if (this.title.titleMusic.status !== SoundSourceStatus.Stopped) {
                    this.title.titleMusic.stop();
                }
            } catch (err) { }
            return;
        }
        try {
            if (this.title.titleMusic.status !== SoundSourceStatus.Playing) {
                this.core.commandBuffer.runCommand(Command.PLAY_MUSIC, 0);
                this.title.titleMusic.volume = 50;
                this.title.titleMusic.play();
            }
        } catch (err) { }
        if (this.title.fadeIn.w < 1.0) {
            this.title.fadeIn.w += 0.001;
        }
        //this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.title.icon, xywh(0, 0, this.title.icon.width, this.title.icon.height), xywh(0, 0, this.title.icon.width / 4, this.title.icon.width / 4), this.title.fadeIn, FlipFlags.None);
        this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.title.tex, xywh(0, 0, this.title.tex.width, this.title.tex.height), xywh(0, 0, this.ModLoader.ImGui.getMainViewport().size.x, this.ModLoader.ImGui.getMainViewport().size.y), this.title.fadeIn, FlipFlags.None);
    }

}

export class ChristmasServer implements IWorldEvent {
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    rewardData: any;

    @Preinit()
    preinit() {
        if (fs.existsSync(path.resolve(global.ModLoader.startdir, "christmas2020_rewardmap.json"))) {
            this.rewardData = JSON.parse(fs.readFileSync(path.resolve(global.ModLoader.startdir, "christmas2020_rewardmap.json")).toString());
        } else {
            this.rewardData = {};
            for (let i = 0; i < 31; i++) {
                this.rewardData[i.toString()] = [];
            }
        }
    }

    @EventHandler(EventsServer.ON_LOBBY_DATA)
    onData(data: LobbyData) {
        let d = new Date();
        let day = d.getDate();
        data.data["OotOnline:ChristmasRewardMap"] = this.rewardData;
        data.data["OotOnline:ChristmasProgress"] = day;
    }
}