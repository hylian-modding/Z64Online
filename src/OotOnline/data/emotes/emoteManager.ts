import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { OotOnlineEvents, OotOnline_Emote } from '@OotOnline/OotoAPI/OotoAPI';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { onTick, onViUpdate, Postinit } from "modloader64_api/PluginLifecycle";
import { Sound } from "modloader64_api/Sound/sfml_audio";
import zlib from 'zlib';

export class EmoteManager {
    isCurrentlyPlayingEmote: boolean = false;
    currentEmoteID: number = -1;
    currentEmoteFrame: number = 0;
    masterEmoteList: Array<anim_binary_container> = [];
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    displayingEmoteWindow: boolean = false;
    currentEmoteSoundID: number = 0xFF00;

    @EventHandler(OotOnlineEvents.ON_REGISTER_EMOTE)
    onRegisterEmote(emote: OotOnline_Emote) {
        let s: Sound | undefined;
        let id: number | undefined;
        if (emote.sound !== undefined) {
            console.log("LOADING EMOTE SOUND");
            s = this.ModLoader.sound.initSound(emote.sound);
            id = this.currentEmoteSoundID++;
        }
        this.masterEmoteList.push(new anim_binary_container(emote.name, emote.buf, s, emote.sound, id));
    }

    @onViUpdate()
    onViUpdate() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")) {
                    if (this.ModLoader.ImGui.menuItem("Emotes")) {
                        this.displayingEmoteWindow = !this.displayingEmoteWindow;
                    }
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
        if (this.displayingEmoteWindow) {
            if (this.ModLoader.ImGui.begin("Emotes###OotO:Emotes")) {
                if (this.masterEmoteList.length > 0) {
                    for (let i = 0; i < this.masterEmoteList.length; i++) {
                        if (this.masterEmoteList[i].name !== "") {
                            this.ModLoader.ImGui.text(this.masterEmoteList[i].name);
                            this.ModLoader.ImGui.sameLine();
                            if (this.ModLoader.ImGui.button("Play###OotO:Emotes:" + this.masterEmoteList[i])) {
                                this.currentEmoteID = i;
                                this.isCurrentlyPlayingEmote = true;
                            }
                        }
                    }
                }
                this.ModLoader.ImGui.end();
            }
        }
    }

    @Postinit()
    onPost(){
        let rawSound: any = {};
        for (let i = 0; i < this.masterEmoteList.length; i++){
            if (this.masterEmoteList[i].soundid !== undefined){
                let arr: Array<Buffer> = [];
                arr.push(zlib.deflateSync(this.masterEmoteList[i].soundBuffer!));
                rawSound[this.masterEmoteList[i].soundid!] = arr;
            }
        }
        bus.emit(OotOnlineEvents.ON_LOAD_SOUND_PACK, rawSound);
    }

    @onTick()
    onTick(frame: number) {
        if (this.isCurrentlyPlayingEmote) {
            if (this.currentEmoteFrame === 5 && this.masterEmoteList[this.currentEmoteID].sound !== undefined) {
                console.log("PLAYING EMOTE SOUND");
                this.masterEmoteList[this.currentEmoteID].sound!.play();
                this.core.link.current_sound_id = this.masterEmoteList[this.currentEmoteID].soundid!;
            }
            this.core.link.redeadFreeze = 0x3;
            this.core.link.anim_data = this.masterEmoteList[this.currentEmoteID].readAnimFrame(this.currentEmoteFrame);
            this.currentEmoteFrame++;
            if (this.currentEmoteFrame > this.masterEmoteList[this.currentEmoteID].getTotalFrames()) {
                this.isCurrentlyPlayingEmote = false;
                this.core.link.redeadFreeze = 0x0;
                this.currentEmoteFrame = -1;
            }
        }
    }
}

export class anim_binary_container {

    name: string;
    data: Buffer;
    sound?: Sound;
    soundBuffer?: Buffer;
    soundid?: number;

    constructor(name: string, buf: Buffer, sound: Sound | undefined = undefined, soundBuffer: Buffer | undefined = undefined, id: number | undefined = undefined) {
        this.name = name;
        this.data = buf;
        this.sound = sound;
        this.soundid = id;
        this.soundBuffer = soundBuffer;
    }

    getTotalFrames() {
        return this.data.byteLength / 0x86;
    }

    readAnimFrame(frame: number) {
        return this.data.slice((frame * 0x86), (frame * 0x86) + 0x86);
    }
}