import { Z64OnlineEvents, Z64_AnimationBank } from "@Z64Online/common/api/Z64API";
import { EventHandler } from "modloader64_api/EventHandler";
import { IModLoaderAPI, ModLoaderEvents } from "modloader64_api/IModLoaderAPI";
import { Init } from "modloader64_api/PluginLifecycle";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { Z64O_PRIVATE_EVENTS } from "../../api/InternalAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Z64_ANIM_BANK_DMA } from "@Z64Online/common/types/GameAliases";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";

export default class AnimationManager {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    banks: Map<string, Buffer> = new Map<string, Buffer>();
    animationBankAddress: number = -1;
    vanillaBank!: Buffer;
    disabled: boolean = false;

    @EventHandler(Z64OnlineEvents.CUSTOM_ANIMATION_BANK_REGISTER)
    onRegister(evt: Z64_AnimationBank) {
        this.banks.set(evt.name, evt.bank);
    }

    @Init()
    onInit() {
        this.ModLoader.privateBus.emit(Z64O_PRIVATE_EVENTS.REGISTER_ANIM_BANKS_WITH_COSTUME_MANAGER, this.banks);
    }

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRom(evt: any) {
        let rom: Buffer = evt.rom;
        let tools: Z64RomTools = new Z64RomTools(this.ModLoader, Z64_GAME);
        let bank: Buffer = tools.decompressDMAFileFromRom(rom, Z64_ANIM_BANK_DMA);
        this.vanillaBank = bank;
        this.animationBankAddress = tools.getStartEndOfDMAEntry(evt.rom, Z64_ANIM_BANK_DMA).start;
    }

    @EventHandler(Z64OnlineEvents.FORCE_CUSTOM_ANIMATION_BANK)
    onApply(evt: Z64_AnimationBank) {
        if (this.disabled) return;
        if (evt.bank.byteLength === 1) {
            this.ModLoader.rom.romWriteBuffer(this.animationBankAddress, this.vanillaBank);
        } else {
            this.ModLoader.rom.romWriteBuffer(this.animationBankAddress, evt.bank);
        }
        this.ModLoader.publicBus.emit(Z64OnlineEvents.CUSTOM_ANIMATION_BANK_EQUIPPED, this.animationBankAddress);
    }

}