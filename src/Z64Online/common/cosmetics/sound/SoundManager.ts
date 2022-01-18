import { bus, EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { NetworkHandler, INetworkPlayer } from "modloader64_api/NetworkHandler";
import zlib from 'zlib';
import Vector3 from "modloader64_api/math/Vector3";
import { onPostTick, onTick, Postinit } from 'modloader64_api/PluginLifecycle';
import * as sf from 'modloader64_api/Sound/sfml_audio';
import { OotEvents } from "Z64Lib/API/OoT/OOTAPI";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { SoundCategory_Adult, SoundCategory_Child, SoundCategory_Deity, SoundCategory_Deku, SoundCategory_Goron, SoundCategory_Human, SoundCategory_Zora } from "@Z64Online/common/cosmetics/sound/SoundCategory";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";
import { RemoteSoundPlayRequest, Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import Z64Serialize from "@Z64Online/common/storage/Z64Serialize";
import { CommonConfigInst, volume_local, volume_remote } from "@Z64Online/common/lib/Settings";
import { BackwardsCompat } from "@Z64Online/common/compat/BackwardsCompat";
import { Z64_GAME, Z64_IS_RANDOMIZER } from "Z64Lib/src/Common/types/GameAliases";
import { OOT_GAME } from "@Z64Online/common/types/OotAliases";
import { MM_GAME } from "@Z64Online/common/types/MMAliases";
import { getAgeOrForm, getLinkPos, getLinkSoundID, getViewStruct, isPaused, isTitleScreen } from "@Z64Online/common/types/GameAliases";
import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { SoundHax_mm, SoundHax_oot } from "@Z64Online/overlay/SoundHax";
import { SmartBuffer } from "smart-buffer";
import { J_ENCODE } from "@Z64Online/common/lib/OpcodeBullshit";
import { Z64O_Logger } from "@Z64Online/common/lib/Logger";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";

export class SoundAccess {
    private sm: SoundManagerClient;
    constructor(sm: SoundManagerClient) {
        this.sm = sm;
    }

    get sound_id(): number {
        return this.sm.sound_id;
    }

    set sound_id(value: number) {
        this.sm.sound_id = value;
    }
}

export let SoundAccessSingleton: SoundAccess;

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
    rawSounds!: Record<number, Buffer>;
    SIZE_LIMIT: number = 10;
    nops: Map<AgeOrForm, () => void> = new Map();
    sounds: Map<number, Array<sf.Sound>> = new Map<number, Array<sf.Sound>>();
    localSoundPaks: Map<string, Record<number, Buffer>> = new Map<string, Record<number, Buffer>>();
    currentIDs: string[] = [];
    soundCache: Map<string, sf.Sound> = new Map();

    hasAdult: boolean = false;
    hasChild: boolean = false;
    hasHuman: boolean = false;
    hasDeku: boolean = false;
    hasGoron: boolean = false;
    hasZora: boolean = false;
    hasDeity: boolean = false;

    arb!: ArbitraryHook;

    constructor() {
        SoundAccessSingleton = new SoundAccess(this);
    }

    getAddrForNop() {
        if (Z64_GAME === OOT_GAME) {
            return 0x80022F84;
        } else if (Z64_GAME === MM_GAME) {
            // TODO - fix these.
            if (Z64_IS_RANDOMIZER) {
                return 0x800B8E58;
            } else {
                return 0x800B8E58;
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
    }

    get sound_id(): number {
        return this.ModLoader.emulator.rdramRead32(this.arb.instancePointer + 0x8);
    }

    set sound_id(value: number) {
        this.ModLoader.emulator.rdramWrite32(this.arb.instancePointer + 0x8, 0);
    }

    set isMuted(bool: boolean) {
        this.ModLoader.emulator.rdramWrite32(this.arb.instancePointer + 0x4, bool ? 1 : 0);
    }

    @onPostTick()
    onPostTick() {
        if (this.arb === undefined) return;
        if (this.arb.instancePointer <= 0) return;
        this.sound_id = 0;
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: { rom: Buffer }) {
        this.ModLoader.utils.setTimeoutFrames(() => {
            Z64O_Logger.debug("Loading new sound hack...");
            this.arb = new ArbitraryHook("Sound Hacks", this.ModLoader, this.core, Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME ? SoundHax_oot : SoundHax_mm);
            this.arb.inject();
            this.ModLoader.utils.setTimeoutFrames(() => {
                Z64O_Logger.debug("Executing new sound hack...");
                this.arb.runCreate(0xDEADBEEF, () => {
                    //
                    Z64O_Logger.debug("Hooking func_80022F84...");
                    let sb = new SmartBuffer();
                    sb.writeUInt32BE(J_ENCODE(this.ModLoader.emulator.rdramRead32(this.arb.instancePointer)));
                    sb.writeBuffer(Buffer.from("0000000003E0000800000000", "hex"));
                    this.ModLoader.emulator.rdramWriteBuffer(this.getAddrForNop()!, sb.toBuffer());
                    sb.clear();
                    this.ModLoader.emulator.invalidateCachedCode();
                    Z64O_Logger.debug(`Sound Hack Context: ${this.arb.instancePointer.toString(16)}.`);
                });
            }, 20);
        }, 20);
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
                let sounds: any;
                try{
                    sounds = Z64Serialize.deserializeSync(buf);
                }catch(err: any){
                    this.ModLoader.logger.error(err.stack);
                    this.ModLoader.logger.error("CDN failure?");
                    CDNClient.singleton.flagCDNFailure(packet.ids[i]);
                    return;
                }
                Object.keys(sounds).forEach((key: string) => {
                    if (sounds[key].length === 0) return;
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
        this.hasDeku = false;
        this.hasGoron = false;
        this.hasZora = false;
        this.hasDeity = false;
        if (ids.length === 0) {
            this.ModLoader.clientSide.sendPacket(new OotO_SoundPackLoadPacket([], this.ModLoader.clientLobby));
            this.isMuted = false;
            return;
        }
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let evt: {id: string, data: Record<number, Buffer>} = { id: id, data: this.localSoundPaks.get(id)! };
            if (!this.localSoundPaks.has(id)) {
                this.ModLoader.logger.error("Something has gone very wrong with sound pak loading.");
                this.ModLoader.logger.error(`ID ${id} does not exist.`);
                continue;
            }
            Object.keys(evt.data).forEach((key: string) => {
                if (evt.data[key].length == 0) return;
                let id = parseInt(key);
                if (SoundCategory_Child.indexOf(id) > -1) this.hasChild = true;
                if (SoundCategory_Adult.indexOf(id) > -1) this.hasAdult = true;
                if (SoundCategory_Human.indexOf(id) > -1) this.hasHuman = true;
                if (SoundCategory_Deku.indexOf(id) > -1) this.hasDeku = true;
                if (SoundCategory_Goron.indexOf(id) > -1) this.hasGoron = true;
                if (SoundCategory_Zora.indexOf(id) > -1)  this.hasZora = true;
                if (SoundCategory_Deity.indexOf(id) > -1) this.hasDeity = true;
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
            this.onAgeChange(getAgeOrForm(this.core));
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
        if (age === targetage) this.isMuted = bool;
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
    }

    @onTick()
    onTick() {
        if (isTitleScreen(this.core)) return;
        let view = getViewStruct(this.core);
        let dir = view.position.minus(view.focus).normalized();
        this.ModLoader.sound.listener.position = view.position;
        this.ModLoader.sound.listener.direction = dir;
        this.ModLoader.sound.listener.upVector = view.axis;

        if (CommonConfigInst.muteLocalSounds) return;

        if (getLinkSoundID(this.core) > 0) {
            if (this.sounds.has(getLinkSoundID(this.core))) {
                let random = this.getRandomInt(0, this.sounds.get(getLinkSoundID(this.core))!.length - 1);
                let sound: sf.Sound = this.sounds.get(getLinkSoundID(this.core))![random];
                let raw = getLinkPos(this.core);
                let pos = new Vector3(raw.readFloatBE(0), raw.readFloatBE(4), raw.readFloatBE(8));
                if (sound !== undefined && sound.position !== undefined){
                    sound.position = pos;
                    sound.minDistance = 250.0
                    sound.play();
                }
            }
        }

        this.sounds.forEach((sound: sf.Sound[], key: number) => {
            for (let i = 0; i < sound.length; i++) {
                sound[i].volume = (Math.floor(volume_local[0] * 100));
            }
        });
    }
}