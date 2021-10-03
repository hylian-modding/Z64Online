import { number_ref } from "modloader64_api/Sylvain/ImGui";

export const volume_local: number_ref = [1.0];
export const volume_remote: number_ref = [1.0];

export class Z64O_Common_Config{
    nameplates: boolean = true;
    muteNetworkedSounds: boolean = false;
    muteLocalSounds: boolean = false;
    networkedVolume: number = 1.0;
    localVolume: number = 1.0;
}

export let CommonConfigInst: Z64O_Common_Config;

export function setCommonConfigInst(inst: Z64O_Common_Config){
    CommonConfigInst = inst;
}