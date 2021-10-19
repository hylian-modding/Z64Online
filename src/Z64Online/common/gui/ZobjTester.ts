import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import fs from 'fs';
import path from 'path';
import { number_ref } from "modloader64_api/Sylvain/ImGui";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { bus } from "modloader64_api/EventHandler";
import { getLinkObject, Z64OnlineEvents, Z64Online_ModelAllocation } from "../api/Z64API";
import { getAgeOrForm } from "../types/GameAliases";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import * as defines from '../cosmetics/Defines';
import { MatrixTranslate } from "../cosmetics/utils/MatrixTranslate";

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

class MTX_Group {
    XR: number_ref = [0];
    YR: number_ref = [0];
    ZR: number_ref = [0];
    XT: number_ref = [0];
    YT: number_ref = [0];
    ZT: number_ref = [0];
    XS: number_ref = [1];

    mtx_arr: number_ref[] = [this.XR, this.YR, this.ZR, this.XT, this.YT, this.ZT, this.XS];
}

export class ZobjTester {

    ModLoader!: IModLoaderAPI;
    zobjs: zobj[] = [];
    current: number_ref = [0];
    isOOT: boolean = false;
    isMM: boolean = false;
    core: IZ64Main;
    isOpen: boolean = false;
    currentMtx: number_ref = [0];
    mtxLabels: string[] = [
        "MATRIX_SWORD1_BACK",
        "MATRIX_SWORD2_BACK",
        "MATRIX_SWORD3_BACK",
        "MATRIX_SHIELD1_BACK",
        "MATRIX_SHIELD2_BACK",
        "MATRIX_SHIELD3_BACK",
        "MATRIX_SHIELD1_ITEM"
    ];
    MTX: MTX_Group[] = [
        new MTX_Group(),
        new MTX_Group(),
        new MTX_Group(),
        new MTX_Group(),
        new MTX_Group(),
        new MTX_Group(),
        new MTX_Group(),
    ];


    constructor(ModLoader: IModLoaderAPI, core: IZ64Main) {
        this.ModLoader = ModLoader;
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            this.isOOT = true;
            for (let i = 0; i < 7; i++) {
                this.loadOOTDefaults(i);
            }
        }
        if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            this.isMM = true;
            for (let i = 0; i < 7; i++) {
                this.loadMMDefaults(i);
            }
        }
        this.core = core;
    }

    private loadMMDefaults(cur: number) {
        let d: number[] = [];
        switch (cur) {
            case 0:
                d = [0, 0, 0, -578, -221, -32, 1];
                break;
            case 1:
                d = [0, 0, 0, -480, -240, -14, 1];
                break;
            case 2:
                d = [0, 0, 0, -578, -221, -32, 1];
                break;
            case 3:
            case 4:
                d = [0, 0, 182, 552, 0, 0, 1];
            case 5:
                d = [0, 0, 182, 552, 0, -50, 1];
                break;
            default:
                d = [0, 0, 0, 0, 0, 0, 1];
                break;
        }
        for (let i = 0; i < d.length; i++) {
            this.MTX[cur].mtx_arr[i][0] = d[i];
        }
    }

    private loadOOTDefaults(cur: number) {
        let d: number[] = [];
        switch (cur) {
            case 0:
            case 1:
            case 2:
                d = [0, 0, 0, -440, -211, 0, 1];
                break;
            case 3:
            case 5:
                d = [0, 0, 180, 545, 0, 80, 1];
                break;
            case 4:
                d = [0, 0, 0, 0, 0, 0, 1];
                break;
            default:
                d = [0, 0, 0, 0, 0, 0, 1];
                break;
        }
        for (let i = 0; i < d.length; i++) {
            this.MTX[cur].mtx_arr[i][0] = d[i];
        }
    }

    updateMtx() {
        let link = getLinkObject();
        let mtx_start = defines.MATRIX_SWORD1_BACK;
        mtx_start += (this.currentMtx[0] * 0x40);
        let mtx = MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(this.MTX[this.currentMtx[0]].XR[0], this.MTX[this.currentMtx[0]].YR[0], this.MTX[this.currentMtx[0]].ZR[0], this.MTX[this.currentMtx[0]].XT[0], this.MTX[this.currentMtx[0]].YT[0], this.MTX[this.currentMtx[0]].ZT[0], this.MTX[this.currentMtx[0]].XS[0]));
        this.ModLoader.emulator.rdramWriteBuffer(link + mtx_start, mtx);
    }

    onVi() {
        if (!this.isOpen) return;
        if (this.ModLoader.ImGui.begin("ZOBJ TESTER Z64O")) {
            this.ModLoader.ImGui.columns(2);
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
                this.ModLoader.ImGui.nextColumn();
                this.ModLoader.ImGui.labelText("", "Matrix Editor");
                if (this.ModLoader.ImGui.listBox("Matrix Select", this.currentMtx, this.mtxLabels)) {
                }
                if (this.ModLoader.ImGui.sliderFloats("XR", this.MTX[this.currentMtx[0]].XR, -1000, 1000)) {
                    this.updateMtx();
                }
                if (this.ModLoader.ImGui.sliderFloats("YR", this.MTX[this.currentMtx[0]].YR, -1000, 1000)) {
                    this.updateMtx();
                }
                if (this.ModLoader.ImGui.sliderFloats("ZR", this.MTX[this.currentMtx[0]].ZR, -1000, 1000)) {
                    this.updateMtx();
                }
                if (this.ModLoader.ImGui.sliderFloats("XT", this.MTX[this.currentMtx[0]].XT, -1000, 1000)) {
                    this.updateMtx();
                }
                if (this.ModLoader.ImGui.sliderFloats("YT", this.MTX[this.currentMtx[0]].YT, -1000, 1000)) {
                    this.updateMtx();
                }
                if (this.ModLoader.ImGui.sliderFloats("ZT", this.MTX[this.currentMtx[0]].ZT, -1000, 1000)) {
                    this.updateMtx();
                }
                if (this.ModLoader.ImGui.sliderInt("Scale", this.MTX[this.currentMtx[0]].XS, 0, 2)) {
                    this.updateMtx();
                }
            }
        }
    }

}