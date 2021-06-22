import { Age, IOOTCore, LinkState, Tunic } from "modloader64_api/OOT/OOTAPI";
import { IOOTSaveContext, IOOTSyncSave } from "./OotAliases";

export type AgeorForm = Age;
export type IZ64SaveContext = IOOTSaveContext;
export type IZ64SyncSave = IOOTSyncSave;
export type Scene = number;
export type Core = IOOTCore;
export type Z64Tunic = Tunic;

export const LinkStandingState: number = LinkState.STANDING;