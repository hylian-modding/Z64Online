import { onViUpdate } from "modloader64_api/PluginLifecycle";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";
import { bus } from "modloader64_api/EventHandler";
import { Z64OnlineEvents } from "@Z64Online/common/api/Z64API";
import { rgba, xy } from "modloader64_api/Sylvain/vec";
import path from 'path';
import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { OotOnlineConfigCategory } from "@Z64Online/oot/OotOnline";
import { BUILD_DATE, VERSION_NUMBER } from "@Z64Online/common/lib/VERSION_NUMBER";
import fse from 'fs-extra';
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { Command } from "Z64Lib/API/Common/ICommandBuffer";
import { IZ64OnlineHelpers } from "@Z64Online/common/lib/IZ64OnlineHelpers";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { ImGuiHandlerCommon } from "@Z64Online/common/gui/ImGuiHandlerCommon";
import { CommonConfigInst } from "@Z64Online/common/lib/Settings";

export class ImGuiHandler extends ImGuiHandlerCommon{

    @ModLoaderAPIInject()
    ModLoader: IModLoaderAPI = {} as any;
    @InjectCore()
    core: IZ64Main = {} as any;
    @ParentReference()
    parent!: IZ64OnlineHelpers;
    settings!: OotOnlineConfigCategory
    // #ifdef IS_DEV_BUILD
    teleportDest: string_ref = [""];
    cutsceneDest: string_ref = [""];
    sound_id: string_ref = [""];
    // #endif

    constructor() {
        super();
        // #ifdef IS_DEV_BUILD
        this.actorNames = JSON.parse(fse.readFileSync(path.resolve(__dirname, "ACTOR_NAMES.json")).toString());
        // #endif
    }

    @onViUpdate()
    onViUpdate() {
        super.onViUpdate();
        // #ifdef IS_DEV_BUILD
        let isTitleScreen: boolean = this.core.OOT!.helper.isTitleScreen();
        this.ModLoader.Gfx.addText(this.ModLoader.ImGui.getBackgroundDrawList(), this.font, `Z64Online ${VERSION_NUMBER}`, xy(2, this.ModLoader.ImGui.getMainViewport().size.y - (isTitleScreen ? 60 : 45)), rgba(255, 255, 255, 255), rgba(0, 0, 0, isTitleScreen ? 255 : 20), xy(isTitleScreen ? 1 : 0.5, isTitleScreen ? 1 : 0.5));
        // #endif

        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("Z64O")) {
                    if (this.ModLoader.ImGui.beginMenu("General Settings")) {
                        if (this.ModLoader.ImGui.menuItem("Show nameplates", undefined, CommonConfigInst.nameplates, true)) {
                            CommonConfigInst.nameplates = !CommonConfigInst.nameplates;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Show notifications", undefined, this.settings.notifications, true)) {
                            this.settings.notifications = !this.settings.notifications
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Notification Sounds", undefined, this.settings.notificationSound)) {
                            this.settings.notificationSound = !this.settings.notificationSound;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Diagnostic Mode", undefined, this.settings.diagnosticMode)) {
                            this.settings.diagnosticMode = !this.settings.diagnosticMode;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Autosave", undefined, this.settings.autosaves)) {
                            this.settings.autosaves = !this.settings.autosaves;
                            this.ModLoader.config.save();
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Sync Settings")) {
                        if (this.ModLoader.ImGui.menuItem("Sync Masks", undefined, this.settings.syncMasks)) {
                            this.settings.syncMasks = !this.settings.syncMasks;
                            this.ModLoader.config.save();
                        }
                        if (this.ModLoader.ImGui.menuItem("Sync Bottle Contents", undefined, this.settings.syncBottleContents)) {
                            this.settings.syncBottleContents = !this.settings.syncBottleContents;
                            this.ModLoader.config.save();
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    // #ifdef IS_DEV_BUILD
                    if (this.ModLoader.ImGui.beginMenu("Game Sounds")) {
                        this.ModLoader.ImGui.inputText("sound id", this.sound_id);
                        if (this.ModLoader.ImGui.button("play")) {
                            this.core.OOT!.commandBuffer.runCommand(Command.PLAYSOUND, parseInt(this.sound_id[0]));
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Teleport")) {
                        this.ModLoader.ImGui.inputText("Destination", this.teleportDest);
                        this.ModLoader.ImGui.inputText("Cutscene", this.cutsceneDest);
                        if (this.ModLoader.ImGui.button("Warp")) {
                            this.core.OOT!.commandBuffer.runWarp(parseInt(this.teleportDest[0], 16), parseInt(this.cutsceneDest[0], 16));
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.button("DUMP RAM")) {
                        bus.emit(Z64OnlineEvents.DEBUG_DUMP_RAM, {});
                    }
                    if (this.ModLoader.ImGui.button("PRINT LINK POS")) {
                        console.log(JSON.stringify(this.core.OOT!.link.position.getVec3()));
                    }
                    // #endif
                    this.ModLoader.ImGui.endMenu();
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
    }

}