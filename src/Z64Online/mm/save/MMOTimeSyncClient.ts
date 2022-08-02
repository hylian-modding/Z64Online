import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { bus, EventHandler, EventsServer } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { NetworkHandler, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { Preinit, onTick, Postinit } from "modloader64_api/PluginLifecycle";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { LinkState } from "Z64Lib/API/Common/Z64API";
import { MMOnlineConfigCategory } from "../MMOnline";
import { Z64O_FlagUpdate, Z64O_ServerTimeStart, Z64O_SoTPacket, Z64O_SyncRequest, Z64O_SyncSettings, Z64O_TimePacket } from "../network/MMOPackets";
import { MMOnlineStorageClient } from "../storage/MMOnlineStorageClient";
import SoTTrigger from "./SoTTrigger";
import * as API from "Z64Lib/API/imports";

export const RECORD_TICK_MODULO = 6
export const NUM_SCHEDULE_TICKS = 196608;
export const NUM_TICKS_PER_DAY = 0x10000;
export const NUM_TICKS_SYNC = NUM_TICKS_PER_DAY / RECORD_TICK_MODULO
export const TICKS_PER_HOUR = NUM_TICKS_PER_DAY / 24;
export const TICKS_PER_MINUTE = TICKS_PER_HOUR / 60;

export default class TimeSyncClient {
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    inverted: boolean = false;
    isStarted: boolean = false;
    songOfTime!: SoTTrigger;
    sentSoT: boolean = false;
    songOfTimeLoop: string | undefined;
    dontRepeat: boolean = false;
    sotActive: boolean = false;
    lobbyConfig!: MMOnlineConfigCategory;
    clientStorage: MMOnlineStorageClient = new MMOnlineStorageClient();
    sotTimeout: boolean = false;
    timeSyncTickHandler: any = undefined;

    @Postinit()
    postInit() {
        this.songOfTime = new SoTTrigger(this.ModLoader, this.core);
        this.lobbyConfig = this.ModLoader.config.registerConfigCategory("MMOnline") as MMOnlineConfigCategory;
    }

    get currentCutscene(): number {
        return this.ModLoader.emulator.rdramRead16(0x801F35BA);
    }

    @onTick()
    onTick() {
        if (!this.isStarted || !this.lobbyConfig.syncModeTime) return;
        if (this.core.MM?.helper.isTitleScreen()) return;
        if (this.core.MM!.save.time_speed === -2 && !this.inverted) {
            // switched to ISoT
            console.log("Switching to slowed speed...")
            //console.log(`this.core.MM!.save.time_speed: ${this.core.MM!.save.time_speed}, this.inverted: ${this.inverted} `)
            this.inverted = true;
            this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day, -2, this.core.MM!.save.day_night,
                this.ModLoader.clientLobby));
        } else if (this.core.MM!.save.time_speed === 0 && this.inverted) {
            // switch to normal speed
            console.log("Switching to normal speed...")
            //console.log(`this.core.MM!.save.time_speed: ${this.core.MM!.save.time_speed}, this.inverted: ${this.inverted} `)
            this.inverted = false;
            this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day, 0, this.core.MM!.save.day_night,
                this.ModLoader.clientLobby));
        }
        //console.log(`current cutscene: ${this.currentCutscene.toString(16)}, current scene: ${this.core.MM!.global.scene}`)
        //if(this.core.MM!.global.scene === 0x8)//console.log(`current cutscene: ${this.currentCutscene.toString(16)}, current scene: ${this.core.MM!.global.scene}`)
        if (this.currentCutscene === 0xfff7 && !this.sotActive) {
            this.ModLoader.utils.setTimeoutFrames(() => {
                if (this.core.MM!.global.scene === 0x08 && !this.dontRepeat && !this.sotActive) {
                    console.log(`song of time triggered! sending to others...`);
                    this.sentSoT = true;
                    this.sotActive = true;
                    this.ModLoader.clientSide.sendPacket(new Z64O_SoTPacket(true, this.ModLoader.clientLobby));
                    this.clientStorage.eventFlags = this.core.MM!.save.weekEventFlags; //Clear flags on SoT Cutscene
                    this.ModLoader.clientSide.sendPacket(new Z64O_FlagUpdate(this.clientStorage.eventFlags, this.ModLoader.clientLobby));
                }
            }, 40);
        }
        if (this.core.MM!.global.scene !== 0x08 && this.core.MM!.global.scene_framecount === 20) {
            this.sentSoT = false;
            this.dontRepeat = false;
        }
    }

    @EventHandler(Z64OnlineEvents.MMO_TIME_START)
    timeStarted() {
        if (this.timeSyncTickHandler === undefined) {
            this.timeSyncTickHandler = this.ModLoader.utils.setIntervalFrames(() => {
                if (this.core.MM!.helper.isTitleScreen()) return;
                if (!this.lobbyConfig.syncModeTime) return;
                if (this.ModLoader.clientSide.getLobbyOwner(this.ModLoader.clientLobby).uuid === this.ModLoader.me.uuid) {
                    this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day,
                        this.core.MM!.save.time_speed, this.core.MM!.save.day_night, this.ModLoader.clientLobby));
                } else {
                    this.ModLoader.clientSide.sendPacket(new Z64O_ServerTimeStart(true, this.ModLoader.clientLobby));
                }
            }, 200);
            this.isStarted = true;
        }
    }

    @EventHandler(Z64OnlineEvents.MMO_TIME_STOP)
    timeStopped() {
        if (this.timeSyncTickHandler !== undefined) {
            this.isStarted = false;
            this.ModLoader.utils.clearIntervalFrames(this.timeSyncTickHandler);
            this.timeSyncTickHandler = undefined;
        }
    }

    @NetworkHandler('Z64O_SoTPacket')
    onSOT(packet: Z64O_SoTPacket) {
        if (this.sentSoT) return;
        if (this.songOfTimeLoop !== undefined) return;
        if (!packet.isTriggered) return;
        this.sotActive = true;
        console.log('recieving song of time! executing...')
        this.songOfTimeLoop = this.ModLoader.utils.setIntervalFrames(() => {
            if (!this.core.MM!.helper.isLinkEnteringLoadingZone() &&
                !this.core.MM!.helper.isFadeIn() &&
                this.core.MM!.helper.isInterfaceShown() &&
                !this.core.MM!.helper.isPaused()) {
                this.songOfTime.trigger();
                this.ModLoader.utils.clearIntervalFrames(this.songOfTimeLoop!);
                this.songOfTimeLoop = undefined;
                this.dontRepeat = true;
            }
        }, 20);
    }

    @NetworkHandler('Z64O_TimePacket')
    onTime(packet: Z64O_TimePacket) {
        //console.log(`Client onTime`)

        if (!this.lobbyConfig.syncModeTime) {
            this.ModLoader.clientSide.sendPacket(new Z64O_SyncRequest(this.ModLoader.clientLobby, false, false));
            return;
        }
        if (!this.isStarted) return;
        if (this.core.MM!.link.state === LinkState.BUSY || !this.core.MM!.helper.isInterfaceShown()) return;
        if (this.core.MM?.helper.isTitleScreen()) return;
        if (this.sotActive) return;
        //console.log(`Client onTime time: ${packet.time}`)

        // if (this.core.MM!.save.day_time >= 0x4000 && packet.time < 0x4000) return;
        // if (this.core.MM!.save.day_time >= 0xC000 && packet.time < 0xC000) return;

        //console.log(`client time: ${this.core.MM!.save.day_time}; time - packet.time: ${this.core.MM!.save.day_time - packet.time}`);
        // if ((packet.time - this.core.MM!.save.day_time) > (TICKS_PER_HOUR / 4)) {

        if (packet.speed !== this.core.MM!.save.time_speed) {
            this.core.MM!.save.time_speed = packet.speed;
        }

        //Check to see if player needs to be caught up through day change
        if (this.core.MM!.save.current_day < packet.day) {
            if (packet.time >= 0x4000) {
                //console.log(`Moving forward a day? 1`)
                this.core.MM!.save.day_time = packet.time;
                //this.core.MM!.save.current_day = packet.day;
            }
        }

        if (Math.abs(packet.time - this.core.MM!.save.day_time) > 100) {
            if ((packet.day >= this.core.MM!.save.current_day) && (((packet.time + 0xC000) % 0x10000) > ((this.core.MM!.save.day_time + 0xC000) % 0x10000))) {
                this.core.MM!.save.day_time = packet.time;
                this.core.MM!.save.current_day = packet.day;
                this.core.MM!.save.day_night = packet.night;
            } else {
                this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day,
                    this.core.MM!.save.time_speed, this.core.MM!.save.day_night, this.ModLoader.clientLobby))
            }
        }
        //Check to see if player goes forward one day
        if (this.core.MM!.save.day_time >= 0x4000 && packet.time >= 0xC000) {
            if (this.core.MM!.save.current_day > packet.day) {
                //console.log(`Moving forward a day? 2`)
                this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day,
                    this.core.MM!.save.time_speed, this.core.MM!.save.day_night, this.ModLoader.clientLobby))
            }
        }

        //this.core.MM!.save.day_time = time;
        //this.core.MM!.save.current_day = day;
        //this.core.MM!.save.time_speed = speed;
        //this.core.MM!.save.day_night = night;

    }

    @NetworkHandler('Z64O_SyncSettings')
    onSyncSettings(packet: Z64O_SyncSettings) {
        this.lobbyConfig.syncModeBasic = packet.syncModeBasic;
        this.lobbyConfig.syncModeTime = packet.syncModeTime;
    }

    @NetworkHandler('Z64O_SyncRequest')
    onSyncRequest(packet: Z64O_SyncRequest) {
        this.lobbyConfig.syncModeBasic = packet.syncModeBasic;
        this.lobbyConfig.syncModeTime = packet.syncModeTime;
    }

    @EventHandler(API.Z64.Z64Events.ON_SCENE_CHANGE)
    onSceneChange() {
        if (this.core.MM!.global.scene === 0x08) {
            return;
        }
        if (this.sotActive) {
            console.log("Clearing flags during SoT");
            this.clientStorage.eventFlags = this.core.MM!.save.weekEventFlags; //Clear flags on SoT Cutscene
            this.ModLoader.clientSide.sendPacket(new Z64O_FlagUpdate(this.clientStorage.eventFlags, this.ModLoader.clientLobby));
        }
        this.sotActive = false;
        console.log(`is Song of Time still active? ${this.sotActive}`);
        if (this.sentSoT) this.ModLoader.clientSide.sendPacket(new Z64O_SoTPacket(false, this.ModLoader.clientLobby));
    }
}