import fs from 'fs';

class Actor {
  name: string;
  addr: string;
  data: string;
  isPuppet: boolean;
  modelslot!: number;

  constructor(name: string, addr: string, data: string, isPuppet: boolean) {
    this.name = name;
    this.addr = addr;
    this.data = data;
    this.isPuppet = isPuppet;
  }

  toString() {
    return this.name + " - " + this.addr;
  }
}

export class CrashParserActorTable {

  parse(dump: Buffer): string {
    let gc = 0x1c84a0;
    let actor_array_offset = 0x001c30;
    let actor_next_offset = 0x124;
    let actor_names: any = JSON.parse(
      fs.readFileSync(__dirname + '/ACTOR_NAMES.json').toString()
    );
    let output = new Array<Actor[]>();
    for (let i = 0; i < 12 * 8; i += 8) {
      let actors: number[] = new Array<number>();
      let addr: number = gc + actor_array_offset + i;
      let count = dump.readUInt32BE(addr);
      if (count > 0) {
        let pointer: number = dump.readUInt32BE(addr + 4) & 0x00ffffff;
        actors.push(pointer);
        let next: number =
          dump.readUInt32BE(pointer + actor_next_offset) & 0x00ffffff;
        while (next > 0) {
          actors.push(next);
          next = dump.readUInt32BE(next + actor_next_offset) & 0x00ffffff;
        }
      }
      let str: Actor[] = new Array<Actor>();
      for (let i = 0; i < actors.length; i++) {
        let p: number = actors[i];
        let id: number = dump.readUInt16BE(p);
        let _id: string = '0x' + id.toString(16).toUpperCase();
        let actor_name: string = "Custom Actor #" + id;
        if (actor_names.hasOwnProperty(_id)) {
          actor_name = actor_names[_id].trim();
        }
        let a = new Actor(actor_name, "80" + p.toString(16), dump.slice(p, p + 0x800).toString('base64'), (dump.slice(p, p + 0x800).indexOf(Buffer.from("DEADBEEF", 'hex')) > -1));
        if (a.isPuppet) {
          console.log(a.name);
          console.log((dump.slice(p, p + 0x800).indexOf(Buffer.from("DEADBEEF", 'hex')).toString(16)));
          a.modelslot = ((dump.readUInt32BE(p + 0x26C) - 0x80000000) - 0x800000) / 0x37800;
          if (a.modelslot < 0) {
            a.modelslot = 0;
            a.isPuppet = false;
          } else {
            a.name = a.name.replace("Custom Actor", "Link Puppet");
            if (a.modelslot > 36) {
              a.isPuppet = false;
            }
          }
        }
        str.push(a);
      }
      output.push(str);
    }
    let html = "<!DOCTYPE html><html><head>";

    html += "<style>";
    html += fs.readFileSync(__dirname + "/crash_dump.css").toString();
    html += "</style>"

    html += "</head><body>";

    let actor_categories = [
      "Switches",
      "Prop (1)",
      "Player",
      "Bomb",
      "NPC",
      "Enemy",
      "Prop",
      "Item/Action",
      "Misc",
      "Boss",
      "Door",
      "Chests"
    ];

    html += "<h1>Actor List</h1>";

    for (let i = 0; i < actor_categories.length; i++) {
      let key: string = actor_categories[i];
      let value = output[i];
      html += "<button class=\"accordion\">" + key + "</button>";
      html += "<div class=\"panel\">";
      for (let j = 0; j < value.length; j++) {
        if (value[j].isPuppet) {
          html += "<p>" + value[j].toString().toUpperCase() + " - Model Block: " + value[j].modelslot + "</p>"
        } else {
          html += "<p>" + value[j].toString().toUpperCase() + "</p>"
        }
      }
      html += "</div>"
    }

    html += "<h1>Model Blocks</h1>";

    let alloc_size: number = 0x37800;
    let stack_size: number = 36;

    for (let i = 0; i < stack_size; i++) {
      let addr: number = (alloc_size * i) + 0x800000;
      let buf: Buffer = dump.slice(addr, addr + alloc_size);
      let header_offset = buf.indexOf(Buffer.from("MODLOADER64"));
      if (header_offset > -1) {
        html += " <input type=\"checkbox\" name=\"checkbox_" + i + "\" checked> ";
      } else {
        html += " <input type=\"checkbox\" name=\"checkbox_" + i + "\" disabled> ";
      }
    }

    html += "<script>";
    html += fs.readFileSync(__dirname + "/crash_dump.js").toString();
    html += "</script>"

    let end_html = "</body></html>";
    html += end_html;

    return html;
  }
}