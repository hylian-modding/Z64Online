import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { NetworkHandler, INetworkPlayer } from "modloader64_api/NetworkHandler";
import zlib from 'zlib';
import Vector3 from "modloader64_api/math/Vector3";
import { Postinit } from 'modloader64_api/PluginLifecycle';
import { OotOnlineEvents, RemoteSoundPlayRequest } from "@OotOnline/OotoAPI/OotoAPI";
import * as sf from 'modloader64_api/Sound/sfml_audio';

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
    PlayerSounds: Map<string, Map<number, sf.Sound[]>> = new Map<string, Map<number, sf.Sound[]>>();
    rawSounds: any;
    SIZE_LIMIT: number = 5;

    getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    @EventHandler(OotOnlineEvents.ON_LOAD_SOUND_PACK)
    onSoundPackLoaded(rawSounds: any) {
        let size: number = 0;
        Object.keys(rawSounds).forEach((key: string) => {
            let arr: Array<Buffer> = rawSounds[key];
            for (let i = 0; i < arr.length; i++) {
                size += arr[i].byteLength;
            }
        });
        if (this.rawSounds === undefined) {
            this.rawSounds = rawSounds;
        } else {
            Object.keys(rawSounds).forEach((key: string) => {
                this.rawSounds[key] = rawSounds[key];
            });
        }
        // TODO: ADD SOME SANITY HERE
        if (size > (this.SIZE_LIMIT * 1024 * 1024)) {
            this.ModLoader.logger.error("Your sound pak is too large to reasonably network. Please tone it down.");
            return;
        }
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(rawSounds, size, this.ModLoader.clientLobby));
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

    @EventHandler(OotOnlineEvents.ON_REMOTE_PLAY_SOUND)
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

    @Postinit()
    onPost() {
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackRequestPacket(this.ModLoader.clientLobby));
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onPlayerLeave(player: INetworkPlayer) {
        if (this.PlayerSounds.has(player.uuid)) {
            this.PlayerSounds.delete(player.uuid);
        }
    }

}