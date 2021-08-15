import { IOOTCore, Tunic } from "Z64Lib/API/OOT/OOTAPI";
import { AgeOrForm, LinkState } from "Z64Lib/API/Common/Z64API";
import { IOOTSaveContext, IOOTSyncSave } from "./OotAliases";
import * as MMAPI from 'Z64Lib/API/Imports';
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { OOTAdultManifest } from "Z64Lib/API/OoT/ModelData/OOTAdultManfest";
import { MMChildManifest } from 'Z64Lib/API/MM/ModelData/MMChildManifest';
import { OOTChildManifest } from "Z64Lib/API/OoT/ModelData/OOTChildManifest";
import { IManifest } from "Z64Lib/API/Utilities/Z64ManifestBuffer";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";

export type IZ64SaveContext = IOOTSaveContext;
export type IZ64SyncSave = IOOTSyncSave;
export type Scene = number;
export type Core = IZ64Main;
export type Z64Tunic = Tunic;
export type DMAIndex = number;
export type Game = Z64LibSupportedGames;
export type Manifest = IManifest;
export type AdultManifest = OOTAdultManifest | MMChildManifest;
export type ChildManifest = OOTChildManifest | MMChildManifest;

export const LinkStandingState: number = LinkState.STANDING;