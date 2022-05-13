import { IKeyRing } from "@Z64Online/common/save/IKeyRing";
import { ProxySide } from "modloader64_api/SidedProxy/SidedProxy";
import { IZ64SyncSave } from "../types/Types";

export interface ISaveSyncData {
    hash: string;
    createKeyRing(): IKeyRing;
    processKeyRing(settings: any, keys: IKeyRing, storage: IKeyRing, side: ProxySide): void;
    processKeyRing_OVERWRITE(settings: any, keys: IKeyRing, storage: IKeyRing, side: ProxySide): void;
    createSave(): Buffer;
    forceOverrideSave(settings: any, save: Buffer, storage: IZ64SyncSave, side: ProxySide): void;
    mergeSave(settings: any, save: Buffer, storage: IZ64SyncSave, side: ProxySide): Promise<boolean>;
    applySave(settings: any, save: Buffer): void;
}
