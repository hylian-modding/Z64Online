import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { bus, EventHandler, EventsServer } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { NetworkHandler, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { Preinit } from "modloader64_api/PluginLifecycle";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { MMOnlineConfigCategory } from "../MMOnline";
import { Z64O_ServerTimeStart, Z64O_SoTPacket, Z64O_SyncRequest, Z64O_SyncSettings, Z64O_TimePacket } from "../network/MMOPackets";
import { MMOnlineStorage } from "../storage/MMOnlineStorage";
import { ParentReference } from 'modloader64_api/SidedProxy/SidedProxy';

export const RECORD_TICK_MODULO = 6
export const NUM_SCHEDULE_TICKS = 196608;
export const NUM_TICKS_PER_DAY = 0x10000;
export const NUM_TICKS_SYNC = NUM_TICKS_PER_DAY / RECORD_TICK_MODULO
export const TICKS_PER_HOUR = NUM_TICKS_PER_DAY / 24;
export const TICKS_PER_MINUTE = TICKS_PER_HOUR / 60;

export default class TimeSyncServer {
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    @ParentReference()
    parent: any;
    simulatedTime!: number;
    simulatedDay!: number;
    simulatedSpeed!: number;
    simulatedNight!: number;
    sotActive: boolean = false;

    @ServerNetworkHandler('Z64O_ServerTimeStart')
    serverUpdate(packet: Z64O_ServerTimeStart) {
        //console.log(`Server: Z64O_ServerTimeStart`)

        //600 frames between event handler
        //3 ticks per frame on normal
        //1 tick per frame on inverted
        //60 ticks = 20fps = 1 second

        // this.simulatedTime = this.simulatedTime + (this.simulatedSpeed + 3) * 200;
        /*         if (this.simulatedTime > NUM_TICKS_PER_DAY) {
                    this.simulatedTime = 0;
                    this.simulatedDay++;
                } */

        /* if (this.simulatedTime <= 0xBFFF && this.simulatedNight === 0) {
            this.simulatedTime = 0xC000;
            this.simulatedNight = 1;
        }
        if (this.simulatedTime >= 0x3FFF && this.simulatedNight === 1) { //New Day
            this.simulatedTime = 0x4000;
            this.simulatedDay++;
            this.simulatedNight = 0;
        } */


        this.ModLoader.serverSide.sendPacket(new Z64O_TimePacket((this.simulatedTime + 0x4000) % NUM_TICKS_PER_DAY, this.simulatedDay, this.simulatedSpeed, this.simulatedNight, packet.lobby));

    }

    @ServerNetworkHandler('Z64O_SoTPacket')
    onSOT(packet: Z64O_SoTPacket) {
        //console.log(`Server: SoTPacket`);
        this.sotActive = packet.isTriggered;
        if (!this.sotActive) return;
        this.simulatedTime = 0;
        this.simulatedDay = 0;
        this.simulatedSpeed = 0;
        this.simulatedNight = 0;
        this.ModLoader.serverSide.sendPacket(new Z64O_TimePacket(this.simulatedTime, this.simulatedDay, this.simulatedSpeed, this.simulatedNight, packet.lobby));
    }

    @ServerNetworkHandler('Z64O_TimePacket')
    onTime(packet: Z64O_TimePacket) {
        if (this.sotActive || packet.reset) {
            console.log(`Server: Resetting time.`)
            this.simulatedTime = 0;
            this.simulatedDay = 0;
            this.simulatedSpeed = 0;
            this.simulatedNight = 0;
            this.ModLoader.serverSide.sendPacket(new Z64O_TimePacket(this.simulatedTime, this.simulatedDay, this.simulatedSpeed, this.simulatedNight, packet.lobby, true));
            return;
        }
        //console.log(`Server: onTime: ${packet.time}`)
        //Server needs to catch up to client
        this.simulatedTime = (packet.time + 0xC000) % NUM_TICKS_PER_DAY;
        //console.log(`server: onTime simulatedTime: ${this.simulatedTime}; packet.time: ${packet.time}; sending: ${(this.simulatedTime + 0x4000) % NUM_TICKS_PER_DAY}`)
        this.simulatedDay = packet.day;
        this.simulatedSpeed = packet.speed;
        this.simulatedNight = packet.night;
        this.ModLoader.serverSide.sendPacket(new Z64O_TimePacket((this.simulatedTime + 0x4000) % NUM_TICKS_PER_DAY, this.simulatedDay, this.simulatedSpeed, this.simulatedNight, packet.lobby));
    }

    @ServerNetworkHandler('Z64O_SyncRequest')
    onSyncRequest(packet: Z64O_SyncRequest) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        console.log(`Player ${packet.player.nickname} requested the current sync mode; basic: ${!storage.MM_IS_TIME}, time: ${storage.MM_IS_TIME}`);
        this.ModLoader.serverSide.sendPacketToSpecificPlayer(new Z64O_SyncRequest(packet.lobby, !storage.MM_IS_TIME, storage.MM_IS_TIME), packet.player);
    }

    @ServerNetworkHandler('Z64O_SyncSettings')
    onSyncSettings(packet: Z64O_SyncSettings) {
        let storage: MMOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
        ) as MMOnlineStorage;
        if (storage === null) {
            return;
        }
        storage.MM_IS_TIME = packet.syncModeTime;
        this.ModLoader.serverSide.sendPacket(new Z64O_SyncSettings(packet.syncModeBasic, packet.syncModeTime, packet.lobby));
    }

}