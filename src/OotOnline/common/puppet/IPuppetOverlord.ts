import { INetworkPlayer, IPacketHeader } from "modloader64_api/NetworkHandler";
import { IPuppet } from "@OotOnline/common/puppet/IPuppet";
import { AgeorForm, Scene } from "@OotOnline/common/types/Types";

export interface IPuppetOverlordServer {
    onPuppetData_server(packet: IPacketHeader): void;
}

export interface IPuppetOverlordClient {
    fakeClientPuppet: IPuppet;
    readonly current_scene: Scene;
    localPlayerLoadingZone(): void;
    localPlayerChangingScenes(entering_scene: Scene, age: AgeorForm): void;
    registerPuppet(player: INetworkPlayer): void;
    unregisterPuppet(player: INetworkPlayer): void;
    changePuppetScene(player: INetworkPlayer, entering_scene: Scene): void;
    processNewPlayers(): void;
    processAwaitingSpawns(): void;
    lookForMissingOrStrandedPuppets(): void;
    sendPuppetPacket(): void;
    processPuppetPacket(packet: IPacketHeader): void;
}
