import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Tunic } from "Z64Lib/API/OOT/OOTAPI";
import { IOOTSaveContext, IOOTSyncSave } from "./OotAliases";
import { OOTManifest } from 'Z64Lib/API/OoT/ModelData/OOTManfest';
import { IManifest } from "Z64Lib/API/Utilities/Z64ManifestBuffer";
import { LinkState } from "Z64Lib/API/Common/Z64API";
import { IPluginServerConfig } from "modloader64_api/IModLoaderAPI";
import { IMMSaveContext, IMMSyncSave } from "./MMAliases";

export { AgeOrForm } from 'Z64Lib/API/Common/Z64API';
export type IZ64SaveContext = IOOTSaveContext | IMMSaveContext;
export type IZ64SyncSave = IOOTSyncSave | IMMSyncSave;
export type Scene = number;
export type Core = IZ64Main;
export type Z64Tunic = Tunic;
export type DMAIndex = number;
export type Manifest = IManifest;
export type ManifestImpl = OOTManifest;

export const LinkStandingState: number = LinkState.STANDING;

export interface IZ64GameMain extends IPluginServerConfig{
}