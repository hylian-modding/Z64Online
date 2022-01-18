import {
  Packet,
  packetHelper,
  UDPPacket,
} from 'modloader64_api/ModLoaderDefaultImpls';

export class Z64O_PermFlagsPacket extends Packet {
  flags: Buffer;
  eventFlags: Buffer;

  constructor(flags: Buffer, eventFlags: Buffer, lobby: string) {
    super('Z64O_PermFlagsPacket', 'Z64Online', lobby, false);
    this.flags = flags;
    this.eventFlags = eventFlags;
  }
}

export class Z64O_TimePacket extends Packet {
  time: number;
  day: number;
  speed: number;
  night: number;

  constructor(time: number, day: number, speed: number, night: number, lobby: string) {
    super('Z64O_TimePacket', 'Z64Online', lobby, false);
    this.time = time;
    this.day = day;
    this.speed = speed;
    this.night = night;
  }

}

export class Z64O_SoTPacket extends Packet {
  isTriggered: boolean;

  constructor(isTriggered: boolean, lobby: string) {
    super('Z64O_SoTPacket', 'Z64Online', lobby, true);
    this.isTriggered = isTriggered;
  }
}

export class Z64O_SyncSettings extends Packet {
  syncModeBasic: boolean;
  syncModeTime: boolean;

  constructor(syncModeBasic: boolean, syncModeTime: boolean, lobby: string) {
    super('Z64O_SyncSettings', 'Z64Online', lobby, true);
    this.syncModeBasic = syncModeBasic;
    this.syncModeTime = syncModeTime;
  }

}