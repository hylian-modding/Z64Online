import { IPacketHeader } from "modloader64_api/NetworkHandler";


export interface IZ64OnlineHelpers {
    sendPacketToPlayersInScene(packet: IPacketHeader): void;
}
