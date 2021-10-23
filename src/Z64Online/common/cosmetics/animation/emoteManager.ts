import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { EventHandler, PrivateEventHandler } from "modloader64_api/EventHandler";
import { Z64OnlineEvents, Z64Emote_Emote, RemoteSoundPlayRequest } from '@Z64Online/common/api/Z64API';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { onTick, onViUpdate, Postinit } from "modloader64_api/PluginLifecycle";
import { Sound, SoundSourceStatus } from "modloader64_api/Sound/sfml_audio";
import { bool_ref, WindowFlags } from "modloader64_api/Sylvain/ImGui";
import { OotOnlineConfigCategory } from "@Z64Online/oot/OotOnline";
import { Core, LinkStandingState } from "@Z64Online/common/types/Types";
import { IMGUI_LABELS } from "@Z64Online/common/lib/Labels";
import Z64Serialize from "@Z64Online/common/storage/Z64Serialize";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";
import { Z64O_EmoteLoadPacket, Z64O_EmotePlayPacket, Z64O_EmoteRequestPacket } from "@Z64Online/common/network/Z64OPackets";
import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { getLinkPos } from "@Z64Online/common/types/GameAliases";
import Vector3 from "modloader64_api/math/Vector3";
import { CommonConfigInst, volume_local, volume_remote } from "@Z64Online/common/lib/Settings";
import { Z64O_PRIVATE_EVENTS } from "@Z64Online/common/api/InternalAPI";

export class EmoteManager {
    isCurrentlyPlayingEmote: boolean = false;
    currentEmoteID: number = -1;
    currentEmoteFrame: number = 0;
    masterEmoteList: Array<anim_binary_container> = [];
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: Core;
    displayingEmoteWindow: bool_ref = [false];
    currentEmoteSoundID: number = 0x0000;
    emoteSounds: Map<number, Sound> = new Map();
    remoteEmoteSounds: Map<string, Map<number, Sound>> = new Map();
    loadedEmotes: Array<string> = [];

    @EventHandler(Z64OnlineEvents.ON_REGISTER_EMOTE)
    onRegisterEmote(emote: Z64Emote_Emote) {
        let s: Sound | undefined;
        let id: number | undefined;
        let e = new anim_binary_container(emote.name, emote.buf, s, emote.sound, id);
        if (emote.sound !== undefined) {
            s = this.ModLoader.sound.initSound(emote.sound);
            e.sound = s;
            id = this.currentEmoteSoundID++;
            e.soundid = id;
        }
        e.loops = emote.loops;
        this.masterEmoteList.push(e);
    }

