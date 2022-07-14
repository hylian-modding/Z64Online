import { onTick, onViUpdate, Preinit } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { InjectCore } from "modloader64_api/CoreInjection";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import path from 'path';
import { ImGuiHandlerCommon } from "@Z64Online/common/gui/ImGuiHandlerCommon";
import fse from 'fs-extra';
import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { bus, EventHandler, EventOwnerChanged, EventsClient } from "modloader64_api/EventHandler";
import { IZ64OnlineHelpers } from "@Z64Online/common/lib/IZ64OnlineHelpers";
import MMOnline, { MMOnlineConfigCategory } from "@Z64Online/mm/MMOnline";
import { Z64O_SyncSettings } from "../network/MMOPackets";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { Z64O_DownloadResponsePacket } from "@Z64Online/common/network/Z64OPackets";
import { markAsTimeSync } from "@Z64Online/common/types/GameAliases";
import MMOnlineClient from "../MMOnlineClient";
import Z64Online from "@Z64Online/Z64Online";

export class ImGuiHandler_MM extends ImGuiHandlerCommon {

    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: IZ64Main = {} as any;
    @ParentReference()
    parent!: IZ64OnlineHelpers;
    input: string_ref = [""];
    result: string_ref = [""];
    lobbyConfig!: MMOnlineConfigCategory;
    amIHost!: boolean;

    constructor() {
        super();
        // #ifdef IS_DEV_BUILD
        this.actorNames = JSON.parse(fse.readFileSync(path.resolve(__dirname, "ACTOR_NAMES.json")).toString());
        // #endif
    }

    @Preinit()
    preInit(){
        this.lobbyConfig = this.ModLoader.config.registerConfigCategory("MMOnline") as MMOnlineConfigCategory;
    }
    @onTick()
    onTick(){
        if(this.core.MM!.save.checksum === 0) this.amIHost = false;
    }
    
    @onViUpdate()
    onViUpdate() {
        super.onViUpdate();
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("Z64O")) {
                    if (this.ModLoader.ImGui.beginMenu("General Settings")) {
                        //if (this.ModLoader.ImGui.menuItem("Show nameplates", undefined, CommonConfigInst.nameplates, true)) {
                        //    CommonConfigInst.nameplates = !CommonConfigInst.nameplates;
                        //    this.ModLoader.config.save();
                        //}
                        /* if (this.ModLoader.ImGui.menuItem("Show notifications", undefined, this.lobbyConfig.notifications, true)) {
                            this.lobbyConfig.notifications = !this.lobbyConfig.notifications
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Notification Sounds", undefined, this.lobbyConfig.notificationSound)) {
                            this.lobbyConfig.notificationSound = !this.lobbyConfig.notificationSound;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Diagnostic Mode", undefined, this.lobbyConfig.diagnosticMode)) {
                            this.lobbyConfig.diagnosticMode = !this.lobbyConfig.diagnosticMode;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Autosave", undefined, this.lobbyConfig.autosaves)) {
                            this.lobbyConfig.autosaves = !this.lobbyConfig.autosaves;
                            this.ModLoader.config.save();
                        } */
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Sync Settings")) {
                        if (this.ModLoader.ImGui.menuItem("Sync Mode: Basic", undefined, this.lobbyConfig.syncModeBasic, this.amIHost)) {
                            this.lobbyConfig.syncModeBasic = !this.lobbyConfig.syncModeBasic;
                            this.lobbyConfig.syncModeTime = false;
                            if(this.lobbyConfig.syncModeBasic === false && this.lobbyConfig.syncModeTime === false) this.lobbyConfig.syncModeTime = true;
                            this.ModLoader.config.save();
                            console.log(`Sync config updated; Basic: ${this.lobbyConfig.syncModeBasic}`)
                            // This is such an ugly hack. Do something about this @TODO
                            markAsTimeSync((((this.parent as unknown as Z64Online).MM as MMOnline).client as MMOnlineClient).clientStorage, this.lobbyConfig.syncModeTime)
                            this.ModLoader.clientSide.sendPacket(new Z64O_SyncSettings(this.lobbyConfig.syncModeBasic, this.lobbyConfig.syncModeTime, this.ModLoader.clientLobby))
                        }
                        if (this.ModLoader.ImGui.menuItem("Sync Mode: Time", undefined, this.lobbyConfig.syncModeTime, this.amIHost)) {
                            this.lobbyConfig.syncModeTime = !this.lobbyConfig.syncModeTime;
                            this.lobbyConfig.syncModeBasic = false;
                            if(this.lobbyConfig.syncModeTime === false && this.lobbyConfig.syncModeBasic === false) this.lobbyConfig.syncModeBasic = true;
                            this.ModLoader.config.save();
                            console.log(`Sync config updated; Time: ${this.lobbyConfig.syncModeTime}`)
                            markAsTimeSync((((this.parent as unknown as Z64Online).MM as MMOnline).client as MMOnlineClient).clientStorage, this.lobbyConfig.syncModeTime)
                            this.ModLoader.clientSide.sendPacket(new Z64O_SyncSettings(this.lobbyConfig.syncModeBasic, this.lobbyConfig.syncModeTime, this.ModLoader.clientLobby))
                        }
                        //if (this.ModLoader.ImGui.menuItem("Sync Bottle Contents", undefined, this.lobbyConfig.syncBottleContents)) {
                        //    this.lobbyConfig.syncBottleContents = !this.lobbyConfig.syncBottleContents;
                        //    this.ModLoader.config.save();
                        //}
                        this.ModLoader.ImGui.endMenu();
                    }
                    // #ifdef IS_DEV_BUILD
                    if (this.ModLoader.ImGui.button("DUMP RAM")) {
                        bus.emit(Z64OnlineEvents.DEBUG_DUMP_RAM, {});
                    }
                    if (this.ModLoader.ImGui.button("PRINT LINK POS")) {
                        console.log(JSON.stringify(this.core.MM!.link.position.getVec3()));
                    }
                    if (this.ModLoader.ImGui.button("FLIP ALL FLAGS IN ROOM")){
                        let flags = this.core.MM!.global.liveSceneData_switch;
                        let nflags = Buffer.alloc(flags.byteLength, 0xFF);
                        if (flags.equals(nflags)){
                            this.ModLoader.utils.clearBuffer(nflags);
                        }
                        this.core.MM!.global.liveSceneData_switch = nflags;
                    }
                    // #endif
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
    }

    @NetworkHandler('Z64O_SyncSettings')
    onSyncSettings(packet: Z64O_SyncSettings){
        this.lobbyConfig.syncModeBasic = packet.syncModeBasic;
        this.lobbyConfig.syncModeTime = packet.syncModeTime;
    }

    @NetworkHandler('Z64O_DownloadResponsePacket')
    onDownloadPacket_client(packet: Z64O_DownloadResponsePacket) {
        let owner = this.ModLoader.clientSide.getLobbyOwner(this.ModLoader.clientLobby);
        if (owner.uuid === this.ModLoader.me.uuid){
            this.ModLoader.logger.debug("I own this lobby!");
            this.amIHost = true;
        }else{
            this.ModLoader.logger.debug(`${owner.nickname} owns this lobby!`);
            this.amIHost = false;
        }
    }

    @EventHandler(EventsClient.ON_LOBBY_OWNER_CHANGE)
    onLobbyOwnerChange(evt: EventOwnerChanged){
        console.log(`Lobby is currently owned by ${evt.owner.nickname}`);
        if(evt.owner.uuid === this.ModLoader.me.uuid) this.amIHost = true;
        else this.amIHost = false;
    }

}