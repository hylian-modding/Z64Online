import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { ProxySide, SidedProxy } from 'modloader64_api/SidedProxy/SidedProxy';
import { onViUpdate, Postinit, Preinit } from 'modloader64_api/PluginLifecycle';
import { bus, EventHandler, PrivateEventHandler } from 'modloader64_api/EventHandler';
import { bool_ref, Dir } from 'modloader64_api/Sylvain/ImGui';
import { CostumeHelper } from '../events/CostumeHelper';
import { Z64_EventConfig } from './Z64_EventConfig';
import fs from 'fs';
import path from 'path';
import { StorageContainer } from 'modloader64_api/Storage';
import { EventController } from '../events/EventController';
import { ExternalEventData, OOTO_PRIVATE_ASSET_HAS_CHECK, OOTO_PRIVATE_ASSET_LOOKUP_OBJ, OOTO_PRIVATE_COIN_LOOKUP_OBJ, Z64O_PRIVATE_EVENTS, RewardTicket } from '@Z64Online/common/api/InternalAPI';
import { AssetContainer } from '../events/AssetContainer';
import zlib from 'zlib';
import { IModelReference, IModelScript, Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation, Z64_AnimationBank } from '@Z64Online/common/api/Z64API';
import { IZ64Main } from 'Z64Lib/API/Common/IZ64Main';
import { AgeOrForm } from 'Z64Lib/API/Common/Z64API';
import { getAdultID, getChildID, isPaused } from '../types/GameAliases';
import { Z64_GAME } from 'Z64Lib/src/Common/types/GameAliases';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import { Z64 } from 'Z64Lib/API/imports';
import { BackwardsCompat } from '../compat/BackwardsCompat';
import { rgba } from 'modloader64_api/Sylvain/vec';

export interface Z64_EventReward {
    name: string;
    age: AgeOrForm;
    equipmentCategory?: string;
    data: Buffer;
    event: string;
    checked?: boolean;
}

export interface RewardContainer {
    tickets: RewardTicket[];
    coins: number;
    sig: Buffer;
    externalData: any;
}

export interface ScriptedReward {
    DEFAULT_MODEL: Buffer;
    DEFAULT_SCRIPT: IModelScript;
}

export class WorldEventRewards {
    config!: Z64_EventConfig;
    cacheDir: string = path.resolve(global.ModLoader.startdir, "cache");

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    allowManagerUsage: boolean = false;
    rewardsWindowStatus: bool_ref = [false];
    customModelRegistry: Map<AgeOrForm, Map<string, IModelReference>> = new Map();
    customModelsFilesEquipment: Map<string, Z64Online_EquipmentPak[]> = new Map<string, Z64Online_EquipmentPak[]>();

    customSoundGroups: Map<string, any> = new Map<string, any>();

    anims: Map<string, Buffer> = new Map<string, Buffer>();

    allRewardTickets: Map<string, RewardTicket> = new Map<string, RewardTicket>();
    rewardTicketsByEvent: Map<string, Map<string, Array<RewardTicket>>> = new Map<string, Map<string, Array<RewardTicket>>>();
    rewardTicketsForEquipment: Map<string, Map<string, Array<RewardTicket>>> = new Map<string, Map<string, Array<RewardTicket>>>();
    rewardTicketsByUUID: Map<string, RewardTicket> = new Map<string, RewardTicket>();
    rewardContainer: RewardContainer = { tickets: [], coins: 0, sig: Buffer.alloc(1), externalData: {} };
    assets!: AssetContainer;
    compressedTicketCache: Map<string, ScriptedReward> = new Map<string, ScriptedReward>();

    constructor() {
    }

    @EventHandler(Z64OnlineEvents.POST_LOADED_MODELS_LIST)
    onModelPost(evt: any) {
        this.customModelRegistry = evt.models;
        let eqMap: Map<string, Z64Online_EquipmentPak> = evt.equipment;
        eqMap.forEach((value: Z64Online_EquipmentPak) => {
            if (!this.customModelsFilesEquipment.has(value.category)) {
                this.customModelsFilesEquipment.set(value.category, []);
            }
            this.customModelsFilesEquipment.get(value.category)!.push(value);
        });
    }

    @EventHandler(Z64OnlineEvents.POST_LOADED_SOUND_LIST)
    onSoundPost(paks: Map<string, any>) {
        this.customSoundGroups = paks;
        // I don't understand how something with a key of undefined keeps ending up in here.
        //@ts-ignore
        this.customSoundGroups.delete(undefined);
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.REGISTER_ANIM_BANKS_WITH_COSTUME_MANAGER)
    onAnimReg(evt: Map<string, Buffer>) {
        this.anims = evt;
    }

