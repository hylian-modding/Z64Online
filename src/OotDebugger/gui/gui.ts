import { MessageLayer } from "modloader64_api/MessageLayer";
import { TunnelMessageHandler, GUITunnelPacket } from "modloader64_api/GUITunnel";

const electron = require('electron');
const ipc = electron.ipcRenderer;

const hooks = {
    onSceneChange: (scene: number)=>{},
    onRoomChange: (room: number)=>{},
    onLiveChange: (data: string)=>{},
    onSaveChange: (data: string)=>{}
};

class MapMessageHandlers{

    tunnel: MessageLayer

    constructor(){
        this.tunnel = new MessageLayer("OotoDebugger", ipc, ipc);
        this.tunnel.setupMessageProcessor(this);
    }

    @TunnelMessageHandler("OotOnline:onSceneChanged")
    onPlayerMovedScene(evt: GUITunnelPacket){
        hooks.onSceneChange(evt.data)
    }

    @TunnelMessageHandler("OotOnline:onRoomChanged")
    onPlayerMovedRoom(evt: GUITunnelPacket){
        hooks.onRoomChange(evt.data);
    }

    @TunnelMessageHandler("OotDebugger:LiveSceneData")
    onLive(evt: GUITunnelPacket){
        hooks.onLiveChange(evt.data)
    }

    @TunnelMessageHandler("OotDebugger:SaveSceneData")
    onSave(evt: GUITunnelPacket){
        hooks.onSaveChange(evt.data);
    }

}

const handlers = new MapMessageHandlers();

module.exports = hooks;