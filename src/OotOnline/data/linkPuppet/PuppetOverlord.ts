import { Puppet } from './Puppet';
import { IOOTCore, Age, OotEvents, Scene } from 'modloader64_api/OOT/OOTAPI';
import { INetworkPlayer, NetworkHandler, ServerNetworkHandler } from 'modloader64_api/NetworkHandler';
import { IModLoaderAPI, ModLoaderEvents } from 'modloader64_api/IModLoaderAPI';
import { Ooto_PuppetPacket, Ooto_SceneRequestPacket, Ooto_ScenePacket, Ooto_PuppetWrapperPacket } from '../OotOPackets';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { Postinit, onTick } from 'modloader64_api/PluginLifecycle';
import { EventHandler, EventsClient, bus, PrivateEventHandler } from 'modloader64_api/EventHandler';
import { Z64OnlineEvents, PuppetQuery } from '@OotOnline/Z64API/OotoAPI';
import { IActor } from 'modloader64_api/OOT/IActor';
import { HorseData } from './HorseData';
import { ParentReference, ProxySide, SidedProxy } from 'modloader64_api/SidedProxy/SidedProxy';
import { IZ64OnlineHelpers, OOTO_PRIVATE_EVENTS } from '../InternalAPI';

export let ACTOR_T_PADDING: number = 0;
export let ALL_PUPPETS_INVISIBLE: boolean = false;
export let FORBID_PUPPETS: boolean = false;

export class PuppetOverlordServer {

  @ParentReference()
  parent!: IZ64OnlineHelpers;

  @ServerNetworkHandler('Ooto_PuppetPacket')
  onPuppetData_server(packet: Ooto_PuppetWrapperPacket) {
    this.parent.sendPacketToPlayersInScene(packet);
  }
}

export class PuppetOverlordClient {
  private puppets: Map<string, Puppet> = new Map<string, Puppet>();
  private awaiting_spawn: Puppet[] = new Array<Puppet>();
  fakeClientPuppet!: Puppet;
  private amIAlone = true;
  private playersAwaitingPuppets: INetworkPlayer[] = new Array<
    INetworkPlayer
  >();
  @ParentReference()
  parent!: IZ64OnlineHelpers;
  private Epona: HorseData | undefined;
  private queuedSpawn: boolean = false;

  @ModLoaderAPIInject()
  private ModLoader!: IModLoaderAPI;
  @InjectCore()
  private core!: IOOTCore;

  @Postinit()
  postinit(
  ) {
    if (global.ModLoader['isDebugRom']) {
      ACTOR_T_PADDING += 16;
    }

    this.fakeClientPuppet = new Puppet(
      this.ModLoader.me,
      this.core,
      // The pointer here points to blank space, so should be fine.
      0x6011e8,
      this.ModLoader,
      this.parent
    );
  }

  get current_scene() {
    return this.fakeClientPuppet.scene;
  }

  localPlayerLoadingZone() {
    this.puppets.forEach(
      (value: Puppet, key: string, map: Map<string, Puppet>) => {
        value.despawn();
      }
    );
    this.awaiting_spawn.splice(0, this.awaiting_spawn.length);
    bus.emit(Z64OnlineEvents.PUPPETS_CLEAR, {});
  }

  localPlayerChangingScenes(entering_scene: Scene, age: Age) {
    this.awaiting_spawn.splice(0, this.awaiting_spawn.length);
    this.fakeClientPuppet.scene = entering_scene;
  }

  registerPuppet(player: INetworkPlayer) {
    this.ModLoader.logger.info(
      'Player ' + player.nickname + ' awaiting puppet assignment.'
    );
    this.playersAwaitingPuppets.push(player);
  }

  unregisterPuppet(player: INetworkPlayer) {
    if (this.puppets.has(player.uuid)) {
      let puppet: Puppet = this.puppets.get(player.uuid)!;
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

  changePuppetScene(player: INetworkPlayer, entering_scene: Scene) {
    if (this.puppets.has(player.uuid)) {
      let puppet = this.puppets.get(player.uuid)!;
      puppet.scene = entering_scene;
      this.ModLoader.logger.info(
        'Puppet ' + puppet.id + ' moved to scene ' + puppet.scene
      );
      if (this.fakeClientPuppet.scene === puppet.scene) {
        this.ModLoader.logger.info(
          'Queueing puppet ' + puppet.id + ' for immediate spawning.'
        );
        this.awaiting_spawn.push(puppet);
      }
    } else {
      this.ModLoader.logger.info('No puppet found for player ' + player.nickname + '.');
    }
  }

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
      this.ModLoader.logger.info(
        'Player ' +
        player.nickname +
        ' assigned new puppet ' +
        this.puppets.get(player.uuid)!.id +
        '.'
      );
      this.ModLoader.clientSide.sendPacket(new Ooto_SceneRequestPacket(this.ModLoader.clientLobby));
    }
  }

  processAwaitingSpawns() {
    if (this.awaiting_spawn.length > 0 && !this.queuedSpawn) {
      let puppet: Puppet = this.awaiting_spawn.shift() as Puppet;
      puppet.spawn();
    }
  }

  lookForMissingOrStrandedPuppets() {
    let check = false;
    this.puppets.forEach(
      (value: Puppet, key: string, map: Map<string, Puppet>) => {
        if (value.scene === this.fakeClientPuppet.scene) {
          if (!value.isSpawned && this.awaiting_spawn.indexOf(value) === -1) {
            this.awaiting_spawn.push(value);
          }
          check = true;
        }
        if (
          value.scene !== this.fakeClientPuppet.scene &&
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
      let puppet: Puppet = this.puppets.get(packet.player.uuid)!;
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

  @onTick()
  onTick() {
    if (FORBID_PUPPETS) return;
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
  onAgeChange(age: Age) {
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

  @EventHandler("OotOnline:RoguePuppet")
  onRoguePuppet(puppet: Puppet) {
    if (this.puppets.has(puppet.player.uuid)) {
      this.puppets.delete(puppet.player.uuid);
    }
  }

  @EventHandler(ModLoaderEvents.ON_SOFT_RESET_PRE)
  onReset(evt: any) {
    this.localPlayerLoadingZone();
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_SPAWNED)
  onSpawn(puppet: Puppet) {
    this.ModLoader.logger.debug("Unlocking puppet spawner.")
    this.queuedSpawn = false;
  }

  @EventHandler(Z64OnlineEvents.PLAYER_PUPPET_PRESPAWN)
  onPreSpawn(puppet: Puppet) {
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

  @PrivateEventHandler(OOTO_PRIVATE_EVENTS.TOGGLE_PUPPET_VISIBILITY)
  togglePuppetVisibility(t: boolean) {
    this.puppets.forEach((puppet: Puppet) => {
      puppet.toggleVisibility(t);
    });
    ALL_PUPPETS_INVISIBLE = t;
  }

  @PrivateEventHandler(OOTO_PRIVATE_EVENTS.FORBID_PUPPETS)
  toggleForbiddance(t: boolean){
    FORBID_PUPPETS = t;
    if (FORBID_PUPPETS){
      this.ModLoader.logger.debug("Puppet forbiddance true.");
      this.localPlayerLoadingZone();
    }else{
      this.ModLoader.logger.debug("Puppet forbiddance false.");
    }
  }

}