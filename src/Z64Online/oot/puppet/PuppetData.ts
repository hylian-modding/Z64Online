import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import path from 'path';
import { RemoteSoundPlayRequest, Z64OnlineEvents } from '@Z64Online/common/api/Z64API';
import { Puppet_OOT } from './Puppet';
import { bus } from 'modloader64_api/EventHandler';
import { PUPPET_INST_SIZE } from '@Z64Online/common/cosmetics/Defines';
import { PuppetDataAbstract } from '@Z64Online/common/puppet/PuppetDataAbstract';
import { SyncData } from '../../common/puppet/SyncData';

export const SYNC_DATA: SyncData = require(path.resolve(__dirname, "PuppetData_OOT.json"));

export class PuppetData_OOT extends PuppetDataAbstract {

	constructor(parent: Puppet_OOT, pointer: number, ModLoader: IModLoaderAPI) {
		super(parent, pointer, ModLoader);
	}

	getEntry(key: string) {
		if (key === "tunic") {
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 1, 0x3);
		} else if (key === "strength") {
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 0, 0x1);
		} else if (key === "gauntlet") {
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 5, 0x3);
		} else if (key === "sound") {
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 0x10, 0x2);
		} else {
			return this.ModLoader.emulator.rdramReadBuffer(parseInt(SYNC_DATA.sources[key]), SYNC_DATA.lengths[key]);
		}
	}

	onTick() {
		this.buf.clear();
		let keys = Object.keys(SYNC_DATA.sources);
		for (let i = 0; i < keys.length; i++) {
			this.buf.writeBuffer(this.getEntry(keys[i]));
		}
	}

	get bundle(): Buffer {
		return this.buf.toBuffer();
	}

	set bundle(buf: Buffer) {
		this.buf.clear();
		this.buf.writeBuffer(buf);
		this.buf.readOffset = 0;
		let keys = Object.keys(SYNC_DATA.destinations);
		let pendingSound = 0;
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			if (key === "age") {
				let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
				this.ageOrForm = data.readUInt32BE(0);
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
}