    private migrateRewards() {
        if (fs.existsSync("./storage/holiday_event_rewards_v3.pak")) {
            if (fs.existsSync("./storage/Z64O_Reward_Tickets.pak")) {
                let storage = new StorageContainer("Z64O_Reward_Tickets");
                this.rewardContainer = storage.loadObject() as RewardContainer;
            }
            this.ModLoader.logger.debug("Migrating event rewards...");
            let rewards: Array<string> = [];
            let old = new StorageContainer("holiday_event_rewards_v3").loadObject().events;
            Object.keys(old).forEach((event: string) => {
                let e = old[event];
                Object.keys(e).forEach((cat: string) => {
                    let c = e[cat];
                    let items = c["items"];
                    Object.keys(items).forEach((item: string) => {
                        if (Buffer.isBuffer(items[item])) {
                            this.ModLoader.logger.info(item);
                            rewards.push(item);
                        } else {
                            let i = items[item];
                            Object.keys(i).forEach((eq: string) => {
                                this.ModLoader.logger.info(eq);
                                rewards.push(eq);
                            });
                        }
                    });
                });
            });
            try {
                let tickets: Array<RewardTicket> = [];
                this.assets.bundle.files.forEach((buf: Buffer, key: string) => {
                    if (key.indexOf(".json") > -1) {
                        tickets.push(JSON.parse(buf.toString()));
                    }
                });
                rewards.forEach((value: string) => {
                    this.ModLoader.logger.info("found matching zobj. Looking for ticket...");
                    for (let i = 0; i < tickets.length; i++) {
                        if (tickets[i].game !== "OotO") continue;
                        if (tickets[i].name.indexOf(value) > -1) {
                            this.ModLoader.logger.info("found matching ticket!");
                            this.rewardContainer.tickets.push(tickets[i]);
                        }
                    }
                });
                new StorageContainer("Z64O_Reward_Tickets").storeObject(this.rewardContainer);
                fs.unlinkSync("./storage/holiday_event_rewards_v3.pak");
            } catch (err: any) {
                console.log(err);
            }
        }
    }

