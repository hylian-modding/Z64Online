import { Packet, UDPPacket } from 'modloader64_api/ModLoaderDefaultImpls';

export class MyTcpPacket extends Packet {
  example_val: any;
  
  constructor(example_val: any) {
    // Set the third value to false if you do not
    // wish for the packet to be sent to more than
    // one endpoint ex: client to server, server to specific user
    super('SyncMyTcpPacket', 'template', true);

    this.example_val = example_val;
  }
}

export class MyUdpPacket extends UDPPacket {
  example_val: any;
  
  constructor(example_val: any) {
    // Set the third value to false if you do not
    // wish for the packet to be sent to more than
    // one endpoint ex: client to server, server to specific user
    super('SyncMyUdpPacket', 'template', true);

    this.example_val = example_val;
  }
}