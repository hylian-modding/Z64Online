import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { NetworkHandler } from 'modloader64_api/NetworkHandler';
import { CDNConfirm_Packet, CDNFileDownload_Packet, CDNFileRequest_Packet, CDNFileUpload_Packet } from './CDNPackets';
import zip from 'adm-zip';
import { SmartBuffer } from 'smart-buffer';
import { onTick, onViUpdate } from 'modloader64_api/PluginLifecycle';
import { rgba, xy } from 'modloader64_api/Sylvain/vec';

const MAX_UPLOAD_RATE: number = Math.floor(0xE000 / 20);

class PendingUpload {
    buf: SmartBuffer = new SmartBuffer();
    con: boolean = true;
    chunks: number = 0;
    curChunk: number = 0;
    resolve: (bool: boolean)=>void;
    reject: (error: string)=>void;

    constructor(buf: Buffer, resolve: (bool: boolean)=>void, reject: (error: string)=>void) {
        this.buf.writeBuffer(buf);
        this.resolve = resolve;
        this.reject = reject;
    }
}

class PendingDownload{
    resolve: (buf: Buffer)=>void;
    reject: (error: string)=>void;

    constructor(r1: (buf: Buffer)=>void, r2: (error: string)=>void){
        this.resolve = r1;
        this.reject = r2;
    }
}

export class CDNClient {

    static singleton: CDNClient;
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    pendingQueries: Map<string, Buffer> = new Map<string, Buffer>();
    pendingQueryPromises: Map<string, (bool: boolean) => void> = new Map<string, (bool: boolean) => void>();
    pendingDownloads: Map<string, PendingDownload> = new Map<string, PendingDownload>();
    pendingUploads: Map<string, PendingUpload> = new Map<string, PendingUpload>();
    cache: Map<string, Buffer> = new Map();

    constructor() {
        CDNClient.singleton = this;
    }

    registerWithCache(buf: Buffer){
        this.cache.set(this.ModLoader.utils.hashBuffer(buf), buf);
    }

    askCDN(buf: Buffer) {
        let pend = this.ModLoader.utils.hashBuffer(buf);
        this.pendingQueries.set(pend, buf);
        let promise = new Promise<boolean>((resolve, reject) => {
            if (this.cache.has(pend)){
                this.pendingQueries.delete(pend);
                resolve(true);
                return;
            }else{
                this.pendingQueryPromises.set(pend, resolve);
            }
        });
        this.ModLoader.clientSide.sendPacket(new CDNFileRequest_Packet(pend));
        return promise;
    }

    uploadFile(id: string, buf: Buffer){
        return new Promise<boolean>((resolve, reject)=>{
            this.pendingUploads.set(id, new PendingUpload(buf, resolve, reject));
        });
    }

    requestFile(id: string) {
        let promise = new Promise<Buffer>((resolve, reject) => {
            if (this.cache.has(id)){
                resolve(this.cache.get(id)!);
            }else{
                this.pendingDownloads.set(id, new PendingDownload(resolve, reject));
                this.ModLoader.clientSide.sendPacket(new CDNFileDownload_Packet(id));
            }
        });
        return promise;
    }

    @NetworkHandler('CDNFileRequest_Packet')
    private onResp(packet: CDNFileRequest_Packet) {
        if (this.pendingQueries.has(packet.model_id)) {
            this.pendingQueryPromises.get(packet.model_id)!(packet.has);
            this.pendingQueryPromises.delete(packet.model_id);
            this.pendingQueries.delete(packet.model_id);
        }
    }

    @onTick()
    onTick() {
        if (this.pendingUploads.size > 0) {
            const [[k, v]] = this.pendingUploads;
            if (v.con) {
                if (v.chunks === 0){
                    v.chunks = Math.round(v.buf.length / MAX_UPLOAD_RATE);
                }
                if (v.buf.remaining() >= MAX_UPLOAD_RATE) {
                    let p = new CDNFileUpload_Packet(k, v.buf.readBuffer(MAX_UPLOAD_RATE));
                    this.ModLoader.clientSide.sendPacket(p);
                    v.curChunk++;
                } else {
                    let p = new CDNFileUpload_Packet(k, v.buf.readBuffer(v.buf.remaining()));
                    p.done = true;
                    this.ModLoader.clientSide.sendPacket(p);
                    v.curChunk++;
                    this.pendingUploads.get(k)!.resolve(true);
                    this.pendingUploads.delete(k);
                }
                v.con = false;
            }
        }
    }

    @onViUpdate()
    onVi(){
        if (this.pendingUploads.size > 0){
            this.ModLoader.ImGui.getForegroundDrawList().addText(xy(0, 0), rgba(0xFF, 0xFF, 0xFF, 0xFF), "You are currently uploading custom content to other players...");
            const [[k, v]] = this.pendingUploads;
            this.ModLoader.ImGui.getForegroundDrawList().addText(xy(0, 14), rgba(0xFF, 0xFF, 0xFF, 0xFF), `${v.curChunk} of ${v.chunks} blocks transferred. ${this.pendingUploads.size} items pending.`);
        }
    }

    @NetworkHandler('CDNFileDownload_Packet')
    private onResp2(packet: CDNFileDownload_Packet) {
        if (packet.error){
            this.ModLoader.logger.error("Failed to download asset " + packet.model_id + ".");
            this.pendingDownloads.get(packet.model_id)!.reject("Failed to download asset " + packet.model_id + ".");
            this.pendingDownloads.delete(packet.model_id);
        }else{
            var fetchUrl = require("fetch").fetchUrl;
            fetchUrl(packet.url, (error: any, meta: any, body: any) => {
                if (this.pendingDownloads.has(packet.model_id)) {
                    this.ModLoader.utils.setTimeoutFrames(() => {
                        let _zip = new zip(body);
                        let data = _zip.getEntry(packet.model_id)!.getData();
                        this.cache.set(packet.model_id, data);
                        this.pendingDownloads.get(packet.model_id)!.resolve(data);
                        this.pendingDownloads.delete(packet.model_id);
                    }, 1);
                }
            });
        }
    }

    @NetworkHandler('CDNConfirm_Packet')
    private onResp3(packet: CDNConfirm_Packet){
        if (this.pendingUploads.has(packet.id)){
            this.pendingUploads.get(packet.id)!.con = packet.con;
        }
    }

}