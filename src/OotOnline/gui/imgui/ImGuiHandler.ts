import { onViUpdate, onTick, onCreateResources } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { ModelManagerClient } from "@OotOnline/data/models/ModelManager";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IOOTCore, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { Puppet } from "@OotOnline/data/linkPuppet/Puppet";
import { EventHandler } from "modloader64_api/EventHandler";
import { OotOnlineEvents } from "@OotOnline/OotoAPI/OotoAPI";
import Vector3 from "modloader64_api/math/Vector3";
import {glmatrix_matrix4, glmatrix_vec4} from 'modloader64_api/math/glmatrix';
import { xywh, rgba, xy } from "modloader64_api/Sylvain/vec";
import { Font } from "modloader64_api/Sylvain/Gfx";
import path from 'path';

export class ImGuiHandler {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    modelManager!: ModelManagerClient;
    puppets: Array<Puppet> = [];
    scene: number = -1;
    // View
    eye: Vector3 = new Vector3()
    cp: Vector3 = new Vector3()
    up: Vector3 = new Vector3()
    v: Array<number> = new Array<number>(16);
    p: Array<number> = new Array<number>(16);
    font!: Font;
    nameplates: boolean = true;
    puppetsDespawn: Array<number> = [];

    constructor() {
    }
    
    @EventHandler(OotOnlineEvents.PLAYER_PUPPET_SPAWNED)
    onPuppetSpawn(puppet: Puppet){
        this.puppets.push(puppet);
    }

