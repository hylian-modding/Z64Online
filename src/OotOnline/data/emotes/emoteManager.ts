import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IOOTCore, LinkState } from "modloader64_api/OOT/OOTAPI";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { Z64OnlineEvents, Z64Emote_Emote } from '@OotOnline/Z64API/OotoAPI';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { onTick, onViUpdate, Postinit } from "modloader64_api/PluginLifecycle";
import { Sound, SoundSourceStatus } from "modloader64_api/Sound/sfml_audio";
import zlib from 'zlib';
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { bool_ref, WindowFlags } from "modloader64_api/Sylvain/ImGui";

export class EmoteManager {
    isCurrentlyPlayingEmote: boolean = false;
    currentEmoteID: number = -1;
    currentEmoteFrame: number = 0;
    masterEmoteList: Array<anim_binary_container> = [];
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    displayingEmoteWindow: bool_ref = [false];
    currentEmoteSoundID: number = 0xFF00;
    muteAll: bool_ref = [false];

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
        if (emote.builtIn !== undefined) {
            e.isBuiltInEmote = emote.builtIn;
        }
        e.loops = emote.loops;
        this.masterEmoteList.push(e);
    }

    @onViUpdate()
    onViUpdate() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")) {
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
                if (this.ModLoader.ImGui.checkbox("Mute All", this.muteAll)) {
                }
                if (this.isCurrentlyPlayingEmote) {
                    if (this.ModLoader.ImGui.smallButton("Stop")) {
                        try {
                            this.masterEmoteList[this.currentEmoteID].sound!.stop();
                        } catch (err) { }
                        this.isCurrentlyPlayingEmote = false;
                        this.core.link.redeadFreeze = 0x0;
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
                                if (this.core.link.state === LinkState.STANDING) {
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
        let rawSound: any = {};
        for (let i = 0; i < this.masterEmoteList.length; i++) {
            if (this.masterEmoteList[i].soundid !== undefined && !this.masterEmoteList[i].isBuiltInEmote) {
                let arr: Array<Buffer> = [];
                arr.push(zlib.deflateSync(this.masterEmoteList[i].soundBuffer!));
                rawSound[this.masterEmoteList[i].soundid!] = arr;
            }
        }
        bus.emit(Z64OnlineEvents.ON_LOAD_SOUND_PACK, rawSound);
    }

    @onTick()
    onTick(frame: number) {
        if (this.isCurrentlyPlayingEmote) {
            if (this.currentEmoteFrame === 5 && this.masterEmoteList[this.currentEmoteID].sound !== undefined) {
                if (this.masterEmoteList[this.currentEmoteID].sound!.status !== SoundSourceStatus.Playing) {
                    if (!this.muteAll[0]) {
                        this.masterEmoteList[this.currentEmoteID].sound!.play();
                    }
                    if (!this.masterEmoteList[this.currentEmoteID].isBuiltInEmote) {
                        this.core.link.current_sound_id = this.masterEmoteList[this.currentEmoteID].soundid!;
                    } else {
                        this.ModLoader.clientSide.sendPacket(new OotO_PlayBuiltInEmotePacket(this.masterEmoteList[this.currentEmoteID].name, this.core.global.scene, this.ModLoader.clientLobby));
                    }
                }
            }
            this.core.link.redeadFreeze = 0x3;
            this.core.link.anim_data = this.masterEmoteList[this.currentEmoteID].readAnimFrame(this.currentEmoteFrame);
            this.currentEmoteFrame++;
            if (this.currentEmoteFrame > this.masterEmoteList[this.currentEmoteID].getTotalFrames()) {
                if (this.masterEmoteList[this.currentEmoteID].loops){
                    this.currentEmoteFrame = 0;
                }else{
                    this.isCurrentlyPlayingEmote = false;
                    this.core.link.redeadFreeze = 0x0;
                    this.currentEmoteFrame = -1;
                }
            }
        }
    }

    @NetworkHandler("OotO_PlayBuiltInEmotePacket")
    onEmotePacket(packet: OotO_PlayBuiltInEmotePacket) {
        for (let i = 0; i < this.masterEmoteList.length; i++) {
            if (this.masterEmoteList[i].name === packet.emote) {
                if (this.masterEmoteList[i].sound !== undefined) {
                    if (this.masterEmoteList[i].sound!.status !== SoundSourceStatus.Playing) {
                        if (!this.muteAll[0]) {
                            if (this.core.global.scene === packet.scene) {
                                this.masterEmoteList[i].sound!.play();
                            }
                        }
                    }
                }
            }
        }
    }
}

export class OotO_PlayBuiltInEmotePacket extends Packet {

    emote: string;
    scene: number;

    constructor(emote: string, scene: number, lobby: string) {
        super("OotO_PlayBuiltInEmotePacket", "OotOnline", lobby, true);
        this.emote = emote;
        this.scene = scene;
    }
}

export class anim_binary_container {

    name: string;
    data: Buffer;
    sound?: Sound;
    soundBuffer?: Buffer;
    soundid?: number;
    isBuiltInEmote: boolean = false;
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