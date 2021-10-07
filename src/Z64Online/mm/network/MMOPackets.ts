import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';

export class Z64O_PermFlagsPacket extends Packet{
  flags: Buffer;
  eventFlags: Buffer;

  constructor(flags: Buffer, eventFlags: Buffer, lobby: string){
    super('Z64O_PermFlagsPacket', 'Z64Online', lobby, false);
    this.flags = flags;
    this.eventFlags = eventFlags;
  }
}