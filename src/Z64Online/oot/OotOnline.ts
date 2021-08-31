import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { InjectCore } from "modloader64_api/CoreInjection";
import { SidedProxy, ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { IPacketHeader } from "modloader64_api/NetworkHandler";
import path from 'path';
import { setupOot } from "../common/types/GameAliases";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Preinit } from "modloader64_api/PluginLifecycle";
import { IZ64GameMain } from "@Z64Online/common/types/Types";
import { IS_DEV_BUILD } from "../common/lib/IS_DEV_BUILD";
import { IZ64Utility } from "@Z64Online/common/api/InternalAPI";
import { IZ64ClientStorage } from "@Z64Online/common/storage/Z64Storage";

export const SCENE_ARR_SIZE = 0xb0c;
export const EVENT_ARR_SIZE = 0x1c;
export const ITEM_FLAG_ARR_SIZE = 0x8;
export const INF_ARR_SIZE = 0x3c;
export const SKULLTULA_ARR_SIZE = 0x18;
export const SCARECROW_ARR_SIZE = 0x80;

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
  autosaves: boolean = true;
}

export default class OotOnline implements IZ64GameMain, IZ64Utility {

  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IZ64Main;
  @SidedProxy(ProxySide.CLIENT, path.resolve(__dirname, "OotOnlineClient.js"))
  client!: any;
  @SidedProxy(ProxySide.SERVER, path.resolve(__dirname, "OotOnlineServer.js"))
  server!: any;

  sendPacketToPlayersInScene(packet: IPacketHeader): void {
    if (this.server !== undefined) {
      this.server.sendPacketToPlayersInScene(packet);
    }
  }

  getClientStorage(): IZ64ClientStorage {
    return this.client !== undefined ? this.client.clientStorage : null;
  }

  @Preinit()
  preinit(): void {
    setupOot();
  }

  getServerURL(): string {
    return IS_DEV_BUILD ? "192.99.70.23:9000" : "192.99.70.23:8000";
  }

}