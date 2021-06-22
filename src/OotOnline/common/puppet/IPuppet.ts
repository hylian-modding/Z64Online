import { Scene } from "modloader64_api/OOT/OOTAPI";
import { PuppetData } from "../../data/linkPuppet/PuppetData";
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { AgeorForm } from "@OotOnline/common/types/Types";
import { IPuppetData } from "@OotOnline/common/puppet/IPuppetData";

export interface IPuppet {
    player: INetworkPlayer;
    id: string;
    data: PuppetData;
    isSpawned: boolean;
    isSpawning: boolean;
    isShoveled: boolean;
    scene: Scene;
    readonly age: AgeorForm;
    spawn(): void;
    processIncomingPuppetData(data: IPuppetData): void;
    shovel(): void;
    despawn(): void;
}
