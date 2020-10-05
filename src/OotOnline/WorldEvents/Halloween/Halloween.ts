import { IWorldEvent } from "../WorldEvents";
import { Z64LibSupportedGames } from 'Z64Lib/API/Z64LibSupportedGames';
import { Z64RomTools } from 'Z64Lib/API/Z64RomTools';
import path from 'path';
import { zzstatic } from 'Z64Lib/API/zzstatic';
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { OotOnlineEvents, OotOnline_Emote } from "@OotOnline/OotoAPI/OotoAPI";
import zip from 'adm-zip';
import { FlipFlags, Texture } from "modloader64_api/Sylvain/Gfx";
import fs from 'fs';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { onCreateResources, onViUpdate, Preinit } from "modloader64_api/PluginLifecycle";
import { rgb, rgba, vec4, xywh } from "modloader64_api/Sylvain/vec";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";

export class Halloween implements IWorldEvent {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    assets: Map<string, Buffer> = new Map<string, Buffer>();
    resourceLoad: boolean = false;
    titleScreen!: Texture;
    fadeIn: vec4 = rgba(255, 255, 255, 0);

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        let rom: Buffer = evt.rom;
        try {
            let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);

            // Replace bomb icon in inventory.
            let icons = tools.decompressDMAFileFromRom(rom, 8);
            this.assets.get("assets/skull_bomb_inv.bin")!.copy(icons, 0x2000);
            tools.recompressDMAFileIntoRom(rom, 8, icons);

            // Replace bomb in hand and bomb drop icons.
            // Also replace the moon.
            let gk = tools.decompressDMAFileFromRom(rom, 498);
            this.assets.get("assets/skull_bomb_world.bin")!.copy(gk, 0x6820);
            this.assets.get("assets/skull_bomb_drop.bin")!.copy(gk, 0x3F580);
            this.assets.get("assets/pumpkin_moon.bin")!.copy(gk, 0x383A0);
            tools.recompressDMAFileIntoRom(rom, 498, gk);

            let curRam = 0x80700000;
            // Replace Bombiwa model.
            let bb_obj = tools.decompressDMAFileFromRom(rom, 830);
            this.ModLoader.utils.clearBuffer(bb_obj);
            Buffer.from("DE00000000000000DF00000000000000", 'hex').copy(bb_obj, 0x9E0);
            bb_obj.writeUInt32BE(curRam + 0x10, 0x9E4);
            tools.recompressDMAFileIntoRom(rom, 830, bb_obj);
            let replacement = this.assets.get("assets/bombiwaPumpkin.zobj")!;
            let s = new zzstatic(Z64LibSupportedGames.OCARINA_OF_TIME);
            replacement = s.doRepoint(replacement, 0, false, curRam);
            curRam += replacement.byteLength;

            // Replace Gossip stone model.
            let gs_replacement = this.assets.get("assets/gravestone.zobj")!;
            gs_replacement = s.doRepoint(gs_replacement, 0, false, curRam);
            let gs_obj = tools.decompressDMAFileFromRom(rom, 869);
            this.ModLoader.utils.clearBuffer(gs_obj);
            Buffer.from("E700000000000000DF00000000000000", 'hex').copy(gs_obj, 0x950);
            Buffer.from("E700000000000000DF00000000000000", 'hex').copy(gs_obj, 0xA60);
            Buffer.from("DE00000000000000DF00000000000000", 'hex').copy(gs_obj, 0x9D0);
            gs_obj.writeUInt32BE(curRam + 0x10, 0x9D4);
            tools.recompressDMAFileIntoRom(rom, 869, gs_obj);

            // Replace scarecrow textures.
            let sc = tools.decompressDMAFileFromRom(rom, 815);
            this.assets.get("assets/scarecrow_textures.bin")!.copy(sc, 0x2C00);
            tools.recompressDMAFileIntoRom(rom, 815, sc);

            bus.emit(OotOnlineEvents.ON_REGISTER_EMOTE, { name: "Spooky", buf: this.assets.get("assets/skeleton_dance.bin")!, sound: this.assets.get("assets/skeleton.ogg")! } as OotOnline_Emote);

            this.ModLoader.utils.setTimeoutFrames(() => {
                this.ModLoader.emulator.rdramWriteBuffer(0x80700000, replacement);
                this.ModLoader.emulator.rdramWriteBuffer(curRam, gs_replacement);
            }, 1);

        } catch (err) {
            this.ModLoader.logger.error(err.stack);
        }
    }

    @onCreateResources()
    onLoadAssets() {
        if (!this.resourceLoad) {
            this.titleScreen = this.ModLoader.Gfx.createTexture();
            fs.writeFileSync(path.resolve(__dirname, "Halloween.png"), this.assets.get("assets/Halloween.png")!);
            this.titleScreen.loadFromFile(path.resolve(__dirname, "Halloween.png"));
            this.resourceLoad = true;
        }
    }

    getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    @Preinit()
    preinit(): void {
        let assets: zip = new zip(path.resolve(__dirname, "assets.zip"));
        this.ModLoader.logger.info("Loading Halloween assets...");
        for (let i = 0; i < assets.getEntries().length; i++) {
            let e = assets.getEntries()[i];
            if (!e.isDirectory) {
                this.assets.set(e.entryName, e.getData());
                this.ModLoader.logger.debug(e.entryName);
            }
        }
        let costumes_adult: Buffer[] = [];
        let costumes_child: Buffer[] = [];
        this.assets.forEach((value: Buffer, key: string) => {
            if (key.indexOf("costumes/adult") > -1) {
                costumes_adult.push(this.assets.get(key)!);
            } else if (key.indexOf("costumes/child") > -1) {
                costumes_child.push(this.assets.get(key)!);
            }
        });
        let choice = costumes_adult[this.getRandomInt(0, costumes_adult.length - 1)];
        bus.emit(OotOnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_ADULT, choice);
        let choice2 = costumes_child[this.getRandomInt(0, costumes_child.length - 1)];
        bus.emit(OotOnlineEvents.CUSTOM_MODEL_LOAD_BUFFER_CHILD, choice2);
    }

    @onViUpdate()
    onVi() {
        if (!this.core.helper.isTitleScreen() || !this.core.helper.isSceneNumberValid()){
            this.fadeIn.w = 0;
            return;
        };
        if (this.fadeIn.w < 1.0){
            this.fadeIn.w+=0.001;
        }
        this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.titleScreen, xywh(0, 0, this.titleScreen.width, this.titleScreen.height), xywh(0, 0, this.ModLoader.ImGui.getMainViewport().size.x, this.ModLoader.ImGui.getMainViewport().size.y), this.fadeIn, FlipFlags.None);
    }
}