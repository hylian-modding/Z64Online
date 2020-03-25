import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { EventHandler } from "modloader64_api/EventHandler";
import {OotOnlineEvents, OotOnline_Emote} from '@OotOnline/OotoAPI/OotoAPI';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { onTick } from "modloader64_api/PluginLifecycle";

export class EmoteManager{
    private emote_trigger: number = 0x6011F0;
    isCurrentlyPlayingEmote: boolean = false;
    currentEmoteID: number = -1;
    currentEmoteFrame: number = 0;
    masterEmoteList: Array<anim_binary_container> = [];
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;

    constructor(){
        // Dummy emote to eat slot 0.
        this.masterEmoteList.push(new anim_binary_container(Buffer.alloc(1)));
    }

    @EventHandler(OotOnlineEvents.ON_REGISTER_EMOTE)
    onRegisterEmote(emote: OotOnline_Emote){
        this.masterEmoteList.push(new anim_binary_container(emote.buf));
    }

    @onTick()
    onTick(frame: number){
        if (this.isCurrentlyPlayingEmote){
            this.core.link.redeadFreeze = 0x3;
            this.core.link.anim_data = this.masterEmoteList[this.currentEmoteID].readAnimFrame(this.currentEmoteFrame);
            this.currentEmoteFrame++;
            if (this.currentEmoteFrame > this.masterEmoteList[this.currentEmoteID].getTotalFrames()){
                this.isCurrentlyPlayingEmote = false;
                this.core.link.redeadFreeze = 0x0;
            }
        }else{
            let em: number = this.ModLoader.emulator.rdramRead8(this.emote_trigger);
            if (em !== 0x0){
                this.currentEmoteID = em;
                this.ModLoader.emulator.rdramWrite8(this.emote_trigger, 0x0);
                this.currentEmoteFrame = -1;
                this.isCurrentlyPlayingEmote = true;
            }
        }
    }
}

export class anim_binary_container{

    data: Buffer;

    constructor(buf: Buffer){
        this.data = buf;
    }

    getTotalFrames(){
        return this.data.byteLength / 0x86;
    }

    readAnimFrame(frame: number){
        return this.data.slice((frame * 0x86), (frame * 0x86) + 0x86);
    }
}