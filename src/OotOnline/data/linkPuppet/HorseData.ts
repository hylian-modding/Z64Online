import { IActor } from "modloader64_api/OOT/IActor"
import { Puppet } from "./Puppet";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";

export class HorseData{

    actor: IActor;
    parent: Puppet;
    puppet!: IActor;
    private readonly copyFields: string[] = ["pos", "rot", "anim_id", "speed"];

    constructor(actor: IActor, parent: Puppet, core: IOOTCore){
        this.actor = actor;
        this.parent = parent;
        if (this.parent.hasAttachedHorse()){
            this.puppet = core.actorManager.createIActorFromPointer(this.parent.getAttachedHorse());
        }
    }

    get pos(): Buffer{
        return this.actor.position.getRawPos();
    }

    set pos(buf: Buffer){
        this.puppet.rdramWriteBuffer(0x24, buf);
    }

    get rot(): Buffer{
        return this.actor.rotation.getRawRot();
    }

    set rot(buf: Buffer){
        this.puppet.rdramWriteBuffer(0xB4, buf);
    }

    get anim_id(): number{
        return this.actor.rdramRead32(0x1a4);
    }

    set anim_id(id: number){
        this.puppet.rdramWrite32(0x214, id);
    }

    get speed(): number{
        return this.actor.rdramRead32(0x1b8);
    }

    set speed(s: number){
        this.puppet.rdramWrite32(0x1a4, s);
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