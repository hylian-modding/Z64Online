/*
 * File generated by Interface generator (dotup.dotup-vscode-interface-generator)
 * Date: 2021-06-10 13:59:55 
*/
import { IKeyRing } from "@OotOnline/common/save/IKeyRing";
import { ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { IZ64SyncSave } from "../types/Types";

export interface ISaveSyncData {
    hash: string;
    createKeyRing(): IKeyRing;
    processKeyRing(keys: IKeyRing, storage: IKeyRing, side: ProxySide): void;
    processKeyRing_OVERWRITE(keys: IKeyRing, storage: IKeyRing, side: ProxySide): void;
    createSave(): Buffer;
    forceOverrideSave(save: Buffer, storage: IZ64SyncSave, side: ProxySide): void;
    mergeSave(save: Buffer, storage: IZ64SyncSave, side: ProxySide): void;
    applySave(save: Buffer): void;
}
