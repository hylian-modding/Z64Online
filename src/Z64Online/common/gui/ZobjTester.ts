import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import fs from 'fs';
import path from 'path';
import { bool_ref, number_ref } from "modloader64_api/Sylvain/ImGui";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { bus } from "modloader64_api/EventHandler";
import { getLinkObject, Z64OnlineEvents, Z64Online_ModelAllocation } from "../api/Z64API";
import { getAgeOrForm } from "../types/GameAliases";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import * as defines from '../cosmetics/Defines';
import { MatrixTranslate } from "../cosmetics/utils/MatrixTranslate";
import Z64OManifestParser from "../cosmetics/Z64OManifestParser";

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
    forceAdultSizedInMM: bool_ref = [false];

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
                this.ModLoader.ImGui.text(`Put zobjs in ${path.resolve(global.ModLoader.startdir, "zobjs")} to get started.`);
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
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.checkbox("Force Adult Size in MM", this.forceAdultSizedInMM)) {
                }
                if (this.ModLoader.ImGui.smallButton("Load Model")) {
                    bus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, new Z64Online_ModelAllocation(fs.readFileSync(this.zobjs[this.current[0]]._path), this.forceAdultSizedInMM[0] ? 0x68 : getAgeOrForm(this.core), this.isOOT ? Z64LibSupportedGames.OCARINA_OF_TIME : Z64LibSupportedGames.MAJORAS_MASK));
                }
                this.ModLoader.ImGui.nextColumn();
                this.ModLoader.ImGui.labelText("", "Matrix Editor");
                if (this.ModLoader.ImGui.listBox("Matrix Select", this.currentMtx, this.mtxLabels)) {
                }

                if (this.ModLoader.ImGui.sliderFloats("XR", this.MTX[this.currentMtx[0]].XR, -9999, 9999)) {
                    this.updateMtx();
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.inputFloat(`   ###XR_IN`, this.MTX[this.currentMtx[0]].XR)) {
                    this.updateMtx();
                }

                if (this.ModLoader.ImGui.sliderFloats("YR", this.MTX[this.currentMtx[0]].YR, -9999, 9999)) {
                    this.updateMtx();
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.inputFloat(`   ###YR_IN`, this.MTX[this.currentMtx[0]].YR)) {
                    this.updateMtx();
                }

                if (this.ModLoader.ImGui.sliderFloats("ZR", this.MTX[this.currentMtx[0]].ZR, -9999, 9999)) {
                    this.updateMtx();
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.inputFloat(`   ###ZR_IN`, this.MTX[this.currentMtx[0]].ZR)) {
                    this.updateMtx();
                }

                if (this.ModLoader.ImGui.sliderFloats("XT", this.MTX[this.currentMtx[0]].XT, -9999, 9999)) {
                    this.updateMtx();
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.inputFloat(`   ###XT_IN`, this.MTX[this.currentMtx[0]].XT)) {
                    this.updateMtx();
                }

                if (this.ModLoader.ImGui.sliderFloats("YT", this.MTX[this.currentMtx[0]].YT, -9999, 9999)) {
                    this.updateMtx();
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.inputFloat(`   ###YT_IN`, this.MTX[this.currentMtx[0]].YT)) {
                    this.updateMtx();
                }

                if (this.ModLoader.ImGui.sliderFloats("ZT", this.MTX[this.currentMtx[0]].ZT, -9999, 9999)) {
                    this.updateMtx();
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.inputFloat(`   ###ZT_IN`, this.MTX[this.currentMtx[0]].ZT)) {
                    this.updateMtx();
                }

                if (this.ModLoader.ImGui.sliderFloats("Scale", this.MTX[this.currentMtx[0]].XS, -9999, 9999)) {
                    this.updateMtx();
                }
                this.ModLoader.ImGui.sameLine();
                if (this.ModLoader.ImGui.inputFloat(`   ###XS_IN`, this.MTX[this.currentMtx[0]].XS)) {
                    this.updateMtx();
                }

                if (this.ModLoader.ImGui.smallButton("Export")) {
                    let zobj = fs.readFileSync(this.zobjs[this.current[0]]._path);
                    zobj = Z64OManifestParser.removeMTXData(zobj);
                    let all_mtx: Buffer[] = [];
                    for (let i = 0; i < this.MTX.length; i++) {
                        let mtx = MatrixTranslate.guMtxF2L(MatrixTranslate.guRTSF(this.MTX[i].XR[0], this.MTX[i].YR[0], this.MTX[i].ZR[0], this.MTX[i].XT[0], this.MTX[i].YT[0], this.MTX[i].ZT[0], this.MTX[i].XS[0]));
                        all_mtx.push(mtx);
                    }
                    zobj = Z64OManifestParser.writeMTXData(zobj, all_mtx);
                    let tag = "_MTX_" + Date.now().toString(16).toUpperCase();
                    let name = path.parse(this.zobjs[this.current[0]]._path).name;
                    name += tag;
                    name += ".zobj";
                    let dir = path.parse(this.zobjs[this.current[0]]._path).dir;
                    let p = path.resolve(dir, name);
                    fs.writeFileSync(p, zobj);
                    this.zobjs.length = 0;
                    this.current[0] = 0;
                }
            }
        }
    }

}