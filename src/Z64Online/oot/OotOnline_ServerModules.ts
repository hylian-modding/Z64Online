import { setupGameParentReference } from "@Z64Online/common/api/GameParent";
import { CDNServer } from "@Z64Online/common/cdn/CDNServer";
import { IZ64GameMain } from "@Z64Online/common/types/Types";
import { WorldEvents } from "@Z64Online/common/WorldEvents/WorldEvents";
import { SidedProxy, ProxySide, ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { ActorHookingManagerServer } from "./actor_systems/ActorHookingSystem";
import { OOT_PuppetOverlordServer } from "./puppet/OOT_PuppetOverlord";
import { PvPServer } from "./pvp/PvPModule";

export class OotOnline_ServerModules{
    //@SidedProxy(ProxySide.SERVER, ActorHookingManagerServer)
    actorHooks!: ActorHookingManagerServer;
    @SidedProxy(ProxySide.SERVER, OOT_PuppetOverlordServer)
    puppets!: OOT_PuppetOverlordServer;
    @SidedProxy(ProxySide.SERVER, WorldEvents)
    worldEvents!: WorldEvents;
    // #ifdef IS_DEV_BUILD
    @SidedProxy(ProxySide.SERVER, PvPServer)
    pvp!: PvPServer;
    // #endif
    @SidedProxy(ProxySide.SERVER, CDNServer)
    cdn!: CDNServer;
    @ParentReference()
    parent!: IZ64GameMain;

    constructor(){
        setTimeout(()=>{
            setupGameParentReference(this.actorHooks, (this.parent as any).OOT);
        }, 10 * 1000);
    }
}