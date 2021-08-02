import { Age, IOOTCore, LinkState, Tunic } from "modloader64_api/OOT/OOTAPI";
import { IOOTSaveContext, IOOTSyncSave } from "./OotAliases";
import * as MMAPI from 'MajorasMask/API/Imports';
import { Z64LibSupportedGames } from "Z64Lib/API/Z64LibSupportedGames";

export type AgeorForm = Age | MMAPI.MMForms;
export type IZ64SaveContext = IOOTSaveContext;
export type IZ64SyncSave = IOOTSyncSave;
export type Scene = number;
export type Core = IOOTCore;
export type Z64Tunic = Tunic;
export type DMAIndex = number;
export type Game = Z64LibSupportedGames;

export const LinkStandingState: number = LinkState.STANDING;