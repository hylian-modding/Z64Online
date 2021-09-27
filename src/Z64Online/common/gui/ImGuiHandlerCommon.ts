import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IActor } from "Z64Lib/API/imports";
import { Z64_GLOBAL_PTR } from "Z64Lib/src/Common/types/GameAliases";
import Vector3 from "modloader64_api/math/Vector3";
import { xy } from "modloader64_api/Sylvain/vec";
import { openMemoryUtils3Tab } from "../compat/MemoryUtils3";

function buf2hex(buffer: Buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function v3toTruncatedString(v3: Vector3, fixed: number = 4): string {
    return "(" + v3.x.toFixed(fixed).toString() + ", " + v3.y.toFixed(fixed).toString() + ", " + v3.z.toFixed(fixed).toString() + ")";
}

export abstract class ImGuiHandlerCommon {

    ModLoader!: IModLoaderAPI;
    core!: IZ64Main;

    // #ifdef IS_DEV_BUILD
    showSpawner: boolean = false;
    spawnID: string_ref = [""];
    spawnParam: string_ref = [""];
    spawnParam2: string_ref = [""];
    showActorBrowser: boolean = false;
    actorCategories: Array<string> = ["Switches", "Backgrounds", "Player", "Bomb", "NPC", "Enemy", "Prop", "Item", "Misc", "Boss", "Door", "Chest"];
    actorNames: any;
    curActor: number = 0;
    raddeg: number = Math.PI / 32768
    actor_data: Buffer = Buffer.alloc(0x13C);
    // #endif

    onViUpdate() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("Z64O")) {
                    // #ifdef IS_DEV_BUILD
                    if (this.ModLoader.ImGui.menuItem("Actor Spawner")) {
                        this.showSpawner = true;
                    }
                    if (this.ModLoader.ImGui.menuItem("Actor Browser")) {
                        this.showActorBrowser = !this.showActorBrowser;
                    }
                    // #endif
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
        this.ModLoader.ImGui.end();
        // #ifdef IS_DEV_BUILD
        if (this.showSpawner) {
            if (this.ModLoader.ImGui.begin("Actor Spawner###OotO:ActorSpawner")) {
                this.ModLoader.ImGui.inputText("ID", this.spawnID);
                this.ModLoader.ImGui.inputText("Param", this.spawnParam);
                this.ModLoader.ImGui.inputText("Rot", this.spawnParam2);
                if (this.ModLoader.ImGui.smallButton("Spawn")) {
                    let _core = this.core.OOT !== undefined ? this.core.OOT : this.core.MM;
                    let pos = _core!.link.position.getVec3();
                    let rot = _core!.link.rotation.getVec3();
                    this.ModLoader.utils.setTimeoutFrames(() => {
                        _core!.commandBuffer.spawnActorRXY_Z(parseInt(this.spawnID[0], 16), parseInt(this.spawnParam[0], 16), parseInt(this.spawnParam2[0], 16), rot.z, pos).then((actor: IActor) => {
                            actor.position.setRawPos(_core!.link.position.getRawPos());
                            console.log(actor.pointer.toString(16));
                        });
                    }, 1);
                }
            }
            this.ModLoader.ImGui.end();
        }
        if (this.showActorBrowser) {
            let treeNodeDepth = 0;
            if (this.ModLoader.ImGui.begin("Actor Browser###OotO:ActorDebug")) {
                this.ModLoader.ImGui.columns(2, "###ActorView", true)

                let _core = this.core.OOT !== undefined ? this.core.OOT : this.core.MM!;
                for (let i = 0; i < 12; i++) {
                    let actors = _core.actorManager.getActors(i);
                    treeNodeDepth++;
                    if (this.ModLoader.ImGui.treeNode(this.actorCategories[i] + "###OotO:ActorDebugTree" + treeNodeDepth)) {
                        //this.ModLoader.ImGui.sameLine();
                        for (let j = 0; j < actors.length; j++) {
                            let name = this.actorNames["0x" + actors[j].actorID.toString(16).padStart(4, '0')];
                            if (name === undefined) {
                                name = "Unknown actor";
                            }
                            if (this.ModLoader.ImGui.menuItem(name + "###OotO:ActorDebugTree" + actors[j].pointer.toString(16), undefined, this.curActor === actors[j].pointer)) {
                                this.curActor = actors[j].pointer;
                            }
                        }
                        this.ModLoader.ImGui.treePop();
                    }
                }

                this.ModLoader.ImGui.nextColumn();

                let actor = _core.actorManager.createIActorFromPointer(this.curActor);
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
                    let pos = _core.link.position.getRawPos();
                    let rot = _core.link.rotation.getRawRot();
                    actor.position.setRawPos(pos);
                    actor.rotation.setRawRot(rot);
                }
                if (this.ModLoader.ImGui.smallButton("Move Link to Actor")) {
                    let pos = actor.position.getRawPos();
                    let rot = actor.rotation.getRawRot();
                    _core.link.position.setRawPos(pos);
                    _core.link.rotation.setRawRot(rot);
                }

                if (this.ModLoader.ImGui.smallButton("Kill Actor")) {
                    actor.destroy();
                }

                if (this.ModLoader.ImGui.smallButton("Clone Actor")) {
                    this.core.OOT!.commandBuffer.spawnActor(actor.actorID, actor.variable, this.core.OOT!.link.position.getVec3(), this.core.OOT!.link.rotation.getVec3());
                }

                if (this.ModLoader.isModLoaded("MemoryUtils3")) {
                    if (this.ModLoader.ImGui.smallButton("Open in MemoryUtils3")) {
                        openMemoryUtils3Tab(actor.pointer);
                    }
                }
            }
            this.ModLoader.ImGui.end();
        }
        // #endif
    }

}