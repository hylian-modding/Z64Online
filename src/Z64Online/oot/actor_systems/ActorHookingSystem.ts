import { GameParent } from "@Z64Online/common/api/GameParent";
import { IZ64OnlineHelpers } from "@Z64Online/common/lib/IZ64OnlineHelpers";
import { Scene } from "@Z64Online/common/types/Types";
import { InjectCore } from "modloader64_api/CoreInjection";
import { EventHandler, EventsClient } from "modloader64_api/EventHandler";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { UDPPacket } from "modloader64_api/ModLoaderDefaultImpls";
import { NetworkHandler, ServerNetworkHandler } from "modloader64_api/NetworkHandler";
import { onTick } from "modloader64_api/PluginLifecycle";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IActor, Z64 } from "Z64Lib/API/imports";

class Z64O_ActorSyncPacket extends UDPPacket {

  uuid: string;
  data: Buffer;

  constructor(lobby: string, uuid: string, data: Buffer) {
    super('Z64O_ActorSyncPacket', "Z64O", lobby, false);
    this.uuid = uuid;
    this.data = data;
  }
}

class Z64O_ActorSpawnPacket extends UDPPacket {

  Actor: IActor;
  scene: Scene;
  room: number;

  constructor(lobby: string, actor: IActor, scene: Scene, room: number) {
    super('Z64O_ActorSpawnPacket', 'Z64O', lobby, false);
    this.Actor = actor;
    this.scene = scene;
    this.room = room;
  }
}

export class ActorHookingManagerServer {

  @GameParent()
  parent!: IZ64OnlineHelpers;

  @ServerNetworkHandler('Z64O_ActorSyncPacket')
  onZ64O_ActorSyncPacket(packet: Z64O_ActorSyncPacket) {
    this.parent.sendPacketToPlayersInScene(packet);
  }

  @ServerNetworkHandler('Z64O_ActorSpawnPacket')
  onZ64O_ActorSpawnPacket(packet: Z64O_ActorSpawnPacket) {
    this.parent.sendPacketToPlayersInScene(packet);
  }
}

export class ActorHookingManagerClient {

  @ModLoaderAPIInject()
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IZ64Main;

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onInject() {
    
  }

  @EventHandler(Z64.OotEvents.ON_ACTOR_SPAWN)
  onActorSpawn(actor: IActor) {
  }

  @EventHandler(Z64.OotEvents.ON_ACTOR_DESPAWN)
  onActorDespawn(actor: IActor) {
  }

  @NetworkHandler('Z64O_ActorSpawnPacket')
  onSpawnPacket(packet: Z64O_ActorSpawnPacket) {
  }

  @NetworkHandler('Z64O_ActorSyncPacket')
  onSyncPacket(packet: Z64O_ActorSyncPacket) {
  }

  @onTick()
  onTick() {
  }

  @EventHandler(Z64.OotEvents.ON_LOADING_ZONE)
  onLoadingZone() {
  }

  @EventHandler(Z64.OotEvents.ON_SCENE_CHANGE)
  onSceneChange(scene: number) {
  }

}
