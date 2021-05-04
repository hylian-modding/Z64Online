import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { SmartBuffer } from 'smart-buffer';
import path from 'path';
import { Age } from 'modloader64_api/OOT/OOTAPI';

interface SyncData {
	lengths: any;
	sources: any;
	destinations: any;
}

const SYNC_DATA: SyncData = require(path.resolve(__dirname, "PuppetData.json"));

export class PuppetData {
	pointer: number;
	ModLoader: IModLoaderAPI;
	buf: SmartBuffer;
	ageLastFrame: Age = Age.ADULT;
	age: Age = Age.ADULT;

	private readonly copyFields: string[] = new Array<string>();

	constructor(pointer: number, ModLoader: IModLoaderAPI) {
		this.pointer = pointer;
		this.ModLoader = ModLoader;
		this.buf = new SmartBuffer();
		this.copyFields.push("bundle");
	}

	onTick() {
		this.buf.clear();
		Object.keys(SYNC_DATA.sources).forEach((key: string) => {
			if (key === "tunic") {
				this.buf.writeBuffer(this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 1, 0x3));
			} else if (key === "strength") {
				this.buf.writeUInt8(this.ModLoader.emulator.rdramRead8(global.ModLoader["OotO_SyncContext"] + 0));
			}else if (key === "gauntlet"){
				this.buf.writeBuffer(this.ModLoader.emulator.rdramReadBuffer(global.ModLoader["OotO_SyncContext"] + 5, 0x3));
			} else {
				this.buf.writeBuffer(this.ModLoader.emulator.rdramReadBuffer(parseInt(SYNC_DATA.sources[key]), SYNC_DATA.lengths[key]));
			}
		});
	}

	get bundle(): Buffer {
		return this.buf.toBuffer();
	}

	set bundle(buf: Buffer) {
		this.buf.clear();
		this.buf.writeBuffer(buf);
		this.buf.readOffset = 0;
		Object.keys(SYNC_DATA.destinations).forEach((key: string) => {
			if (key === "age") {
				let data = this.buf.readBuffer(SYNC_DATA.lengths[key]);
				this.age = data.readUInt32BE(0);
				this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), data);
			} else {
				this.ModLoader.emulator.rdramWriteBuffer(this.pointer + parseInt(SYNC_DATA.destinations[key]), this.buf.readBuffer(SYNC_DATA.lengths[key]));
			}
		});
	}

	toJSON() {
		const jsonObj: any = {};
		for (let i = 0; i < this.copyFields.length; i++) {
			jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
		}

		return jsonObj;
	}
}
