import { Packet } from "modloader64_api/ModLoaderDefaultImpls";

export class WorldEvents_TransactionPacket extends Packet{

    hash: string;
    sig: Buffer = Buffer.alloc(1);
    processed: boolean = false;

    constructor(lobby: string, hash: string){
        super('WorldEvents_TransactionPacket', 'Z64Online', lobby, false);
        this.hash = hash;
    }

}