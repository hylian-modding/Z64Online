import { setupGameParentReference } from "@Z64Online/common/api/GameParent";
import { CDNClient } from "@Z64Online/common/cdn/CDNClient";
import AnimationManager from "@Z64Online/common/cosmetics/animation/AnimationManager";
import { EmoteManager } from "@Z64Online/common/cosmetics/animation/emoteManager";
import EponaModelManager from "@Z64Online/common/cosmetics/epona/EponaModelManager";
import NaviModelManager from "@Z64Online/common/cosmetics/navi/NaviModelManager";
import { NPCReplacer } from "@Z64Online/common/cosmetics/npc/NPCReplacer";
import { ModelManagerClient } from "@Z64Online/common/cosmetics/player/ModelManager";
import { SoundManagerClient } from "@Z64Online/common/cosmetics/sound/SoundManager";
import PuppetNameTagHandler from "@Z64Online/common/gui/PuppetNameTagHandler";
import { IZ64GameMain } from "@Z64Online/common/types/Types";
import { WorldEvents } from "@Z64Online/common/WorldEvents/WorldEvents";
import { SidedProxy, ProxySide, ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import ActorFixManager from "../common/actors/ActorFixManager";
import { ActorHookingManagerClient } from "./actor_systems/ActorHookingSystem";
import { Multiworld } from "./compat/OotR";
import SongOfSoaringCompat from "./compat/SongOfSoaring";
import GamemodeManager from "./gamemodes/GamemodeManager";
import { ImGuiHandler } from "./imgui/ImGuiHandler";
import { Notifications } from "./imgui/Notifications";
import { OOT_PuppetOverlordClient } from "./puppet/OOT_PuppetOverlord";
import { PvPModule } from "./pvp/PvPModule";

export default class OotOnline_ClientModules {

    // Cosmetic stuff.
    @SidedProxy(ProxySide.CLIENT, EmoteManager)
    emotes!: EmoteManager;
    @SidedProxy(ProxySide.CLIENT, ModelManagerClient)
    modelManager!: ModelManagerClient;
    @SidedProxy(ProxySide.CLIENT, NaviModelManager)
    naviManager!: NaviModelManager;
    @SidedProxy(ProxySide.CLIENT, AnimationManager)
    animManager!: AnimationManager;
    @SidedProxy(ProxySide.CLIENT, SoundManagerClient)
    sound!: SoundManagerClient;
    @SidedProxy(ProxySide.CLIENT, CDNClient)
    cdn!: CDNClient;

    // Sync related stuff
    //@SidedProxy(ProxySide.CLIENT, ActorHookingManagerClient)
    actorHooks!: ActorHookingManagerClient;
    @SidedProxy(ProxySide.CLIENT, OOT_PuppetOverlordClient)
    puppets!: OOT_PuppetOverlordClient;

    // GUI stuff
    @SidedProxy(ProxySide.CLIENT, ImGuiHandler)
    gui!: ImGuiHandler;
    @SidedProxy(ProxySide.CLIENT, PuppetNameTagHandler)
    nametags!: PuppetNameTagHandler;
    @SidedProxy(ProxySide.CLIENT, Notifications)
    notificationManager!: Notifications;

    // Holiday Events.
    @SidedProxy(ProxySide.CLIENT, WorldEvents)
    worldEvents!: WorldEvents;

    // Compatibility modules.
    @SidedProxy(ProxySide.CLIENT, Multiworld)
    multiworld!: Multiworld;
    @SidedProxy(ProxySide.CLIENT, SongOfSoaringCompat)
    songOfSoaring!: SongOfSoaringCompat;

    // Actor specific crash or behavior fixes
    @SidedProxy(ProxySide.CLIENT, ActorFixManager)
    actorFixes!: ActorFixManager;

    // Test modules that don't exist in prod builds.
    // #ifdef IS_DEV_BUILD
    //@SidedProxy(ProxySide.CLIENT, PvPModule)
    pvp!: PvPModule;
    //@SidedProxy(ProxySide.CLIENT, NPCReplacer)
    npc!: NPCReplacer;
    //@SidedProxy(ProxySide.CLIENT, EponaModelManager)
    eponaManager!: EponaModelManager;
    //@SidedProxy(ProxySide.CLIENT, GamemodeManager)
    gamemodes!: GamemodeManager;
    // #endif
    @ParentReference()
    parent!: IZ64GameMain;

    constructor(){
        setTimeout(()=>{
            setupGameParentReference(this.actorHooks, (this.parent as any).OOT);
            setupGameParentReference(this.multiworld, (this.parent as any).OOT);
        }, 10 * 1000);
    }
}