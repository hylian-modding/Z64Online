import { Z64OnlineEvents, Z64_SaveDataItemSet } from "@OotOnline/Z64API/OotoAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { onCreateResources, onViUpdate } from "modloader64_api/PluginLifecycle";
import { FlipFlags, Font, Texture } from "modloader64_api/Sylvain/Gfx";
import { rgba, xy, xywh } from "modloader64_api/Sylvain/vec";
import fs from 'fs';
import path from 'path';

export class Notifications {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    //---
    font!: Font;
    messages: Array<string> = [];
    icon!: Texture;
    curMessage: string = "";
    timer: number = 0;
    MAX_TIMER: number = 500;
    resourcesLoaded: boolean = false;
    itemIcons: Map<string, Texture> = new Map<string, Texture>();

    @EventHandler(Z64OnlineEvents.SAVE_DATA_ITEM_SET)
    onSaveDataToggle(evt: Z64_SaveDataItemSet) {
        this.messages.push(evt.key);
    }

    @onCreateResources()
    onResource() {
        if (!this.resourcesLoaded) {
            let base: string = path.resolve(__dirname, "..", "sprites");
            fs.readdirSync(base).forEach((file: string) => {
                let p = path.resolve(base, file);
                let t: Texture = this.ModLoader.Gfx.createTexture();
                t.loadFromFile(p);
                this.itemIcons.set(path.parse(file).name, t);
            });
            this.resourcesLoaded = true;
            this.icon = this.itemIcons.get("navi")!;
        }
    }

    @onViUpdate()
    onVi() {
        if (this.curMessage !== "") {
            this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getBackgroundDrawList(), this.icon, xywh(0, 0, 32, 32), xywh(0, 0, 64, 64), rgba(0xFF, 0xFF, 0xFF, 0xFF), FlipFlags.None);
            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), global.ModLoader["FONT"], this.curMessage, xy(34, 0), rgba(0, 0, 0, 0xFF), rgba(0xFF, 0xFF, 0xFF, 0xFF), xy(1, 1));
            this.timer++;
            if (this.timer > this.MAX_TIMER) {
                this.curMessage = "";
                this.timer = 0;
            }
        } else {
            if (this.messages.length > 0) {
                if (this.messages.length > 1) {
                    this.curMessage = this.messages.length.toString();
                    while (this.messages.length > 0) {
                        this.messages.shift();
                    }
                } else {
                    this.curMessage = this.messages.shift()!;
                    if (this.itemIcons.has(this.curMessage)) {
                        this.icon = this.itemIcons.get(this.curMessage)!;
                    } else {
                        this.icon = this.itemIcons.get("navi")!;
                    }
                }
                this.ModLoader.utils.setTimeoutFrames(() => {
                    this.core.commandBuffer.runCommand(Command.PLAY_SOUND, 0x4831);
                }, 1);
            }
        }
    }

}