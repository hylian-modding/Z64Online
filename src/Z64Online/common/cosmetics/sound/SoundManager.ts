import { bus, EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { NetworkHandler, INetworkPlayer } from "modloader64_api/NetworkHandler";
import zlib from 'zlib';
import Vector3 from "modloader64_api/math/Vector3";
import { onTick, Postinit } from 'modloader64_api/PluginLifecycle';
import * as sf from 'modloader64_api/Sound/sfml_audio';
import { OotEvents } from "Z64Lib/API/OoT/OOTAPI";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { SoundCategory_Adult, SoundCategory_Child, SoundCategory_Human } from "@Z64Online/common/cosmetics/sound/SoundCategory";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";
import { RemoteSoundPlayRequest, Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import Z64Serialize from "@Z64Online/common/storage/Z64Serialize";
import { CommonConfigInst, volume_local, volume_remote } from "@Z64Online/common/lib/Settings";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { Z64_GAME, Z64_IS_RANDOMIZER } from "Z64Lib/src/Common/types/GameAliases";
import { OOT_GAME } from "@Z64Online/common/types/OotAliases";
import { MM_GAME } from "@Z64Online/common/types/MMAliases";
import { getLinkPos, getLinkSoundID, getViewStruct, isPaused } from "@Z64Online/common/types/GameAliases";

export class OotO_SoundPackLoadPacket extends Packet {
    ids: string[];

    constructor(ids: string[], lobby: string) {
        super('Z64O_SoundPackLoadPacket', 'Z64Online', lobby, true);
        this.ids = ids;
    }
}

export class OotO_SoundPackRequestPacket extends Packet {
    constructor(lobby: string) {
        super('Z64O_SoundPackRequestPacket', 'Z64Online', lobby, true);
    }
}

export class SoundManagerClient {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    PlayerSounds: Map<string, Map<number, sf.Sound[]>> = new Map<string, Map<number, sf.Sound[]>>();
    rawSounds: any;
    SIZE_LIMIT: number = 10;
    nops: Map<AgeOrForm, () => void> = new Map();
    sounds: Map<number, Array<sf.Sound>> = new Map<number, Array<sf.Sound>>();
    localSoundPaks: Map<string, any> = new Map<string, any>();
    currentIDs: string[] = [];
    soundCache: Map<string, sf.Sound> = new Map();

    hasAdult: boolean = false;
    nopOOT: Buffer = Buffer.from('3C048060A4850088', 'hex');
    hasChild: boolean = false;
    hasHuman: boolean = false;
    nopMM: Buffer = Buffer.from('240501A100000000', 'hex');
    hasDeku: boolean = false;
    hasGoron: boolean = false;
    hasZora: boolean = false;
    hasDeity: boolean = false;

    backup: Buffer | undefined;

    getNopForGame() {
        if (Z64_GAME === OOT_GAME) {
            return this.nopOOT;
        } else if (Z64_GAME === MM_GAME) {
            return this.nopMM;
        }
    }

    getAddrForNop() {
        if (Z64_GAME === OOT_GAME) {
            return 0x80389048;
        } else if (Z64_GAME === MM_GAME) {
            if (Z64_IS_RANDOMIZER) {
                return 0x806EB47C;
            } else {
                return 0x8074B47C;
            }
        }
    }

    getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    @EventHandler(Z64OnlineEvents.ON_LOAD_SOUND_PACK)
    onSoundPackLoaded(evt: any) {
        try {
            Object.keys(evt.data).forEach((key: string) => {
                let arr: Array<Buffer> = evt.data[key];
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = zlib.inflateSync(arr[i]);
                }
            });
            this.localSoundPaks.set(evt.id, evt.data);
        } catch (err: any) { }
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onReset() {
        this.backup = undefined;
    }

    @EventHandler(BackwardsCompat.OLD_OOT_SOUND_PAK_EVT)
    onSoundPakLoaded_backcompat(evt: any) {
        bus.emit(Z64OnlineEvents.ON_LOAD_SOUND_PACK, evt);
    }

    @NetworkHandler('Z64O_SoundPackRequestPacket')
    onRequest(packet: OotO_SoundPackRequestPacket) {
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(this.currentIDs, this.ModLoader.clientLobby));
    }

    @NetworkHandler("Z64O_SoundPackLoadPacket")
    onSoundLoadPacket(packet: OotO_SoundPackLoadPacket) {
        this.PlayerSounds.set(packet.player.uuid, new Map<number, sf.Sound[]>());
        if (packet.ids.length === 0) return;
        for (let i = 0; i < packet.ids.length; i++) {
            CDNClient.singleton.requestFile(packet.ids[i]).then((buf: Buffer) => {
                let sounds = Z64Serialize.deserializeSync(buf);
                Object.keys(sounds).forEach((key: string) => {
                    this.PlayerSounds.get(packet.player.uuid)!.set(parseInt(key), []);
                    let arr: Array<Buffer> = sounds[key];
                    for (let i = 0; i < arr.length; i++) {
                        let raw: Buffer = arr[i];
                        let hash = this.ModLoader.utils.hashBuffer(raw);
                        if (this.soundCache.has(hash)) {
                            let s = this.soundCache.get(hash)!;
                            this.PlayerSounds.get(packet.player.uuid)!.get(parseInt(key))!.push(s);
                        } else {
                            this.ModLoader.logger.info("Loading " + arr.length + " sounds");
                            let s = this.ModLoader.sound.initSound(raw);
                            s.ref();
                            this.soundCache.set(hash, s);
                            this.PlayerSounds.get(packet.player.uuid)!.get(parseInt(key))!.push(s);
                        }
                    }
                });
            });
        }
    }

    @EventHandler(Z64OnlineEvents.ON_REMOTE_PLAY_SOUND)
    onSound(remote: RemoteSoundPlayRequest) {
        if (CommonConfigInst.muteNetworkedSounds) return;
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
                s.volume = (Math.floor((volume_remote[0] * 100)));
                s.play();
            }
        }
    }

    @EventHandler(Z64OnlineEvents.ON_SELECT_SOUND_PACK)
    onSelect(ids: string[]) {
        this.sounds.clear();
        this.hasChild = false;
        this.hasAdult = false;
        this.hasHuman = false;
        if (ids.length === 0) {
            this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket([], this.ModLoader.clientLobby));
            return;
        }
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let evt = { id: id, data: this.localSoundPaks.get(id)! };
            if (!this.localSoundPaks.has(id)){
                this.ModLoader.logger.error("Something has gone very wrong with sound pak loading.");
                this.ModLoader.logger.error(`ID ${id} does not exist.`);
                continue;
            }
            Object.keys(evt.data).forEach((key: string) => {
                let id = parseInt(key);
                if (SoundCategory_Child.indexOf(id) > -1) this.hasChild = true;
                if (SoundCategory_Adult.indexOf(id) > -1) this.hasAdult = true;
                if (SoundCategory_Human.indexOf(id) > -1) this.hasHuman = true;
                if (this.sounds.has(id)) {
                    // If an earlier pak loaded a sound for this id skip it. First come first served.
                    return;
                } else {
                    this.sounds.set(id, []);
                }
                let arr: Array<Buffer> = evt.data[key];
                for (let i = 0; i < arr.length; i++) {
                    let hash = this.ModLoader.utils.hashBuffer(arr[i]);
                    if (this.soundCache.has(hash)) {
                        let sound = this.soundCache.get(hash)!;
                        this.sounds.get(parseInt(key))!.push(sound);
                    } else {
                        let sound = this.ModLoader.sound.initSound(arr[i]);
                        this.soundCache.set(hash, sound);
                        sound.ref();
                        this.sounds.get(parseInt(key))!.push(sound);
                    }
                }
            });
            this.rawSounds = evt.data;
            let buf = Z64Serialize.serializeSync(this.rawSounds);
            let _id = this.ModLoader.utils.hashBuffer(buf);
            CDNClient.singleton.askCDN(buf).then((has: boolean) => {
                if (has) {
                    this.currentIDs.push(_id);
                    this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(this.currentIDs, this.ModLoader.clientLobby));
                } else {
                    CDNClient.singleton.uploadFile(_id, buf).then((done: boolean) => {
                        if (done) {
                            this.currentIDs.push(_id);
                            this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket(this.currentIDs, this.ModLoader.clientLobby));
                        }
                    });
                }
            });
        }
    }

    @Postinit()
    onPost() {
        this.ModLoader.clientSide.sendPacket(new OotO_SoundPackRequestPacket(this.ModLoader.clientLobby));
        bus.emit(Z64OnlineEvents.POST_LOADED_SOUND_LIST, this.localSoundPaks);
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onPlayerLeave(player: INetworkPlayer) {
        if (this.PlayerSounds.has(player.uuid)) {
            this.PlayerSounds.get(player.uuid)!.forEach((sounds: Array<sf.Sound>) => {
                for (let i = 0; i < sounds.length; i++) {
                    sounds[i].unref();
                }
            });
            this.PlayerSounds.delete(player.uuid);
        }
    }

    handleFormChange(age: AgeOrForm, targetage: AgeOrForm, bool: boolean) {
        if (age === targetage) {
            if (bool) {
                this.ModLoader.emulator.rdramWriteBuffer(this.getAddrForNop()!, this.getNopForGame()!);
            } else {
                this.ModLoader.emulator.rdramWriteBuffer(this.getAddrForNop()!, this.backup!);
            }
        }
    }

    @EventHandler(OotEvents.ON_AGE_CHANGE)
    onAgeChange(age: AgeOrForm) {
        if (Z64_GAME === OOT_GAME) {
            this.handleFormChange(age, AgeOrForm.ADULT, this.hasAdult);
            this.handleFormChange(age, AgeOrForm.CHILD, this.hasChild);
        } else if (Z64_GAME === MM_GAME) {
            this.handleFormChange(age, AgeOrForm.HUMAN, this.hasHuman);
            this.handleFormChange(age, AgeOrForm.DEKU, this.hasDeku);
            this.handleFormChange(age, AgeOrForm.GORON, this.hasGoron);
            this.handleFormChange(age, AgeOrForm.ZORA, this.hasZora);
            this.handleFormChange(age, AgeOrForm.FD, this.hasDeity);
        }
        this.ModLoader.emulator.invalidateCachedCode();
    }

    @onTick()
    onTick() {
        let view = getViewStruct(this.core);
        let dir = view.position.minus(view.focus).normalized();
        this.ModLoader.sound.listener.position = view.position;
        this.ModLoader.sound.listener.direction = dir;
        this.ModLoader.sound.listener.upVector = view.axis;

        if (!isPaused(this.core)) {
            let nop = this.getNopForGame()!;
            if (this.backup === undefined) {
                this.ModLoader.logger.debug("Backing up original voice code.");
                this.backup = Buffer.alloc(8);
                this.ModLoader.emulator.rdramReadBuffer(this.getAddrForNop()!, nop.byteLength).copy(this.backup);
            }
            if (this.sounds.size > 0) {
                if (!this.ModLoader.emulator.rdramReadBuffer(this.getAddrForNop()!, nop.byteLength).equals(nop)) {
                    this.ModLoader.emulator.rdramWriteBuffer(this.getAddrForNop()!, nop);
                    this.ModLoader.emulator.invalidateCachedCode();
                }
            } else {
                if (this.ModLoader.emulator.rdramReadBuffer(this.getAddrForNop()!, nop.byteLength).equals(nop)) {
                    this.ModLoader.emulator.rdramWriteBuffer(this.getAddrForNop()!, this.backup);
                    this.ModLoader.emulator.invalidateCachedCode();
                }
                return;
            }
        }

        if (CommonConfigInst.muteLocalSounds) return;

        if (getLinkSoundID(this.core) > 0) {
            console.log(getLinkSoundID(this.core));
            console.log(this.sounds.has(getLinkSoundID(this.core)));
            if (this.sounds.has(getLinkSoundID(this.core))) {
                let random = this.getRandomInt(0, this.sounds.get(getLinkSoundID(this.core))!.length - 1);
                let sound: sf.Sound = this.sounds.get(getLinkSoundID(this.core))![random];
                let raw = getLinkPos(this.core);
                let pos = new Vector3(raw.readFloatBE(0), raw.readFloatBE(4), raw.readFloatBE(8));
                sound.position = pos;
                sound.minDistance = 250.0
                sound.play();
            }
        }

        this.sounds.forEach((sound: sf.Sound[], key: number) => {
            for (let i = 0; i < sound.length; i++) {
                sound[i].volume = (Math.floor(volume_local[0] * 100));
            }
        });
    }
}