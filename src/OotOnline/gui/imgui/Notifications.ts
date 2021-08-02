import { Z64OnlineEvents, Z64_SaveDataItemSet } from "@OotOnline/common/api/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler, EventsClient, PrivateEventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IOOTCore, SongNotes, SongFlags, ScarecrowSongNoteStruct } from "modloader64_api/OOT/OOTAPI";
import { onViUpdate, Postinit } from "modloader64_api/PluginLifecycle";
import { FlipFlags, Font, Texture } from "modloader64_api/Sylvain/Gfx";
import { rgba, xy, xywh } from "modloader64_api/Sylvain/vec";
import fs from 'fs';
import path from 'path';
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { OotOnlineConfigCategory } from "@OotOnline/OotOnline";
import { OOTO_PRIVATE_EVENTS } from "@OotOnline/data/InternalAPI";
import { IZ64Clientside } from "@OotOnline/common/lib/IZ64Clientside";
import { SpriteMap } from "./SpriteMap";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import RomFlags from "@OotOnline/data/RomFlags";

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

class ScarecrowNotif extends Notif {
    notes: string[];

    constructor(msg: string, icon: Texture, notes: string[], max: number, noSound?: boolean) {
        super(msg, icon, max, noSound);
        this.notes = notes;
    }
}

export class Notifications {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    @ParentReference()
    parent!: IZ64Clientside;
    //---
    font!: Font;
    messages: Array<Notif> = [];
    curMessage: Notif | ScarecrowNotif | undefined;
    MAX_TIMER: number = 500;
    resourcesLoaded: boolean = false;
    itemIcons: Map<string, Texture> = new Map<string, Texture>();
    boop: number = 0x4831;
    config!: OotOnlineConfigCategory;
    lockIncomingItems: boolean = false;
    //---
    CIRCLE_TIMER_MAX: number = 10;
    circleAssets: Map<string, Texture> = new Map<string, Texture>();

    @EventHandler(Z64OnlineEvents.SAVE_DATA_ITEM_SET)
    onSaveDataToggle(evt: Z64_SaveDataItemSet) {
        if (!this.resourcesLoaded) return;
        if (SpriteMap.has(evt.key) && !this.lockIncomingItems) {
            if (this.parent.getClientStorage()!.localization.hasOwnProperty(SpriteMap.get(evt.key)!)) {
                if (evt.key == "scarecrowsSongChildFlag" || evt.key == "scarecrowsSongAdultFlag") {
                    let i = 0;
                    let obj: any;
                    let btnNotes: Array<string> = [];
                    let str = '';
                    obj = evt.value;
                    while (i <= 7) {
                        for (let j = 0; j < obj.byteLength; j += 0x8) {
                            let struct = new ScarecrowSongNoteStruct(obj.slice(j, j + 0x8));
                            if (struct.note[0] !== SongNotes.SILENCE) {
                                if (struct.note[0] == SongNotes.A_FLAT || struct.note[0] == SongNotes.A_NOTE || struct.note[0] == SongNotes.A_SHARP) {
                                    btnNotes[i] = "note_a";
                                }
                                if (struct.note[0] == SongNotes.C_DOWN_FLAT || struct.note[0] == SongNotes.C_DOWN_NOTE || struct.note[0] == SongNotes.C_DOWN_SHARP) {
                                    btnNotes[i] = "note_c_down";
                                }
                                if (struct.note[0] == SongNotes.C_RIGHT_FLAT || struct.note[0] == SongNotes.C_RIGHT_NOTE || (struct.note[0] == SongNotes.C_RIGHT_SHARP && struct.special[0] == SongFlags.SHARPENED_NOTE)) {
                                    btnNotes[i] = "note_c_right";
                                }
                                if ((struct.note[0] == SongNotes.C_LEFT_FLAT && struct.special[0] == SongFlags.FLATTENED_NOTE) || struct.note[0] == SongNotes.C_LEFT_NOTE || struct.note[0] == SongNotes.C_LEFT_SHARP) {
                                    btnNotes[i] = "note_c_left";
                                }
                                if (struct.note[0] == SongNotes.C_UP_FLAT || struct.note[0] == SongNotes.C_UP_NOTE || struct.note[0] == SongNotes.C_UP_SHARP) {
                                    btnNotes[i] = "note_c_up";
                                }
                                i++;
                            }
                        }
                    }
                    for (let i = 0; i <= 7; i++) {
                        str += ' ';
                        switch (btnNotes[i]) {
                            case "note_a":
                                str += 'A';
                                break;
                            case "note_c_down":
                                str += 'C-DOWN';
                                break;
                            case "note_c_right":
                                str += 'C-RIGHT';
                                break;
                            case "note_c_left":
                                str += 'C-LEFT';
                                break;
                            case "note_c_up":
                                str += 'C-UP';
                                break;
                        }
                    }
                    if (evt.key == "scarecrowsSongChildFlag") {
                        this.messages.push(new ScarecrowNotif("A child taught Bonooru ", this.itemIcons.get(SpriteMap.get("scarecrowsSong")!)!, btnNotes, this.MAX_TIMER)); // Requires adjustment for localization in the future.
                        this.ModLoader.logger.info('A child taught Bonooru' + str);
                    }
                    else if (evt.key == "scarecrowsSongAdultFlag") {
                        this.messages.push(new ScarecrowNotif(this.parent.getClientStorage()!.localization[SpriteMap.get(evt.key)!], this.itemIcons.get(SpriteMap.get("scarecrowsSong")!)!, btnNotes, this.MAX_TIMER));
                        this.ModLoader.logger.info('Learned Scarecrow\'s Song:' + str);
                    }
                    this.ModLoader.logger.info('Visit Bonooru as a child if you\'d like to change it to something else.');
                }
                else if (!RomFlags.isMultiworld) {
                    this.messages.push(new Notif(this.parent.getClientStorage()!.localization[SpriteMap.get(evt.key)!], this.itemIcons.get(SpriteMap.get(evt.key)!)!, this.MAX_TIMER));
                }
            }
        }
    }

