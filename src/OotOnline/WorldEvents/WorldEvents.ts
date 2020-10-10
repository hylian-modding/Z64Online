import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { Halloween, Halloween_Server } from './Halloween/Halloween';
import { DateProxy } from 'modloader64_api/SidedProxy/DateProxy';
import { ProxySide } from 'modloader64_api/SidedProxy/SidedProxy';

export interface IWorldEvent {
}

//const HALLOWEEN_START: Date = new Date(new Date().getFullYear(), 9, 27);
//const HALLOWEEN_END: Date = new Date(new Date().getFullYear(), 10, 3);

const HALLOWEEN_START: Date = new Date(new Date().getFullYear(), 9, 1);
const HALLOWEEN_END: Date = new Date(new Date().getFullYear(), 10, 3);

export class WorldEvents {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    @DateProxy(ProxySide.CLIENT, HALLOWEEN_START, HALLOWEEN_END, Halloween)
    halloween!: Halloween;
    @DateProxy(ProxySide.SERVER, HALLOWEEN_START, HALLOWEEN_END, Halloween_Server)
    halloweenServer!: Halloween_Server;
}