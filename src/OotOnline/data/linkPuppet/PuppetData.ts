import IMemory from 'modloader64_api/IMemory';
import { ILink, Tunic, Age } from 'modloader64_api/OOT/OOTAPI';
import { ISaveContext } from 'modloader64_api/OOT/OOTAPI';

// The idea here is the getters will get the real Link's data and set will set the puppet that the player owns.

export interface IPuppetData {
  pointer: number;
  pos: Buffer;
  anim: Buffer;
  rot: Buffer;
  unknown_0x140: Buffer;
  unknown_0x14C: Buffer;
  tunicColor: Buffer;
  unknown_0x159: number;
  unknown_0x15A: number;
  unknown_0x160: number;
  unknown_0x164: number;
  unknown_0x15B: number;
  unknown_0x16C: number;
  unknown_0x171: number;
  unknown_0x172: number;
  gauntlets: number;
  unknown_0x174: number;
  shadow: Buffer;
}

export class PuppetData implements IPuppetData {
  pointer: number;
  emulator: IMemory;
  link: ILink;
  save: ISaveContext;
  private readonly copyFields: string[] = new Array<string>();

  constructor(
    pointer: number,
    emulator: IMemory,
    link: ILink,
    save: ISaveContext
  ) {
    this.pointer = pointer;
    this.emulator = emulator;
    this.link = link;
    this.save = save;
    this.copyFields.push('pos');
    this.copyFields.push('rot');
    this.copyFields.push('anim');
    this.copyFields.push('unknown_0x140');
    this.copyFields.push('unknown_0x14C');
    this.copyFields.push('unknown_0x159');
    this.copyFields.push('unknown_0x15A');
    this.copyFields.push('unknown_0x160');
    this.copyFields.push('unknown_0x164');
    this.copyFields.push('unknown_0x15B');
    this.copyFields.push('unknown_0x16C');
    this.copyFields.push('unknown_0x171');
    this.copyFields.push('unknown_0x172');
    this.copyFields.push('unknown_0x174');
    this.copyFields.push('shadow');
    this.copyFields.push('gauntlets');
    this.copyFields.push('sound');
  }

  get pos(): Buffer {
    return this.link.position.getRawPos();
  }

  set pos(pos: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0x24, pos);
  }

  get anim(): Buffer {
    return this.link.anim_data;
  }

  set anim(anim: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0x1e0, anim);
  }

  get rot(): Buffer {
    return this.link.rotation.getRawRot();
  }

  set rot(rot: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0xb4, rot);
  }

  get unknown_0x140(): Buffer {
    return this.link.rdramReadBuffer(0x150, 0xc);
  }

  set unknown_0x140(uk: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0x140, uk);
  }

  get unknown_0x14C(): Buffer {
    return this.link.rdramReadBuffer(0x14c, 0x3);
  }

  set unknown_0x14C(uk: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0x14c, uk);
  }

  get tunic(): Tunic {
    return this.link.tunic;
  }

  set tunicColor(buf: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0x154, buf);
  }

  get unknown_0x159(): number {
    return this.link.rdramRead8(0x1d9);
  }

  set unknown_0x159(data: number) {
    this.emulator.rdramWrite8(this.pointer + 0x159, data);
  }

  get unknown_0x15A(): number {
    return this.link.rdramRead8(0x37);
  }

  set unknown_0x15A(data: number) {
    this.emulator.rdramWrite8(this.pointer + 0x15a, data);
  }

  get unknown_0x160(): number {
    return this.link.rdramRead32(0x84c);
  }

  set unknown_0x160(data: number) {
    this.emulator.rdramWrite32(this.pointer + 0x160, data);
  }

  get unknown_0x164(): number {
    return this.link.rdramRead32(0x6b4);
  }

  set unknown_0x164(data: number) {
    this.emulator.rdramWrite32(this.pointer + 0x164, data);
  }

  get unknown_0x15B(): number {
    return this.link.rdramRead8(0x144);
  }

  set unknown_0x15B(data: number) {
    this.emulator.rdramWrite8(this.pointer + 0x15b, data);
  }

  get unknown_0x16C(): number {
    return this.link.rdramRead32(0x68);
  }

  set unknown_0x16C(data: number) {
    this.emulator.rdramWrite32(this.pointer + 0x16c, data);
  }

  get unknown_0x171(): number {
    return this.link.rdramRead8(0x13f);
  }

  set unknown_0x171(data: number) {
    this.emulator.rdramWrite8(this.pointer + 0x171, data);
  }

  get unknown_0x172(): number {
    return this.link.rdramRead8(0x14f);
  }

  set unknown_0x172(data: number) {
    this.emulator.rdramWrite8(this.pointer + 0x172, data);
  }

  get gauntlets(): number {
    // Bypassing abstraction for this. We need the raw value.
    return this.emulator.rdramRead8(global.ModLoader.save_context + 0xa3);
  }

  set gauntlets(data: number) {
    this.emulator.rdramWrite8(this.pointer + 0x173, data);
  }

  get unknown_0x174(): number {
    return this.link.rdramRead16(0x13d);
  }

  set unknown_0x174(data: number) {
    this.emulator.rdramWrite16(this.pointer + 0x174, data);
  }

  get age(): Age {
    return this.save.age;
  }

  get shadow(): Buffer {
    return this.link.rdramReadBuffer(0xc0, 0x40);
  }

  set shadow(buf: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0xc0, buf);
  }

  get sound(): number {
    let id = this.link.current_sound_id;
    this.link.current_sound_id = 0;
    return id;
  }

  set sound(s: number) {
    this.emulator.rdramWrite16(this.pointer + 0x266, s);
  }

  toJSON() {
    const jsonObj: any = {};

    for (let i = 0; i < this.copyFields.length; i++) {
      jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
    }

    // Tunic color is a pain.
    let addr = 0x000f7ad8 + this.tunic * 3;
    jsonObj['tunicColor'] = this.emulator.rdramReadBuffer(addr, 0x3);

    return jsonObj;
  }
}
