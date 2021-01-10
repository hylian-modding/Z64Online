import { bus, EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { NetworkHandler, INetworkPlayer } from "modloader64_api/NetworkHandler";
import zlib from 'zlib';
import Vector3 from "modloader64_api/math/Vector3";
import { Init, onTick, Postinit } from 'modloader64_api/PluginLifecycle';
import { Z64OnlineEvents, RemoteSoundPlayRequest } from "@OotOnline/Z64API/OotoAPI";
import * as sf from 'modloader64_api/Sound/sfml_audio';
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { Z64_EventConfig } from "@OotOnline/WorldEvents/Z64_EventConfig";

export class OotO_SoundPackLoadPacket extends Packet {
    totalSize: number;
    // Key: number, Value: Array<Buffer>
    sounds: any;

    constructor(sounds: any, totalSize: number, lobby: string) {
        super('OotO_SoundPackLoadPacket', 'OotOnline', lobby, true);
        this.sounds = sounds;
        this.totalSize = totalSize;
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

    @Init()
    init() {
        this.config = this.ModLoader.config.registerConfigCategory("OotO_WorldEvents") as Z64_EventConfig;
        this.ModLoader.config.setData("OotO_WorldEvents", "voice", "");
        if (this.config.voice !== "") {
            bus.emit(Z64OnlineEvents.ON_SELECT_SOUND_PACK, this.config.voice);
        }
    }

    getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    @EventHandler(Z64OnlineEvents.ON_LOAD_SOUND_PACK)
    onSoundPackLoaded(evt: any) {
        this.localSoundPaks.set(evt.id, evt.data);
    }

    @NetworkHandler('OotO_SoundPackRequestPacket')
    onRequest(packet: OotO_SoundPackRequestPacket) {
        try {
            let size: number = 0;
            Object.keys(this.rawSounds).forEach((key: string) => {
                let arr: Array<Buffer> = this.rawSounds[key];
                for (let i = 0; i < arr.length; i++) {
                    size += arr[i].byteLength;
                }
            });
            this.ModLoader.clientSide.sendPacketToSpecificPlayer(new OotO_SoundPackLoadPacket(this.rawSounds, size, this.ModLoader.clientLobby), packet.player);
        } catch (err) { }
    }

    @NetworkHandler("OotO_SoundPackLoadPacket")
    onSoundLoadPacket(packet: OotO_SoundPackLoadPacket) {
        this.PlayerSounds.set(packet.player.uuid, new Map<number, sf.Sound[]>());
        Object.keys(packet.sounds).forEach((key: string) => {
            this.PlayerSounds.get(packet.player.uuid)!.set(parseInt(key), []);
            let arr: Array<Buffer> = packet.sounds[key];
            this.ModLoader.logger.info("Loading " + arr.length + " sounds");
            for (let i = 0; i < arr.length; i++) {
                let raw: Buffer = zlib.inflateSync(arr[i]);
                let s = this.ModLoader.sound.initSound(raw);
                this.PlayerSounds.get(packet.player.uuid)!.get(parseInt(key))!.push(s);
            }
        });
    }

    @EventHandler(Z64OnlineEvents.ON_REMOTE_PLAY_SOUND)
    onSound(remote: RemoteSoundPlayRequest) {
        if (this.PlayerSounds.has(remote.player.uuid)) {
            let rawPos: Buffer = remote.puppet.pos;
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
                s.play();
            }
        }
    }

    @EventHandler(Z64OnlineEvents.ON_SELECT_SOUND_PACK)
    onSelect(id: string | undefined) {
        this.sounds.clear();
        if (id === undefined) {
            this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket({}, 0, this.ModLoader.clientLobby));
            return;
        }
        let evt = { id: id, data: this.localSoundPaks.get(id)! };
        let size: number = 0;
        Object.keys(evt.data).forEach((key: string) => {
            this.sounds.set(parseInt(key), []);
            let arr: Array<Buffer> = evt.data[key];
            for (let i = 0; i < arr.length; i++) {
                this.sounds.get(parseInt(key))!.push(this.ModLoader.sound.initSound(zlib.inflateSync(arr[i])));
                size += arr[i].byteLength;
            }
        });
        this.rawSounds = evt.data;
        // TODO: ADD SOME SANITY HERE
        if (size > (this.SIZE_LIMIT * 1024 * 1024)) {
            this.ModLoader.logger.error("Your sound pak is too large to reasonably network. Please tone it down.");
            return;
        }
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(evt.data, size, this.ModLoader.clientLobby));
    }

    @Postinit()
    onPost() {
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackRequestPacket(this.ModLoader.clientLobby));
        bus.emit(Z64OnlineEvents.POST_LOADED_SOUND_LIST, this.localSoundPaks);
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onPlayerLeave(player: INetworkPlayer) {
        if (this.PlayerSounds.has(player.uuid)) {
            this.PlayerSounds.delete(player.uuid);
        }
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

        if (this.core.link.current_sound_id > 0) {
            if (this.sounds.has(this.core.link.current_sound_id)) {
                let random = this.getRandomInt(0, this.sounds.get(this.core.link.current_sound_id)!.length - 1);
                let sound: sf.Sound = this.sounds.get(this.core.link.current_sound_id)![random];
                sound.position = this.core.link.position;
                sound.minDistance = 250.0
                sound.play();
            }
        }

        this.sounds.forEach((sound: sf.Sound[], key: number) => {
            for (let i = 0; i < sound.length; i++) {
                sound[i].position = this.core.link.position;
            }
        });
    }

}