    loadTickets() {
        const homedir = require('os').homedir();
        let backup = path.resolve(homedir, "Z64O_Reward_Tickets.pak");
        this.ModLoader.logger.info("Loading reward tickets...");
        this.allRewardTickets.clear();
        this.rewardTicketsByEvent.clear();
        this.rewardTicketsByUUID.clear();
        this.rewardTicketsForEquipment.clear();
        this.assets.bundle.files.forEach((buf: Buffer, key: string) => {
            if (key.indexOf(".json") > -1) {
                let ticket: RewardTicket = JSON.parse(buf.toString());
                this.allRewardTickets.set(ticket.uuid, ticket);
            }
        });
        this.allRewardTickets.forEach((ticket: RewardTicket) => {
            if (!this.compressedTicketCache.has(ticket.uuid)) {
                if (ticket.scripted) {
                    let rs = require('require-from-string');
                    let b = this.assets.bundle.files.get(ticket.name)!;
                    let c = zlib.inflateSync(b).toString();
                    try{
                        let r = rs(c);
                        this.compressedTicketCache.set(ticket.uuid, r);
                    }catch(err: any){
                        this.ModLoader.logger.error(err.stack);
                        return;
                    }
                }
            }
        });
        if (!fs.existsSync("./storage/Z64O_Reward_Tickets.pak")) {
            if (fs.existsSync(backup)) {
                try {
                    fs.mkdirSync("./storage");
                } catch (err) { }
                fs.copyFileSync(backup, path.resolve("./storage/Z64O_Reward_Tickets.pak"));
            } else {
                return;
            }
        }
        let storage = new StorageContainer("Z64O_Reward_Tickets");
        this.rewardContainer = storage.loadObject() as RewardContainer;
        let obj: any = { tickets: this.rewardContainer.tickets, coins: this.rewardContainer.coins };
        let hash: string = this.ModLoader.utils.hashBuffer(Buffer.from(JSON.stringify(obj)));
        const verified = hash === this.rewardContainer.sig.toString();
        if (verified) {
            this.ModLoader.logger.debug("Rewards file OK.");
        } else {
            this.ModLoader.logger.error("This rewards file has an invalid signature.");
        }
        for (let i = 0; i < this.rewardContainer.tickets.length; i++) {
            this.rewardContainer.tickets[i] = this.allRewardTickets.get(this.rewardContainer.tickets[i].uuid)!;
            let ticket = this.rewardContainer.tickets[i];
            if (ticket.game !== "OotO") continue;
            this.rewardTicketsByUUID.set(ticket.uuid, ticket);
            if (!this.rewardTicketsByEvent.has(ticket.event)) {
                this.rewardTicketsByEvent.set(ticket.event, new Map<string, RewardTicket[]>());
            }
            if (!this.rewardTicketsByEvent.get(ticket.event)!.has(ticket.category)) {
                this.rewardTicketsByEvent.get(ticket.event)!.set(ticket.category, []);
            }
            this.rewardTicketsByEvent.get(ticket.event)!.get(ticket.category)!.push(ticket);
            if (ticket.category === "Equipment") {
                if (!this.rewardTicketsForEquipment.has(ticket.event)) {
                    this.rewardTicketsForEquipment.set(ticket.event, new Map<string, RewardTicket[]>());
                }
                let category = CostumeHelper.getEquipmentCategory(this.assets.bundle.files.get(ticket.name)!);
                if (!this.rewardTicketsForEquipment.get(ticket.event)!.has(category)) {
                    this.rewardTicketsForEquipment.get(ticket.event)!.set(category, []);
                }
                this.rewardTicketsForEquipment.get(ticket.event)!.get(category)!.push(ticket);
            }
        }

        let r = path.resolve("./storage/Z64O_Reward_Tickets.pak");
        if (fs.existsSync(r)) {
            this.ModLoader.logger.debug(`Backed up event rewards to ${backup}`);
            fs.copyFileSync(r, backup);
        }
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CLIENT_ASSET_DATA_GET)
    onAssetData(assetURLS: Array<string>) {
        if (assetURLS.length === 0) {
            if (this.config.assetcache !== "") {
                this.ModLoader.logger.debug("Loading locally saved assets...");
                this.assets = new AssetContainer(this.ModLoader, this.core, () => {
                    this.loadTickets();
                });
                // Generate a junk url to trick the system into loading this anyway.
                this.assets.url = "https://" + this.ModLoader.utils.getUUID() + ".fake/" + this.config.assetcache;
                this.assets.preinit();
            }
        } else {
            this.assets = new AssetContainer(this.ModLoader, this.core, () => {
                this.migrateRewards();
                this.loadTickets();
            });
            this.assets.url = assetURLS[0];
            this.assets.preinit();
            this.config.assetcache = path.parse(this.assets.url).base;
            this.ModLoader.config.save();
        }
    }

    @Preinit()
    preinit() {
        this.config = this.ModLoader.config.registerConfigCategory("Z64O_WorldEvents") as Z64_EventConfig;
        let c: any = {};
        for (let i = 0; i < 5; i++) {
            let l = this.getLabelByFormID(i);
            if (l !== "") {
                c[l] = "";
            }
        }
        this.ModLoader.config.setData("Z64O_WorldEvents", "costumeLoadout", c);
        this.ModLoader.config.setData("Z64O_WorldEvents", "equipmentLoadout", {});
        this.ModLoader.config.setData("Z64O_WorldEvents", "voices", []);
        this.ModLoader.config.setData("Z64O_WorldEvents", "anim_bank", "");
        this.ModLoader.config.setData("Z64O_WorldEvents", "assetcache", "");
    }

    private _getAllAssetByUUID(uuid: string): Buffer | undefined {
        let ticket = this.allRewardTickets.get(uuid)!;
        if (ticket === undefined) {
            this.ModLoader.logger.warn("Couldn't find ticket for " + uuid + ".");
            return undefined
        };
        let asset = this.assets.bundle.files.get(ticket.name)!;
        if (asset === undefined) {
            this.ModLoader.logger.warn("Couldn't find asset for " + ticket.name + ".");
            return undefined;
        }
        if (ticket.scripted) {
            return this.compressedTicketCache.get(ticket.uuid)!.DEFAULT_MODEL;
        }
        return asset;
    }

    private getAssetByUUID(uuid: string): Buffer | undefined {
        let ticket = this.rewardTicketsByUUID.get(uuid)!;
        if (ticket === undefined) {
            //this.ModLoader.logger.warn("Couldn't find ticket for " + uuid + ".");
            return undefined
        };
        let asset = this.assets.bundle.files.get(ticket.name)!;
        if (asset === undefined) {
            //this.ModLoader.logger.warn("Couldn't find asset for " + ticket.name + ".");
            return undefined;
        }
        if (ticket.scripted) {
            return this.compressedTicketCache.get(ticket.uuid)!.DEFAULT_MODEL;
        }
        return asset;
    }

