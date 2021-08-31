import { IOvlPayloadResult } from "Z64Lib/API/Common/Z64API";

export interface IZ64ClientStorage{
    puppetOvl: IOvlPayloadResult;
    overlayCache: any;
}

export interface IZ64Clientside {
    getClientStorage(): IZ64ClientStorage;
}