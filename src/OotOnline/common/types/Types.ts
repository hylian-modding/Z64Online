import { Age, IOOTCore, LinkState, Tunic } from "modloader64_api/OOT/OOTAPI";
import { IOOTSaveContext, IOOTSyncSave } from "./OotAliases";
import * as MMAPI from 'MajorasMask/API/Imports';
import { Z64LibSupportedGames } from "Z64Lib/API/Z64LibSupportedGames";
import { OOTAdultManifest } from "Z64Lib/API/OOT/OOTAdultManfest";
import { MMChildManifest } from 'Z64Lib/API/MM/MMChildManifest';
import { OOTChildManifest } from "Z64Lib/API/OOT/OOTChildManifest";
import { IManifest } from "Z64Lib/API/Z64ManifestBuffer";

export type AgeorForm = Age | MMAPI.MMForms;
export type IZ64SaveContext = IOOTSaveContext;
export type IZ64SyncSave = IOOTSyncSave;
export type Scene = number;
export type Core = IOOTCore;
export type Z64Tunic = Tunic;
export type DMAIndex = number;
export type Game = Z64LibSupportedGames;
export type Manifest = IManifest;
export type AdultManifest = OOTAdultManifest | MMChildManifest;
export type ChildManifest = OOTChildManifest | MMChildManifest;

export const LinkStandingState: number = LinkState.STANDING;