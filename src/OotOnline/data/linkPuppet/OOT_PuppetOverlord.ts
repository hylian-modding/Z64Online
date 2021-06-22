import { IPuppet } from "@OotOnline/common/puppet/IPuppet";
import { PuppetOverlordClient, PuppetOverlordServer } from "@OotOnline/common/puppet/PuppetOverlord";
import { AgeorForm, Core, Scene } from "@OotOnline/common/types/Types";
import { HorseData } from "@OotOnline/data/linkPuppet/HorseData";
import { Puppet } from "@OotOnline/data/linkPuppet/Puppet";
import { Ooto_PuppetPacket, Ooto_PuppetWrapperPacket, Ooto_ScenePacket, Ooto_SceneRequestPacket } from "@OotOnline/data/OotOPackets";
import { PuppetQuery, Z64OnlineEvents } from "@OotOnline/common/api/Z64API";
import { INetworkPlayer, IPacketHeader, NetworkHandler, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { EventsClient, EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { IActor } from "modloader64_api/OOT/IActor";
import { OotEvents } from "modloader64_api/OOT/OOTAPI";
import { onTick, Postinit } from "modloader64_api/PluginLifecycle";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IOotUtility } from "@OotOnline/data/InternalAPI";
import { IZ64OnlineHelpers } from "@OotOnline/common/lib/IZ64OnlineHelpers";

export class OOT_PuppetOverlordServer extends PuppetOverlordServer {
    @ParentReference()
    parent!: IZ64OnlineHelpers;

    @ServerNetworkHandler('Ooto_PuppetPacket')
    onPuppetData_server(packet: IPacketHeader) {
        this.parent.sendPacketToPlayersInScene(packet);
    }
}

export class OOT_PuppetOverlordClient extends PuppetOverlordClient {

    private Epona: HorseData | undefined;
    @ParentReference()
    parent!: IOotUtility;
    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: Core = {} as any;

    processNewPlayers() {
        if (this.playersAwaitingPuppets.length > 0) {
            let player: INetworkPlayer = this.playersAwaitingPuppets.splice(0, 1)[0];
            this.puppets.set(
                player.uuid,
                new Puppet(
                    player,
                    this.core,
                    0x0,
                    this.ModLoader,
                    this.parent
                )
            );
            this.ModLoader.logger.info('Player ' + player.nickname + ' assigned new puppet ' + this.puppets.get(player.uuid)!.id + '.');
            this.ModLoader.clientSide.sendPacket(new Ooto_SceneRequestPacket(this.ModLoader.clientLobby));
        }
    }

    sendPuppetPacket() {
        if (!this.amIAlone) {
            this.fakeClientPuppet.data.onTick();
            let packet = new Ooto_PuppetPacket(this.fakeClientPuppet.data, this.ModLoader.clientLobby);
            if (this.Epona !== undefined) {
                packet.setHorseData(this.Epona);
            }
            this.ModLoader.clientSide.sendPacket(new Ooto_PuppetWrapperPacket(packet, this.ModLoader.clientLobby));
        }
    }

    processPuppetPacket(packet: Ooto_PuppetWrapperPacket) {
        if (this.puppets.has(packet.player.uuid)) {
            let puppet: Puppet = this.puppets.get(packet.player.uuid)! as Puppet;
            let actualPacket = JSON.parse(packet.data) as Ooto_PuppetPacket;
            puppet.processIncomingPuppetData(actualPacket.data);
            if (actualPacket.horse_data !== undefined) {
                puppet.processIncomingHorseData(actualPacket.horse_data);
            }
        }
    }

    isCurrentlyWarping() {
        return this.core.link.rdramRead32(0x69C) === 0x00030000;
    }

    @Postinit()
    postinit(
    ) {
        this.fakeClientPuppet = new Puppet(
            this.ModLoader.me,
            this.core,
            0x0,
            this.ModLoader,
            this.parent
        );
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
    onSceneChange(scene: Scene) {
        this.localPlayerLoadingZone();
        this.localPlayerChangingScenes(scene, this.core.save.age);
    }

    @NetworkHandler('Ooto_ScenePacket')
    onSceneChange_client(packet: Ooto_ScenePacket) {
        this.changePuppetScene(packet.player, packet.scene);
    }

    @NetworkHandler('Ooto_PuppetPacket')
    onPuppetData_client(packet: Ooto_PuppetWrapperPacket) {
        if (
            this.core.helper.isTitleScreen() ||
            this.core.helper.isPaused() ||
            this.core.helper.isLinkEnteringLoadingZone()
        ) {
            return;
        }
        this.processPuppetPacket(packet);
    }

    @EventHandler(OotEvents.ON_AGE_CHANGE)
    onAgeChange(age: AgeorForm) {
        this.localPlayerLoadingZone();
    }

    @EventHandler(OotEvents.ON_ACTOR_SPAWN)
    onEponaSpawned(actor: IActor) {
        if (actor.actorID === 0x0014) {
            // Epona spawned.
            this.ModLoader.logger.debug("Epona spawned");
            this.Epona = new HorseData((actor as any)["instance"], this.fakeClientPuppet, this.core);
        }
    }

    @EventHandler(OotEvents.ON_ACTOR_DESPAWN)
    onEponaDespawned(actor: IActor) {
        if (actor.actorID === 0x0014) {
            // Epona despawned.
            this.Epona = undefined;
            this.ModLoader.logger.debug("Epona despawned");
        }
    }

    @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
    onReset(evt: any) {
        this.localPlayerLoadingZone();
    }

    @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
    onSpawn(puppet: IPuppet) {
        this.ModLoader.logger.debug("Unlocking puppet spawner.")
        this.queuedSpawn = false;
    }

    @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN)
    onPreSpawn(puppet: IPuppet) {
        this.ModLoader.logger.debug("Locking puppet spawner.")
        this.queuedSpawn = true;
    }

    @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_QUERY)
    onQuery(evt: PuppetQuery) {
        if (this.puppets.has(evt.player.uuid)) {
            evt.puppet = this.puppets.get(evt.player.uuid);
        }
    }

    @EventHandler(Z64OnlineEvents.FORCE_PUPPET_RESPAWN_IMMEDIATE)
    onForceRepop(evt: any) {
        let puppet = this.puppets.get(evt.player.uuid);
        if (puppet !== undefined) {
            if (puppet.isSpawning) return;
            if (puppet.isShoveled) {
                puppet.despawn();
            }
            if (puppet.isSpawned) {
                puppet.despawn();
                // The system will auto-respawn these in a couple of frames.
            }
        }
    }

    @onTick()
    onTick() {
        if (
            this.core.helper.isTitleScreen() ||
            !this.core.helper.isSceneNumberValid() ||
            this.core.helper.isPaused()
        ) {
            return;
        }
        if (
            !this.core.helper.isLinkEnteringLoadingZone() &&
            this.core.helper.isInterfaceShown() &&
            !this.isCurrentlyWarping()
        ) {
            this.processNewPlayers();
            this.processAwaitingSpawns();
            this.lookForMissingOrStrandedPuppets();
        }
        this.sendPuppetPacket();
    }

}