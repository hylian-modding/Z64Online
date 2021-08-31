import { SYNC_DATA } from "./PuppetData_OOT";
import { SmartBuffer } from 'smart-buffer';
import { IPuppetServerStub } from "@Z64Online/common/puppet/IPuppetServerStub";

export class PuppetServerStub implements IPuppetServerStub{
    buf: SmartBuffer = new SmartBuffer();
    backingShared: SharedArrayBuffer = new SharedArrayBuffer(0x400);
	backingBuffer: Buffer = Buffer.from(this.backingShared);
    lobby: string;

    constructor(lobby: string){
        this.lobby = lobby;
    }

    writeData(buf: Buffer){
        this.buf.clear();
        this.buf.writeBuffer(buf);
        let keys = Object.keys(SYNC_DATA.destinations);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
			let dest = SYNC_DATA.destinations[key];
            for (let j = 0; j < data.byteLength; j++){
                Atomics.store(this.backingBuffer, dest + j, data[j]);
            }
        }
    }
}