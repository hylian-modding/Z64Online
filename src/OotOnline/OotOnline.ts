import { IPlugin, IPluginServerConfig, IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { SidedProxy, ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { IPacketHeader } from "modloader64_api/NetworkHandler";
import { OotOnlineStorageClient } from "./OotOnlineStorageClient";
import path from 'path';
import { ExternalAPIProvider } from 'modloader64_api/ExternalAPIProvider';
import { IZ64OnlineHelpers } from "./data/InternalAPI";

export const SCENE_ARR_SIZE = 0xb0c;
export const EVENT_ARR_SIZE = 0x1c;
export const ITEM_FLAG_ARR_SIZE = 0x8;
export const INF_ARR_SIZE = 0x3c;
export const SKULLTULA_ARR_SIZE = 0x18;
export const SCARECROW_ARR_SIZE = 0x80;

export let IS_DEV_BUILD: boolean = false;
// #ifdef IS_DEV_BUILD
IS_DEV_BUILD = true;
// #endif

export const VERSION_NUMBER: number = require(path.resolve(__dirname, 'package.json')).version;
export const BUILD_DATE: number = require(path.resolve(__dirname, 'package.json')).date;

export interface IOotOnlineLobbyConfig {
  data_syncing: boolean;
  actor_syncing: boolean;
  key_syncing: boolean;
}

export class OotOnlineConfigCategory {
  mapTracker: boolean = false;
  keySync: boolean = true;
  notifications: boolean = true;
  nameplates: boolean = true;
  muteNetworkedSounds: boolean = false;
  muteLocalSounds: boolean = false;
  notificationSound: boolean = true;
  syncMasks: boolean = true;
  syncBottleContents: boolean = true;
  diagnosticMode: boolean = false;
}

@ExternalAPIProvider("Z64Lib", require(path.resolve(__dirname, "libs", "Z64Lib", "package.json")).version, path.resolve(__dirname, "libs", "Z64Lib"))
export default class OotOnline implements IPlugin, IZ64OnlineHelpers, IPluginServerConfig {

  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;
  @SidedProxy(ProxySide.CLIENT, path.resolve(__dirname, "OotOnlineClient.js"))
  client!: any;
  @SidedProxy(ProxySide.SERVER, path.resolve(__dirname, "OotOnlineServer.js"))
  server!: any;

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
    return IS_DEV_BUILD ? "192.99.70.23:9000" : "192.99.70.23:8000";
  }

}