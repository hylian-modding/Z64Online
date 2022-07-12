import { Puppet_OOT } from "@Z64Online/oot/puppet/Puppet_OOT";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { glmatrix_matrix4, glmatrix_vec4 } from "modloader64_api/math/glmatrix";
import Vector3 from "modloader64_api/math/Vector3";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { onTick, onViUpdate } from "modloader64_api/PluginLifecycle";
import { xywh, xy, rgba } from "modloader64_api/Sylvain/vec";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64Events } from "Z64Lib/API/Common/Z64API";
import { Scene } from "Z64Lib/API/OoT/OOTAPI";
import { Z64OnlineEvents } from "../api/Z64API";
import { CommonConfigInst } from "../lib/Settings";
import { HYLIAN_FONT_REF } from "./HyliaFont";

export default class PuppetNameTagHandler {

    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: IZ64Main = {} as any;

    // View
    eye: Vector3 = new Vector3()
    cp: Vector3 = new Vector3()
    up: Vector3 = new Vector3()
    v: Array<number> = new Array<number>(16);
    p: Array<number> = new Array<number>(16);
    puppetsDespawn: Array<number> = [];
    puppets: Array<Puppet_OOT> = [];
    scene: Scene = -1;

    @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
    onPuppetSpawn(puppet: Puppet_OOT) {
        this.puppets.push(puppet);
    }

    @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_DESPAWNED)
    onPuppetDespawn(puppet: Puppet_OOT) {
        let index: number = -1;
        for (let i = 0; i < this.puppets.length; i++) {
            if (puppet.id === this.puppets[i].id) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            this.puppets.slice(index, 1);
        }
    }

    @EventHandler(Z64Events.ON_SCENE_CHANGE)
    onSceneChanged(scene: Scene) {
        this.scene = scene;
    }

    @EventHandler(Z64Events.ON_LOADING_ZONE)
    onSceneChanging() {
        this.puppets.length = 0;
    }

    @onTick()
    onTick() {
        this.eye = this.ModLoader.math.rdramReadV3(0x801C8580)
        this.cp = this.ModLoader.math.rdramReadV3(0x801C858C);
        this.up = this.ModLoader.math.rdramReadV3(0x801C86E8);
        this.v = this.getmtx(0x801DA200);
        this.p = this.getmtx(0x801DA240);
        for (let i = 0; i < this.puppets.length; i++) {
            if (this.puppets[i].scene !== this.scene) {
                this.puppetsDespawn.push(i);
            }
        }
        if (this.puppetsDespawn.length > 0) {
            for (let i = 0; i < this.puppetsDespawn.length; i++) {
                this.puppets.slice(this.puppetsDespawn[i], 1);
            }
            this.puppetsDespawn.length = 0;
        }
    }

    getmtx(addr: number) {
        let m: number[] = [];
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
    }

    //@onViUpdate()
    onViUpdate() {
        if (!CommonConfigInst.nameplates) {
            return;
        }
        for (let i = 0; i < this.puppets.length; i++) {
            if (this.puppets[i].scene === this.scene) {
                try {
                    if (this.puppets[i] !== undefined) {
                        let lp = this.ModLoader.math.rdramReadV3(this.puppets[i].data!.pointer + 0x38);
                        let text = this.puppets[i].player.nickname;

                        let fovy = this.ModLoader.emulator.rdramReadF32(0x801C8570) // view.fovy
                        let near = this.ModLoader.emulator.rdramReadF32(0x801C8574) // view.near
                        let far = this.ModLoader.emulator.rdramReadF32(0x801C8578) // view.far
                        let scale = this.ModLoader.emulator.rdramReadF32(0x801C857C) // view.scale

                        let winX = 0;
                        let winY = 0;

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

                        if (Math.abs(v4.x) < v4.w
                            && Math.abs(v4.y) < v4.w
                            && 0 < v4.z
                            && v4.z < v4.w) {

                            winX = Math.round(((vxyz.x + 1.0) / 2.0) * this.ModLoader.ImGui.getMainViewport().size.x)
                            winY = Math.round(((1.0 - vxyz.y) / 2.0) * this.ModLoader.ImGui.getMainViewport().size.y);

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
                            let tsxy = this.ModLoader.Gfx.calcTextSize(HYLIAN_FONT_REF, text, xy(sxy * x_scale, sxy * y_scale))

                            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getWindowDrawList(), HYLIAN_FONT_REF, text,
                                xy(winX - (tsxy.x / 2), winY - (tsxy.y / 2)),
                                rgba(255, 255, 255, 255), rgba(0, 0, 0, 255),
                                xy(sxy * x_scale, sxy * y_scale));
                        }
                    }
                } catch (err: any) { this.ModLoader.logger.error(err); }
            }
        }
    }


}