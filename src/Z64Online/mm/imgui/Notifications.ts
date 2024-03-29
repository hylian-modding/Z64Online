import { Z64OnlineEvents, Z64_SaveDataItemSet } from "@Z64Online/common/api/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler, EventsClient, PrivateEventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Command } from "Z64Lib/API/Common/ICommandBuffer";
import { SongNotes, SongFlags } from "Z64Lib/API/Common/Z64API"
import { onViUpdate, Postinit } from "modloader64_api/PluginLifecycle";
import { FlipFlags, Font, Texture } from "modloader64_api/Sylvain/Gfx";
import { rgba, xy, xywh } from "modloader64_api/Sylvain/vec";
import fs from 'fs';
import path from 'path';
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { MMOnlineConfigCategory } from "@Z64Online/mm/MMOnline";
import { Z64O_PRIVATE_EVENTS } from "@Z64Online/common/api/InternalAPI";
import { IMMOClientside } from "@Z64Online/mm/save/IMMOClientside";
import { SpriteMap } from "./SpriteMap";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";

class Notif {
    msg: string;
    icon: Texture;
    timer: number = 0;
    max: number;
    noSound: boolean = false;

    constructor(msg: string, icon: Texture, max: number, noSound?: boolean) {
        this.msg = msg;
        this.icon = icon;
        this.max = max;
        if (noSound !== undefined) this.noSound = noSound;
    }
}

//class ScarecrowNotif extends Notif {
//    notes: string[];
//
//    constructor(msg: string, icon: Texture, notes: string[], max: number, noSound?: boolean) {
//        super(msg, icon, max, noSound);
//        this.notes = notes;
//    }
//}

export class Notifications {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    @ParentReference()
    parent!: IMMOClientside;
    //---
    messages: Array<Notif> = [];
    curMessage: Notif | undefined;
    MAX_TIMER: number = 500;
    resourcesLoaded: boolean = false;
    itemIcons: Map<string, Texture> = new Map<string, Texture>();
    boop: number = 0x4831;
    config!: MMOnlineConfigCategory;
    lockIncomingItems: boolean = false;
    //---
    CIRCLE_TIMER_MAX: number = 10;
    circleAssets: Map<string, Texture> = new Map<string, Texture>();

    @EventHandler(Z64OnlineEvents.SAVE_DATA_ITEM_SET)
    onSaveDataToggle(evt: Z64_SaveDataItemSet) {


    }

    @EventHandler(EventsClient.ON_PLAYER_JOIN)
    onJoin(player: INetworkPlayer) {
        if (!this.resourcesLoaded) return;
        this.messages.push(new Notif(player.nickname + " connected!", this.itemIcons.get("tatl")!, this.MAX_TIMER));
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onLeave(player: INetworkPlayer) {
        if (!this.resourcesLoaded) return;
        this.messages.push(new Notif(player.nickname + " disconnected!", this.itemIcons.get("tatl")!, this.MAX_TIMER));
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.DOING_SYNC_CHECK)
    onSync(evt: any) {
        this.circleAssets.forEach((asset: Texture, key: string) => {
            this.messages.push(new Notif("", asset, this.CIRCLE_TIMER_MAX, true));
        });
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.LOCK_ITEM_NOTIFICATIONS)
    onLock(evt: any) {
        this.lockIncomingItems = true;
        this.ModLoader.utils.setTimeoutFrames(() => {
            this.lockIncomingItems = false;
        }, 20);
    }

    @Postinit()
    onPost() {
        this.config = this.ModLoader.config.registerConfigCategory("MMOnline") as MMOnlineConfigCategory;
    }

    @onViUpdate()
    onVi() {
        if (!this.resourcesLoaded) {
            let base: string = path.resolve(__dirname, "..", "sprites");
            fs.readdirSync(base).forEach((file: string) => {
                let p = path.resolve(base, file);
                let t: Texture = this.ModLoader.Gfx.createTexture();
                t.loadFromFile(p);
                this.itemIcons.set(path.parse(file).name, t);
            });
            base = path.resolve(global["module-alias"]["moduleAliases"]["@Z64Online"], "common", "assets", "circle");
            fs.readdirSync(base).forEach((file: string) => {
                let p = path.resolve(base, file);
                let t: Texture = this.ModLoader.Gfx.createTexture();
                t.loadFromFile(p);
                this.circleAssets.set(path.parse(file).name, t);
            });
            let mem = this.ModLoader.Gfx.createTexture();
            mem.loadFromFile(path.resolve(global["module-alias"]["moduleAliases"]["@Z64Online"], "common", "assets", "mempak.png"));
            this.itemIcons.set("mempak", mem);
            this.resourcesLoaded = true;
        }
        if (!this.config.notifications) {
            if (this.messages.length > 0) {
                while (this.messages.length > 0) {
                    this.messages.shift();
                }
            }
            return;
        }
        if (this.curMessage !== undefined) {
            try {
                this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getBackgroundDrawList(), this.curMessage.icon, xywh(0, 0, this.curMessage.icon.width, this.curMessage.icon.height), xywh(0, 0, 32, 32), rgba(0xFF, 0xFF, 0xFF, 0xFF), FlipFlags.None);
                this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), global.ModLoader["FONT"], this.curMessage.msg, xy(34, 0), rgba(0xFF, 0xFF, 0xFF, 0xFF), rgba(0, 0, 0, 0xFF), xy(1, 1));
            } catch (err: any) {
                console.log(this.curMessage);
            }
            this.curMessage.timer++;
            if (this.curMessage.timer > this.curMessage.max) {
                this.curMessage = undefined;
            }
        } else {
            if (this.messages.length > 0) {
                this.curMessage = this.messages.shift()!;
                if (!this.curMessage.noSound && this.config.notificationSound) {
                    this.ModLoader.utils.setTimeoutFrames(() => {
                        //this.core.commandBuffer.runCommand(Command.PLAY_SOUND, this.boop);
                    }, 1);
                }
            }
        }
    }

}