import { onViUpdate, onTick } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { OotEvents, Scene } from "Z64Lib/API/OOT/OOTAPI";
import { Puppet_OOT } from "@Z64Online/oot/puppet/Puppet";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import Vector3 from "modloader64_api/math/Vector3";
import { glmatrix_matrix4, glmatrix_vec4 } from 'modloader64_api/math/glmatrix';
import { xywh, rgba, xy } from "modloader64_api/Sylvain/vec";
import { Font } from "modloader64_api/Sylvain/Gfx";
import path from 'path';
import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { OotOnlineConfigCategory } from "@Z64Online/oot/OotOnline";
import { BUILD_DATE, VERSION_NUMBER } from "@Z64Online/common/lib/VERSION_NUMBER";
import { changeKillfeedFont } from "modloader64_api/Announcements";
import IMemory from "modloader64_api/IMemory";
import { IActor } from "Z64Lib/API/Common/IActor";
import fse from 'fs-extra';
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { Command } from "Z64Lib/API/Common/ICommandBuffer";
import { IZ64OnlineHelpers } from "@Z64Online/common/lib/IZ64OnlineHelpers";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { ImGuiHandlerCommon } from "@Z64Online/common/gui/ImGuiHandlerCommon";

export class ImGuiHandler extends ImGuiHandlerCommon{

    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: IZ64Main = {} as any;
    @ParentReference()
    parent!: IZ64OnlineHelpers;
    puppets: Array<Puppet_OOT> = [];
    scene: Scene = -1;
    settings!: OotOnlineConfigCategory
    // View
    eye: Vector3 = new Vector3()
    cp: Vector3 = new Vector3()
    up: Vector3 = new Vector3()
    v: Array<number> = new Array<number>(16);
    p: Array<number> = new Array<number>(16);
    font!: Font;
    puppetsDespawn: Array<number> = [];
    // #ifdef IS_DEV_BUILD
    teleportDest: string_ref = [""];
    cutsceneDest: string_ref = [""];
    sound_id: string_ref = [""];
    // #endif

    constructor() {
        super();
        // #ifdef IS_DEV_BUILD
        this.actorNames = JSON.parse(fse.readFileSync(path.resolve(__dirname, "ACTOR_NAMES.json")).toString());
        // #endif
    }

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

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChanged(scene: Scene) {
        this.scene = scene;
    }

