import {
  EventsClient,
  EventServerJoined,
  EventServerLeft,
  EventHandler,
  EventsServer,
} from 'modloader64_api/EventHandler';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import {
  ILobbyStorage,
  INetworkPlayer,
  LobbyData,
  NetworkHandler,
  ServerNetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { LobbyVariable } from 'modloader64_api/LobbyVariable';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import * as Net from './network/Imports';

export class _name_ implements IPlugin {
  ModLoader = {} as IModLoaderAPI;
  name = '_name_';

  @InjectCore() core!: _core_;

  // Storage Variables
  @LobbyVariable('_name_:storage')
  sDB = new Net.DatabaseServer();
  cDB = new Net.DatabaseClient();
  
  constructor() {}

  preinit(): void {}

  init(): void {}

  postinit(): void {}

  onTick(): void {}

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onClient_InjectFinished(evt: any) {}

  @EventHandler(EventsServer.ON_LOBBY_CREATE)
  onServer_LobbyCreate(storage: ILobbyStorage) {
    this.sDB = new Net.DatabaseServer();
  }

  @EventHandler(EventsClient.ON_LOBBY_JOIN)
  onClient_LobbyJoin(lobby: LobbyData): void {
    this.cDB = new Net.DatabaseClient();
  }

  @EventHandler(EventsServer.ON_LOBBY_JOIN)
  onServer_LobbyJoin(evt: EventServerJoined) {}

  @EventHandler(EventsServer.ON_LOBBY_LEAVE)
  onServer_LobbyLeave(evt: EventServerLeft) {
    let lobbyStorage = this.ModLoader.lobbyManager.getLobbyStorage(evt.lobby);
    if (lobbyStorage === null) return;
    let storage = lobbyStorage.data['_name_:storage'].sDB as Net.DatabaseServer;
  }

  @EventHandler(EventsClient.ON_SERVER_CONNECTION)
  onClient_ServerConnection(evt: any) {}

  @EventHandler(EventsClient.ON_PLAYER_JOIN)
  onClient_PlayerJoin(nplayer: INetworkPlayer) {}

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onClient_PlayerLeave(nplayer: INetworkPlayer) {}

  // #################################################
  // ##  Server Receive Packets
  // #################################################

  @ServerNetworkHandler('MyTcpPacket')
  onServer_MyTcpPacket(packet: Net.MyTcpPacket): void {
    this.ModLoader.logger.info('[Server] Received: {MyTcpPacket}');
  }

  @ServerNetworkHandler('MyUdpPacket')
  onServer_MyUdpPacket(packet: Net.MyUdpPacket): void {
    this.ModLoader.logger.info('[Server] Received: {MyUdpPacket}');
  }

  // #################################################
  // ##  Client Receive Packets
  // #################################################

  @NetworkHandler('MyTcpPacket')
  onClient_MyTcpPacket(packet: Net.MyTcpPacket): void {
    this.ModLoader.logger.info('[Client] Received: {MyTcpPacket}');
  }
  
  @NetworkHandler('MyUdpPacket')
  onClient_MyUdpPacket(packet: Net.MyUdpPacket): void {
    this.ModLoader.logger.info('[Client] Received: {MyUdpPacket}');
  }
}
