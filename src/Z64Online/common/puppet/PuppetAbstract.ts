import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { IOvlPayloadResult, IZ64Core } from "Z64Lib/API/Common/Z64API";
import { Scene } from "Z64Lib/API/OoT/OOTAPI";
import { bus } from "modloader64_api/EventHandler";
import Vector3 from "modloader64_api/math/Vector3";
import { Z64OnlineEvents } from "../api/Z64API";
import { IZ64Clientside } from "../storage/Z64Storage";
import { AgeOrForm } from "../types/Types";
import { IPuppet } from "./IPuppet";
import { IPuppetData } from "./IPuppetData";
import { HorseData } from "./HorseData";
import { IActor } from "Z64Lib/API/imports";
import { PUPPET_INST_SIZE } from "../cosmetics/Defines";

let CUR_PUPPET_ID: number = 0;

export abstract class PuppetAbstract implements IPuppet {
    player: INetworkPlayer;
    id: string;
    data: IPuppetData | undefined;
    isSpawned: boolean = false;
    isSpawning: boolean = false;
    isShoveled: boolean = false;
    scene: Scene;
    ModLoader: IModLoaderAPI;
    core: IZ64Core;
    parent: IZ64Clientside;
    home!: Vector3;
    horse: HorseData | undefined;
    horseSpawning: boolean = false;
    modelPointer: number = 0;

    constructor(
        player: INetworkPlayer,
        core: IZ64Core,
        ModLoader: IModLoaderAPI,
        parent: IZ64Clientside
    ) {
        this.player = player;
        this.scene = 0xDEADBEEF;
        this.ModLoader = ModLoader;
        this.core = core;
        this.id = (CUR_PUPPET_ID++).toString(16).padStart(8, '0');
        this.parent = parent;
    }

    get ageOrForm(): AgeOrForm {
        return this.data!.ageOrForm;
    }

    doNotDespawnMe(p: number) {
        this.ModLoader.emulator.rdramWrite8(p + 0x3, 0xff);
    }

    spawn() {
        if (this.isShoveled) {
            this.isShoveled = false;
            this.ModLoader.logger.debug('Puppet resurrected.');
            return;
        }
        if (!this.isSpawned && !this.isSpawning) {
            bus.emit(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN, this);
            this.isSpawning = true;
/*             if (this.data!.pointer === 0){
                this.data!.pointer = this.ModLoader.heap!.malloc(PUPPET_INST_SIZE);
            } */
            this.parent.getClientStorage()!.puppetOvl.spawnActorRXY_Z(this.ageOrForm, this.modelPointer, 0, new Vector3(8192, -2048, 8192)).then((actor: IActor) => {
                this.data!.pointer = actor.pointer;
                this.doNotDespawnMe(this.data!.pointer);
                this.home = this.ModLoader.math.rdramReadV3(this.data!.pointer + 0x24);
                this.isSpawned = true;
                this.isSpawning = false;
                this.ModLoader.logger.debug(`Puppet ${this.id} pointer: ${this.data!.pointer.toString(16)}`);
                bus.emit(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED, this);
            });
        }
    }

    processIncomingPuppetData(data: {bundle: Buffer}) {
        if (this.isSpawned && !this.isShoveled) {
            this.data!.ageOrFormLastFrame = this.ageOrForm;
            this.data!.processBundle(data.bundle);
            if (this.data!.ageOrFormLastFrame !== this.ageOrForm) {
                bus.emit(Z64OnlineEvents.PUPPET_AGE_CHANGED, this);
            }
        }
    }

    shovel() {
        if (this.isSpawned) {
            if (this.data!.pointer > 0) {
                if (this.horse !== undefined) {
                    this.ModLoader.math.rdramWriteV3(this.horse.pointer + 0x24, this.home);
                    this.ModLoader.logger.debug(`Horse for puppet ${this.id} shoveled.`);
                }
                this.ModLoader.math.rdramWriteV3(this.data!.pointer + 0x24, this.home);
                this.ModLoader.logger.debug('Puppet ' + this.id + ' shoveled.');
                this.isShoveled = true;
            }
        }
    }

    despawn() {
        if (this.isSpawned) {
            if (this.data!.pointer > 0) {
                if (this.horse !== undefined) {
                    this.horse.puppet.rdramWrite32(0x130, 0x0);
                    this.horse.puppet.rdramWrite32(0x134, 0x0);
                    this.horse = undefined;
                }
                this.ModLoader.emulator.rdramWrite32(this.data!.pointer + 0x130, 0x0);
                this.ModLoader.emulator.rdramWrite32(this.data!.pointer + 0x134, 0x0);
                this.data!.pointer = 0;
            }
            this.isSpawned = false;
            this.isShoveled = false;
            this.ModLoader.logger.debug('Puppet ' + this.id + ' despawned.');
            bus.emit(Z64OnlineEvents.PLAYER_PUPPET_DESPAWNED, this);
        }
    }

    hasAttachedHorse(): boolean {
        return this.ModLoader.emulator.rdramRead32(this.data!.pointer + 0x011C) > 0;
    }

    processIncomingHorseData(data: HorseData) {
        if (this.horse === undefined && !this.horseSpawning) {
            this.horseSpawning = true;
            (this.parent.getClientStorage()!.overlayCache["horse-3.ovl"] as IOvlPayloadResult).spawn(0x0, new Vector3(8192, -2048, 8192), new Vector3(0, 0, 0)).then((actor: IActor) => {
                this.horse = new HorseData(actor.pointer, this, this.core);
                this.horseSpawning = false;
            });
        }
        if (this.isSpawned && !this.isShoveled && this.horse !== undefined && !this.horseSpawning) {
            Object.keys(data).forEach((key: string) => {
                (this.horse as any)[key] = (data as any)[key];
            });
        }
    }

}