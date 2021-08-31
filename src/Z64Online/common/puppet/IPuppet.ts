import { Scene } from "Z64Lib/API/OOT/OOTAPI";
import { INetworkPlayer } from "modloader64_api/NetworkHandler";
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { IPuppetData } from "@Z64Online/common/puppet/IPuppetData";

export interface IPuppet {
    player: INetworkPlayer;
    id: string;
    data: IPuppetData | undefined;
    isSpawned: boolean;
    isSpawning: boolean;
    isShoveled: boolean;
    scene: Scene;
    readonly ageOrForm: AgeOrForm;
    spawn(): void;
    processIncomingPuppetData(data: {bundle: Buffer}): void;
    shovel(): void;
    despawn(): void;
}
