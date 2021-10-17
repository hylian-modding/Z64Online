/**
 * This class is intended to draw an ImGui menu that crawls a display list one command at a time and NOPs.
 * I wrote this for debugging stuff with the model porting.
 */

import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { number_ref, string_ref } from "modloader64_api/Sylvain/ImGui";

export default class DListCrawler {

    ModLoader: IModLoaderAPI;
    start: string_ref = [""];
    current: string_ref = [""];
    lastcommand: string_ref = [""];
    buttonState: string = "RUN";
    speed: number_ref = [20];
    tick: any;

    constructor(ModLoader: IModLoaderAPI) {
        this.ModLoader = ModLoader;
    }

    onVi() {
        if (this.ModLoader.ImGui.begin("DLIST CRAWLER")) {
            this.ModLoader.ImGui.inputText("Start", this.start);
            this.ModLoader.ImGui.sliderInt("Speed", this.speed, 1, 20);
            this.ModLoader.ImGui.newLine();
            this.ModLoader.ImGui.labelText("Current", this.current[0]);
            this.ModLoader.ImGui.labelText("Last", this.lastcommand[0]);
            if (this.ModLoader.ImGui.smallButton(this.buttonState)) {
                if (this.buttonState === "RUN") {
                    this.lastcommand[0] = "";
                    this.current[0] = "";
                    this.buttonState = "STOP";
                    let a = parseInt(this.start[0]);
                    this.current[0] = `0x${a.toString(16)}`;
                    this.tick = this.ModLoader.utils.setIntervalFrames(() => {
                        if (this.lastcommand[0] !== "") {
                            let cur = parseInt(this.current[0]);
                            this.ModLoader.emulator.rdramWriteBuffer(cur, Buffer.from(this.lastcommand[0], 'hex'));
                            cur += 0x8;
                            this.current[0] = `0x${cur.toString(16)}`;
                        }
                        let cur = parseInt(this.current[0]);
                        let cmd = this.ModLoader.emulator.rdramReadBuffer(cur, 0x8);
                        this.lastcommand[0] = cmd.toString('hex');
                        if (cmd.readUInt32BE(0) === 0xDF000000) {
                            console.log("LAST COMMAND REACHED");
                            this.buttonState = "RUN";
                            this.ModLoader.utils.clearIntervalFrames(this.tick);
                            return;
                        }
                        cmd.writeUInt32BE(0xDF000000, 0);
                        cmd.writeUInt32BE(0x00000000, 4);
                        this.ModLoader.emulator.rdramWriteBuffer(cur, cmd);
                    }, this.speed[0]);
                } else {
                    this.buttonState = "RUN";
                    this.ModLoader.utils.clearIntervalFrames(this.tick);
                }
            }
            this.ModLoader.ImGui.sameLine();
            if (this.ModLoader.ImGui.smallButton("NEXT")) {
                if (this.lastcommand[0] !== "") {
                    let cur = parseInt(this.current[0]);
                    this.ModLoader.emulator.rdramWriteBuffer(cur, Buffer.from(this.lastcommand[0], 'hex'));
                }
                let cur = parseInt(this.current[0]);
                cur += 0x8;
                this.current[0] = `0x${cur.toString(16)}`;
                let cmd = this.ModLoader.emulator.rdramReadBuffer(cur, 0x8);
                this.lastcommand[0] = cmd.toString('hex');
                cmd.writeUInt32BE(0xDF000000, 0);
                cmd.writeUInt32BE(0x00000000, 4);
                this.ModLoader.emulator.rdramWriteBuffer(cur, cmd);
            }
            this.ModLoader.ImGui.sameLine();
            if (this.ModLoader.ImGui.smallButton("BACK")) {
                if (this.lastcommand[0] !== "") {
                    let cur = parseInt(this.current[0]);
                    this.ModLoader.emulator.rdramWriteBuffer(cur, Buffer.from(this.lastcommand[0], 'hex'));
                }
                let cur = parseInt(this.current[0]);
                cur -= 0x8;
                this.current[0] = `0x${cur.toString(16)}`;
                let cmd = this.ModLoader.emulator.rdramReadBuffer(cur, 0x8);
                this.lastcommand[0] = cmd.toString('hex');
                cmd.writeUInt32BE(0xDF000000, 0);
                cmd.writeUInt32BE(0x00000000, 4);
                this.ModLoader.emulator.rdramWriteBuffer(cur, cmd);
            }
        }
        this.ModLoader.ImGui.end();
    }

}