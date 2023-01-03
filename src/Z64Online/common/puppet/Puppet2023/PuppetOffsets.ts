import { Puppet_oot10 } from "@Z64Online/overlay/Puppet";
import ActorEmbedParse, { CustomActorStruct } from "./ActorEmbedParse";

export default class PuppetOffsets{
    static offsets: Map<string, CustomActorStruct> = new Map();
}

PuppetOffsets.offsets = ActorEmbedParse.findMainTable(Puppet_oot10);