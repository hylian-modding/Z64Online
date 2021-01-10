import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { Age, IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { ProxySide, SidedProxy } from 'modloader64_api/SidedProxy/SidedProxy';
import { onViUpdate, Postinit, Preinit } from 'modloader64_api/PluginLifecycle';
import { StorageContainer } from 'modloader64_api/Storage';
import { Cryptr } from './Cryptr';
import os from 'os';
import { bus, EventHandler } from 'modloader64_api/EventHandler';
import { Z64OnlineEvents, Z64Online_EquipmentPak, Z64Online_ModelAllocation } from '@OotOnline/Z64API/OotoAPI';
import { bool_ref } from 'modloader64_api/Sylvain/ImGui';
import fs from 'fs';
import { CostumeHelper } from './CostumeHelper';
import { Z64_EventConfig } from './Z64_EventConfig';
import { MLPatchLib } from './ML64PatchLib';
import { trimBuffer } from 'Z64Lib/API/Z64RomTools';

export interface IWorldEvent {
}

export class RewardContainer {
    events: any = {};
    patches: any = {};

    findRewardByKey(key: string): Buffer | undefined {
        let eventKeys = Object.keys(this.events);
        for (let i = 0; i < eventKeys.length; i++) {
            let event = this.events[eventKeys[i]];
            let categoryKeys = Object.keys(event);
            for (let j = 0; j < categoryKeys.length; j++) {
                let items = event[categoryKeys[j]].items;
                let itemKeys = Object.keys(items);
                for (let k = 0; k < itemKeys.length; k++) {
                    if (itemKeys[k] === key) {
                        if (this.patches.hasOwnProperty(itemKeys[k])) {
                            let pp = new MLPatchLib();
                            return trimBuffer(pp.apply(items[itemKeys[k]], this.patches[itemKeys[k]]));
                        } else {
                            return items[itemKeys[k]];
                        }
                    }
                }
            }
        }
        return undefined;
    }

    findEquipmentRewardByKey(key: string): Buffer | undefined {
        let eventKeys = Object.keys(this.events);
        for (let i = 0; i < eventKeys.length; i++) {
            let event = this.events[eventKeys[i]];
            let categoryKeys = ["Equipment"];
            let eqTypes = event[categoryKeys[0]].items;
            let eqTypeKeys = Object.keys(eqTypes);
            for (let j = 0; j < eqTypeKeys.length; j++) {
                let eqItems = eqTypes[eqTypeKeys[j]];
                let eqKeys = Object.keys(eqItems);
                for (let k = 0; k < eqKeys.length; k++) {
                    if (eqKeys[k] === key) {
                        if (this.patches.hasOwnProperty(eqKeys[k])) {
                            let pp = new MLPatchLib();
                            return trimBuffer(pp.apply(eqItems[eqKeys[k]], this.patches[eqKeys[k]]));
                        } else {
                            return eqItems[eqKeys[k]];
                        }
                    }
                }
            }
        }
        return undefined;
    }

    fromData(data: any) {
        let clone: string[] = JSON.parse(JSON.stringify(Object.keys(this.events)));
        this.events = data.events;
        for (let i = 0; i < clone.length; i++) {
            this.createEvent(clone[i]);
        }
        if (data.hasOwnProperty("patches")) {
            this.patches = data.patches;
        }
        return this;
    }

    createEvent(event: string) {
        if (!this.events.hasOwnProperty(event)) {
            this.events[event] = {};
        }
        if (!this.events[event].hasOwnProperty("Adult")) {
            this.events[event]["Adult"] = new RewardTypeContainer();
        }
        if (!this.events[event].hasOwnProperty("Child")) {
            this.events[event]["Child"] = new RewardTypeContainer();
        }
        if (!this.events[event].hasOwnProperty("Equipment")) {
            this.events[event]["Equipment"] = new RewardTypeContainer();
        }
    }
}

export class RewardItem {
    data: Buffer;
    uuid: string;

    constructor(uuid: string, data: Buffer) {
        this.data = data;
        this.uuid = uuid;
    }
}

export class RewardTypeContainer {
    items: any = {};
}

export class RewardContainerOld {
    adult: any = {};
    child: any = {};
}

export const enum Z64_RewardEvents {
    UNLOCK_PLAYAS = "Z64:WorldEvent_UnlockPlayas",
    CHECK_REWARD = "Z64:WorldEvent_CheckReward",
    APPLY_REWARD_PATCH = "Z64:WorldEvent_ApplyRewardPatch"
}

export interface Z64_EventReward {
    name: string;
    age: Age;
    equipmentCategory?: string;
    data: Buffer;
    event: string;
    checked?: boolean;
}

export class WorldEventRewards {
    config!: Z64_EventConfig;
    rewards: RewardContainer = new RewardContainer();
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    rewardsWindowStatus: bool_ref = [false];
    customModelFilesAdult: Map<string, Buffer> = new Map<string, Buffer>();
    customModelFilesChild: Map<string, Buffer> = new Map<string, Buffer>();
    customModelsFilesEquipment: Map<string, Z64Online_EquipmentPak[]> = new Map<string, Z64Online_EquipmentPak[]>();
    customSoundGroups: Map<string, any> = new Map<string, any>();

    constructor() {
        this.rewards.createEvent("Halloween 2020");
        this.rewards.createEvent("Christmas 2020");
    }

    @EventHandler(Z64OnlineEvents.POST_LOADED_MODELS_LIST)
    onModelPost(evt: any) {
        this.customModelFilesAdult = evt.adult;
        this.customModelFilesChild = evt.child;
        let eqMap: Map<string, Buffer> = evt.equipment;
        eqMap.forEach((value: Buffer) => {
            let name = CostumeHelper.getCostumeName(value);
            let cat = CostumeHelper.getEquipmentCategory(value);
            if (!this.customModelsFilesEquipment.has(cat)) {
                this.customModelsFilesEquipment.set(cat, []);
            }
            this.customModelsFilesEquipment.get(cat)!.push(new Z64Online_EquipmentPak(name, value));
        });
    }

    @EventHandler(Z64OnlineEvents.POST_LOADED_SOUND_LIST)
    onSoundPost(paks: Map<string, any>){
        this.customSoundGroups = paks;
        // I don't understand how something with a key of undefined keeps ending up in here.
        //@ts-ignore
        this.customSoundGroups.delete(undefined);
    }

    @EventHandler(Z64_RewardEvents.UNLOCK_PLAYAS)
    onUnlock(reward: Z64_EventReward) {
        try {
            switch (reward.age) {
                case Age.CHILD:
                    this.rewards.events[reward.event].Child.items[reward.name] = reward.data;
                    break;
                case Age.ADULT:
                    this.rewards.events[reward.event].Adult.items[reward.name] = reward.data;
                    break;
                case 0x69:
                    if (!this.rewards.events[reward.event].Equipment.items.hasOwnProperty(reward.equipmentCategory!)) {
                        this.rewards.events[reward.event].Equipment.items[reward.equipmentCategory!] = {};
                    }
                    this.rewards.events[reward.event].Equipment.items[reward.equipmentCategory!][reward.name] = reward.data;
                    break;
            }
            let sc = new StorageContainer("holiday_event_rewards_v3");
            sc.storeObject(this.rewards);
        } catch (err) {
            console.log(err.stack);
        }
    }

    @EventHandler(Z64_RewardEvents.CHECK_REWARD)
    onCheck(reward: Z64_EventReward) {
        switch (reward.age) {
            case Age.CHILD:
                reward.checked = this.rewards.events[reward.event].Child.items.hasOwnProperty(reward.name);
                break;
            case Age.ADULT:
                reward.checked = this.rewards.events[reward.event].Adult.items.hasOwnProperty(reward.name);
                break;
            case 0x69:
                if (!this.rewards.events[reward.event].Equipment.items.hasOwnProperty(reward.equipmentCategory!)) {
                    this.rewards.events[reward.event].Equipment.items[reward.equipmentCategory!] = {};
                }
                reward.checked = this.rewards.events[reward.event].Equipment.items[reward.equipmentCategory!].hasOwnProperty(reward.name);
                break;
        }
    }

    @EventHandler(Z64_RewardEvents.APPLY_REWARD_PATCH)
    onApplyPatch(patch: any) {
        this.rewards.patches[patch.name] = patch.data;
        let sc = new StorageContainer("holiday_event_rewards_v3");
        sc.storeObject(this.rewards);
    }

    private migrateRewardsFile1() {
        if (fs.existsSync("./storage/holiday_event_rewards.pak")) {
            this.ModLoader.logger.debug("Migrating event rewards...");
            let sc = new StorageContainer("holiday_event_rewards");
            let str = sc.loadObject();
            let n = os.userInfo().username + '@' + os.hostname();
            let d = new Cryptr(n).decrypt(str);
            this.rewards = JSON.parse(d);
            sc = new StorageContainer("holiday_event_rewards_v2");
            sc.storeObject(new Cryptr("holiday_event_rewards_v2").encrypt(JSON.stringify(this.rewards)));
            fs.unlinkSync("./storage/holiday_event_rewards.pak");
        }
    }

    private migrateRewardsFile2() {
        if (fs.existsSync("./storage/holiday_event_rewards_v2.pak")) {
            this.ModLoader.logger.debug("Migrating event rewards...");
            let sc = new StorageContainer("holiday_event_rewards_v2");
            let str = sc.loadObject();
            let d = new Cryptr("holiday_event_rewards_v2").decrypt(str);
            let rewards_old: RewardContainerOld = JSON.parse(d);
            let event = "Halloween 2020";
            this.rewards.events[event] = {};
            this.rewards.events[event]["Adult"] = new RewardTypeContainer();
            this.rewards.events[event]["Child"] = new RewardTypeContainer();
            Object.keys(rewards_old.child).forEach((key: string) => {
                this.rewards.events[event]["Child"].items[key] = rewards_old.child[key];
            });
            Object.keys(rewards_old.adult).forEach((key: string) => {
                this.rewards.events[event]["Adult"].items[key] = rewards_old.adult[key];
            });
            sc = new StorageContainer("holiday_event_rewards_v3");

            sc.storeObject(this.rewards);
            fs.unlinkSync("./storage/holiday_event_rewards_v2.pak");
        }
    }

    @Preinit()
    preinit() {
        this.migrateRewardsFile1();
        this.migrateRewardsFile2();
        this.config = this.ModLoader.config.registerConfigCategory("OotO_WorldEvents") as Z64_EventConfig;
        this.ModLoader.config.setData("OotO_WorldEvents", "adultCostume", "");
        this.ModLoader.config.setData("OotO_WorldEvents", "childCostume", "");
        this.ModLoader.config.setData("OotO_WorldEvents", "equipmentLoadout", {});
        this.ModLoader.config.setData("OotO_WorldEvents", "voice", "");
        try {
            let sc = new StorageContainer("holiday_event_rewards_v3");
            let d = sc.loadObject();
            this.rewards = this.rewards.fromData(d);
        } catch (err) {
        }
        if (this.config.adultCostume !== "") {
            let c = this.rewards.findRewardByKey(this.config.adultCostume);
            if (c !== undefined) {
                bus.emit(Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT, c);
            }
        }
        if (this.config.childCostume !== "") {
            let c = this.rewards.findRewardByKey(this.config.childCostume);
            if (c !== undefined) {
                bus.emit(Z64OnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD, c);
            }
        }
        if (this.config.voice !== ""){
            // TODO
        }
        let keys = Object.keys(this.config.equipmentLoadout);
        if (keys.length > 0) {
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let value = this.config.equipmentLoadout[key];
                let c = this.rewards.findEquipmentRewardByKey(value);
                if (c !== undefined) {
                    bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, new Z64Online_EquipmentPak(key, c));
                }
            }
        }
    }

    @onViUpdate()
    onVi() {
        try {
            if (this.ModLoader.ImGui.beginMainMenuBar()) {
                if (this.ModLoader.ImGui.beginMenu("Mods")) {
                    if (this.ModLoader.ImGui.beginMenu("OotO")) {
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
                    if (this.ModLoader.ImGui.smallButton("Remove costumes")) {
                        this.config.adultCostume = "";
                        this.config.childCostume = "";
                        this.config.equipmentLoadout = {};
                        this.config.voice = "";
                        this.ModLoader.utils.setTimeoutFrames(() => {
                            bus.emit(Z64OnlineEvents.CLEAR_EQUIPMENT, {});
                            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, new Z64Online_ModelAllocation(Buffer.alloc(1), Age.ADULT));
                            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, new Z64Online_ModelAllocation(Buffer.alloc(1), Age.CHILD));
                            bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, undefined);
                        }, 1);
                        this.ModLoader.config.save();
                    }
                    this.ModLoader.ImGui.text("First costume change requires a game restart");
                    Object.keys(this.rewards.events).forEach((event: string) => {
                        let eventObj = this.rewards.events[event];
                        if (this.ModLoader.ImGui.treeNode(event + "###" + event)) {
                            if (this.ModLoader.ImGui.treeNode("Adult###" + event + "Adult")) {
                                Object.keys(eventObj.Adult.items).forEach((key: string) => {
                                    if (this.ModLoader.ImGui.menuItem(key, undefined, key === this.config.adultCostume)) {
                                        this.config.adultCostume = key;
                                        this.ModLoader.utils.setTimeoutFrames(() => {
                                            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, new Z64Online_ModelAllocation(this.ModLoader.utils.cloneBuffer(this.rewards.findRewardByKey(key)!), Age.ADULT));
                                        }, 1);
                                        this.ModLoader.config.save();
                                    }
                                });
                                this.ModLoader.ImGui.treePop();
                            }
                            if (this.ModLoader.ImGui.treeNode("Child###" + event + "Child")) {
                                Object.keys(eventObj.Child.items).forEach((key: string) => {
                                    if (this.ModLoader.ImGui.menuItem(key, undefined, key === this.config.childCostume)) {
                                        this.config.childCostume = key;
                                        this.ModLoader.utils.setTimeoutFrames(() => {
                                            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, new Z64Online_ModelAllocation(this.ModLoader.utils.cloneBuffer(this.rewards.findRewardByKey(key)!), Age.CHILD));
                                        }, 1);
                                        this.ModLoader.config.save();
                                    }
                                });
                                this.ModLoader.ImGui.treePop();
                            }
                            if (this.ModLoader.ImGui.treeNode("Equipment###" + event + "Equipment")) {
                                Object.keys(eventObj.Equipment.items).forEach((key: string) => {
                                    if (this.ModLoader.ImGui.treeNode(key + "###" + event + key)) {
                                        Object.keys(eventObj.Equipment.items[key]).forEach((key2: string) => {
                                            if (this.ModLoader.ImGui.menuItem(key2, undefined, this.config.equipmentLoadout[key] === key2)) {
                                                this.config.equipmentLoadout[key] = key2;
                                                this.ModLoader.utils.setTimeoutFrames(() => {
                                                    bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, new Z64Online_EquipmentPak(key, this.rewards.findEquipmentRewardByKey(key2)!));
                                                    bus.emit(Z64OnlineEvents.REFRESH_EQUIPMENT, {});
                                                }, 1);
                                                this.ModLoader.config.save();
                                            }
                                        });
                                        this.ModLoader.ImGui.treePop();
                                    }
                                });
                                this.ModLoader.ImGui.treePop();
                            }
                            this.ModLoader.ImGui.treePop();
                        }
                    });
                    if (this.customModelFilesAdult.size > 0 || this.customModelFilesChild.size > 0 || this.customModelsFilesEquipment.size > 0 || this.customSoundGroups.size > 0) {
                        if (this.ModLoader.ImGui.treeNode("Custom###OotOCustomModels")) {
                            if (this.ModLoader.ImGui.treeNode("Adult###OotOCustomModels_Adult")) {
                                this.customModelFilesAdult.forEach((value: Buffer, key: string) => {
                                    if (this.ModLoader.ImGui.menuItem(key, undefined, key === this.config.adultCostume)) {
                                        this.config.adultCostume = key;
                                        this.ModLoader.utils.setTimeoutFrames(() => {
                                            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_ADULT_GAMEPLAY, new Z64Online_ModelAllocation(this.ModLoader.utils.cloneBuffer(value), Age.ADULT));
                                        }, 1);
                                        this.ModLoader.config.save();
                                    }
                                });
                                this.ModLoader.ImGui.treePop();
                            }
                            if (this.ModLoader.ImGui.treeNode("Child###OotOCustomModels_Child")) {
                                this.customModelFilesChild.forEach((value: Buffer, key: string) => {
                                    if (this.ModLoader.ImGui.menuItem(key, undefined, key === this.config.adultCostume)) {
                                        this.config.childCostume = key;
                                        this.ModLoader.utils.setTimeoutFrames(() => {
                                            bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL_CHILD_GAMEPLAY, new Z64Online_ModelAllocation(this.ModLoader.utils.cloneBuffer(value), Age.CHILD));
                                        }, 1);
                                        this.ModLoader.config.save();
                                    }
                                });
                                this.ModLoader.ImGui.treePop();
                            }
                            if (this.ModLoader.ImGui.treeNode("Equipment###OotOCustomModels_Equipment")) {
                                this.customModelsFilesEquipment.forEach((value: Z64Online_EquipmentPak[], key: string) => {
                                    if (this.ModLoader.ImGui.treeNode(key + "###" + "OotOCustomModels_Equipment_" + key)) {
                                        for (let i = 0; i < value.length; i++) {
                                            if (this.ModLoader.ImGui.menuItem(value[i].name, undefined, this.config.equipmentLoadout[key] === value[i].name)) {
                                                this.config.equipmentLoadout[key] = value[i].name;
                                                this.ModLoader.utils.setTimeoutFrames(() => {
                                                    bus.emit(Z64OnlineEvents.LOAD_EQUIPMENT_BUFFER, new Z64Online_EquipmentPak(key, value[i].data));
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
                            if (this.ModLoader.ImGui.treeNode("Voice###OotOCustomVoice")){
                                this.customSoundGroups.forEach((value: any, key: string)=>{
                                    if (this.ModLoader.ImGui.menuItem(key, undefined, key === this.config.voice)) {
                                        this.config.voice = key;
                                        bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, key);
                                        this.ModLoader.config.save();
                                    }
                                });
                                this.ModLoader.ImGui.treePop();
                            }
                            this.ModLoader.ImGui.treePop();
                        }
                    }
                }
                this.ModLoader.ImGui.end();
            }
        } catch (err) {
            console.log(err);
        }
    }

    @Postinit()
    onPost() {
    }
}

export class WorldEvents {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    @SidedProxy(ProxySide.CLIENT, WorldEventRewards)
    rewards!: WorldEventRewards;
}