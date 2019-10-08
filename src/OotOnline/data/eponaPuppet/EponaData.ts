import { IActor } from 'modloader64_api/OOT/IActor';
import { convertObjPointerToId } from './EquestrianOverlord';

export class EponaData {
  actor: IActor;
  anim: number;
  speed: number;
  constructor(actor: IActor) {
    this.actor = actor;
    this.anim = convertObjPointerToId(this.actor.rdramRead32(0x1a4));
    this.speed = this.actor.rdramRead32(0x1b8);
  }
}
