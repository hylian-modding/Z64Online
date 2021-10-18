import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import fs from 'fs';
import path from 'path';
import { number_ref } from "modloader64_api/Sylvain/ImGui";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { bus } from "modloader64_api/EventHandler";
import { Z64OnlineEvents, Z64Online_ModelAllocation } from "../api/Z64API";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { getAgeOrForm } from "../types/GameAliases";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";

class zobj {
    name: string;
    _path: string;

    constructor(_path: string) {
        this.name = path.parse(_path).name;
        this._path = _path;
    }

    toString() {
        return this.name;
    }
}

export class ZobjTester {

    ModLoader!: IModLoaderAPI;
    zobjs: zobj[] = [];
    current: number_ref = [0];
    isOOT: boolean = false;
    isMM: boolean = false;
    core: IZ64Main;
    isOpen: boolean = false;

    constructor(ModLoader: IModLoaderAPI, core: IZ64Main) {
        this.ModLoader = ModLoader;
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            this.isOOT = true
        }
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            this.isMM = true
        }
        this.core = core;
    }

    onVi() {
        if (!this.isOpen) return;
        if (this.ModLoader.ImGui.begin("ZOBJ TESTER Z64O")) {
            if (this.zobjs.length === 0) {
                let d = path.resolve(global.ModLoader.startdir, "zobjs");
                if (!fs.existsSync(d)) {
                    fs.mkdirSync(d);
                }
                fs.readdirSync(d).forEach((f: string) => {
                    let file = path.resolve(d, f);
                    if (fs.existsSync(file) && !fs.lstatSync(file).isDirectory()) {
                        let parse = path.parse(file);
                        if (parse.ext === ".zobj") {
                            this.zobjs.push(new zobj(file));
                        }
                    }
                });
            } else {
                if (this.ModLoader.ImGui.listBox("zobjs", this.current, this.zobjs)) {

                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.smallButton("Refresh List")) {
                    this.zobjs.length = 0;
                }
                if (this.ModLoader.ImGui.radioButton("OOT", this.isOOT)) {
                    this.isOOT = !this.isOOT;
                    this.isMM = !this.isMM;
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.radioButton("MM", this.isMM)) {
                    this.isOOT = !this.isOOT;
                    this.isMM = !this.isMM;
                }
                if (this.ModLoader.ImGui.smallButton("Load Model")) {
                    bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(fs.readFileSync(this.zobjs[this.current[0]]._path), getAgeOrForm(this.core), this.isOOT ? Z64LibSupportedGames.OCARINA_OF_TIME : Z64LibSupportedGames.MAJORAS_MASK));
                }
            }
        }
    }

}