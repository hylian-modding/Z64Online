import Vector3 from 'modloader64_api/math/Vector3';


export class ActorSpawn {
    actorID: number;
    pos: Vector3;
    rot: Vector3;
    variable: number;
    uuid: string = "";

    constructor(actorID: number, pos: Vector3, rot: Vector3, variable: number) {
        this.actorID = actorID;
        this.pos = pos;
        this.rot = rot;
        this.variable = variable;
    }
}
