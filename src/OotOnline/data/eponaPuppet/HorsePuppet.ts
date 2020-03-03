import { IPuppet } from "@OotOnline/OotoAPI/IPuppet";
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { IPuppetData } from "@OotOnline/OotoAPI/IPuppetData";
import { Age, IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import uuid from 'uuid';
import { HorseData } from "./HorseData";

export class HorsePuppet implements IPuppet{
    player: INetworkPlayer; 
    id: string;
    data: IPuppetData;
    isSpawned: boolean = false;
    isSpawning: boolean = false;
    isShoveled: boolean = false;
    scene: number = -1;
    age: Age = Age.ADULT;
    ModLoader: IModLoaderAPI;
    core: IOOTCore;

    constructor(player: INetworkPlayer, ModLoader: IModLoaderAPI, core: IOOTCore){
        this.id = uuid.v4();
        this.player = player;
        this.ModLoader = ModLoader;
        this.core = core;
        this.data = new HorseData(this.ModLoader, this.core);
    }

    spawn(): void {
    }

    shovel(): void {
    }

    despawn(): void {
    }

    
}