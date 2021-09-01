import { RemoteSoundPlayRequest, Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { PUPPET_INST_SIZE } from "@Z64Online/common/cosmetics/Defines";
import { PuppetDataAbstract } from "@Z64Online/common/puppet/PuppetDataAbstract";
import { SyncData } from "@Z64Online/common/puppet/SyncData";
import path from 'path';
import { bus } from "modloader64_api/EventHandler";
import { IPuppet } from "@Z64Online/common/puppet/IPuppet";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";

export const SYNC_DATA: SyncData = require(path.resolve(__dirname, "PuppetSync_MM.json"));

export default class PuppetData_MM extends PuppetDataAbstract {

    constructor(parent: IPuppet, pointer: number, ModLoader: IModLoaderAPI) {
        super(parent, pointer, ModLoader);
    }

    processBundle(bundle: Buffer): void {
        this.buf.clear();
        this.buf.writeBuffer(bundle);
        this.buf.readOffset = 0;
        let keys = Object.keys(SYNC_DATA.destinations);
        let pendingSound = 0;
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (key === "form") {
                let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
                this.ageOrForm = data.readUInt8(0);
                // force this to be uint32_t for compatibility.
                this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
            } else if (key === "sound") {
                let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
                pendingSound = data.readUInt16BE(0);
            } else {
                let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
                this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
            }
        }
        let temp = this.ModLoader.emulator.rdramReadBuffer(this.pointer, PUPPET_INST_SIZE);
        temp.copy(this.backingBuffer);
        if (pendingSound > 0) {
            let e = new RemoteSoundPlayRequest(this.parent.player, this.backingBuffer.slice(0x24, 0x24 + 0xC), pendingSound);
            bus.emit(Z64OnlineEvents.ON_REMOTE_PLAY_SOUND, e);
            if (!e.isCanceled) {
                this.ModLoader.emulator.rdramWrite16(this.pointer + parseInt(SYNC_DATA.destinations["sound"]), pendingSound);
            }
        }
    }

    onTick() {
        this.buf.clear();
        let keys = Object.keys(SYNC_DATA.sources);
        for (let i = 0; i < keys.length; i++) {
            this.buf.writeBuffer(this.ModLoader.emulator.rdramReadBuffer(parseInt(SYNC_DATA.sources[keys[i]]), SYNC_DATA.lengths[keys[i]]));
        }
    }

}