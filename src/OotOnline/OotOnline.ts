import { IPlugin, IPluginServerConfig, IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { IOotOnlineHelpers } from "./OotoAPI/OotoAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { SidedProxy, ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { OotOnlineClient } from "./OotOnlineClient";
import { OotOnlineServer } from "./OotOnlineServer";
import { IPacketHeader } from "modloader64_api/NetworkHandler";
import { OotOnlineStorageClient } from "./OotOnlineStorageClient";

export const SCENE_ARR_SIZE = 0xb0c;
export const EVENT_ARR_SIZE = 0x1c;
export const ITEM_FLAG_ARR_SIZE = 0x8;
export const INF_ARR_SIZE = 0x3c;
export const SKULLTULA_ARR_SIZE = 0x18;

export interface IOotOnlineLobbyConfig {
  data_syncing: boolean;
  actor_syncing: boolean;
  key_syncing: boolean;
}

export class OotOnlineConfigCategory {
  mapTracker: boolean = false;
}

export class OotOnline implements IPlugin, IOotOnlineHelpers, IPluginServerConfig {

  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  @SidedProxy(ProxySide.CLIENT, OotOnlineClient)
  client!: OotOnlineClient;
  @SidedProxy(ProxySide.SERVER, OotOnlineServer)
  server!: OotOnlineServer;

  sendPacketToPlayersInScene(packet: IPacketHeader): void {
    if (this.server !== undefined) {
      this.server.sendPacketToPlayersInScene(packet);
    }
  }

  getClientStorage(): OotOnlineStorageClient | null {
    return this.client !== undefined ? this.client.clientStorage : null;
  }

  preinit(): void {
  }

  init(): void {
  }

  postinit(): void {
  }

  onTick(frame: number): void {
  }

  getServerURL(): string {
    return "192.99.70.23:8000";
  }

}

module.exports = OotOnline;