    @EventHandler(OotEvents.ON_LOADING_ZONE)
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
    };

    getActorBehavior(
        emulator: IMemory,
        actor: IActor,
        offset: number
    ): number {
        let id: number = actor.actorID;
        let overlay_table: number = global.ModLoader['overlay_table'];
        let overlay_entry = overlay_table + id * 32;
        let behavior_start = overlay_entry + 0x10;
        let pointer = emulator.dereferencePointer(behavior_start);
        let behavior = actor.dereferencePointer(offset);
        return behavior - pointer;
    }

    setActorBehavior(
        emulator: IMemory,
        actor: IActor,
        offset: number,
        behavior: number
    ) {
        let id: number = actor.actorID;
        let overlay_table: number = global.ModLoader['overlay_table'];
        let overlay_entry = overlay_table + id * 32;
        let behavior_start = overlay_entry + 0x10;
        let pointer = emulator.dereferencePointer(behavior_start);
        let behavior_result = pointer + behavior;
        actor.rdramWrite32(offset, behavior_result + 0x80000000);
    }

    @onViUpdate()
    onViUpdate() {
        super.onViUpdate();
        if (this.font === undefined) {
            try {
                this.font = this.ModLoader.Gfx.createFont();
                this.font.loadFromFile(path.resolve(__dirname, "HyliaSerifBeta-Regular.otf"), 22, 2);
                changeKillfeedFont(this.font);
                global.ModLoader["FONT"] = this.font;
            } catch (err) {
                this.ModLoader.logger.error(err);
            }
            return;
        }

        // #ifdef IS_DEV_BUILD
        if (this.core.OOT!.helper.isTitleScreen()) {
            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), this.font, "Z64Online", xy(2, this.ModLoader.ImGui.getWindowHeight() - 100), rgba(255, 255, 255, 255), rgba(0, 0, 0, 255), xy(1, 1));
            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), this.font, `Version: ${VERSION_NUMBER}`, xy(2, this.ModLoader.ImGui.getWindowHeight() - 68), rgba(255, 255, 255, 255), rgba(0, 0, 0, 255), xy(1, 1));
            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), this.font, `Build Date: ${BUILD_DATE}`, xy(2, this.ModLoader.ImGui.getWindowHeight() - 36), rgba(255, 255, 255, 255), rgba(0, 0, 0, 255), xy(1, 1));
        }
        // #endif

        if (this.ModLoader.isModLoaded("Multiworld64")) {
            if (this.ModLoader.ImGui.begin("MULTIWORLD64 WARNING")) {
                this.ModLoader.ImGui.text("You appear to be running Multiworld64.");
                this.ModLoader.ImGui.text("This mod is unnecessary as OotO 3.X natively supports multiworld.");
                this.ModLoader.ImGui.text("You should delete Multiworld64 to avoid conflicts.");
            }
            this.ModLoader.ImGui.end();
        }

        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("Z64O")) {
                    if (this.ModLoader.ImGui.beginMenu("General Settings")) {
                        if (this.ModLoader.ImGui.menuItem("Mute custom sounds (local)", undefined, this.settings.muteLocalSounds)) {
                            this.settings.muteLocalSounds = !this.settings.muteLocalSounds;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Mute custom sounds (remote)", undefined, this.settings.muteNetworkedSounds)) {
                            this.settings.muteNetworkedSounds = !this.settings.muteNetworkedSounds;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Show nameplates", undefined, this.settings.nameplates, true)) {
                            this.settings.nameplates = !this.settings.nameplates;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Show notifications", undefined, this.settings.notifications, true)) {
                            this.settings.notifications = !this.settings.notifications
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Notification Sounds", undefined, this.settings.notificationSound)) {
                            this.settings.notificationSound = !this.settings.notificationSound;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Diagnostic Mode", undefined, this.settings.diagnosticMode)) {
                            this.settings.diagnosticMode = !this.settings.diagnosticMode;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Autosave", undefined, this.settings.autosaves)) {
                            this.settings.autosaves = !this.settings.autosaves;
                            this.ModLoader.config.save();
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Sync Settings")) {
                        if (this.ModLoader.ImGui.menuItem("Sync Masks", undefined, this.settings.syncMasks)) {
                            this.settings.syncMasks = !this.settings.syncMasks;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Sync Bottle Contents", undefined, this.settings.syncBottleContents)) {
                            this.settings.syncBottleContents = !this.settings.syncBottleContents;
                            this.ModLoader.config.save();
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    // #ifdef IS_DEV_BUILD
                    if (this.ModLoader.ImGui.beginMenu("Game Sounds")) {
                        this.ModLoader.ImGui.inputText("sound id", this.sound_id);
                        if (this.ModLoader.ImGui.button("play")) {
                            this.core.OOT!.commandBuffer.runCommand(Command.PLAYSOUND, parseInt(this.sound_id[0]));
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Teleport")) {
                        this.ModLoader.ImGui.inputText("Destination", this.teleportDest);
                        this.ModLoader.ImGui.inputText("Cutscene", this.cutsceneDest);
                        if (this.ModLoader.ImGui.button("Warp")) {
                            this.core.OOT!.commandBuffer.runWarp(parseInt(this.teleportDest[0], 16), parseInt(this.cutsceneDest[0], 16), () => { });
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.button("DUMP RAM")) {
                        bus.emit(Z64OnlineEvents.DEBUG_DUMP_RAM, {});
                    }
                    if (this.ModLoader.ImGui.button("PRINT LINK POS")) {
                        console.log(JSON.stringify(this.core.OOT!.link.position.getVec3()));
                    }
                    // #endif
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }

        if (!this.settings.nameplates) {
            return;
        }

        for (let i = 0; i < this.puppets.length; i++) {
            if (this.puppets[i].scene === this.scene) {
                try {
                    if (this.puppets[i] !== undefined) {
                        let lp = this.ModLoader.math.rdramReadV3(this.puppets[i].data.pointer + 0x38);
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
                                let tsxy = this.ModLoader.Gfx.calcTextSize(this.font, text, xy(sxy * x_scale, sxy * y_scale))

                                this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getWindowDrawList(), this.font, text,
                                    xy(winX - (tsxy.x / 2), winY - (tsxy.y / 2)),
                                    rgba(255, 255, 255, 255), rgba(0, 0, 0, 255),
                                    xy(sxy * x_scale, sxy * y_scale));
                            }
                        }
                    }
                } catch (err) { this.ModLoader.logger.error(err); }
            }
        }
    }

}