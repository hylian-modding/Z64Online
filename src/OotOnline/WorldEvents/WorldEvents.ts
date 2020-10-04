import { EventHandler } from 'modloader64_api/EventHandler';
import { IModLoaderAPI, ModLoaderEvents } from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { Preinit } from 'modloader64_api/PluginLifecycle';
import { IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { Halloween } from './Halloween/Halloween';

export interface IWorldEvent {
    ModLoader: IModLoaderAPI;
    startDate: Date;
    endDate: Date;
    injectAssets(rom: Buffer): void;
    preinit(): void;
}

export class WorldEvents {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    halloween!: Halloween;

    @EventHandler(ModLoaderEvents.ON_ROM_PATCHED)
    onRomPatched(evt: any) {
        let date = new Date();
        if (date > this.halloween.startDate && date < this.halloween.endDate) {
            this.halloween.injectAssets(evt.rom);
        }
    }

    @Preinit()
    onPre() {
        this.halloween = new Halloween(this.ModLoader);
        this.halloween.preinit();
    }
}