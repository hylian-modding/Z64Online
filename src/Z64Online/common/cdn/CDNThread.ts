// !ML64_PROD_IGNORE
import { parentPort } from 'worker_threads';
import { CDNData } from './ICDNData';
import path from 'path';
import { CDNConfirm_Packet, CDNFileDownload_Packet, CDNFileFailure_Packet, CDNFileRequest_Packet, CDNFileUpload_Packet } from './CDNPackets';
import fs from 'fs-extra';
import zip from 'adm-zip';
import http, { IncomingMessage, ServerResponse } from 'http';
import { SmartBuffer } from 'smart-buffer';
import CDNConfig from './CDNConfig';

class CDNThread {

    knownFiles: Map<string, string> = new Map<string, string>();
    pendingUploads: Map<string, SmartBuffer> = new Map<string, SmartBuffer>();
    server!: http.Server;
    config!: CDNConfig;
    deleteMode: boolean = false;

    makeServer() {
        try {
            fs.mkdirSync("./cdn");
            fs.mkdirSync("./cdn/files");
        } catch (err: any) {
        }
        fs.readdirSync("./cdn/files").forEach((f: string) => {
            let p = path.resolve("./cdn/files", f);
            if (fs.existsSync(p)) {
                if (this.deleteMode) {
                    fs.unlinkSync(p);
                } else {
                    this.knownFiles.set(path.parse(p).name, p);
                }
            }
        });
        this.server = new http.Server((req: IncomingMessage, res: ServerResponse) => {
            fs.readFile(`./${req.url!}`, function (err, data) {
                if (err) {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }
                res.writeHead(200);
                res.write(data);
                res.end();
            });
        });
        this.server.listen(this.config.port);
    }

    hasFile(id: string) {
        return this.knownFiles.has(id);
    }

    handleRequest(packet: CDNFileRequest_Packet) {
        let resp: CDNFileRequest_Packet = new CDNFileRequest_Packet(packet.model_id);
        resp.has = this.hasFile(packet.model_id);
        resp.player = packet.player;
        this.sendMessageToMainThread(resp.packet_id, resp);
    }

    handleUpload(packet: CDNFileUpload_Packet) {
        if (!this.pendingUploads.has(packet.id)) {
            this.pendingUploads.set(packet.id, new SmartBuffer());
        }
        this.pendingUploads.get(packet.id)!.writeBuffer(packet.buf);
        if (packet.done) {
            let buf = this.pendingUploads.get(packet.id)!.toBuffer();
            let _zip = new zip();
            _zip.addFile(packet.id, buf);
            let p = path.resolve("./cdn/files/", `${packet.id}.zip`);
            fs.writeFile(p, _zip.toBuffer(), () => {
                this.knownFiles.set(packet.id, p);
                this.pendingUploads.delete(packet.id);
            });
        } else {
            let resp = new CDNConfirm_Packet(packet.id);
            resp.player = packet.player;
            this.sendMessageToMainThread('CDNConfirm_Packet', resp);
        }
    }

    handleDownload(packet: CDNFileDownload_Packet) {
        let resp = new CDNFileDownload_Packet(packet.model_id);
        resp.player = packet.player;
        let port = this.config.reverseProxy ? this.config.reverseProxyPort.toString() : this.config.port.toString();
        resp.url = `${this.config.url}:${port}/cdn/files/` + packet.model_id + ".zip";
        if (!this.knownFiles.has(packet.model_id)) {
            resp.error = true;
        }
        this.sendMessageToMainThread(resp.packet_id, resp);
    }

    handleFailure(packet: CDNFileFailure_Packet) {
        if (this.knownFiles.has(packet.id)) {
            let p = this.knownFiles.get(packet.id)!;
            try {
                fs.unlinkSync(p);
            } catch (err: any) { }
            this.knownFiles.delete(packet.id);
        }
    }

    private sendMessageToMainThread(id: string, packet: any) {
        parentPort!.postMessage(new CDNData(id, packet));
    }

    onMessageFromMainThread(p: CDNData) {
        switch (p.id) {
            case "config":
                this.config = p.packet;
                this.makeServer();
                break;
            case "CDNFileRequest_Packet":
                this.handleRequest(p.packet);
                break;
            case 'CDNFileUpload_Packet':
                p.packet.buf = Buffer.from(p.packet.buf);
                this.handleUpload(p.packet);
                break;
            case 'CDNFileDownload_Packet':
                this.handleDownload(p.packet);
                break;
            case 'CDNFileFailure_Packet':
                this.handleFailure(p.packet);
                break;
        }
    }
}

const thread: CDNThread = new CDNThread();

parentPort!.on('message', thread.onMessageFromMainThread.bind(thread));

// Tick tock keep the thread alive.
setInterval(() => { }, 1000);