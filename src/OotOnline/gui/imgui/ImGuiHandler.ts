import { onViUpdate, onTick } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IOOTCore, OotEvents, Scene } from "modloader64_api/OOT/OOTAPI";
import { Puppet } from "@OotOnline/data/linkPuppet/Puppet";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { Z64OnlineEvents } from "@OotOnline/common/api/Z64API";
import Vector3 from "modloader64_api/math/Vector3";
import { glmatrix_matrix4, glmatrix_vec4 } from 'modloader64_api/math/glmatrix';
import { xywh, rgba, xy } from "modloader64_api/Sylvain/vec";
import { Font } from "modloader64_api/Sylvain/Gfx";
import path from 'path';
import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { BUILD_DATE, OotOnlineConfigCategory, VERSION_NUMBER } from "@OotOnline/OotOnline";
import { changeKillfeedFont } from "modloader64_api/Announcements";
import IMemory from "modloader64_api/IMemory";
import { IActor } from "modloader64_api/OOT/IActor";
import fse from 'fs-extra';
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { OpaDebug } from "./OpaDebug";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IZ64OnlineHelpers } from "@OotOnline/common/lib/IZ64OnlineHelpers";

function buf2hex(buffer: Buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function v3toTruncatedString(v3: Vector3, fixed: number = 4): string {
    return "(" + v3.x.toFixed(fixed).toString() + ", " + v3.y.toFixed(fixed).toString() + ", " + v3.z.toFixed(fixed).toString() + ")";
}

export class ImGuiHandler {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    @ParentReference()
    parent!: IZ64OnlineHelpers;
    puppets: Array<Puppet> = [];
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
    showActorBrowser: boolean = false;
    actorCategories: Array<string> = ["Switches", "Backgrounds", "Player", "Bomb", "NPC", "Enemy", "Prop", "Item", "Misc", "Boss", "Door", "Chest"];
    actorNames: any;
    curActor: number = 0;
    raddeg: number = Math.PI / 32768
    actor_data: Buffer = Buffer.alloc(0x13C);
    opa!: OpaDebug;
    // #endif

    constructor() {
        // #ifdef IS_DEV_BUILD
        this.actorNames = JSON.parse(fse.readFileSync(path.resolve(__dirname, "ACTOR_NAMES.json")).toString());
        // #endif
    }

    @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
    onPuppetSpawn(puppet: Puppet) {
        this.puppets.push(puppet);
    }

    @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_DESPAWNED)
    onPuppetDespawn(puppet: Puppet) {
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
        if (this.font === undefined) {
            try {
                this.font = this.ModLoader.Gfx.createFont();
                this.font.loadFromFile(path.resolve(__dirname, "HyliaSerifBeta-Regular.otf"), 22, 2);
                changeKillfeedFont(this.font);
                global.ModLoader["FONT"] = this.font;
            } catch (err) {
                this.ModLoader.logger.error(err);
            }
            // #ifdef IS_DEV_BUILD
            this.opa = new OpaDebug(this.ModLoader.ImGui, this.ModLoader.emulator, this.core, this.ModLoader);
            // #endif
            return;
        }

        // #ifdef IS_DEV_BUILD
        if (this.core.helper.isTitleScreen()){
            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), this.font, "OotOnline", xy(2, this.ModLoader.ImGui.getWindowHeight() - 100), rgba(255, 255, 255, 255), rgba(0, 0, 0, 255), xy(1, 1));
            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), this.font, `Version: ${VERSION_NUMBER}`, xy(2, this.ModLoader.ImGui.getWindowHeight() - 68), rgba(255, 255, 255, 255), rgba(0, 0, 0, 255), xy(1, 1));
            this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), this.font, `Build Date: ${BUILD_DATE}`, xy(2, this.ModLoader.ImGui.getWindowHeight() - 36), rgba(255, 255, 255, 255), rgba(0, 0, 0, 255), xy(1, 1));
        }
        // #endif

        // #ifdef IS_DEV_BUILD
        if (this.opa !== undefined) {
            this.opa.onViUpdate();
        }
        // #endif

        if (this.ModLoader.isModLoaded("Multiworld64")){
            if (this.ModLoader.ImGui.begin("MULTIWORLD64 WARNING")){
                this.ModLoader.ImGui.text("You appear to be running Multiworld64.");
                this.ModLoader.ImGui.text("This mod is unnecessary as OotO 3.X natively supports multiworld.");
                this.ModLoader.ImGui.text("You should delete Multiworld64 to avoid conflicts.");
            }
            this.ModLoader.ImGui.end();
        }

        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")) {
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
                        if (this.ModLoader.ImGui.menuItem("Notification Sounds", undefined, this.settings.notificationSound)){
                            this.settings.notificationSound = !this.settings.notificationSound;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Diagnostic Mode", undefined, this.settings.diagnosticMode)){
                            this.settings.diagnosticMode = !this.settings.diagnosticMode;
                            this.ModLoader.config.save();
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Sync Settings")){
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
                    if (this.ModLoader.ImGui.beginMenu("Game Sounds")){
                        this.ModLoader.ImGui.inputText("sound id", this.sound_id);
                        if (this.ModLoader.ImGui.button("play")){
                            this.core.commandBuffer.runCommand(Command.PLAY_SOUND, parseInt(this.sound_id[0]));
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Teleport")) {
                        this.ModLoader.ImGui.inputText("Destination", this.teleportDest);
                        this.ModLoader.ImGui.inputText("Cutscene", this.cutsceneDest);
                        if (this.ModLoader.ImGui.button("Warp")) {
                            this.core.commandBuffer.runWarp(parseInt(this.teleportDest[0], 16), parseInt(this.cutsceneDest[0], 16), () => { });
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.menuItem("Actor Browser")) {
                        this.showActorBrowser = !this.showActorBrowser;
                    }
                    if (this.ModLoader.ImGui.button("DUMP RAM")) {
                        bus.emit(Z64OnlineEvents.DEBUG_DUMP_RAM, {});
                    }
                    // #endif
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }

        // #ifdef IS_DEV_BUILD
        if (this.showActorBrowser) {
            let treeNodeDepth = 0;
            if (this.ModLoader.ImGui.begin("Actor Browser###OotO:ActorDebug")) {
                this.ModLoader.ImGui.columns(2, "###ActorView", true)

                let offset = 0x1C30;
                for (let i = 0; i < 12; i++) {
                    treeNodeDepth++;
                    let ptr = this.ModLoader.emulator.rdramRead32(global.ModLoader.global_context_pointer);
                    ptr += offset + (i * 8) + 4;
                    if (this.ModLoader.ImGui.treeNode(this.actorCategories[i] + "###OotO:ActorDebugTree" + treeNodeDepth)) {
                        this.ModLoader.ImGui.sameLine()
                        this.ModLoader.ImGui.textDisabled(ptr.toString(16).toUpperCase())

                        if (this.ModLoader.emulator.rdramReadPtr32(global.ModLoader.global_context_pointer, offset + (i * 8)) === 0) {
                            this.ModLoader.ImGui.treePop();
                            continue;
                        }

                        let next = this.ModLoader.emulator.rdramReadPtr32(global.ModLoader.global_context_pointer, offset + (i * 8) + 4);

                        while (next !== 0) {
                            let name = this.actorNames["0x" + this.ModLoader.emulator.rdramRead16(next).toString(16).toUpperCase()];
                            if (name === undefined) {
                                name = "Unknown actor";
                            }

                            if (this.ModLoader.ImGui.menuItem(name + "###OotO:ActorDebugTree" + next.toString(16), undefined, this.curActor === next)) {
                                this.curActor = next;
                            }
                            next = this.ModLoader.emulator.rdramRead32(next + 0x124);
                        }

                        this.ModLoader.ImGui.treePop();
                    }
                }

                this.ModLoader.ImGui.nextColumn()

                let actor = this.core.actorManager.createIActorFromPointer(this.curActor);
                let actor_size = this.ModLoader.emulator.rdramRead32(this.ModLoader.emulator.rdramRead32(this.ModLoader.emulator.rdramRead32(this.curActor + (0x13C - 4)) + 0x14) + 0xC)

                if (actor_size === 0) actor_size = 0x13C

                this.ModLoader.ImGui.textDisabled("UUID: " + actor.actorUUID.toUpperCase())
                this.ModLoader.ImGui.textDisabled("Address: " + this.curActor.toString(16).toUpperCase())

                this.ModLoader.ImGui.text("Actor ID: " + actor.actorID.toString(16).toUpperCase().padStart(4, "0")); this.ModLoader.ImGui.sameLine()
                this.ModLoader.ImGui.text("Actor Type: " + actor.actorType.toString(16).toUpperCase()); this.ModLoader.ImGui.sameLine()
                this.ModLoader.ImGui.text("Variable: " + actor.variable.toString(16).toUpperCase()); this.ModLoader.ImGui.sameLine()
                this.ModLoader.ImGui.text("Room: " + actor.room.toString(16).toUpperCase())
                this.ModLoader.ImGui.text("Render Flags: " + actor.renderingFlags.toString(16).toUpperCase())

                this.ModLoader.ImGui.text("Health: " + actor.health.toString())
                this.ModLoader.ImGui.text("Object Table Index: " + actor.objectTableIndex.toString(16))
                this.ModLoader.ImGui.text("Redead Freeze: " + actor.redeadFreeze.toString(16).toUpperCase())
                this.ModLoader.ImGui.text("Sound Effect: " + actor.soundEffect.toString(16).toUpperCase())

                this.ModLoader.ImGui.text("Position: " + v3toTruncatedString(actor.position.getVec3()));
                this.ModLoader.ImGui.text("Rotation: " + v3toTruncatedString(actor.rotation.getVec3().multiplyN(this.raddeg)));
                this.ModLoader.ImGui.text("Sizeof: " + actor_size.toString(16).toUpperCase())

                if (this.ModLoader.ImGui.treeNode("Hex" + "###" + this.curActor.toString(16))) {
                    this.actor_data = this.ModLoader.emulator.rdramReadBuffer(this.curActor, actor_size)

                    this.ModLoader.ImGui.sameLine(undefined, 12)
                    if (this.ModLoader.ImGui.button("Copy")) {
                        this.ModLoader.ImGui.setClipboardText(buf2hex(this.actor_data).toUpperCase())
                    }

                    let width = this.ModLoader.ImGui.getContentRegionAvail().x - 20
                    let current_offset = 0

                    this.ModLoader.ImGui.beginChildFrame(1, xy(width, 320))

                    for (let i = 0; i < actor_size; i += 4) {
                        current_offset += 8

                        if (current_offset >= width - 64) {
                            this.ModLoader.ImGui.newLine()
                            current_offset = 8
                        }

                        for (let j = 0; j < 4; j++) {
                            this.ModLoader.ImGui.sameLine(current_offset - j, 0)
                            this.ModLoader.ImGui.textDisabled(buf2hex(this.actor_data.slice(i + j, i + j + 1)).toUpperCase())
                            current_offset += 20
                        }

                        current_offset += 8
                    }

                    this.ModLoader.ImGui.endChildFrame()

                    this.ModLoader.ImGui.treePop()
                }

                if (this.ModLoader.ImGui.smallButton(this.raddeg === (Math.PI / 32768) ? "Radians" : "Degrees")) {
                    this.raddeg = this.raddeg == (Math.PI / 32768) ? (180 / 32769) : (Math.PI / 32768)
                }

                this.ModLoader.ImGui.sameLine()
                if (this.ModLoader.ImGui.smallButton("Move to Link")) {
                    let pos = this.core.link.position.getRawPos();
                    let rot = this.core.link.rotation.getRawRot();
                    actor.position.setRawPos(pos);
                    actor.rotation.setRawRot(rot);
                }
                if (this.ModLoader.ImGui.smallButton("Move Link to Actor")) {
                    let pos = actor.position.getRawPos();
                    let rot = actor.rotation.getRawRot();
                    this.core.link.position.setRawPos(pos);
                    this.core.link.rotation.setRawRot(rot);
                }

                if (this.ModLoader.ImGui.smallButton("Kill Actor")) {
                    actor.destroy();
                }
            }
            this.ModLoader.ImGui.end();
        }
        // #endif

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