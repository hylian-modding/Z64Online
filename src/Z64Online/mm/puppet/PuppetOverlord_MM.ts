import { PuppetOverlordClient, PuppetOverlordServer } from "@Z64Online/common/puppet/PuppetOverlord";
import { IZ64GameMain, Core, AgeOrForm } from "@Z64Online/common/types/Types";
import { INetworkPlayer, IPacketHeader, NetworkHandler, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api//IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api//ModLoaderAPIInjector";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import Puppet_MM from "./Puppet_MM";
import { Z64O_PuppetPacket, Z64O_ScenePacket, Z64O_SceneRequestPacket } from "@Z64Online/common/network/Z64OPackets";
import { HorseData } from "@Z64Online/common/puppet/HorseData";
import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { onTick, Postinit } from "modloader64_api/PluginLifecycle";
import { PuppetQuery, Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { IPuppet } from "@Z64Online/common/puppet/IPuppet";
import { Scene } from "Z64Lib/API/MM/MMAPI";
import { IZ64Master } from "@Z64Online/common/api/InternalAPI";
import { LinkState } from "Z64Lib/API/Common/Z64API";
import * as API from "Z64Lib/API/imports";

export class PuppetOverlordServer_MM extends PuppetOverlordServer {

    @ParentReference()
    parent!: IZ64Master;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    @ServerNetworkHandler('Z64O_PuppetPacket')
    onPuppetData_server(packet: IPacketHeader) {
        this.parent.MM.sendPacketToPlayersInScene(packet);
    }
}

export default class PuppetOverlord_MM extends PuppetOverlordClient {

    @ParentReference()
    parent!: IZ64GameMain;
    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: Core = {} as any;
    private Epona: HorseData | undefined;

    processNewPlayers() {
        if (this.playersAwaitingPuppets.length > 0) {
            let player: INetworkPlayer = this.playersAwaitingPuppets.splice(0, 1)[0];
            this.puppets.set(
                player.uuid,
                new Puppet_MM(
                    player,
                    this.core.MM!,
                    this.ModLoader,
                    (this.parent as any)["MM"]
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
            let puppet: Puppet_MM = this.puppets.get(packet.player.uuid)! as Puppet_MM;
            puppet.processIncomingPuppetData(packet.data);
            if (packet.horse_data !== undefined) {
                puppet.processIncomingHorseData(packet.horse_data);
            }
        }
    }

    // Actual Handlers

    @Postinit()
    postinit(
    ) {
        this.fakeClientPuppet = new Puppet_MM(
            this.ModLoader.me,
            this.core.OOT!,
            this.ModLoader,
            (this.parent as any)["MM"]
        );
    }

    @EventHandler(API.Z64.Z64Events.ON_LOADING_ZONE)
    onLoadingZone(evt: any) {
        this.localPlayerLoadingZone();
    }

    @EventHandler(API.Z64.Z64Events.ON_SCENE_CHANGE)
    onSceneChange(scene: Scene) {
        this.localPlayerLoadingZone();
        this.localPlayerChangingScenes(scene, this.core.MM!.save.form);
    }

    @EventHandler(EventsClient.ON_PLAYER_JOIN)
    onPlayerJoin(player: INetworkPlayer) {
        this.registerPuppet(player);
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onPlayerLeft(player: INetworkPlayer) {
        this.unregisterPuppet(player);
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

    // Networking
    @NetworkHandler('Z64O_ScenePacket')
    onSceneChange_client(packet: Z64O_ScenePacket) {
        let loop: string | undefined = this.ModLoader.utils.setIntervalFrames(() => {
            if (this.ModLoader.emulator.rdramRead32(0x8040081C) !== 0x30000002) {
                this.changePuppetScene(packet.player, packet.scene);
                this.ModLoader.utils.clearIntervalFrames(loop!);
                loop = undefined;
            }
        }, 20);
        //transformation state @TODO: Refine later
    }

    @NetworkHandler('Z64O_PuppetPacket')
    onPuppetData_client(packet: Z64O_PuppetPacket) {
        if (
            this.core.MM!.helper.isTitleScreen() ||
            this.core.MM!.helper.isPaused() ||
            this.core.MM!.helper.isLinkEnteringLoadingZone()
        ) {
            return;
        }
        if (this.ModLoader.emulator.rdramRead32(0x8040081C) === 0x30000002) return; //transformation state @TODO: Refine later
        this.processPuppetPacket(packet);
    }

    isCurrentlyWarping() {
        return this.core.MM!.link.rdramRead32(0xA90) === 0x00030000;
    }

    @onTick()
    onTick() {
        if (
            this.core.MM!.helper.isTitleScreen() ||
            !this.core.MM!.helper.isSceneNumberValid() ||
            this.core.MM!.helper.isPaused() || this.core.MM!.helper.isFadeIn()
        ) {
            return;
        }
        if (
            !this.core.MM!.helper.isLinkEnteringLoadingZone() &&
            this.core.MM!.helper.isInterfaceShown() &&
            !this.isCurrentlyWarping() &&
            !this.core.MM!.helper.isFadeIn()
        ) {
            if (this.core.MM!.helper.isFadeIn()) return;
            if (this.ModLoader.emulator.rdramRead32(0x8040081C) === 0x30000002) return; //transformation state @TODO: Refine later
            this.processNewPlayers();
            this.processAwaitingSpawns();
            this.lookForMissingOrStrandedPuppets();
            this.sendPuppetPacket();
        }
    }
}