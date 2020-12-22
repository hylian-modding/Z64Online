import { InjectCore } from "modloader64_api/CoreInjection";
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { Command } from "modloader64_api/OOT/ICommandBuffer";
import { IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { Music, SoundSourceStatus } from "modloader64_api/Sound/sfml_audio";
import { FlipFlags, Texture } from "modloader64_api/Sylvain/Gfx";
import fs from 'fs';
import path from 'path';
import { rgba, xy, xywh } from "modloader64_api/Sylvain/vec";
import { onTick, onViUpdate } from "modloader64_api/PluginLifecycle";

export class CreditsController {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: IOOTCore;
    playingCredits: boolean = false;
    creditsInterval: any;
    needsSlideChange: boolean = false;
    playedCredits: boolean = false;
    creditsMusic!: Music;
    assets!: Map<string, Buffer>;
    currentCreditsSlide!: Texture;
    totalSlidesShown: number = 0;
    private entranceTrigger: number = 0x0000006B;
    private cutsceneTrigger: number = 0x0000FFF2;
    eventDisabled: boolean = false;
    muteMusic: boolean = false;
    creditsDone: boolean = false;

    @onTick()
    onTick() {
        if (this.playingCredits) {
            this.core.commandBuffer.runCommand(Command.PLAY_MUSIC, 0);
        }
    }

    @onViUpdate()
    onVi() {
        if (this.eventDisabled) {
            return;
        }
        if (this.playingCredits) {
            if (this.creditsMusic === undefined) {
                this.creditsMusic = this.ModLoader.sound.initMusic(this.assets.get("assets/music/credits.ogg")!);
                this.creditsMusic.volume = 50;
                return;
            }
            if (this.creditsMusic.status !== SoundSourceStatus.Playing && !this.creditsDone) {
                if (!this.muteMusic) {
                    this.creditsMusic.stop();
                    this.creditsMusic.play();
                }
                this.needsSlideChange = true;
            }
            if (this.needsSlideChange) {
                if (this.assets.has("assets/credits/" + "slide" + this.totalSlidesShown + ".png")) {
                    this.currentCreditsSlide = this.ModLoader.Gfx.createTexture();
                    fs.writeFileSync(path.resolve(__dirname, "slide" + this.totalSlidesShown + ".png"), this.assets.get("assets/credits/" + "slide" + this.totalSlidesShown + ".png")!);
                    this.currentCreditsSlide.loadFromFile(path.resolve(__dirname, "slide" + this.totalSlidesShown + ".png"));
                    this.totalSlidesShown++;
                } else {
                    // ran out of slides?
                    clearInterval(this.creditsInterval);
                    this.creditsInterval = undefined;
                    this.creditsDone = true;
                }
                this.needsSlideChange = false;
            }
            this.ModLoader.ImGui.getWindowDrawList().addRectFilled(xy(0, 0), xy(this.ModLoader.ImGui.getWindowWidth(), this.ModLoader.ImGui.getWindowHeight()), rgba(0, 0, 0, 0xFF));
            if (this.currentCreditsSlide !== undefined) {
                this.ModLoader.Gfx.addSprite(this.ModLoader.ImGui.getWindowDrawList(), this.currentCreditsSlide, xywh(0, 0, this.currentCreditsSlide.width, this.currentCreditsSlide.height), xywh(0, 0, this.ModLoader.ImGui.getMainViewport().size.x, this.ModLoader.ImGui.getMainViewport().size.y), rgba(255, 255, 255, 255), FlipFlags.None);
            }
            return;
        }
        if (this.core.save.entrance_index === this.entranceTrigger && this.core.save.cutscene_number === this.cutsceneTrigger && !this.playingCredits && !this.playedCredits) {
            this.playingCredits = true;
            this.creditsInterval = setInterval(() => {
                if (this.playingCredits) {
                    this.needsSlideChange = true;
                    this.playedCredits = true;
                }
            }, 10 * 1000);
        }
    }

}