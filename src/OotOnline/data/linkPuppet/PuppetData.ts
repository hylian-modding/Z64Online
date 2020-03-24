import {
  Age,
  Shield,
  Sword,
  Strength,
  IOOTCore,
} from 'modloader64_api/OOT/OOTAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { IPuppetData } from '../../OotoAPI/IPuppetData';

export class PuppetData implements IPuppetData{
  pointer: number;
  ModLoader: IModLoaderAPI;
  core: IOOTCore;

  private readonly copyFields: string[] = new Array<string>();

  constructor(
    pointer: number,
    ModLoader: IModLoaderAPI,
    core: IOOTCore
  ) {
    this.pointer = pointer;
    this.ModLoader = ModLoader;
    this.core = core;
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
    return this.core.link.position.getRawPos();
  }

  set pos(pos: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0x24, pos);
  }

  get anim(): Buffer {
    return this.core.link.anim_data;
  }

  set anim(anim: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0x13c, anim);
  }

  get rot(): Buffer {
    return this.core.link.rotation.getRawRot();
  }

  set rot(rot: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0xb4, rot);
  }

  get age(): Age {
    return this.core.save.age;
  }

  get sound(): number {
    let id = this.core.link.current_sound_id;
    this.core.link.current_sound_id = 0;
    return id;
  }

  set sound(s: number) {
    this.ModLoader.emulator.rdramWrite16(this.pointer + 0x27e, s);
  }

  get tunic_color(): Buffer {
    let addr = 0x000f7ad8 + this.core.link.tunic * 3;
    return this.ModLoader.emulator.rdramReadBuffer(addr, 0x3);
  }

  set tunic_color(buf: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0x252, buf);
  }

  get strength_upgrade(): number {
    let id = 0;
    if (this.age === 0) {
      if (this.core.save.inventory.strength > Strength.GORON_BRACELET) {
        id = this.core.save.inventory.strength;
      }
    } else {
      if (this.core.save.inventory.strength >= Strength.GORON_BRACELET) {
        id = this.core.save.inventory.strength;
      }
    }
    return id;
  }

  set strength_upgrade(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + 0x251, num);
  }

  get gauntlet_color(): Buffer {
    let addr: number = 0x0f7ae4 + 3 * (this.core.save.inventory.strength - 2);
    return this.ModLoader.emulator.rdramReadBuffer(addr, 0x3);
  }

  set gauntlet_color(buf: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0x256, buf);
  }

  get areHandsClosed(): boolean {
    return this.core.link.rdramRead32(0x68) > 0;
  }

  set areHandsClosed(bool: boolean) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + 0x278, bool ? 1 : 0);
  }

  get current_mask(): number {
    return this.core.link.rdramRead8(0x014f);
  }

  set current_mask(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + 0x27c, num);
  }

  get left_hand(): number {
    let num: number = this.core.link.rdramRead8(0x144);
    let num2: number = this.core.link.rdramRead8(0x148);
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
          id = this.core.save.swords.biggoronSword ? 2 : 3; // Biggoron.
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
          id = 6;
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
    this.ModLoader.emulator.rdramWrite8(this.pointer + 0x279, num);
  }

  set right_hand(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + 0x27a, num);
  }

  get right_hand(): number {
    let id = 0;
    let shield: Shield = this.core.link.shield;
    let num: number = this.core.link.rdramRead8(0x144);
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
    let sword: boolean = this.core.link.sword !== Sword.NONE;
    let _sword: Sword = this.core.link.sword;
    let shield: Shield = this.core.link.shield;
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
    this.ModLoader.emulator.rdramWrite8(this.pointer + 0x27b, num);
  }

  get shield_state(): number {
    return this.ModLoader.emulator.rdramRead32(0x1db09c);
  }

  set shield_state(state: number) {
    this.ModLoader.emulator.rdramWrite32(this.pointer + 0x284, state);
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
