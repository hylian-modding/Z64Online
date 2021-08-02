import { bus, EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { NetworkHandler, INetworkPlayer } from "modloader64_api/NetworkHandler";
import zlib from 'zlib';
import Vector3 from "modloader64_api/math/Vector3";
import { onTick, onViUpdate, Postinit } from 'modloader64_api/PluginLifecycle';
import * as sf from 'modloader64_api/Sound/sfml_audio';
import { Age, IOOTCore, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { Z64_EventConfig } from "@OotOnline/WorldEvents/Z64_EventConfig";
import { OotOnlineConfigCategory } from "@OotOnline/OotOnline";
import { SoundCategory_Adult, SoundCategory_Child } from "@OotOnline/data/sounds/SoundCategory";
import { number_ref } from "modloader64_api/Sylvain/ImGui";
import { CDNClient } from "@OotOnline/common/cdn/CDNClient";
import { RemoteSoundPlayRequest, Z64OnlineEvents } from "@OotOnline/common/api/Z64API";

export class OotO_SoundPackLoadPacket extends Packet {
    id: string;

    constructor(id: string, lobby: string) {
        super('OotO_SoundPackLoadPacket', 'OotOnline', lobby, true);
        this.id = id;
    }
}

export class OotO_SoundPackRequestPacket extends Packet {
    constructor(lobby: string) {
        super('OotO_SoundPackRequestPacket', 'OotOnline', lobby, true);
    }
}

export class SoundManagerClient {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    PlayerSounds: Map<string, Map<number, sf.Sound[]>> = new Map<string, Map<number, sf.Sound[]>>();
    rawSounds: any;
    SIZE_LIMIT: number = 10;
    nop: Buffer = Buffer.from('3C048060A4850088', 'hex');
    sounds: Map<number, Array<sf.Sound>> = new Map<number, Array<sf.Sound>>();
    localSoundPaks: Map<string, any> = new Map<string, any>();
    originalData!: Buffer;
    config!: Z64_EventConfig;
    client_config!: OotOnlineConfigCategory;
    hasAdult: boolean = false;
    hasChild: boolean = false;
    volume_local: number_ref = [1.0];
    volume_remote: number_ref = [1.0];
    currentID: string = "KILL";

    getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    @EventHandler(Z64OnlineEvents.ON_LOAD_SOUND_PACK)
    onSoundPackLoaded(evt: any) {
        try{
            Object.keys(evt.data).forEach((key: string) => {
                let arr: Array<Buffer> = evt.data[key];
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = zlib.inflateSync(arr[i]);
                }
            });
            this.localSoundPaks.set(evt.id, evt.data);
        }catch(err){}
    }

    @NetworkHandler('OotO_SoundPackRequestPacket')
    onRequest(packet: OotO_SoundPackRequestPacket) {
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(this.currentID, this.ModLoader.clientLobby));
    }

    @NetworkHandler("OotO_SoundPackLoadPacket")
    onSoundLoadPacket(packet: OotO_SoundPackLoadPacket) {
        this.PlayerSounds.set(packet.player.uuid, new Map<number, sf.Sound[]>());
        if (packet.id === "KILL") return;
        CDNClient.singleton.requestFile(packet.id).then((buf: Buffer) => {
            let sounds = JSON.parse(buf.toString());
            Object.keys(sounds).forEach((key: string) => {
                this.PlayerSounds.get(packet.player.uuid)!.set(parseInt(key), []);
                let arr: Array<Buffer> = sounds[key];
                this.ModLoader.logger.info("Loading " + arr.length + " sounds");
                for (let i = 0; i < arr.length; i++) {
                    let raw: Buffer = zlib.inflateSync(arr[i]);
                    let s = this.ModLoader.sound.initSound(raw);
                    this.PlayerSounds.get(packet.player.uuid)!.get(parseInt(key))!.push(s);
                }
            });
        });
    }

    @EventHandler(Z64OnlineEvents.ON_REMOTE_PLAY_SOUND)
    onSound(remote: RemoteSoundPlayRequest) {
        if (this.client_config.muteNetworkedSounds) return;
        if (this.PlayerSounds.has(remote.player.uuid)) {
            let rawPos: Buffer = remote.pos;
            let v = new Vector3(rawPos.readFloatBE(0), rawPos.readFloatBE(4), rawPos.readFloatBE(8));
            this.PlayerSounds.get(remote.player.uuid)!.forEach((value: sf.Sound[], key: number) => {
                for (let i = 0; i < value.length; i++) {
                    value[i].position = v;
                }
            });
            if (remote.sound_id === 0) {
                return;
            }
            if (this.PlayerSounds.get(remote.player.uuid)!.has(remote.sound_id)) {
                remote.isCanceled = true;
                let arr: Array<sf.Sound> = this.PlayerSounds.get(remote.player.uuid)!.get(remote.sound_id)!;
                let rng: number = this.getRandomInt(0, arr.length - 1);
                let s: sf.Sound = arr[rng];
                // Buffer 0xC
                s.position = v;
                s.minDistance = 250.0
                s.volume = (Math.floor((this.volume_remote[0] * 100)));
                s.play();
            }
        }
    }

    @EventHandler(Z64OnlineEvents.ON_SELECT_SOUND_PACK)
    onSelect(id: string | undefined) {
        this.sounds.clear();
        this.hasChild = false;
        this.hasAdult = false;
        if (id === undefined || !this.localSoundPaks.has(id)) {
            this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket("KILL", this.ModLoader.clientLobby));
            return;
        }
        let evt = { id: id, data: this.localSoundPaks.get(id)! };
        Object.keys(evt.data).forEach((key: string) => {
            let id = parseInt(key);
            if (SoundCategory_Child.indexOf(id) > -1) this.hasChild = true;
            if (SoundCategory_Adult.indexOf(id) > -1) this.hasAdult = true;
            this.sounds.set(id, []);
            let arr: Array<Buffer> = evt.data[key];
            for (let i = 0; i < arr.length; i++) {
                this.sounds.get(parseInt(key))!.push(this.ModLoader.sound.initSound(arr[i]));
            }
        });
        this.rawSounds = evt.data;
        let buf = Buffer.from(JSON.stringify(this.rawSounds));
        let _id = this.ModLoader.utils.hashBuffer(buf);
        CDNClient.singleton.askCDN(buf).then((has: boolean) => {
            if (has) {
                this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(_id, this.ModLoader.clientLobby));
                this.currentID = _id;
            } else {
                CDNClient.singleton.uploadFile(_id, buf).then((done: boolean) => {
                    if (done) {
                        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(_id, this.ModLoader.clientLobby));
                        this.currentID = _id;
                    }
                });
            }
        });
    }

    @Postinit()
    onPost() {
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackRequestPacket(this.ModLoader.clientLobby));
        bus.emit(Z64OnlineEvents.POST_LOADED_SOUND_LIST, this.localSoundPaks);
        this.client_config = this.ModLoader.config.registerConfigCategory("OotOnline") as OotOnlineConfigCategory;
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onPlayerLeave(player: INetworkPlayer) {
        if (this.PlayerSounds.has(player.uuid)) {
            this.PlayerSounds.delete(player.uuid);
        }
    }

    @EventHandler(OotEvents.ON_AGE_CHANGE)
    onAgeChange(age: Age) {
        if (age === Age.ADULT) {
            if (this.hasAdult) {
                this.ModLoader.emulator.rdramWriteBuffer(0x80389048, this.nop);
            } else {
                this.ModLoader.emulator.rdramWriteBuffer(0x80389048, this.originalData);
            }
        } else {
            if (this.hasChild) {
                this.ModLoader.emulator.rdramWriteBuffer(0x80389048, this.nop);
            } else {
                this.ModLoader.emulator.rdramWriteBuffer(0x80389048, this.originalData);
            }
        }
        this.ModLoader.emulator.invalidateCachedCode();
    }

    @onTick()
    onTick() {
        let dir = this.core.global.viewStruct.position.minus(this.core.global.viewStruct.focus).normalized();

        this.ModLoader.sound.listener.position = this.core.global.viewStruct.position;
        this.ModLoader.sound.listener.direction = dir;
        this.ModLoader.sound.listener.upVector = this.core.global.viewStruct.axis;

        if (!this.core.helper.isPaused()) {
            if (this.originalData === undefined) {
                this.originalData = this.ModLoader.emulator.rdramReadBuffer(0x80389048, this.nop.byteLength);
                this.ModLoader.logger.debug("Backing up original voice code...");
            }
            if (this.sounds.size > 0) {
                if (!this.ModLoader.emulator.rdramReadBuffer(0x80389048, this.nop.byteLength).equals(this.nop)) {
                    this.ModLoader.emulator.rdramWriteBuffer(0x80389048, this.nop);
                    this.ModLoader.emulator.invalidateCachedCode();
                }
            } else {
                if (!this.ModLoader.emulator.rdramReadBuffer(0x80389048, this.nop.byteLength).equals(this.originalData)) {
                    this.ModLoader.emulator.rdramWriteBuffer(0x80389048, this.originalData);
                    this.ModLoader.emulator.invalidateCachedCode();
                }
                return;
            }
        }

        if (this.client_config.muteLocalSounds) return;

        if (this.core.link.current_sound_id > 0) {
            if (this.sounds.has(this.core.link.current_sound_id)) {
                let random = this.getRandomInt(0, this.sounds.get(this.core.link.current_sound_id)!.length - 1);
                let sound: sf.Sound = this.sounds.get(this.core.link.current_sound_id)![random];
                let raw = this.core.link.position.getRawPos();
                let pos = new Vector3(raw.readFloatBE(0), raw.readFloatBE(4), raw.readFloatBE(8));
                sound.position = pos;
                sound.minDistance = 250.0
                sound.play();
            }
        }

        this.sounds.forEach((sound: sf.Sound[], key: number) => {
            for (let i = 0; i < sound.length; i++) {
                sound[i].volume = (Math.floor(this.volume_local[0] * 100));
            }
        });
    }

    @onViUpdate()
    onVi() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("OotO")) {
                    if (this.ModLoader.ImGui.beginMenu("General Settings")) {
                        this.ModLoader.ImGui.sliderFloat("Voice Pak Volume (local)", this.volume_local, 0.1, 1.0);
                        this.ModLoader.ImGui.sliderFloat("Voice Pak Volume (remote)", this.volume_remote, 0.1, 1.0);
                        this.ModLoader.ImGui.endMenu();
                    }
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
    }

}