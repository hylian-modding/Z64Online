import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';

export class MMO_PermFlagsPacket extends Packet{
  flags: Buffer;
  eventFlags: Buffer;

  constructor(flags: Buffer, eventFlags: Buffer, lobby: string){
    super('MMO_PermFlagsPacket', 'MMOnline', lobby, false);
    this.flags = flags;
    this.eventFlags = eventFlags;
  }
}