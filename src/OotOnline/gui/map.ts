import { MessageLayer } from 'modloader64_api/MessageLayer';
import {
  TunnelMessageHandler,
  GUITunnelPacket,
} from 'modloader64_api/GUITunnel';

const electron = require('electron');
const ipc = electron.ipcRenderer;

const hooks = {
  onSceneChange: (packet: GUITunnelPacket) => {},
  onSceneChange_Network: (packet: GUITunnelPacket) => {},
  onPlayerLeft: (packet: GUITunnelPacket) => {},
  onData: (packet: GUITunnelPacket) => {},
  onAgeChange: (packet: GUITunnelPacket) => {},
};

class MapMessageHandlers {
  tunnel: MessageLayer;

  constructor() {
    this.tunnel = new MessageLayer('OotoMap', ipc, ipc);
    this.tunnel.setupMessageProcessor(this);
  }

  @TunnelMessageHandler('OotOnline:onSceneChanged')
  onPlayerMoved(evt: GUITunnelPacket) {
    hooks.onSceneChange(evt);
  }

  @TunnelMessageHandler('OotOnline:onSceneChanged_Network')
  onPlayerMoved_Network(evt: GUITunnelPacket) {
    hooks.onSceneChange_Network(evt);
  }

  @TunnelMessageHandler('OotOnline:onPlayerLeft')
  onPlayerLeft(evt: GUITunnelPacket) {
    hooks.onPlayerLeft(evt);
  }

  @TunnelMessageHandler('OotOnline:onSubscreenPacket')
  onData(evt: GUITunnelPacket) {
    hooks.onData(evt);
  }

  @TunnelMessageHandler('OotOnline:onAgeChange')
  onAgeChange(evt: GUITunnelPacket) {
    hooks.onAgeChange(evt);
  }
}

const handlers = new MapMessageHandlers();

module.exports = hooks;