    private isAssetScripted(uuid: string) {
        let ticket = this.rewardTicketsByUUID.get(uuid)!;
        if (ticket === undefined) {
            //this.ModLoader.logger.warn("Couldn't find ticket for " + uuid + ".");
            return { is: false };
        };
        let asset = this.assets.bundle.files.get(ticket.name)!;
        if (asset === undefined) {
            //this.ModLoader.logger.warn("Couldn't find asset for " + ticket.name + ".");
            return { is: false };
        }
        if (ticket.scripted === undefined) return { is: false };
        if (ticket.scripted) {
            return { is: ticket.scripted, script: this.compressedTicketCache.get(ticket.uuid)!.DEFAULT_SCRIPT };
        }
        return { is: ticket.scripted };
    }

    clearEverything_OOT() {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            bus.emit(Z64OnlineEvents.CLEAR_EQUIPMENT, {});
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.ADULT, Z64LibSupportedGames.OCARINA_OF_TIME));
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.CHILD, Z64LibSupportedGames.OCARINA_OF_TIME));
            bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, []);
            bus.emit(Z64OnlineEvents.FORCE_CUSTOM_ANIMATION_BANK, new Z64_AnimationBank("Vanilla", Buffer.alloc(1)));
        }
    }

    clearEverything_MM() {
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            bus.emit(Z64OnlineEvents.CLEAR_EQUIPMENT, {});
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.HUMAN, Z64LibSupportedGames.MAJORAS_MASK));
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.DEKU, Z64LibSupportedGames.MAJORAS_MASK));
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.GORON, Z64LibSupportedGames.MAJORAS_MASK));
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.ZORA, Z64LibSupportedGames.MAJORAS_MASK));
            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.FD, Z64LibSupportedGames.MAJORAS_MASK));
            bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, []);
            bus.emit(Z64OnlineEvents.FORCE_CUSTOM_ANIMATION_BANK, new Z64_AnimationBank("Vanilla", Buffer.alloc(1)));
        }
    }

    getLabelByFormID(id: AgeOrForm) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            switch (id) {
                case AgeOrForm.CHILD:
                    return "Child";
                case AgeOrForm.ADULT:
                    return "Adult";
            }
        } else {
            switch (id) {
                case AgeOrForm.HUMAN:
                    return "Human";
                case AgeOrForm.DEKU:
                    return "Deku";
                case AgeOrForm.GORON:
                    return "Goron";
                case AgeOrForm.ZORA:
                    return "Zora";
                case AgeOrForm.FD:
                    return "Fierce Deity";
            }
        }
        return "";
    }

    getFormIDByLabel(label: string) {
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            switch (label) {
                case "Child":
                    return AgeOrForm.CHILD;
                case "Adult":
                    return AgeOrForm.ADULT;
            }
        } else {
            switch (label) {
                case "Human":
                    return AgeOrForm.HUMAN;
                case "Deku":
                    return AgeOrForm.DEKU;
                case "Goron":
                    return AgeOrForm.GORON;
                case "Zora":
                    return AgeOrForm.ZORA;
                case "Fierce Deity":
                    return AgeOrForm.FD;
            }
        }
        return AgeOrForm.ADULT;
    }

    gameTagToID(tag: string) {
        if (tag === "OotO") return Z64LibSupportedGames.OCARINA_OF_TIME;
        if (tag === "MMO") return Z64LibSupportedGames.MAJORAS_MASK;
        return Z64_GAME;
    }

    getAdultIDByTag(tag: string) {
        if (tag === "OotO") return AgeOrForm.ADULT;
        if (tag === "MMO") return BackwardsCompat.OLD_MM_ADULT_SIZED_FLAG;
        return getAdultID();
    }

    getChildIDByTag(tag: string) {
        if (tag === "OotO") return AgeOrForm.CHILD;
        if (tag === "MMO") return AgeOrForm.HUMAN;
        return getChildID();
    }

    @onViUpdate()
    onVi() {
        try {
            if (this.ModLoader.ImGui.beginMainMenuBar()) {
                if (this.ModLoader.ImGui.beginMenu("Mods")) {
                    if (this.ModLoader.ImGui.beginMenu("Z64O")) {
                        if (this.ModLoader.ImGui.menuItem("Costume Manager")) {
                            this.rewardsWindowStatus[0] = !this.rewardsWindowStatus[0];
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMainMenuBar();
            }
            if (this.rewardsWindowStatus[0]) {
                if (this.ModLoader.ImGui.begin("Costume Manager###OotO:EventRewards", this.rewardsWindowStatus)) {
                    if (!this.allowManagerUsage) {
                        this.ModLoader.ImGui.text("Load a save to enable this feature.");
                        this.ModLoader.ImGui.end();
                        return;
                    }
                    if (isPaused(this.core)){
                        this.ModLoader.ImGui.text("Unpause to use this feature.");
                        this.ModLoader.ImGui.end();
                        return;
                    }
                    this.ModLoader.ImGui.columns(this.customSoundGroups.size > 0 ? 2 : 1);
                    this.ModLoader.ImGui.text("Costume Management");
                    if (this.ModLoader.ImGui.smallButton("Remove all costumes")) {
                        this.config.costumeLoadout = {};
                        this.config.equipmentLoadout = {};
                        this.config.voices = [];
                        this.config.anim_bank = '';
                        this.ModLoader.utils.setTimeoutFrames(() => {
                            this.clearEverything_OOT();
                            this.clearEverything_MM();
                        }, 1);
                        this.ModLoader.config.save();
                    }
                    this.rewardTicketsByEvent.forEach((event: Map<string, RewardTicket[]>, key: string) => {
                        if (this.ModLoader.ImGui.treeNode(key + "###" + key)) {
                            if (this.ModLoader.ImGui.treeNode("Adult###" + key + "Adult")) {
                                if (event.has("Adult")) {
                                    event.get("Adult")!.forEach((ticket: RewardTicket) => {
                                        let name = path.parse(ticket.name).name;
                                        if (this.ModLoader.ImGui.menuItem(name, undefined, ticket.uuid === this.config.costumeLoadout["Adult"])) {
                                            let evt = new Z64Online_ModelAllocation(this.getAssetByUUID(ticket.uuid)!, this.getAdultIDByTag(ticket.game), this.gameTagToID(ticket.game));
                                            if (this.isAssetScripted(ticket.uuid).is) {
                                                evt.script = this.isAssetScripted(ticket.uuid).script;
                                            }
                                            if (ticket.uuid === this.config.costumeLoadout["Adult"]) {
                                                this.config.costumeLoadout["Adult"] = "";
                                                evt.model = Buffer.alloc(1);
                                                evt.script = undefined;
                                            } else {
                                                this.config.costumeLoadout["Adult"] = ticket.uuid;
                                            }
                                            this.ModLoader.utils.setTimeoutFrames(() => {
                                                this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.CHANGE_MODEL_INTERNAL, evt);
                                            }, 1);
                                            this.ModLoader.config.save();
                                        }
                                    });
                                }
                                this.ModLoader.ImGui.treePop();
                            }
                            if (this.ModLoader.ImGui.treeNode("Child###" + key + "Child")) {
                                if (event.has("Child")) {
                                    event.get("Child")!.forEach((ticket: RewardTicket) => {
                                        let name = path.parse(ticket.name).name;
                                        if (this.ModLoader.ImGui.menuItem(name, undefined, ticket.uuid === this.config.costumeLoadout["Child"])) {
                                            let evt = new Z64Online_ModelAllocation(this.getAssetByUUID(ticket.uuid)!, this.getChildIDByTag(ticket.game), this.gameTagToID(ticket.game));
                                            if (this.isAssetScripted(ticket.uuid).is) {
                                                evt.script = this.isAssetScripted(ticket.uuid).script;
                                            }
                                            if (ticket.uuid === this.config.costumeLoadout["Child"]) {
                                                this.config.costumeLoadout["Child"] = "";
                                                evt.model = Buffer.alloc(1);
                                                evt.script = undefined;
                                            } else {
                                                this.config.costumeLoadout["Child"] = ticket.uuid;
                                            }
                                            this.ModLoader.utils.setTimeoutFrames(() => {
                                                this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.CHANGE_MODEL_INTERNAL, evt);
                                            }, 1);
                                            this.ModLoader.config.save();
                                        }
                                    });
                                }
                                this.ModLoader.ImGui.treePop();
                            }
                            /* if (this.ModLoader.ImGui.treeNode("Equipment###" + key + "Equipment")) {
                                if (this.rewardTicketsForEquipment.has(key)) {
                                    this.rewardTicketsForEquipment.get(key)!.forEach((value: RewardTicket[], key2: string) => {
                                        if (this.ModLoader.ImGui.treeNode(key2 + "###" + key + key2)) {
                                            value.forEach((ticket: RewardTicket) => {
                                                let name = path.parse(ticket.name).name;
                                                if (this.ModLoader.ImGui.menuItem(name, undefined, this.config.equipmentLoadout[key2] === ticket.uuid)) {
                                                    let evt = new Z64Online_EquipmentPak(key2, this.getAssetByUUID(ticket.uuid)!);
                                                    if (this.config.equipmentLoadout[key2] === ticket.uuid) {
                                                        this.config.equipmentLoadout[key2] = "";
                                                        evt.remove = true;
                                                    } else {
                                                        this.config.equipmentLoadout[key2] = ticket.uuid;
                                                    }
                                                    this.ModLoader.utils.setTimeoutFrames(() => {
                                                        bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, evt);
                                                        bus.emit(Z64OnlineEvents.REFRESH_EQUIPMENT, {});
                                                    }, 1);
                                                    this.ModLoader.config.save();
                                                }
                                            });
                                            this.ModLoader.ImGui.treePop();
                                        }
                                    });
                                }
                                this.ModLoader.ImGui.treePop();
                            } */
                            this.ModLoader.ImGui.treePop();
                        }
                    });
                    if (this.ModLoader.ImGui.treeNode("Custom###OotOCustomModels")) {
                        for (const [form, map] of this.customModelRegistry) {
                            let label = this.getLabelByFormID(form);
                            if (label === "") continue;
                            if (this.ModLoader.ImGui.treeNode(`${label}###OotOCustomModels_${label}`)) {
                                map.forEach((value: IModelReference, key: string) => {
                                    if (this.ModLoader.ImGui.menuItem(key, undefined, key === this.config.costumeLoadout[label])) {
                                        if (this.config.costumeLoadout[label] !== "" && key === this.config.costumeLoadout[label]) {
                                            let evt = new Z64Online_ModelAllocation(Buffer.alloc(1), form, Z64_GAME);
                                            this.ModLoader.utils.setTimeoutFrames(() => {
                                                bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, evt);
                                            }, 1);
                                            this.config.costumeLoadout[label] = "";
                                            this.ModLoader.config.save();
                                        } else {
                                            let evt = new Z64Online_ModelAllocation(Buffer.alloc(1), form, Z64_GAME);
                                            evt.ref = value;
                                            this.ModLoader.utils.setTimeoutFrames(() => {
                                                bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, evt);
                                            }, 1);
                                            this.config.costumeLoadout[label] = key;
                                            this.ModLoader.config.save();
                                        }
                                    }
                                });
                                this.ModLoader.ImGui.treePop();
                            }
                        }
                        if (this.ModLoader.ImGui.treeNode("Equipment###OotOCustomModels_Equipment")) {
                            this.customModelsFilesEquipment.forEach((value: Z64Online_EquipmentPak[], key: string) => {
                                if (this.ModLoader.ImGui.treeNode(key + "###" + "OotOCustomModels_Equipment_" + key)) {
                                    for (let i = 0; i < value.length; i++) {
                                        if (this.ModLoader.ImGui.menuItem(value[i].name, undefined, this.config.equipmentLoadout[key] === value[i].name)) {
                                            let evt = value[i];
                                            if (this.config.equipmentLoadout[key] === value[i].name) {
                                                this.config.equipmentLoadout[key] = "";
                                                evt.remove = true;
                                            } else {
                                                this.config.equipmentLoadout[key] = value[i].name;
                                            }
                                            this.ModLoader.utils.setTimeoutFrames(() => {
                                                bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, evt);
                                                bus.emit(Z64OnlineEvents.REFRESH_EQUIPMENT, {});
                                            }, 1);
                                            this.ModLoader.config.save();
                                        }
                                    }
                                    this.ModLoader.ImGui.treePop();
                                }
                            });
                            this.ModLoader.ImGui.treePop();
                        }
                        if (this.ModLoader.ImGui.treeNode("Animation Banks###OotOCustomAnims")) {
                            this.anims.forEach((value: Buffer, key: string) => {
                                if (this.ModLoader.ImGui.menuItem(key, undefined, key === this.config.anim_bank)) {
                                    if (key === this.config.anim_bank) {
                                        this.config.anim_bank = "";
                                        bus.emit(Z64OnlineEvents.FORCE_CUSTOM_ANIMATION_BANK, new Z64_AnimationBank("Vanilla", Buffer.alloc(1)));
                                    } else {
                                        this.config.anim_bank = key;
                                        bus.emit(Z64OnlineEvents.FORCE_CUSTOM_ANIMATION_BANK, new Z64_AnimationBank(key, value));
                                    }
                                    this.ModLoader.config.save();
                                }
                            });
                            this.ModLoader.ImGui.treePop();
                        }
                        this.ModLoader.ImGui.treePop();
                    }
                    if (this.customSoundGroups.size > 0) {
                        this.ModLoader.ImGui.nextColumn();
                        this.ModLoader.ImGui.text("Voice Management");
                        this.ModLoader.ImGui.newLine();
                        this.ModLoader.ImGui.text("Equipped");
                        if (this.config.voices.length > 0) {
                            for (let i = 0; i < this.config.voices.length; i++) {
                                this.drawSoundEntry(this.config.voices[i]);
                            }
                        } else {
                            this.ModLoader.ImGui.text("No voices equipped.");
                        }
                        this.ModLoader.ImGui.newLine();
                        this.ModLoader.ImGui.text("Available");
                        this.customSoundGroups.forEach((value: any, key: string) => {
                            if (this.config.voices.indexOf(key) === -1) {
                                this.drawSoundSelections(key);
                            }
                        });
                    }
                }
                this.ModLoader.ImGui.end();
            }
        } catch (err: any) {
            console.log(err);
        }
    }

    drawSoundEntry(id: string) {
        if (this.ModLoader.ImGui.arrowButton(`Z64O::Sound::UP::${id}`, Dir.Up)) this.handleSoundArrow(id, Dir.Up);
        this.ModLoader.ImGui.sameLine();
        if (this.ModLoader.ImGui.arrowButton(`Z64O::Sound::DOWN::${id}`, Dir.Down)) this.handleSoundArrow(id, Dir.Down);
        this.ModLoader.ImGui.sameLine();
        if (this.ModLoader.ImGui.smallButton(`X###Z64O::Sound::X::${id}`)) {
            if (this.config.voices.indexOf(id) > -1) {
                this.config.voices.splice(this.config.voices.indexOf(id), 1);
                bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, this.config.voices);
                this.ModLoader.config.save();
            }
        }
        this.ModLoader.ImGui.sameLine();
        this.ModLoader.ImGui.text(id);
    }

    handleSoundArrow(id: string, dir: Dir) {
        let index = this.config.voices.indexOf(id);
        // Can't go up if we're at the top.
        if (index === 0 && dir === Dir.Up) {
            return;
        }
        // Can't go down if we're at the bottom.
        if (index === (this.config.voices.length - 1) && dir === Dir.Down) {
            return;
        }
        let c: number = 1;
        if (dir === Dir.Up) c /= -1;
        c += index;
        let itemAtIndex = this.config.voices[c];
        this.config.voices[c] = id;
        this.config.voices[index] = itemAtIndex;
        bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, this.config.voices);
        this.ModLoader.config.save();
    }

    drawSoundSelections(id: string) {
        if (this.ModLoader.ImGui.smallButton(`${id}###Z64O::Sound::ENABLE::${id}`)) {
            this.config.voices.push(id);
            bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, this.config.voices);
            this.ModLoader.config.save();
        }
    }

    @EventHandler(Z64.Z64Events.ON_SAVE_LOADED)
    onPost() {
        this.ModLoader.utils.setTimeoutFrames(() => {
            Object.keys(this.config.costumeLoadout).forEach((key: string) => {
                let value = this.config.costumeLoadout[key];
                if (value !== "" && this.allRewardTickets.has(value)) {
                    let ticket = this.allRewardTickets.get(value)!;
                    let c = this.getAssetByUUID(ticket.uuid)!;
                    let id = this.getFormIDByLabel(key);
                    if (id !== undefined) {
                        let evt = new Z64Online_ModelAllocation(c, id, this.gameTagToID(ticket.game));
                        if (this.isAssetScripted(value).is) {
                            evt.script = this.isAssetScripted(value).script;
                        }
                        this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.CHANGE_MODEL_INTERNAL, evt);
                    }
                } else {
                    // Probably a custom costume.
                    let id = this.getFormIDByLabel(key);
                    if (id !== undefined) {
                        if (this.customModelRegistry.has(id)) {
                            if (this.customModelRegistry.get(id)!.has(value)) {
                                let evt = new Z64Online_ModelAllocation(Buffer.alloc(1), id, Z64_GAME);
                                evt.ref = this.customModelRegistry.get(id)!.get(value)!;
                                bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, evt);
                            }
                        }
                    }
                }
            });
            if (this.config.voices.length > 0) {
                bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, this.config.voices);
            }
            if (this.config.anim_bank !== "") {
                if (this.anims.has(this.config.anim_bank)) {
                    bus.emit(Z64OnlineEvents.FORCE_CUSTOM_ANIMATION_BANK, new Z64_AnimationBank(this.config.anim_bank, this.anims.get(this.config.anim_bank)!));
                }
            }
            let keys = Object.keys(this.config.equipmentLoadout);
            if (keys.length > 0) {
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    let value = this.config.equipmentLoadout[key];
                    if (value === '') continue;
                    let c = this.getAssetByUUID(value);
                    if (c !== undefined) {
                        /* bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, new Z64Online_EquipmentPak(key, c));
                        bus.emit(Z64OnlineEvents.REFRESH_EQUIPMENT, {}); */
                    } else {
                        // Probably custom gear.
                        if (this.customModelsFilesEquipment.has(key)) {
                            let item = this.customModelsFilesEquipment.get(key)!.find(i => { return i.name === value });
                            if (item !== undefined) {
                                bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, item);
                                bus.emit(Z64OnlineEvents.REFRESH_EQUIPMENT, {});
                            }
                        }
                    }
                }
            }
            this.allowManagerUsage = true;
        }, Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK ? 100 : 1);
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.ASSET_LOOKUP)
    assetLookup(evt: OOTO_PRIVATE_ASSET_LOOKUP_OBJ) {
        let asset = this._getAllAssetByUUID(evt.uuid)!;
        evt.asset = this.ModLoader.utils.cloneBuffer(asset);
        evt.ticket = this.allRewardTickets.get(evt.uuid)!;
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CLIENT_WALLET_GET)
    coinLookup(evt: OOTO_PRIVATE_COIN_LOOKUP_OBJ) {
        evt.coins = this.rewardContainer.coins;
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CLIENT_WALLET_SET)
    coinChange(evt: OOTO_PRIVATE_COIN_LOOKUP_OBJ) {
        this.rewardContainer.coins += evt.coins;
        this.transactionProcess();
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CLIENT_UNLOCK_DOES_HAVE)
    onCheck(evt: OOTO_PRIVATE_ASSET_HAS_CHECK) {
        evt.has = this.rewardContainer.tickets.find(t => { return t.uuid === evt.ticket.uuid }) !== undefined;
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CLIENT_UNLOCK_TICKET)
    onUnlock(ticket: RewardTicket) {
        if (this.allRewardTickets.has(ticket.uuid)) {
            this.rewardContainer.tickets.push(this.allRewardTickets.get(ticket.uuid)!);
            this.transactionProcess();
        }
    }

    transactionProcess() {
        let obj: any = { tickets: this.rewardContainer.tickets, coins: this.rewardContainer.coins };
        let hash: string = this.ModLoader.utils.hashBuffer(Buffer.from(JSON.stringify(obj)));
        this.rewardContainer.sig = Buffer.from(hash);
        new StorageContainer("Z64O_Reward_Tickets").storeObject(this.rewardContainer);
        this.loadTickets();
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.SAVE_EXTERNAL_EVENT_DATA)
    onSaveEvent(evt: ExternalEventData) {
        this.rewardContainer.externalData[evt.tag] = evt.data;
        new StorageContainer("Z64O_Reward_Tickets").storeObject(this.rewardContainer);
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.GET_EXTERNAL_EVENT_DATA)
    onLoadEvent(evt: ExternalEventData) {
        if (this.rewardContainer.externalData.hasOwnProperty(evt.tag)) {
            evt.data = this.rewardContainer.externalData[evt.tag];
        }
    }
}

export class WorldEventsServer {
}

export class WorldEvents {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    @SidedProxy(ProxySide.CLIENT, WorldEventRewards)
    rewards!: WorldEventRewards;
    @SidedProxy(ProxySide.SERVER, WorldEventsServer)
    rewardsServer!: WorldEventsServer;
    eventStack: Map<string, EventController> = new Map<string, EventController>();
    alreadyProcessedEvents: boolean = false;

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CLIENT_EVENT_DATA_GET)
    onEventData(eventURLs: Array<string>) {
        this.loadEvents(eventURLs);
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.SERVER_EVENT_DATA_GET)
    onEventDataServer(eventURLs: Array<string>) {
        this.loadEvents(eventURLs);
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.SERVER_ASSET_DATA_GET)
    onAssetDataServer(assetURLs: Array<string>) {
    }

    private loadEvents(eventURLs: Array<string>) {
        if (this.alreadyProcessedEvents) return;
        for (let i = 0; i < eventURLs.length; i++) {
            if (this.eventStack.has(eventURLs[i])) continue;
            let test = new EventController(this.ModLoader, this.core);
            test.url = eventURLs[i];
            test.preinit();
            this.eventStack.set(eventURLs[i], test);
        }
        this.alreadyProcessedEvents = true;
    }
}