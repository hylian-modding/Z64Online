import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { string_ref } from "modloader64_api/Sylvain/ImGui";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64O_Logger } from "../lib/Logger";
import { getCommandBuffer } from "../types/GameAliases";

export class FunctionTester{

    ModLoader: IModLoaderAPI;
    core: IZ64Main
    isOpen: boolean = false;
    pointer: string_ref = [""];
    param1: string_ref = [""];
    param2: string_ref = [""];
    param3: string_ref = [""];
    param4: string_ref = [""];

    constructor(ModLoader: IModLoaderAPI, core: IZ64Main){
        this.ModLoader = ModLoader;
        this.core = core;
    }

    onVi(){
        if (!this.isOpen) return;
        if (this.ModLoader.ImGui.begin("Function Tester")){
            this.ModLoader.ImGui.inputText("Fn Pointer", this.pointer);
            this.ModLoader.ImGui.inputText("a0", this.param1);
            this.ModLoader.ImGui.inputText("a1", this.param2);
            this.ModLoader.ImGui.inputText("a2", this.param3);
            this.ModLoader.ImGui.inputText("a3", this.param4);
            if (this.ModLoader.ImGui.smallButton("Invoke")){
                let h = this.ModLoader.heap!.malloc(4 * 4);
                let c = 0;
                if (this.param1[0] !== ""){
                    this.ModLoader.emulator.rdramWrite32(h + 0x0, parseInt(this.param1[0]));
                    c++;
                } 
                if (this.param2[0] !== ""){
                    this.ModLoader.emulator.rdramWrite32(h + 0x4, parseInt(this.param2[0]));
                    c++;
                }
                if (this.param3[0] !== ""){
                    this.ModLoader.emulator.rdramWrite32(h + 0x8, parseInt(this.param3[0]));
                    c++;
                }
                if (this.param4[0] !== ""){
                    this.ModLoader.emulator.rdramWrite32(h + 0xC, parseInt(this.param4[0]));
                    c++;
                }
                this.ModLoader.utils.setTimeoutFrames(()=>{
                    getCommandBuffer(this.core)!.arbitraryFunctionCall(parseInt(this.pointer[0], 16), h, c).then((value: Buffer)=>{
                        Z64O_Logger.debug(`Function call complete. Return: ${value.toString('hex')}`);
                    });
                }, 1);
            }
            this.ModLoader.ImGui.end();
        }
    }

}