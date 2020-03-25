import { EventHandler } from "modloader64_api/EventHandler";
import { ModLoaderEvents, IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { Z64RomTools, DMATable, DMATableEntry } from 'Z64Lib/API/Z64RomTools';
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import fse from 'fs-extra';

export class TextboxManip {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    original_text_bank!: Buffer;

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, 0x7430);
        this.original_text_bank = tools.decompressFileFromRom(evt.rom, 22);
    }

    writeTextbox(t: Buffer){
        let dmadata: DMATable = new DMATable(this.ModLoader, 0x7430);
        let text_bank: DMATableEntry = dmadata.getFileEntry(22);
        let buf: Buffer = text_bank.readFile();
        // Do stuff here.
        text_bank.writeFile(buf);
        this.ModLoader.utils.setTimeoutFrames(()=>{
            text_bank.writeFile(this.original_text_bank);
        }, 20);
    }
}