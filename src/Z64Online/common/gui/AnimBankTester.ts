import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { ListBoxData } from "./ListBoxData";
import path from 'path';
import fs from 'fs';
import { number_ref } from "modloader64_api/Sylvain/ImGui";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { Z64OnlineEvents, Z64_AnimationBank, Z64_AnimConvert } from "../api/Z64API";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import Vector3 from "modloader64_api/math/Vector3";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Z64_ANIM_BANK_DMA } from "../types/GameAliases";


export default class AnimBankTester {
    core: IZ64Main;
    isOpen: boolean = false;
    private anims: ListBoxData[] = [];
    private current: number_ref = [0];
    private floorPlane: boolean = false;
    ModLoader: IModLoaderAPI = {} as any;
    
    link_animetion_clean: Buffer = Buffer.alloc(0);

    constructor(ModLoader: IModLoaderAPI, core: IZ64Main) {
        this.ModLoader = ModLoader;
        this.core = core;
    }

    //Translation of CrookedPoe's Anim2Link conversion code
    

    onVi() {
        if (!this.isOpen) return;
        if (this.ModLoader.ImGui.begin("ANIM BANK TESTER")) {
            if (this.anims.length === 0) {
                this.ModLoader.ImGui.text(`Put .anim in ${path.resolve(global.ModLoader.startdir, "anims")} to get started.`);
                let d = path.resolve(global.ModLoader.startdir, "anims");
                if (!fs.existsSync(d)) {
                    fs.mkdirSync(d);
                }
                fs.readdirSync(d).forEach((f: string) => {
                    let file = path.resolve(d, f);
                    if (fs.existsSync(file) && !fs.lstatSync(file).isDirectory()) {
                        let parse = path.parse(file);
                        if (parse.ext === ".anim") {
                            this.anims.push(new ListBoxData(file));
                        }
                    }
                });
            } else {
                if (this.ModLoader.ImGui.listBox("anims", this.current, this.anims)) {
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.smallButton("Refresh List")) {
                    this.anims.length = 0;
                }
                if (this.ModLoader.ImGui.checkbox("Floor Plane Compensation", [this.floorPlane])) {
                    this.floorPlane = !this.floorPlane;
                }
                if (this.ModLoader.ImGui.smallButton("Restore Vanilla Bank")) {
                    bus.emit(Z64OnlineEvents.FORCE_CUSTOM_ANIMATION_BANK, new Z64_AnimationBank("Vanilla", Buffer.alloc(1)));
                }
                if (this.ModLoader.ImGui.smallButton("Load Anim")) {
                    let fileBuf = fs.readFileSync(this.anims[this.current[0]]._path);
                    bus.emit(Z64OnlineEvents.CONVERT_CUSTOM_ANIMATION, new Z64_AnimConvert(this.anims[this.current[0]].name, fileBuf, this.floorPlane))
                }
                if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) this.ModLoader.ImGui.text(`Current Anim ID: 0x${this.core.OOT!.link.get_anim_id().toString(16)}`)
                if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) this.ModLoader.ImGui.text(`Current Anim ID: 0x${this.core.MM!.link.get_anim_id().toString(16)}`)
            }
            this.ModLoader.ImGui.end();
        }
    }
}