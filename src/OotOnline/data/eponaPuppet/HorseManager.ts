import { IPuppetOverlord } from "@OotOnline/OotoAPI/IPuppetOverlord";
import { Age, IOOTCore, OotEvents } from "modloader64_api/OOT/OOTAPI";
import { INetworkPlayer, IPacketHeader, NetworkHandler } from "modloader64_api/NetworkHandler";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { onTick } from "modloader64_api/PluginLifecycle";
import { IOotOnlineHelpers } from "@OotOnline/OotoAPI/OotoAPI";
import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { Ooto_ScenePacket } from "../OotOPackets";
import { HorsePuppet } from "./HorsePuppet";
import { IPuppet } from "@OotOnline/OotoAPI/IPuppet";

export class HorseManager implements IPuppetOverlord {
    current_scene: number = -1;
    @ModLoaderAPIInject()
    private ModLoader!: IModLoaderAPI;
    @InjectCore()
    private core!: IOOTCore;
    private parent: IOotOnlineHelpers;
    private puppets: Map<string, HorsePuppet> = new Map<string, HorsePuppet>();
    private playersAwaitingPuppets: INetworkPlayer[] = new Array<INetworkPlayer>();
    private awaiting_spawn: HorsePuppet[] = new Array<HorsePuppet>();
    private amIAlone: boolean = true;

    constructor(parent: IOotOnlineHelpers) {
        this.parent = parent;
    }

    postinit(): void {
    }

    localPlayerLoadingZone(): void {
        this.puppets.forEach(
            (value: IPuppet, key: string, map: Map<string, IPuppet>) => {
                value.despawn();
            }
        );
        this.awaiting_spawn.splice(0, this.awaiting_spawn.length);
    }

    localPlayerChangingScenes(entering_scene: number, age: Age): void {
        this.awaiting_spawn.splice(0, this.awaiting_spawn.length);
        this.current_scene = entering_scene;
    }

    registerPuppet(player: INetworkPlayer): void {
        this.ModLoader.logger.info(
            'Player ' + player.nickname + ' awaiting Epona puppet assignment.'
        );
        this.playersAwaitingPuppets.push(player);
    }

    unregisterPuppet(player: INetworkPlayer): void {
        if (this.puppets.has(player.uuid)) {
            let puppet: IPuppet = this.puppets.get(player.uuid)!;
            puppet.despawn();
            this.puppets.delete(player.uuid);
        }
        if (this.playersAwaitingPuppets.length > 0) {
            let index = -1;
            for (let i = 0; i < this.playersAwaitingPuppets.length; i++) {
                if (this.playersAwaitingPuppets[i].uuid === player.uuid) {
                    index = i;
                    break;
                }
            }
            if (index > -1) {
                this.playersAwaitingPuppets.splice(index, 1);
            }
        }
    }

    changePuppetScene(player: INetworkPlayer, entering_scene: number, age: Age): void {
        if (this.puppets.has(player.uuid)) {
            let puppet = this.puppets.get(player.uuid)!;
            if (puppet.isSpawned && puppet.age !== age) {
                puppet.despawn();
            }
            puppet.scene = entering_scene;
            puppet.age = age;
            this.ModLoader.logger.info(
                'Puppet ' + puppet.id + ' moved to scene ' + puppet.scene
            );
            if (this.current_scene === puppet.scene) {
                this.ModLoader.logger.info(
                    'Queueing puppet ' + puppet.id + ' for immediate spawning.'
                );
                this.awaiting_spawn.push(puppet);
            }
        } else {
            this.ModLoader.logger.info('No puppet found for player ' + player.nickname + '.');
        }
    }

    processNewPlayers(): void {
        if (this.playersAwaitingPuppets.length > 0) {
            let player: INetworkPlayer = this.playersAwaitingPuppets.splice(0, 1)[0];
            this.puppets.set(
                player.uuid,
                new HorsePuppet(
                    player,
                    this.ModLoader,
                    this.core
                )
            );
            this.ModLoader.logger.info(
                'Player ' +
                player.nickname +
                ' assigned new Epona puppet ' +
                this.puppets.get(player.uuid)!.id +
                '.'
            );
        }
    }

    processAwaitingSpawns(): void {
        if (this.awaiting_spawn.length > 0) {
            let puppet: IPuppet = this.awaiting_spawn.shift() as IPuppet;
            puppet.spawn();
        }
    }

    lookForMissingOrStrandedPuppets(): void {
        let check = false;
        this.puppets.forEach(
            (value: HorsePuppet, key: string, map: Map<string, IPuppet>) => {
                if (value.scene === this.current_scene) {
                    if (!value.isSpawned && this.awaiting_spawn.indexOf(value) === -1) {
                        this.awaiting_spawn.push(value);
                    }
                    check = true;
                }
                if (
                    value.scene !== this.current_scene &&
                    value.isSpawned &&
                    !value.isShoveled
                ) {
                    value.shovel();
                }
            }
        );
        if (check) {
            this.amIAlone = false;
        } else {
            this.amIAlone = true;
        }
    }

    sendPuppetPacket(): void {
    }

    processPuppetPacket(packet: IPacketHeader): void {
    }

    generateCrashDump(): void {
    }

    @onTick()
    onTick(): void {
        if (
            !this.core.helper.isLinkEnteringLoadingZone() &&
            this.core.helper.isInterfaceShown()
        ) {
            this.processNewPlayers();
            this.processAwaitingSpawns();
            this.lookForMissingOrStrandedPuppets();
        }
        this.sendPuppetPacket();
    }

    // Actual Handlers
    @EventHandler(EventsClient.ON_PLAYER_JOIN)
    onPlayerJoin(player: INetworkPlayer) {
        this.registerPuppet(player);
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onPlayerLeft(player: INetworkPlayer) {
        this.unregisterPuppet(player);
    }

    @EventHandler(OotEvents.ON_LOADING_ZONE)
    onLoadingZone(evt: any) {
        this.localPlayerLoadingZone();
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        this.localPlayerLoadingZone();
        this.localPlayerChangingScenes(scene, this.core.save.age);
    }

    @NetworkHandler('Ooto_ScenePacket')
    onSceneChange_client(packet: Ooto_ScenePacket) {
        this.changePuppetScene(packet.player, packet.scene, packet.age);
    }

    @EventHandler(OotEvents.ON_AGE_CHANGE)
    onAgeChange(age: Age) {
        this.localPlayerLoadingZone();
    }

    @EventHandler(ModLoaderEvents.ON_CRASH)
    onEmuCrash(evt: any) {
        this.generateCrashDump();
    }

}