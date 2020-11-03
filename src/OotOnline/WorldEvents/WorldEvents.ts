import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { Age, IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { Halloween, Halloween_Server } from './Halloween/Halloween';
import { DateProxy } from 'modloader64_api/SidedProxy/DateProxy';
import { ProxySide, SidedProxy } from 'modloader64_api/SidedProxy/SidedProxy';
import { onViUpdate, Preinit } from 'modloader64_api/PluginLifecycle';
import { StorageContainer } from 'modloader64_api/Storage';
import { Cryptr } from './Cryptr';
import os from 'os';
import { bus, EventHandler } from 'modloader64_api/EventHandler';
import { OotOnlineEvents } from '@OotOnline/OotoAPI/OotoAPI';
import { bool_ref } from 'modloader64_api/Sylvain/ImGui';
import fs from 'fs';

export interface IWorldEvent {
}

const HALLOWEEN_START: Date = new Date(new Date().getFullYear(), 9, 27);
const HALLOWEEN_END: Date = new Date(new Date().getFullYear(), 10, 3);

export class RewardContainer {
    adult: any = {};
    child: any = {};
}

export interface OotO_EventConfig {
    adultCostume: string;
    childCostume: string;
}

export const enum OotO_RewardEvents {
    UNLOCK_PLAYAS = "OotO:WorldEvent_UnlockPlayas",
    CHECK_REWARD = "OotO:WorldEvent_CheckReward"
}

export interface OotO_EventReward {
    name: string;
    age: Age;
    data: Buffer;
    checked?: boolean;
}

export class WorldEventRewards {
    config!: OotO_EventConfig;
    rewards: RewardContainer = new RewardContainer();
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    rewardsWindowStatus: bool_ref = [false];

    @EventHandler(OotO_RewardEvents.UNLOCK_PLAYAS)
    onUnlock(reward: OotO_EventReward) {
        switch (reward.age) {
            case Age.CHILD:
                this.rewards.child[reward.name] = reward.data;
                break;
            case Age.ADULT:
                this.rewards.adult[reward.name] = reward.data;
                break;
        }
        let n = "holiday_event_rewards_v2"
        let sc = new StorageContainer("holiday_event_rewards_v2");
        sc.storeObject(new Cryptr(n).encrypt(JSON.stringify(this.rewards)));
    }

    @EventHandler(OotO_RewardEvents.CHECK_REWARD)
    onCheck(reward: OotO_EventReward) {
        switch (reward.age) {
            case Age.CHILD:
                reward.checked = this.rewards.child.hasOwnProperty(reward.name);
                break;
            case Age.ADULT:
                reward.checked = this.rewards.adult.hasOwnProperty(reward.name);
                break;
        }
    }

    private migrateRewardsFile1(){
        if (fs.existsSync("./storage/holiday_event_rewards.pak")){
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

    @Preinit()
    preinit() {
        this.migrateRewardsFile1();
        this.config = this.ModLoader.config.registerConfigCategory("OotO_WorldEvents") as OotO_EventConfig;
        this.ModLoader.config.setData("OotO_WorldEvents", "adultCostume", "");
        this.ModLoader.config.setData("OotO_WorldEvents", "childCostume", "");
        try {
            let sc = new StorageContainer("holiday_event_rewards_v2");
            let str = sc.loadObject();
            let n = "holiday_event_rewards_v2";
            let d = new Cryptr(n).decrypt(str);
            this.rewards = JSON.parse(d);
        } catch (err) {
        }
        if (this.config.adultCostume !== "") {
            bus.emit(OotOnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT, this.rewards.adult[this.config.adultCostume]);
        }
        if (this.config.childCostume !== "") {
            bus.emit(OotOnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD, this.rewards.child[this.config.childCostume]);
        }
    }

    @onViUpdate()
    onVi() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")) {
                    if (this.ModLoader.ImGui.menuItem("View rewards")) {
                        this.rewardsWindowStatus[0] = !this.rewardsWindowStatus[0];
                    }
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
        if (this.rewardsWindowStatus[0]) {
            if (this.ModLoader.ImGui.begin("Rewards Inventory###OotO:EventRewards")) {
                this.ModLoader.ImGui.text("Changing costumes requires a game restart.");
                if (this.ModLoader.ImGui.smallButton("Remove costumes")){
                    this.config.adultCostume = "";
                    this.config.childCostume = "";
                    this.ModLoader.config.save();
                }
                this.ModLoader.ImGui.columns(2);
                this.ModLoader.ImGui.text("Adult Costumes");
                Object.keys(this.rewards.adult).forEach((key: string) => {
                    this.ModLoader.ImGui.text(key);
                    this.ModLoader.ImGui.sameLine();
                    if (this.ModLoader.ImGui.smallButton("Equip###OotO:HalloweenRewardsEquip" + key)) {
                        this.config.adultCostume = key;
                        this.ModLoader.config.save();
                    }
                });
                this.ModLoader.ImGui.nextColumn();
                this.ModLoader.ImGui.text("Child Costumes");
                Object.keys(this.rewards.child).forEach((key: string) => {
                    this.ModLoader.ImGui.text(key);
                    this.ModLoader.ImGui.sameLine();
                    if (this.ModLoader.ImGui.smallButton("Equip###OotO:HalloweenRewardsEquip" + key)) {
                        this.config.childCostume = key;
                        this.ModLoader.config.save();
                    }
                });
            }
            this.ModLoader.ImGui.end();
        }
    }
}

export class WorldEvents {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    @SidedProxy(ProxySide.CLIENT, WorldEventRewards)
    rewards!: WorldEventRewards;
    //@DateProxy(ProxySide.CLIENT, HALLOWEEN_START, HALLOWEEN_END, Halloween)
    halloween!: Halloween;
    //@DateProxy(ProxySide.SERVER, HALLOWEEN_START, HALLOWEEN_END, Halloween_Server)
    halloweenServer!: Halloween_Server;
}