    @EventHandler(EventsClient.ON_PLAYER_JOIN)
    onJoin(player: INetworkPlayer) {
        if (!this.resourcesLoaded) return;
        this.messages.push(new Notif(player.nickname + " connected!", this.itemIcons.get("navi")!, this.MAX_TIMER));
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onLeave(player: INetworkPlayer) {
        if (!this.resourcesLoaded) return;
        this.messages.push(new Notif(player.nickname + " disconnected!", this.itemIcons.get("navi")!, this.MAX_TIMER));
    }

    @PrivateEventHandler(OOTO_PRIVATE_EVENTS.DOING_SYNC_CHECK)
    onSync(evt: any) {
        this.circleAssets.forEach((asset: Texture, key: string) => {
            this.messages.push(new Notif("", asset, this.CIRCLE_TIMER_MAX, true));
        });
    }

    @PrivateEventHandler(OOTO_PRIVATE_EVENTS.LOCK_ITEM_NOTIFICATIONS)
    onLock(evt: any) {
        this.lockIncomingItems = true;
        this.ModLoader.utils.setTimeoutFrames(() => {
            this.lockIncomingItems = false;
        }, 20);
    }

    @Postinit()
    onPost() {
        this.config = this.ModLoader.config.registerConfigCategory("OotOnline") as OotOnlineConfigCategory;
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
            base = path.resolve(__dirname, "..", "circle");
            fs.readdirSync(base).forEach((file: string) => {
                let p = path.resolve(base, file);
                let t: Texture = this.ModLoader.Gfx.createTexture();
                t.loadFromFile(p);
                this.circleAssets.set(path.parse(file).name, t);
            });
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
                if (this.curMessage instanceof ScarecrowNotif) {
                    let msgSize = this.ModLoader.Gfx.calcTextSize(global.ModLoader["FONT"], this.curMessage.msg, xy(1, 1));
                    for (let i = 0; i <= 7; i++) {
                        let noteTexture = this.itemIcons.get(SpriteMap.get(this.curMessage.notes[i])!)!;
                        this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getBackgroundDrawList(), noteTexture, xywh(0, 0, noteTexture.width, noteTexture.height), xywh(36 + msgSize.x + (i * 12), 0, 12, 32), rgba(0xFF, 0xFF, 0xFF, 0xFF), FlipFlags.None);
                    }
                }
            } catch (err) {
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
                        this.core.commandBuffer.runCommand(Command.PLAY_SOUND, this.boop);
                    }, 1);
                }
            }
        }
    }

}