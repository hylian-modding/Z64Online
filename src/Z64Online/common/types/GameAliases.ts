import { OOTManifest } from "Z64Lib/API/OoT/ModelData/OOTManfest";
import { OOT_ANIM_BANK_DMA, OOT_ANIM_BANK_SIZE } from "./OotAliases";
import { AgeOrForm, DMAIndex, Manifest } from "./Types";
import { MMManifest } from 'Z64Lib/API/MM/ModelData/MMManfest';
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { Z64_GAME } from "Z64Lib/src/Common/types/GameAliases";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { IViewStruct, IZ64Core } from "Z64Lib/API/Common/Z64API";
import { ICommandBuffer } from "Z64Lib/API/imports";
import Vector3 from "modloader64_api/math/Vector3";
import { MM_ANIM_BANK_DMA, MM_ANIM_BANK_SIZE } from "./MMAliases";
import { SoundAccessSingleton } from "../cosmetics/sound/SoundManager";

export let Z64_ANIM_BANK_DMA: DMAIndex = 0;
export let Z64_ANIM_BANK_SIZE: number = 0;
export let Z64_CHILD_ZOBJ_DMA: DMAIndex = 0;
export let Z64_ADULT_ZOBJ_DMA: DMAIndex = 0;
export let Z64_IS_RANDOMIZER: boolean = false;
export let Z64_CHILD: AgeOrForm;
export let Z64_ADULT: AgeOrForm;
export let Z64_TITLE_SCREEN_FORM: AgeOrForm;
// Playas stuff
export let Z64_MANIFEST: Manifest;
export let Z64_OBJECT_TABLE_RAM: number = 0;
export let Z64_PLAYER_PROXY: Buffer;
//MMR stuff
export let MM_IS_FAIRY: boolean;
export let MM_IS_SKULL: boolean;
export let MM_IS_KEY_KEEP: boolean;

export function setupOot() {
    Z64_ANIM_BANK_DMA = OOT_ANIM_BANK_DMA;
    Z64_ANIM_BANK_SIZE = OOT_ANIM_BANK_SIZE;
    Z64_CHILD = AgeOrForm.CHILD;
    Z64_ADULT = AgeOrForm.ADULT;
    Z64_TITLE_SCREEN_FORM = AgeOrForm.ADULT;
    Z64_MANIFEST = new OOTManifest();
    Z64_ADULT_ZOBJ_DMA = 502;
    Z64_CHILD_ZOBJ_DMA = 503;
    Z64_OBJECT_TABLE_RAM = 0x801D9C44;
}

export function setupMM() {
    Z64_ANIM_BANK_DMA = MM_ANIM_BANK_DMA;
    Z64_ANIM_BANK_SIZE = MM_ANIM_BANK_SIZE;
    Z64_CHILD = AgeOrForm.HUMAN;
    Z64_ADULT = AgeOrForm.HUMAN;
    Z64_TITLE_SCREEN_FORM = AgeOrForm.HUMAN;
    Z64_MANIFEST = new MMManifest();
    Z64_ADULT_ZOBJ_DMA = 654;
    Z64_CHILD_ZOBJ_DMA = 654;
    Z64_OBJECT_TABLE_RAM = 0x803FE8A8;
    MM_IS_FAIRY = false;
    MM_IS_SKULL = false;
    MM_IS_KEY_KEEP = false;
}

export function markAsRandomizer() {
    Z64_IS_RANDOMIZER = true;
}

export function markAsFairySync() {
    MM_IS_FAIRY = true;
}

export function markAsSkullSync() {
    MM_IS_SKULL = true;
}

export function markAsKeySync() {
    MM_IS_KEY_KEEP = true;
}

export function setPlayerProxy(buf: Buffer) {
    Z64_PLAYER_PROXY = buf;
}

export function getAgeOrForm(core: IZ64Main): AgeOrForm {
    return core.OOT !== undefined ? core.OOT!.save.age : core.MM!.save.form;
}

export function getChildID(): AgeOrForm {
    return Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME ? AgeOrForm.CHILD : AgeOrForm.HUMAN
}

export function getAdultID(): AgeOrForm {
    return Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME ? AgeOrForm.ADULT : AgeOrForm.HUMAN
}

export function getLinkPos(core: IZ64Main): Buffer {
    return core.OOT !== undefined ? core.OOT!.link.position.getRawPos() : core.MM!.link.position.getRawPos();
}

export function getLinkSoundID(core: IZ64Main): number {
    return SoundAccessSingleton !== undefined ? SoundAccessSingleton.sound_id : 0;
}

export function isTitleScreen(core: IZ64Main): boolean {
    return core.OOT !== undefined ? core.OOT!.helper.isTitleScreen() : core.MM!.helper.isTitleScreen();
}

export function getViewStruct(core: IZ64Main): IViewStruct {
    return core.OOT !== undefined ? core.OOT!.global.viewStruct : core.MM!.global.viewStruct;
}

export function isPaused(core: IZ64Main): boolean {
    return core.OOT !== undefined ? core.OOT!.helper.isPaused() : core.MM!.helper.isPaused();
}

export function getCommandBuffer(core: IZ64Main): ICommandBuffer {
    return core.OOT !== undefined ? core.OOT!.commandBuffer : core.MM!.commandBuffer;
}

export function isInterfaceShown(core: IZ64Main) {
    return core.OOT !== undefined ? core.OOT!.helper.isInterfaceShown() : core.MM!.helper.isInterfaceShown();
}

export function getLinkLocation(core: IZ64Main): { pos: Vector3, rot: Vector3 } {
    let _core: IZ64Core = core.OOT !== undefined ? core.OOT : core.MM!;
    return { pos: _core.link.position.getVec3(), rot: _core.link.rotation.getVec3() };
}

export function getCurrentSceneID(core: IZ64Main) {
    return core.OOT !== undefined ? core.OOT!.global.scene : core.MM!.global.scene;
}

export function getCurrentRoomID(core: IZ64Main) {
    return core.OOT !== undefined ? core.OOT!.global.room : core.MM!.global.room;
}

export function getLink(core: IZ64Main) {
    return core.OOT !== undefined ? core.OOT!.link : core.MM!.link;
}