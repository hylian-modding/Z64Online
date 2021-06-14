import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { SmartBuffer } from 'smart-buffer';
import path from 'path';
import { Age } from 'modloader64_api/OOT/OOTAPI';
import { RemoteSoundPlayRequest, Z64OnlineEvents } from '@OotOnline/Z64API/OotoAPI';
import { Puppet } from './Puppet';
import { bus } from 'modloader64_api/EventHandler';
import { IPuppetData } from '@OotOnline/Z64API/IPuppetData';
import { AgeorForm } from '@OotOnline/common/types/Types';

interface SyncData {
	lengths: any;
	sources: any;
	destinations: any;
}

const SYNC_DATA: SyncData = require(path.resolve(__dirname, "PuppetFields.json"));
const dummy_buffer: Buffer = Buffer.alloc(0xFF);

export class PuppetData implements IPuppetData{
	parent: Puppet;
	pointer: number;
	ModLoader: IModLoaderAPI;
	header: SmartBuffer;
	buf: SmartBuffer;
	ageLastFrame: AgeorForm = Age.ADULT;
	age: AgeorForm = Age.ADULT;
	localCache: Map<string, Buffer> = new Map<string, Buffer>();
	remoteCache: Map<string, Buffer> = new Map<string, Buffer>();
	tickRate: number = 20;
	tickCount: number = 0;

	private readonly copyFields: string[] = new Array<string>();

	constructor(parent: Puppet, pointer: number, ModLoader: IModLoaderAPI) {
		this.parent = parent;
		this.pointer = pointer;
		this.ModLoader = ModLoader;
		this.buf = new SmartBuffer();
		this.header = new SmartBuffer();
		this.copyFields.push("bundle");
		let keys = Object.keys(SYNC_DATA.sources);
		for (let i = 0; i < keys.length; i++) {
			this.localCache.set(keys[i], dummy_buffer);
			this.remoteCache.set(keys[i], dummy_buffer);
		}
	}

	getEntry(key: string) {
		if (key === "tunic") {
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 1, 0x3);
		} else if (key === "strength") {
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 0, 0x1);
		} else if (key === "gauntlet") {
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 5, 0x3);
		}else if (key === "sound"){
			return this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 0x10, 0x2);
		} else {
			return this.ModLoader.emulator.rdramReadBuffer(parseInt(SYNC_DATA.sources[key]), SYNC_DATA.lengths[key]);
		}
	}

	onTick() {
		this.buf.clear();
		this.header.clear();
		this.tickCount++;
		let keys = Object.keys(SYNC_DATA.sources);
		if (this.tickCount > this.tickRate) {
			this.tickCount = 0;
			this.localCache.clear();
			for (let i = 0; i < keys.length; i++) {
				this.localCache.set(keys[i], dummy_buffer);
				this.remoteCache.set(keys[i], dummy_buffer);
			}
		}
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let entry = this.getEntry(key);
			if (this.localCache.get(key)!.equals(entry)) {
				this.header.writeUInt8(0);
			} else {
				this.header.writeUInt8(1);
				this.localCache.set(key, entry);
			}
		}
		let h = this.header.toBuffer();
		this.buf.writeBuffer(h);
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			if (h[i] === 1) {
				this.buf.writeBuffer(this.localCache.get(key)!);
			}
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
		let header = this.buf.readBuffer(keys.length);
		for (let i = 0; i < keys.length; i++) {
			if (header[i] === 0) continue;
			let key = keys[i];
			if (key === "age") {
				let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
				this.age = data.readUInt32BE(0);
				this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
			}else if (key === "sound"){
				let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
				let e = new RemoteSoundPlayRequest(this.parent.player, this.remoteCache.get("pos")!, data.readUInt16BE(0));
				bus.emit(Z64OnlineEvents.ON_REMOTE_PLAY_SOUND, e);
				if (!e.isCanceled){
					this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
				}
			} else {
				let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
				this.remoteCache.set(key, data);
				this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
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
