import {
  Age,
  Shield,
  Sword,
  Strength,
  IOOTCore,
} from 'modloader64_api/OOT/OOTAPI';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ACTOR_T_PADDING } from './PuppetOverlord';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents, RemoteSoundPlayRequest } from '@OotOnline/OotoAPI/OotoAPI';

export class PuppetData {
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
    this.copyFields.push('tunic_id');
    this.copyFields.push('sword_id');
    this.copyFields.push('shield_id');
    this.copyFields.push('boot_id');
    this.copyFields.push('strength_upgrade');
    this.copyFields.push('gauntlet_color');
    this.copyFields.push('current_mask');
    //this.copyFields.push('stick_length');
    //this.copyFields.push('action_param');
    /* this.copyFields.push("xzvel");
    this.copyFields.push("state_flags_1");
    this.copyFields.push("left_state");
    this.copyFields.push("right_state");
    this.copyFields.push("gi_obtain");
    this.copyFields.push("gi_obj"); */
  }

  get stick_length(): number {
    return this.core.link.rdramReadF32(0x084C);
  }

  set stick_length(num: number) {
    this.ModLoader.emulator.rdramWriteF32(this.pointer + ACTOR_T_PADDING + (0x250 + 0x30), num);
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
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + ACTOR_T_PADDING + 0x13C, anim);
  }

  get rot(): Buffer {
    return this.core.link.rotation.getRawRot();
  }

  set rot(rot: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + 0xB4, rot);
  }

  get age(): Age {
    return this.core.save.age;
  }

  get sound(): number {
    return this.core.link.current_sound_id;
  }

  set sound(s: number) {
    this.ModLoader.emulator.rdramWrite16(this.pointer + ACTOR_T_PADDING + (0x250 + 0x2E), s);
  }

  get tunic_color(): Buffer {
    let addr = 0x000f7ad8 + this.core.link.tunic * 3;
    return this.ModLoader.emulator.rdramReadBuffer(addr, 0x3);
  }

  set tunic_color(buf: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + ACTOR_T_PADDING + (0x250 + 0x19), buf);
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
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x20), num);
  }

  get gauntlet_color(): Buffer {
    let addr: number = 0x0f7ae4 + 3 * (this.core.save.inventory.strength - 2);
    return this.ModLoader.emulator.rdramReadBuffer(addr, 0x3);
  }

  set gauntlet_color(buf: Buffer) {
    this.ModLoader.emulator.rdramWriteBuffer(this.pointer + ACTOR_T_PADDING + (0x250 + 0x21), buf);
  }

  get gi_obtain(): number {
    return this.core.link.rdramRead8(0x0852);
  }

  set gi_obtain(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x3E), num);
  }

  get gi_obj(): number {
    return this.core.link.rdramRead32(0x01A0);
  }

  set gi_obj(num: number) {
    this.ModLoader.emulator.rdramWrite32(this.pointer + ACTOR_T_PADDING + (0x250 + 0x40), num);
  }

  get tunic_id(): number {
    return this.core.link.rdramRead8(0x013C);
  }

  set tunic_id(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x1C), num);
  }

  get sword_id(): number {
    return this.core.link.rdramRead8(0x013D);
  }

  set sword_id(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x1D), num);
  }

  get shield_id(): number {
    return this.core.link.rdramRead8(0x013E);
  }

  set shield_id(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x1E), num);
  }

  get boot_id(): number {
    return this.core.link.rdramRead8(0x013F);
  }

  set boot_id(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x1F), num);
  }

  get xzvel(): number {
    return this.core.link.rdramReadF32(0x68);
  }

  set xzvel(num: number) {
    this.ModLoader.emulator.rdramWriteF32(this.pointer + 0x68, num);
  }

  get current_mask(): number {
    return this.core.link.rdramRead8(0x014F);
  }

  set current_mask(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x2D), num);
  }

  get left_state(): number {
    return this.core.link.rdramRead8(0x014C);
  }

  set left_state(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x3C), num);
  }

  get right_state(): number {
    return this.core.link.rdramRead8(0x014D);
  }

  set right_state(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x3D), num);
  }

  get state_flags_1(): number {
    return this.core.link.rdramRead32(0x066C);
  }

  set state_flags_1(num: number) {
    this.ModLoader.emulator.rdramWrite32(this.pointer + ACTOR_T_PADDING + (0x250 + 0x38), num);
  }

  get action_param(): number {
    return this.core.link.rdramRead8(0x0144);
  }

  set action_param(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x34), num);
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
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x2A), num);
  }

  set right_hand(num: number) {
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x2B), num);
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
      if (left_hand === 2) {
        id = 0;
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
    this.ModLoader.emulator.rdramWrite8(this.pointer + ACTOR_T_PADDING + (0x250 + 0x2C), num);
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
