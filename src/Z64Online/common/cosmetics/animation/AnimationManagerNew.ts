import { Z64_ANIM_BANK_DMA, Z64_OBJECT_TABLE_RAM } from "@Z64Online/common/types/GameAliases";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { OotEvents } from "Z64Lib/API/OoT/OOTAPI";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Anim2Link } from "./Anim2Link";
import { SmartBuffer } from "smart-buffer";
import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { InjectCore } from "modloader64_api/CoreInjection";
import { AnimationHax_oot } from "@Z64Online/overlay/AnimationHax";
import { J_ENCODE } from "@Z64Online/common/lib/OpcodeBullshit";
import fs from 'fs';
import path from 'path';

// This breaks horribly in OotR. Figure it out later.

const enum AnimationManagerNew_Events {
    REGISTER_ANIM = "Z64O:AnimationManagerNew_Events:REGISTER_ANIM"
}

export class AnimationManagerNew_AnimContainer {

    name: string;
    map: Map<number, Buffer> = new Map();

    constructor(name: string, a: any) {
        this.name = name;
        Object.keys(a).forEach((b: string) => {
            this.map.set(parseInt(b), a[b]);
        });
    }

}

export class AnimationManagerNew_AnimAlloc {

    pointer: number;
    name: string;
    buf: Buffer;
    id: number;
    frames: number;

    constructor(pointer: number, name: string, buf: Buffer, id: number, frames: number) {
        this.pointer = pointer;
        this.name = name;
        this.buf = buf;
        this.id = id;
        this.frames = frames;
    }

}

export class AnimationManagerNew_AnimCollection {

    anims: AnimationManagerNew_AnimAlloc[] = [];

}

export class AnimationManagerNew {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IZ64Main;
    animationBankVrom: number = -1;
    collections: Map<string, AnimationManagerNew_AnimCollection> = new Map();
    arb!: ArbitraryHook;
    slot: number = 1;
    vrom: number = -1;
    romStart: number = -1;

    @EventHandler(AnimationManagerNew_Events.REGISTER_ANIM)
    onRegister(evt: AnimationManagerNew_AnimContainer) {
        let col = new AnimationManagerNew_AnimCollection();
        evt.map.forEach((buf: Buffer, id: number) => {
            let aloc = new AnimationManagerNew_AnimAlloc(-1, "test", buf, id, Math.floor(buf.byteLength / 0x86));
            col.anims.push(aloc);
        });
        this.collections.set(evt.name, col);
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRom(evt: { rom: Buffer }) {
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64_GAME);
        this.animationBankVrom = tools.getStartEndOfDMAEntry(evt.rom, Z64_ANIM_BANK_DMA).vrom_start;

        let newBank: Buffer = Buffer.alloc(2 * 1024 * 1024);
        tools.injectNewFile(evt.rom, 1508, newBank, true);
        this.vrom = tools.getStartEndOfDMAEntry(evt.rom, 1508).vrom_start;
        this.romStart = tools.getStartEndOfDMAEntry(evt.rom, 1508).start;

        this.collections.forEach((col: AnimationManagerNew_AnimCollection, name: string) => {
            for (let i = 0; i < col.anims.length; i++){
                col.anims[i].buf.copy(evt.rom, this.romStart);
                col.anims[i].pointer = 0;
            }
        });

        this.ModLoader.utils.setTimeoutFrames(() => {
            this.arb = new ArbitraryHook("Animation Hacks", this.ModLoader, this.core, AnimationHax_oot);
            this.arb.inject();
            this.ModLoader.utils.setTimeoutFrames(() => {
                this.arb.runCreate(0xDEADBEEF, () => {
                    let sb = new SmartBuffer();
                    sb.writeUInt32BE(J_ENCODE(this.ModLoader.emulator.rdramRead32(this.arb.instancePointer)));
                    sb.writeBuffer(Buffer.from("0000000003E0000800000000", "hex"));
                    this.ModLoader.emulator.rdramWriteBuffer(0x8008B4C4, sb.toBuffer());
                    sb.clear();
                    this.ModLoader.emulator.rdramWrite32(this.arb.instancePointer + 0x4, this.animationBankVrom);
                    this.ModLoader.emulator.rdramWrite32(this.arb.instancePointer + 0x8, this.vrom);
                    this.ModLoader.emulator.invalidateCachedCode();
                    console.log(this.arb.instancePointer.toString(16));
                });
            }, 20);
        }, 20);
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        this.onSceneChangeU();
    }

    findGameplayKeep() {
        let obj_list: number = Z64_OBJECT_TABLE_RAM;
        let obj_id = 0x00010000;
        for (let i = 4; i < 0x514; i += 4) {
            let value = this.ModLoader.emulator.rdramRead32(obj_list + i);
            if (value === obj_id) {
                return this.ModLoader.emulator.rdramRead32(obj_list + i + 4);
            }
        }
        return -1;
    }

    createAnimTableEntry(addr: number, frameCount: number): Buffer {
        let buf = new SmartBuffer();
        let o = addr;
        buf.writeUInt16BE(frameCount);
        buf.writeUInt16BE(0);
        buf.writeUInt32BE(o);
        console.log(buf.toBuffer());
        return buf.toBuffer();
    }

    onSceneChangeU() {
        this.collections.forEach((col: AnimationManagerNew_AnimCollection, name: string) => {
            for (let i = 0; i < col.anims.length; i++) {
                let ptr = this.findGameplayKeep();
                ptr += col.anims[i].id;
                this.ModLoader.emulator.rdramWriteBuffer(ptr, this.createAnimTableEntry(col.anims[i].pointer, col.anims[i].frames));
            }
        });
    }

}