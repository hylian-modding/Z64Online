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
    mode: string = "LIST";
    buttonState: string = "RUN";
    speed: number_ref = [20];
    tick: any = undefined;
    aliasTick: any = undefined;
    lastAlias: number = 0;
    isOpen: boolean = false;

    constructor(ModLoader: IModLoaderAPI) {
        this.ModLoader = ModLoader;
    }

    onVi() {
        if (!this.isOpen) return;
        if (this.ModLoader.ImGui.begin("DLIST CRAWLER")) {
            this.ModLoader.ImGui.inputText("Start", this.start);
            this.ModLoader.ImGui.sliderInt("Speed", this.speed, 1, 20);
            if (this.ModLoader.ImGui.smallButton(`Mode: ${this.mode}`)) {
                if (this.mode === "LIST") {
                    this.mode = "ALIAS";
                } else {
                    this.mode = "LIST";
                }
            }
            this.ModLoader.ImGui.newLine();
            this.ModLoader.ImGui.labelText("Current", this.current[0]);
            this.ModLoader.ImGui.labelText("Last", this.lastcommand[0]);
            if (this.ModLoader.ImGui.smallButton(this.buttonState)) {
                if (this.buttonState === "RUN") {
                    this.lastcommand[0] = "";
                    this.current[0] = "";

                    let crawl = () => {
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
                                this.tick = undefined;
                                this.lastcommand[0] = "";
                                this.current[0] = "";
                                return;
                            }
                            cmd.writeUInt32BE(0xDF000000, 0);
                            cmd.writeUInt32BE(0x00000000, 4);
                            this.ModLoader.emulator.rdramWriteBuffer(cur, cmd);
                        }, this.speed[0]);
                    }
                    if (this.mode === "ALIAS") {
                        console.log("ALIAS MODE");
                        let a = parseInt(this.start[0]);
                        a += 0x5000;
                        a += 0x20;
                        this.lastAlias = a;
                        console.log(`Starting alias: ${this.lastAlias.toString(16)}`);
                        this.aliasTick = this.ModLoader.utils.setIntervalFrames(() => {
                            if (this.tick === undefined) {
                                console.log("Alias tick");
                                if (this.ModLoader.emulator.rdramRead32(this.lastAlias) === 0xDE010000) {
                                    console.log(`Found alias entry at ${this.lastAlias.toString(16)}`);
                                    let p = this.ModLoader.emulator.rdramRead32(this.lastAlias + 0x4);
                                    this.start[0] = `0x${p.toString(16)}`;
                                    console.log(`Set start to ${this.start[0]}`);
                                    crawl();
                                } else {
                                    this.ModLoader.utils.clearIntervalFrames(this.aliasTick);
                                    this.aliasTick = undefined;
                                    this.lastAlias = 0;
                                }
                                this.lastAlias += 0x8;
                            }
                        }, 2);
                    } else {
                        crawl();
                    }
                } else {
                    this.buttonState = "RUN";
                    this.ModLoader.utils.clearIntervalFrames(this.tick);
                    this.ModLoader.utils.clearIntervalFrames(this.aliasTick);
                    this.tick = undefined;
                    this.aliasTick = undefined;
                    this.lastAlias = 0;
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