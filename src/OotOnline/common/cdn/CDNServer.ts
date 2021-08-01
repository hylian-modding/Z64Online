import { Worker } from 'worker_threads';
import { Preinit } from 'modloader64_api/PluginLifecycle';
import path from 'path';
import { CDNData } from './ICDNData';
import { ServerNetworkHandler } from 'modloader64_api/NetworkHandler';
import { CDNFileDownload_Packet, CDNFileRequest_Packet, CDNFileUpload_Packet } from './CDNPackets';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';

export class CDNServer {

    thread!: Worker;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;

    @ServerNetworkHandler('CDNFileRequest_Packet')
    onRequest(packet: CDNFileRequest_Packet) {
        this.sendMessageToThread(packet.packet_id, packet);
    }

    @ServerNetworkHandler('CDNFileUpload_Packet')
    onUpload(packet: CDNFileUpload_Packet) {
        let wr = new CDNFileUpload_Packet(packet.id, packet.buf);
        wr.done = packet.done;
        wr.player = packet.player;
        let sab = new SharedArrayBuffer(wr.buf.byteLength);
        wr.buf.copy(Buffer.from(sab));
        //@ts-ignore
        wr.buf = sab;
        this.sendMessageToThread(wr.packet_id, wr);
    }

    @ServerNetworkHandler('CDNFileDownload_Packet')
    onDownload(packet: CDNFileDownload_Packet) {
        this.sendMessageToThread(packet.packet_id, packet);
    }

    @Preinit()
    private preinit() {
        this.thread = new Worker(path.resolve(__dirname, "CDNThread.js"));
        this.thread.on('message', this.onMessageFromThread.bind(this));
        this.sendMessageToThread("root", process.cwd());
    }

    private onMessageFromThread(to: CDNData) {
        switch (to.id) {
            case "CDNFileRequest_Packet":
            case "CDNConfirm_Packet":
            case "CDNFileDownload_Packet":
                this.ModLoader.serverSide.sendPacketToSpecificPlayer(to.packet, to.packet.player);
                break;
        }
    }

    private sendMessageToThread(id: string, packet: any) {
        this.thread.postMessage(new CDNData(id, packet));
    }

}