    @EventHandler(OotOnlineEvents.PLAYER_PUPPET_DESPAWNED)
    onPuppetDespawn(puppet: Puppet){
        let index: number = -1;
        for (let i = 0; i < this.puppets.length; i++){
            if (puppet.id === this.puppets[i].id){
                index = i;
                break;
            }
        }
        if (index > -1){
            this.puppets.slice(index, 1);
        }
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChanged(scene: number){
        this.scene = scene;
    }

    @EventHandler(OotEvents.ON_LOADING_ZONE)
    onSceneChanging(){
        this.puppets.length = 0;
    }

    @onTick()
    onTick(){
        this.eye = this.ModLoader.math.rdramReadV3(0x801C8580)
        this.cp = this.ModLoader.math.rdramReadV3(0x801C858C);
        this.up = this.ModLoader.math.rdramReadV3(0x801C86E8);
        this.v = this.getmtx(0x801DA200);
        this.p = this.getmtx(0x801DA240);
        for (let i = 0; i < this.puppets.length; i++) {
            if (this.puppets[i].scene !== this.scene){
                this.puppetsDespawn.push(i);
            }
        }
        if (this.puppetsDespawn.length > 0){
            for (let i = 0; i < this.puppetsDespawn.length; i++){
                this.puppets.slice(this.puppetsDespawn[i], 1);
            }
            this.puppetsDespawn.length = 0;
        }
    }

    getmtx(addr: number) {
        let m = [];
        let offset = 0;
        for (let i = 0; i < 4; i++) {
            let a = this.ModLoader.emulator.rdramReadF32(addr + offset + 0);
            let b = this.ModLoader.emulator.rdramReadF32(addr + offset + 4);
            let c = this.ModLoader.emulator.rdramReadF32(addr + offset + 8);
            let d = this.ModLoader.emulator.rdramReadF32(addr + offset + 0xC);
            m.push(a, b, c, d);
            offset += 0x10;
        }

        return m;
    };

    @onViUpdate()
    onViUpdate() {
        /* this.ModLoader.ImGui.begin("OotOnline Debugger", [true]);
        this.ModLoader.ImGui.text("Model heap size: " + this.modelManager.allocationManager.MAX_MODELS * 0x37800 + " bytes");
        this.ModLoader.ImGui.text("Allocations: " + (this.modelManager.allocationManager.MAX_MODELS - this.modelManager.allocationManager.getAvailableSlots()) + "/" + this.modelManager.allocationManager.MAX_MODELS);
        this.ModLoader.ImGui.text("Local player using custom model: " + (this.modelManager.customModelFileChild !== '' || this.modelManager.customModelFileAdult !== ''));
        this.ModLoader.ImGui.text("Local player using custom anims: " + (this.modelManager.customModelFileAnims !== ''));
        this.ModLoader.ImGui.newLine();
        for (let i = 0; i < this.modelManager.allocationManager.MAX_MODELS; i++) {
            if (this.modelManager.allocationManager.getModelInSlot(i) !== undefined) {
                let m = this.modelManager.allocationManager.getModelInSlot(i);
                let hasAdult: boolean = m.model.adult.zobj.byteLength > 1;
                let hasChild: boolean = m.model.child.zobj.byteLength > 1;
                this.ModLoader.ImGui.text("Model Slot " + i + ":");
                this.ModLoader.ImGui.checkbox("Adult (Size: " + m.model.adult.zobj.byteLength + " bytes)", [hasAdult]);
                this.ModLoader.ImGui.checkbox("Child (Size: " + m.model.child.zobj.byteLength + " bytes)", [hasChild]);
            }
        }
        this.ModLoader.ImGui.end();*/
        if (this.font === undefined){
            try {
                this.font = this.ModLoader.Gfx.createFont();
                this.font.loadFromFile(path.resolve(__dirname, "PolygonParty-3KXM.ttf"), 22, 2);
            } catch (err) {
                this.ModLoader.logger.error(err);
            }
        }
        
        if (this.ModLoader.ImGui.beginMainMenuBar()){
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")){
                    if (this.ModLoader.ImGui.menuItem("Show nameplates", undefined, this.nameplates, true)) {
                        this.nameplates = !this.nameplates    
                    }
                    
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
        
        if (!this.nameplates){
            return;
        }
        
        for (let i = 0; i < this.puppets.length; i++) {
            if (this.puppets[i].scene === this.scene) {
                try {
                    if (this.puppets[i] !== undefined) {
                        let lp = this.ModLoader.math.rdramReadV3(this.puppets[i].data.pointer + 0x38);
                        lp.y += 53;
                        let text = this.puppets[i].player.nickname;
        
                        let fovy = this.ModLoader.emulator.rdramReadF32(0x801C8570) // view.fovy
                        let near = this.ModLoader.emulator.rdramReadF32(0x801C8574) // view.near
                        let far = this.ModLoader.emulator.rdramReadF32(0x801C8578) // view.far
                        let scale = this.ModLoader.emulator.rdramReadF32(0x801C857C) // view.scale   
        
                        let winX = 0;
                        let winY = 0;
        
                        if (this.font !== undefined) {
                            let dist = this.cp.minus(lp).magnitude()
                            dist = Math.pow(dist, 0.5)
                            scale = this.ModLoader.ImGui.getMainViewport().size.x / this.ModLoader.ImGui.getMainViewport().size.y
        
                            this.v = glmatrix_matrix4.lookAt(this.v, this.eye, this.cp, this.up)
                            this.p = glmatrix_matrix4.perspective(this.p, fovy * (Math.PI / 180.0), scale, near, far)
        
                            let pv: Array<number> = new Array<number>(16);
                            pv = glmatrix_matrix4.multiply(pv, this.p, this.v)
        
                            let v4 = xywh(lp.x, lp.y, lp.z, 1)
                            v4 = glmatrix_vec4.transformMat4(v4, v4, pv)
        
                            let vxyz = new Vector3(v4.x, v4.y, v4.z)
                            vxyz = vxyz.divideN(v4.w)
        
                            vxyz.x /= vxyz.z
                            vxyz.y /= vxyz.z

                            if (    Math.abs(v4.x) < v4.w
                                &&  Math.abs(v4.y) < v4.w
                                &&  0 < v4.z
                                &&  v4.z < v4.w)
                            {
                                
                                winX = Math.round(((vxyz.x + 1.0) / 2.0) * this.ModLoader.ImGui.getMainViewport().size.x)
                                winY = Math.round(((1.0 - vxyz.y) / 2.0) * this.ModLoader.ImGui.getMainViewport().size.y)

                                let x_scale = this.ModLoader.ImGui.getMainViewport().size.x / 320
                                let y_scale = this.ModLoader.ImGui.getMainViewport().size.y / 240

                                let ff = 5 / 4
                                let ft = 4 / 3
                                let st = 16 / 10
                                let sn = 16 / 9
                                let tn = 21 / 9

                                let ff_ft = ff + ((ft - ff) / 2)
                                let ft_st = ft + ((st - ft) / 2)
                                let st_sn = st + ((sn - st) / 2)
                                let sn_tn = sn + ((tn - sn) / 2)

                                if (scale <= ff_ft) {
                                    //this.ModLoader.logger.info("5/4")

                                    x_scale = this.ModLoader.ImGui.getMainViewport().size.x / 360
                                    y_scale = this.ModLoader.ImGui.getMainViewport().size.y / 288
                                }
                                else if (scale <= ft_st) {
                                    //this.ModLoader.logger.info("4/3")

                                    x_scale = this.ModLoader.ImGui.getMainViewport().size.x / 320
                                    y_scale = this.ModLoader.ImGui.getMainViewport().size.y / 240
                                }
                                else if (scale <= st_sn) {
                                    //this.ModLoader.logger.info("16/10")

                                    x_scale = this.ModLoader.ImGui.getMainViewport().size.x / 320
                                    y_scale = this.ModLoader.ImGui.getMainViewport().size.y / 200
                                }
                                else if (scale <= sn_tn) {
                                    //this.ModLoader.logger.info("16/9")

                                    x_scale = this.ModLoader.ImGui.getMainViewport().size.x / 320
                                    y_scale = this.ModLoader.ImGui.getMainViewport().size.y / 180
                                }
                                else {
                                   // this.ModLoader.logger.info("21/9")

                                    x_scale = this.ModLoader.ImGui.getMainViewport().size.x / 320
                                    y_scale = this.ModLoader.ImGui.getMainViewport().size.y / 135
                                }
                                

                                let sxy = (2.5 / dist)
                                let tsxy = this.ModLoader.Gfx.calcTextSize(this.font, text, xy(sxy * x_scale, sxy * y_scale))

                                this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getWindowDrawList(), this.font, text,
                                    xy(winX - (tsxy.x / 2), winY - (tsxy.y / 2)),
                                    rgba(255, 255, 255, 255), rgba(0, 0, 0, 255),
                                    xy(sxy * x_scale, sxy * y_scale));
                            }
                        }
                    }
                } catch (err) { console.log(err); }
            }
        }
    }

}