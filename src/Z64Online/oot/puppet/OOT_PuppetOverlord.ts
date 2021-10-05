import { IPuppet } from "@Z64Online/common/puppet/IPuppet";
import { PuppetOverlordClient, PuppetOverlordServer } from "@Z64Online/common/puppet/PuppetOverlord";
import { Core, IZ64GameMain, Scene } from "@Z64Online/common/types/Types";
import { HorseData } from "@Z64Online/common/puppet/HorseData";
import { Puppet_OOT } from "@Z64Online/oot/puppet/Puppet_OOT";
import { Z64O_PuppetPacket, Z64O_ScenePacket, Z64O_SceneRequestPacket } from "@Z64Online/common/network/Z64OPackets";
import { PuppetQuery, Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { INetworkPlayer, IPacketHeader, NetworkHandler, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { EventsClient, EventHandler} from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { AgeOrForm} from "Z64Lib/API/Common/Z64API";
import { IActor} from "Z64Lib/API/Common/IActor";
import { OotEvents } from "Z64Lib/API/OoT/OOTAPI";
import { onTick, Postinit } from "modloader64_api/PluginLifecycle";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IZ64Master } from "@Z64Online/common/api/InternalAPI";

export class OOT_PuppetOverlordServer extends PuppetOverlordServer {
    @ParentReference()
    parent!: IZ64Master;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    @ServerNetworkHandler('Z64O_PuppetPacket')
    onPuppetData_server(packet: IPacketHeader) {
        this.parent.OOT.sendPacketToPlayersInScene(packet);
    }
}

export class OOT_PuppetOverlordClient extends PuppetOverlordClient {

    private Epona: HorseData | undefined;
    @ParentReference()
    parent!: IZ64GameMain;
    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: Core = {} as any;

    processNewPlayers() {
        if (this.playersAwaitingPuppets.length > 0) {
            let player: INetworkPlayer = this.playersAwaitingPuppets.splice(0, 1)[0];
            this.puppets.set(
                player.uuid,
                new Puppet_OOT(
                    player,
                    this.core.OOT!,
                    this.ModLoader,
                    (this.parent as any)["OOT"]
                )
            );
            this.ModLoader.logger.info('Player ' + player.nickname + ' assigned new puppet ' + this.puppets.get(player.uuid)!.id + '.');
            this.ModLoader.clientSide.sendPacket(new Z64O_SceneRequestPacket(this.ModLoader.clientLobby));
        }
    }

    sendPuppetPacket() {
        this.fakeClientPuppet.data!.onTick();
        let packet = new Z64O_PuppetPacket(this.fakeClientPuppet.data!, this.ModLoader.clientLobby);
        if (this.Epona !== undefined) {
            packet.setHorseData(this.Epona);
        }
        this.ModLoader.clientSide.sendPacket(packet);
    }

    processPuppetPacket(packet: Z64O_PuppetPacket) {
        if (this.puppets.has(packet.player.uuid)) {
            let puppet: Puppet_OOT = this.puppets.get(packet.player.uuid)! as Puppet_OOT;
            puppet.processIncomingPuppetData(packet.data);
            if (packet.horse_data !== undefined) {
                puppet.processIncomingHorseData(packet.horse_data);
            }
        }
    }

    isCurrentlyWarping() {
        return this.core.OOT!.link.rdramRead32(0x69C) === 0x00030000;
    }

    @Postinit()
    postinit(
    ) {
        this.fakeClientPuppet = new Puppet_OOT(
            this.ModLoader.me,
            this.core.OOT!,
            this.ModLoader,
            (this.parent as any)["OOT"]
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
        this.localPlayerChangingScenes(scene, this.core.OOT!.save.age);
    }

    @NetworkHandler('Z64O_ScenePacket')
    onSceneChange_client(packet: Z64O_ScenePacket) {
        this.changePuppetScene(packet.player, packet.scene);
    }

    @NetworkHandler('Z64O_PuppetPacket')
    onPuppetData_client(packet: Z64O_PuppetPacket) {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            this.core.OOT!.helper.isPaused() ||
            this.core.OOT!.helper.isLinkEnteringLoadingZone()
        ) {
            return;
        }
        this.processPuppetPacket(packet);
    }

    @EventHandler(OotEvents.ON_AGE_CHANGE)
    onAgeChange(age: AgeOrForm) {
        this.localPlayerLoadingZone();
    }

    @EventHandler(OotEvents.ON_ACTOR_SPAWN)
    onEponaSpawned(actor: IActor) {
        if (actor.actorID === 0x0014) {
            // Epona spawned.
            this.ModLoader.logger.debug("Epona spawned");
            this.Epona = new HorseData((actor as any)["instance"], this.fakeClientPuppet, this.core.OOT!);
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

    @onTick()
    onTick() {
        if (
            this.core.OOT!.helper.isTitleScreen() ||
            !this.core.OOT!.helper.isSceneNumberValid() ||
            this.core.OOT!.helper.isPaused()
        ) {
            return;
        }
        if (
            !this.core.OOT!.helper.isLinkEnteringLoadingZone() &&
            this.core.OOT!.helper.isInterfaceShown() &&
            !this.isCurrentlyWarping()
        ) {
            this.processNewPlayers();
            this.processAwaitingSpawns();
            this.lookForMissingOrStrandedPuppets();
        }
        else{
        
        }
        this.sendPuppetPacket();
    }

}