import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { InjectCore } from "modloader64_api/CoreInjection";
import { bus, EventHandler, EventsServer } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { NetworkHandler, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { Preinit, onTick, Postinit } from "modloader64_api/PluginLifecycle";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { LinkState } from "Z64Lib/API/Common/Z64API";
import { MMEvents } from "Z64Lib/API/MM/MMAPI";
import { Z64O_SoTPacket, Z64O_TimePacket } from "../network/MMOPackets";
import SoTTrigger from "./SoTTrigger";

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

    @Postinit()
    postInit() {
        this.songOfTime = new SoTTrigger(this.ModLoader, this.core);
    }

    get currentCutscene(): number {
        return this.ModLoader.emulator.rdramRead16(0x801F35BA);
    }

    @onTick()
    onTick() {
        if (!this.isStarted || !this.ModLoader.config.data["MMOnline"]["syncModeTime"]) return;
        if (this.core.MM!.save.time_speed === -2 && !this.inverted) {
            // switched to ISoT
            this.inverted = true;
            this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day, -2, this.core.MM!.save.day_night,
                this.ModLoader.clientLobby));
        } else if (this.core.MM!.save.time_speed === 0 && this.inverted) {
            // switch to normal speed
            this.inverted = false;
            this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day, 0, this.core.MM!.save.day_night,
                this.ModLoader.clientLobby));
        }
        //console.log(`current cutscene: ${this.currentCutscene.toString(16)}, current scene: ${this.core.MM!.global.scene}`)
        //if(this.core.MM!.global.scene === 0x8) console.log(`current cutscene: ${this.currentCutscene.toString(16)}, current scene: ${this.core.MM!.global.scene}`)
        if (this.core.MM!.global.scene === 0x08 && this.currentCutscene === 0xffef && this.core.MM!.global.scene_framecount === 20 && !this.dontRepeat) {
            console.log(`song of time triggered! sending to others...`)
            this.sentSoT = true;
            this.ModLoader.clientSide.sendPacket(new Z64O_SoTPacket(true, this.ModLoader.clientLobby));
        }
        if (this.core.MM!.global.scene !== 0x08 && this.core.MM!.global.scene_framecount === 20) {
            this.sentSoT = false;
            this.dontRepeat = false;
        }
    }

    @EventHandler(Z64OnlineEvents.MMO_TIME_START)
    timeStarted() {
        this.ModLoader.utils.setIntervalFrames(() => {
            if(!this.ModLoader.config.data["MMOnline"]["syncModeTime"]) return;
            bus.emit(Z64OnlineEvents.MMO_UPDATE_TIME);
        }, 200);
        this.isStarted = true;
    }

    @NetworkHandler('Z64O_SoTPacket')
    onSOT() {
        if (this.sentSoT) return;
        if(this.songOfTimeLoop !== undefined) return;
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
        if (!this.isStarted/*  || this.core.MM!.link.state !== LinkState.STANDING */|| this.ModLoader.config.data["MMOnline"]["syncModeBaisc"]) return;
        if (this.core.MM!.link.state === LinkState.BUSY || !this.core.MM!.helper.isInterfaceShown()) return;
        console.log(`Client onTime time: ${packet.time}`)

        // if (this.core.MM!.save.day_time >= 0x4000 && packet.time < 0x4000) return;
        // if (this.core.MM!.save.day_time >= 0xC000 && packet.time < 0xC000) return;

        console.log(`client time: ${this.core.MM!.save.day_time}; time - packet.time: ${this.core.MM!.save.day_time - packet.time}`);
        // if ((packet.time - this.core.MM!.save.day_time) > (TICKS_PER_HOUR / 4)) {

        //Check to see if player needs to be caught up through day change
        if (this.core.MM!.save.current_day < packet.day) {
            if (packet.time >= 0x4000) {
                console.log(`Moving forward a day? 1`)
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
                console.log(`Moving forward a day? 2`)
                this.ModLoader.clientSide.sendPacket(new Z64O_TimePacket(this.core.MM!.save.day_time, this.core.MM!.save.current_day,
                    this.core.MM!.save.time_speed, this.core.MM!.save.day_night, this.ModLoader.clientLobby))
            }
        }
        //if (packet.speed !== this.core.MM!.save.time_speed) {
        //    this.core.MM!.save.time_speed = packet.speed;
        //}

        //this.core.MM!.save.day_time = time;
        //this.core.MM!.save.current_day = day;
        //this.core.MM!.save.time_speed = speed;
        //this.core.MM!.save.day_night = night;

    }

}