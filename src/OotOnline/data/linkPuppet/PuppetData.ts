import IMemory from 'modloader64_api/IMemory';
import {
  ILink,
  Tunic,
  Age,
  Shield,
  Sword,
  Strength,
} from 'modloader64_api/OOT/OOTAPI';
import { ISaveContext } from 'modloader64_api/OOT/OOTAPI';

export class PuppetData {
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
    this.copyFields.push('left_hand');
    this.copyFields.push('right_hand');
    this.copyFields.push('back_item');
    this.copyFields.push('sound');
    this.copyFields.push('tunic_color');
    this.copyFields.push('strength_upgrade');
    this.copyFields.push('gauntlet_color');
    this.copyFields.push('areHandsClosed');
    this.copyFields.push('current_mask');
    this.copyFields.push('shield_state');
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
    this.emulator.rdramWriteBuffer(this.pointer + 0x13c, anim);
  }

  get rot(): Buffer {
    return this.link.rotation.getRawRot();
  }

  set rot(rot: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0xb4, rot);
  }

  get age(): Age {
    return this.save.age;
  }

  get sound(): number {
    let id = this.link.current_sound_id;
    this.link.current_sound_id = 0;
    return id;
  }

  set sound(s: number) {
    this.emulator.rdramWrite16(this.pointer + 0x27e, s);
  }

  get tunic_color(): Buffer {
    let addr = 0x000f7ad8 + this.link.tunic * 3;
    return this.emulator.rdramReadBuffer(addr, 0x3);
  }

  set tunic_color(buf: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0x252, buf);
  }

  get strength_upgrade(): number {
    let id = 0;
    if (this.age === 0) {
      if (this.save.inventory.strength > Strength.GORON_BRACELET) {
        id = this.save.inventory.strength;
      }
    } else {
      if (this.save.inventory.strength >= Strength.GORON_BRACELET) {
        id = this.save.inventory.strength;
      }
    }
    return id;
  }

  set strength_upgrade(num: number) {
    this.emulator.rdramWrite8(this.pointer + 0x251, num);
  }

  get gauntlet_color(): Buffer {
    let addr: number = 0x0f7ae4 + 3 * (this.save.inventory.strength - 2);
    return this.emulator.rdramReadBuffer(addr, 0x3);
  }

  set gauntlet_color(buf: Buffer) {
    this.emulator.rdramWriteBuffer(this.pointer + 0x256, buf);
  }

  get areHandsClosed(): boolean {
    return this.link.rdramRead32(0x68) > 0;
  }

  set areHandsClosed(bool: boolean) {
    this.emulator.rdramWrite8(this.pointer + 0x278, bool ? 1 : 0);
  }

  get current_mask(): number {
    return this.link.rdramRead8(0x014f);
  }

  set current_mask(num: number) {
    this.emulator.rdramWrite8(this.pointer + 0x27c, num);
  }

  get left_hand(): number {
    let num: number = this.link.rdramRead8(0x144);
    let num2: number = this.link.rdramRead8(0x148);
    let id = 0;
    if (this.age === 0) {
      switch (num) {
        case 0:
          id = 0; // Nothing
          break;
        case 3:
          id = 1; // Master Sword
          break;
        case 5:
          id = this.save.swords.biggoronSword ? 2 : 3; // Biggoron.
          break;
        case 7:
          id = 7; // Megaton Hammer.
          break;
        case 0x1e:
          id = 5; // Bottle.
          break;
        case 0xff:
          if (num2 === 0x02) {
            id = 1;
          } else if (num2 === 0x0b) {
            id = 7;
          }
          break;
        default:
          break;
      }
    } else {
      switch (num) {
        case 0:
          break;
        case 4:
          id = 4;
          break;
        case 0x1e:
          id = 5;
          break;
        case 6:
          break;
        case 0xff:
          if (num2 === 0x02) {
            id = 4;
          } else if (num2 === 0x0a) {
            id = 0;
          }
          break;
        default:
          break;
      }
    }
    return id;
  }

  set left_hand(num: number) {
    this.emulator.rdramWrite8(this.pointer + 0x279, num);
  }

  set right_hand(num: number) {
    this.emulator.rdramWrite8(this.pointer + 0x27a, num);
  }

  get right_hand(): number {
    let id = 0;
    let shield: Shield = this.link.shield;
    let num: number = this.link.rdramRead8(0x144);
    let left_hand: number = this.left_hand;
    if (this.age === 0) {
      switch (num) {
        case 0:
          break;
        case 0x1d:
          id = 5;
          break;
        case 0x11:
          id = 7;
          break;
        case 0x10:
          id = 7;
          break;
        case 0x08:
          id = 8;
          break;
        default:
          break;
      }
      if (id === 0) {
        if (
          left_hand === 3 ||
          left_hand === 2 ||
          left_hand === 1 ||
          num === 0xff
        ) {
          switch (shield) {
            case 0:
              break;
            case Shield.HYLIAN:
              id = 1;
              break;
            case Shield.MIRROR:
              id = 2;
              break;
            default:
              break;
          }
        }
      }
    } else {
      switch (num) {
        case 0:
          break;
        case 0x1c:
          id = 4;
          break;
        case 0x1d:
          id = 5;
          break;
        case 0x0f:
          id = 9;
          break;
        default:
          break;
      }
      if (id === 0) {
        if (left_hand === 4 || num === 0xff) {
          switch (shield) {
            case 0:
              break;
            case Shield.DEKU:
              id = 3;
              break;
            default:
              break;
          }
        }
      }
    }
    return id;
  }

  get back_item(): number {
    let id = 0;
    let sword: boolean = this.link.sword !== Sword.NONE;
    let _sword: Sword = this.link.sword;
    let shield: Shield = this.link.shield;
    let left_hand: number = this.left_hand;
    let right_hand: number = this.right_hand;
    if (this.age === 0) {
      if (!sword && shield === Shield.NONE) {
        id = 7;
      } else if (sword && shield === Shield.HYLIAN) {
        if (left_hand === 1) {
          id = 9;
        } else {
          if (right_hand === 1) {
            id = 7;
          } else {
            id = 1;
          }
        }
      } else if (sword && shield === Shield.MIRROR) {
        if (left_hand === 1) {
          id = 9;
        } else {
          if (right_hand === 2) {
            id = 7;
          } else {
            id = 2;
          }
        }
      }
    } else {
      if (!sword && shield === Shield.NONE) {
        id = 0;
      } else if (shield !== Shield.NONE && sword && _sword === 0x11) {
        if (left_hand === 4) {
          id = 10;
        } else {
          if (right_hand === 3) {
            id = 4;
          } else {
            id = 3;
          }
        }
      } else {
        if (left_hand === 4) {
          id = 10;
        } else {
          id = 4;
        }
      }
    }
    return id;
  }

  set back_item(num: number) {
    this.emulator.rdramWrite8(this.pointer + 0x27b, num);
  }

  get shield_state(): number {
    return this.emulator.rdramRead32(0x1db09c);
  }

  set shield_state(state: number) {
    this.emulator.rdramWrite32(this.pointer + 0x284, state);
  }

  toJSON() {
    const jsonObj: any = {};

    for (let i = 0; i < this.copyFields.length; i++) {
      jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
    }
    //console.log(JSON.stringify(jsonObj, null, 2));
    return jsonObj;
  }
}
