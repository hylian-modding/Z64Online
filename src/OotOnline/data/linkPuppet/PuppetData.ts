import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { SmartBuffer } from 'smart-buffer';
import path from 'path';
import { RemoteSoundPlayRequest, Z64OnlineEvents } from '@OotOnline/common/api/Z64API';
import { Puppet } from './Puppet';
import { bus } from 'modloader64_api/EventHandler';
import { AgeOrForm } from 'Z64Lib/API/Common/Z64API';
import { IPuppetData } from '@OotOnline/common/puppet/IPuppetData';

interface SyncData {
	lengths: any;
	sources: any;
	destinations: any;
}

export const SYNC_DATA: SyncData = require(path.resolve(__dirname, "PuppetFields.json"));

export class PuppetData implements IPuppetData {
	parent: Puppet;
	pointer: number;
	ModLoader: IModLoaderAPI;
	buf: SmartBuffer;
	ageLastFrame: AgeOrForm = AgeOrForm.ADULT;
	age: AgeOrForm = AgeOrForm.ADULT;
	backingShared: SharedArrayBuffer = new SharedArrayBuffer(0x400);
	backingBuffer: Buffer = Buffer.from(this.backingShared);

	private readonly copyFields: string[] = new Array<string>();

	constructor(parent: Puppet, pointer: number, ModLoader: IModLoaderAPI) {
		this.parent = parent;
		this.pointer = pointer;
		this.ModLoader = ModLoader;
		this.buf = new SmartBuffer();
		this.copyFields.push("bundle");
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
			this.buf.writeBuffer(this.ModLoader.emulator.rdramReadBuffer(SYNC_DATA.sources[keys[i]], SYNC_DATA.lengths[keys[i]]));
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
				this.age = data.readUInt32BE(0);
				this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
			} else if (key === "sound") {
				let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
				pendingSound = data.readUInt16BE(0);
			} else {
				let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
				this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
			}
		}
		let temp = this.ModLoader.emulator.rdramReadBuffer(this.pointer, 0x400);
		for (let i = 0; i < this.backingBuffer.byteLength; i++){
			Atomics.store(this.backingBuffer, i, temp[i]);
		}
		if (pendingSound > 0) {
			let e = new RemoteSoundPlayRequest(this.parent.player, this.backingBuffer.slice(0x24, 0x24 + 0xC), pendingSound);
			bus.emit(Z64OnlineEvents.ON_REMOTE_PLAY_SOUND, e);
			if (!e.isCanceled) {
				this.ModLoader.emulator.rdramWrite16(this.pointer + parseInt(SYNC_DATA.destinations["sound"]), pendingSound);
			}
		}
	}

	toJSON() {
		const jsonObj: any = {};
		for (let i = 0; i < this.copyFields.length; i++) {
			jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
		}

		return jsonObj;
	}
}
