export interface ICDNData {
    id: string;
    packet: any;
}

export class CDNData implements ICDNData{
    id: string;
    packet: any;
    
    constructor(id: string, packet: any){
        this.id = id;
        this.packet = packet;
    }
}