    @onViUpdate()
    onViUpdate() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu(IMGUI_LABELS.MOD_NAME)) {
                    if (this.ModLoader.ImGui.menuItem("Emotes")) {
                        this.displayingEmoteWindow[0] = !this.displayingEmoteWindow[0];
                    }
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
        if (this.displayingEmoteWindow[0]) {
            if (this.ModLoader.ImGui.begin("Emotes###OotO:Emotes", this.displayingEmoteWindow, WindowFlags.NoCollapse)) {
                if (this.isCurrentlyPlayingEmote) {
                    if (this.ModLoader.ImGui.smallButton("Stop")) {
                        try {
                            this.masterEmoteList[this.currentEmoteID].sound!.stop();
                        } catch (err: any) { }
                        this.isCurrentlyPlayingEmote = false;
                        this.core.OOT!.link.redeadFreeze = 0x0;
                        this.currentEmoteFrame = -1;
                        this.currentEmoteID = -1;
                    }
                }
                if (this.masterEmoteList.length > 0) {
                    for (let i = 0; i < this.masterEmoteList.length; i++) {
                        if (this.masterEmoteList[i].name !== "") {
                            this.ModLoader.ImGui.text(this.masterEmoteList[i].name);
                            this.ModLoader.ImGui.sameLine();
                            if (this.ModLoader.ImGui.button("Play###OotO:Emotes:" + this.masterEmoteList[i].name)) {
                                if (this.core.OOT!.link.state === LinkStandingState) {
                                    this.currentEmoteID = i;
                                    this.isCurrentlyPlayingEmote = true;
                                }
                            }
                        }
                    }
                }
                this.ModLoader.ImGui.end();
            }
        }
    }

    @Postinit()
    onPost() {
        for (let i = 0; i < this.masterEmoteList.length; i++) {
            let u = new EmoteUploadContainer(this.masterEmoteList[i].name, this.masterEmoteList[i].data, this.masterEmoteList[i].soundBuffer, this.masterEmoteList[i].soundid);
            let comp = Z64Serialize.serializeSync(u);
            CDNClient.singleton.askCDN(comp).then((has: boolean) => {
                if (!has) {
                    let hash = this.ModLoader.utils.hashBuffer(comp);
                    CDNClient.singleton.uploadFile(hash, comp).then((done: boolean) => {
                        if (done) {
                            this.ModLoader.clientSide.sendPacket(new Z64O_EmoteLoadPacket(hash, this.ModLoader.clientLobby));
                            this.loadedEmotes.push(hash);
                        }
                    });
                }
            });
        }
    }

    @NetworkHandler('Z64O_EmoteLoadPacket')
    onRegisteredEmote(packet: Z64O_EmoteLoadPacket) {
        CDNClient.singleton.requestFile(packet.id).then((buf: Buffer) => {
            if (!this.remoteEmoteSounds.has(packet.player.uuid)) {
                this.remoteEmoteSounds.set(packet.player.uuid, new Map());
            }
            let data: EmoteUploadContainer = Z64Serialize.deserializeSync(buf);
            if (data.id !== undefined) {
                this.remoteEmoteSounds.get(packet.player.uuid)!.set(data.id!, this.ModLoader.sound.initSound(data.sound!));
            }
        });
    }

    @NetworkHandler('Z64O_EmoteRequestPacket')
    onRequest(packet: Z64O_EmoteRequestPacket) {
        for (let i = 0; i < this.loadedEmotes.length; i++) {
            this.ModLoader.clientSide.sendPacketToSpecificPlayer(new Z64O_EmoteLoadPacket(this.loadedEmotes[i], this.ModLoader.clientLobby), packet.player);
        }
    }

    @NetworkHandler('Z64O_EmotePlayPacket')
    onPlay(packet: Z64O_EmotePlayPacket) {
        if (this.remoteEmoteSounds.has(packet.player.uuid)) {
            if (this.remoteEmoteSounds.get(packet.player.uuid)!.has(packet.req.sound_id)) {
                let s = this.remoteEmoteSounds.get(packet.player.uuid)!.get(packet.req.sound_id)!
                let v = new Vector3(packet.req.pos.readFloatBE(0), packet.req.pos.readFloatBE(4), packet.req.pos.readFloatBE(8));
                s.position = v;
                s.minDistance = 250.0
                s.volume = (Math.floor((volume_remote[0] * 100)));
                s.play();
            }
        }
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CHANGE_LOCAL_VOLUME)
    onVolume1() {
        this.onVolume3();
    }

    @PrivateEventHandler(Z64O_PRIVATE_EVENTS.CHANGE_REMOTE_VOLUME)
    onVolume2() {
        this.onVolume3();
    }

    onVolume3() {
        for (let i = 0; i < this.masterEmoteList.length; i++) {
            if (this.masterEmoteList[i].sound !== undefined) {
                this.masterEmoteList[i].sound!.volume = Math.floor((volume_local[0] * 100));
            }
        }
        this.remoteEmoteSounds.forEach((value: Map<number, Sound>, key: string) => {
            value.forEach((s: Sound) => {
                s.volume = Math.floor((volume_remote[0] * 100));
            });
        });
    }

    @onTick()
    onTick(frame: number) {
        if (this.isCurrentlyPlayingEmote) {
            if (this.currentEmoteFrame === 5 && this.masterEmoteList[this.currentEmoteID].sound !== undefined) {
                if (!CommonConfigInst.muteLocalSounds) {
                    if (this.masterEmoteList[this.currentEmoteID].sound!.status !== SoundSourceStatus.Playing) {
                        let s = this.masterEmoteList[this.currentEmoteID].sound!;
                        let pos = getLinkPos(this.core);
                        s.position = new Vector3(pos.readFloatBE(0), pos.readFloatBE(4), pos.readFloatBE(8));
                        s.minDistance = 250;
                        s.volume = (Math.floor((volume_local[0] * 100)));
                        s.play();
                        this.ModLoader.clientSide.sendPacket(new Z64O_EmotePlayPacket(new RemoteSoundPlayRequest(this.ModLoader.me, pos, this.currentEmoteID), this.ModLoader.clientLobby));
                        this.core.OOT!.link.current_sound_id = this.masterEmoteList[this.currentEmoteID].soundid!;
                    }
                }
            }
            this.core.OOT!.link.redeadFreeze = 0x3;
            this.core.OOT!.link.anim_data = this.masterEmoteList[this.currentEmoteID].readAnimFrame(this.currentEmoteFrame);
            this.currentEmoteFrame++;
            if (this.currentEmoteFrame > this.masterEmoteList[this.currentEmoteID].getTotalFrames()) {
                if (this.masterEmoteList[this.currentEmoteID].loops) {
                    this.currentEmoteFrame = 0;
                } else {
                    this.isCurrentlyPlayingEmote = false;
                    this.core.OOT!.link.redeadFreeze = 0x0;
                    this.currentEmoteFrame = -1;
                }
            }
        }
    }
}

class EmoteUploadContainer {
    name: string;
    data: Buffer;
    id?: number;
    sound?: Buffer;

    constructor(name: string, data: Buffer, sound?: Buffer, id?: number) {
        this.name = name;
        this.id = id;
        this.data = data;
        this.sound = sound;
    }
}

class anim_binary_container {

    name: string;
    data: Buffer;
    sound?: Sound;
    soundBuffer?: Buffer;
    soundid?: number;
    loops: boolean;

    constructor(name: string, buf: Buffer, sound: Sound | undefined = undefined, soundBuffer: Buffer | undefined = undefined, id: number | undefined = undefined, loops: boolean = false) {
        this.name = name;
        this.data = buf;
        this.sound = sound;
        this.soundid = id;
        this.soundBuffer = soundBuffer;
        this.loops = loops;
    }

    getTotalFrames() {
        return this.data.byteLength / 0x86;
    }

    readAnimFrame(frame: number) {
        return this.data.slice((frame * 0x86), (frame * 0x86) + 0x86);
    }
}