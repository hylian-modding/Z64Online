import { Z64_ANIM_BANK_DMA } from "@Z64Online/common/types/GameAliases";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { OotEvents } from "Z64Lib/API/OoT/OOTAPI";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Anim2Link } from "./Anim2Link";

const enum AnimationManagerNew_Events {
    REGISTER_ANIM = "Z64O:AnimationManagerNew_Events:REGISTER_ANIM"
}

export class AnimationManagerNew_AnimContainer {

    name: string;
    map: Map<number, string> = new Map();

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
    animationBankAddress: number = -1;
    collections: Map<string, AnimationManagerNew_AnimCollection> = new Map();

    @EventHandler(AnimationManagerNew_Events.REGISTER_ANIM)
    onRegister(evt: AnimationManagerNew_AnimContainer) {
        let col = new AnimationManagerNew_AnimCollection();
        evt.map.forEach((file: string, id: number) => {
            let names = Anim2Link.getAllNames(file);
            let a2l = new Anim2Link(names[0], file);
            let buf = a2l.GetRaw();
            let aloc = new AnimationManagerNew_AnimAlloc(-1, names[0], buf, id, a2l.FrameCount);
            col.anims.push(aloc);
        });
        this.collections.set(evt.name, col);
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRom(evt: { rom: Buffer }) {
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64_GAME);
        let bank: Buffer = tools.decompressDMAFileFromRom(evt.rom, Z64_ANIM_BANK_DMA);
        this.animationBankAddress = tools.relocateFileToExtendedRom(evt.rom, Z64_ANIM_BANK_DMA, bank, 0, true);
        this.collections.forEach((col: AnimationManagerNew_AnimCollection, name: string) => {
            for (let i = 0; i < col.anims.length; i++) {
                col.anims[i].pointer = Z64RomTools.getRomHeap().malloc(col.anims[i].buf.byteLength);
                Buffer.alloc(col.anims[i].buf.byteLength, 0).copy(evt.rom, col.anims[i].pointer);
                this.ModLoader.logger.debug(`Injecting anim ${col.anims[i].name}`);
            }
        });
        tools.noCRC(evt.rom);
    }

    @EventHandler(OotEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        this.onSceneChangeU();
    }

    createAnimTableEntry(offset: number, frameCount: number): Buffer {
        let bankOffset1: number = (offset >> 16) & 0xFF;
        let bankOffset2: number = (offset >> 8) & 0xFF;
        let bankOffset3: number = offset & 0xFF;
        let frameCount1: number = frameCount >> 16 & 0xFF;
        let frameCount2: number = frameCount & 0xFF;
        return Buffer.from([frameCount1, frameCount2, 0, 0, 7, bankOffset1, bankOffset2, bankOffset3]);
    }

    onSceneChangeU() {
        this.collections.forEach((col: AnimationManagerNew_AnimCollection, name: string) => {
            for (let i = 0; i < col.anims.length; i++) {
                if (col.anims[i].pointer > 0) {
                    let oot_ptr = 0x8016A66C;
                    let ptr = this.ModLoader.emulator.rdramRead32(oot_ptr);
                    this.ModLoader.emulator.rdramWriteBuffer(ptr + col.anims[i].id, this.createAnimTableEntry(col.anims[i].pointer - this.animationBankAddress, col.anims[i].frames));
                }
            }
        });
    }

}