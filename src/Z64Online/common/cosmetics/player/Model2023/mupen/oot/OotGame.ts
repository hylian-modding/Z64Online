import { IModelReference, Z64OnlineEvents, Z64Online_ModelAllocation } from '@Z64Online/common/api/Z64API';
import { proxy_universal } from '@Z64Online/common/assets/proxy_universal';
import { CDNClient } from '@Z64Online/common/cdn/CDNClient';
import { UniversalAliasTable, getManifestForEpona, getManifestForForm } from '@Z64Online/common/cosmetics/UniversalAliasTable';
import { ModelManagerClient } from '@Z64Online/common/cosmetics/player/ModelManager';
import ArbitraryHook from '@Z64Online/common/lib/ArbitraryHook';
import { getAgeOrForm, getCommandBuffer } from '@Z64Online/common/types/GameAliases';
import { NormalSkelEpona } from '@Z64Online/overlay/CustomEponaObject';
import { EponaAnimBank } from '@Z64Online/overlay/EponaAnimBank';
import { adult, child } from '@Z64Online/overlay/LinkObjects';
import { ModelSystem_Player_oot10 } from '@Z64Online/overlay/ModelSystem_Player';
import { AgeOrForm } from 'Z64Lib/API/Common/Z64API';
import { OOTManifest } from 'Z64Lib/API/OoT/ModelData/OOTManfest';
import MipsAssembler from 'Z64Lib/API/Utilities/MipsAssembler';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import { Z64RomTools } from 'Z64Lib/API/Utilities/Z64RomTools';
import { EventHandler, setupEventHandlers } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import IModelSystemGame from '../../IModelSystemGame';
import { LinkHookEnum, LinkHookManager } from '../../LinkHookManager';

export default class OotGame implements IModelSystemGame {

    cCode!: ArbitraryHook;
    adultRom: number = -1;
    childRom: number = -1;
    eponaAnimBank: number = -1;
    eponaStruct: number = -1;

    doGameInjects(ModLoader: IModLoaderAPI, rom: string | Buffer): void {
        /*         Z64Offsets["DL_HOOKSHOT_CHAIN"] = 0x000000000403d2a0;
                Z64Offsets["DL_HOOKSHOT_HOOK"] = 0x000000000403d2c0;
                Z64Offsets["DL_HOOKSHOT_AIM"] = 0x000000000403d2e0; */
        let manifest = new OOTManifest();
        let buf: Buffer;
        // This if statement is just to make intellisense shut up.
        if (Buffer.isBuffer(rom)) {
            buf = rom;
        } else {
            // This should never happen.
            buf = Buffer.alloc(64 * 1024 * 1024);
        }
        let fixproxy = (b: Buffer, age: number) => {
            let big = Buffer.alloc(0x37800);
            b.copy(big);
            if (age === 0) {
                return big;
            }
            return big.subarray(0, 0x2CF80);
        };
        // Convert the zobj to the universal format.
        let model1 = new UniversalAliasTable().createTable(proxy_universal, getManifestForForm(AgeOrForm.ADULT), true, Z64LibSupportedGames.OCARINA_OF_TIME);
        // Inject it into the game.
        manifest.repoint(ModLoader, buf, model1);
        this.adultRom = manifest.inject(ModLoader, buf, fixproxy(model1, 0), true, 0x0014);
        this.childRom = manifest.inject(ModLoader, buf, fixproxy(model1, 1), true, 0x0015);
        // NOP this: https://github.com/zeldaret/oot/blob/master/src/overlays/actors/ovl_player_actor/z_player.c#L14391
        // If we don't nop this we will crash when certain cutscenes are ran. Notably pulling the Master Sword from the pedestal.
        // Technical details: Link's draw function has a seemingly pointless wrapper around it, but this command temporarily removes the wrapper.
        // Removal of the wrapper causes us to crash for some reason I don't entirely understand, but making it stay in place seems to have no ill effect.
        let tools = new Z64RomTools(ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
        let player = tools.decompressDMAFileFromRom(buf, 34);
        MipsAssembler.assemble('nop').copy(player, 0x1FF80);
        tools.recompressDMAFileIntoRom(buf, 34, player);
        // Link will be invisible following this code if nothing else is done.
        rom = buf;
    }

    doHandlerInjection(ModLoader: IModLoaderAPI, core: any, manager: ModelManagerClient): void {
        /* Start Hook manager */
        setupEventHandlers(this, ModLoader.publicBus);
        const hookManager = new LinkHookManager();
        hookManager.setup(ModLoader, core);
        /* Inject our overlay. */
        this.cCode = new ArbitraryHook("Model System Player Oot", ModLoader, core, ModelSystem_Player_oot10);
        this.cCode.injectPromise().then(() => { });
        /* Set default puppet models. */
        manager.puppetModels.set(AgeOrForm.ADULT, manager.allocationManager.registerModel(new UniversalAliasTable().createTable(adult, getManifestForForm(AgeOrForm.ADULT), true, Z64LibSupportedGames.OCARINA_OF_TIME)));
        manager.puppetModels.set(AgeOrForm.CHILD, manager.allocationManager.registerModel(new UniversalAliasTable().createTable(child, getManifestForForm(AgeOrForm.CHILD), true, Z64LibSupportedGames.OCARINA_OF_TIME)));
        manager.puppetModels.set(6 as any, manager.allocationManager.registerModel(new UniversalAliasTable().createTable(NormalSkelEpona, getManifestForEpona(), true, Z64LibSupportedGames.OCARINA_OF_TIME)));
        /* Allocate array for local player. */
        manager.allocationManager.allocateLocalPlayer();

        /* Set and load default models for local player. */
        manager.puppetModels.forEach((ref: IModelReference, age: AgeOrForm) => {
            CDNClient.singleton.registerWithCache(manager.allocationManager.getModel(ref).zobj);
            ref.doNotGC = true;
            ref.isPlayerModel = false;
            ref.loadModel();
            manager.allocationManager.SetLocalPlayerModel(age, ref);
            ModLoader.emulator.rdramWrite32(manager.allocationManager.getLocalPlayerData().pointer + (age * 0x4), manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.pointer);
        });

        /* Epona anims */
        this.eponaAnimBank = ModLoader.gfx_heap!.malloc(EponaAnimBank.byteLength);
        ModLoader.emulator.rdramWriteBuffer(this.eponaAnimBank, EponaAnimBank);
        getCommandBuffer(core).relocateOverlay(this.eponaAnimBank, this.eponaAnimBank + (EponaAnimBank.byteLength - EponaAnimBank.readUInt32BE(EponaAnimBank.byteLength - 0x4)), 0x80800000).then(() => {
            ModLoader.emulator.rdramWrite32(manager.allocationManager.getLocalPlayerData().pointer + (7 * 4), this.eponaAnimBank);
        });

        /* Wait until the N64 logo is over then engage the model system. */
        const t = ModLoader.utils.setIntervalFrames(() => {
            if (this.cCode.instancePointer === -1 || ModLoader.emulator.rdramRead32(0x800F13A0) !== 0) return;
            let evt = new Z64Online_ModelAllocation(Buffer.alloc(1), AgeOrForm.ADULT, Z64LibSupportedGames.OCARINA_OF_TIME);
            ModLoader.publicBus.emit(Z64OnlineEvents.CHANGE_CUSTOM_MODEL, evt);
            ModLoader.utils.clearIntervalFrames(t);
            ModLoader.publicBus.emit(Z64OnlineEvents.ON_MODEL_MANAGER_READY, {});
        }, 1);
    }

    @EventHandler(LinkHookEnum.READY)
    private on_link_hook_ready(evt: { ModLoader: IModLoaderAPI, data: Buffer }) {
        LinkHookManager.inject(evt.ModLoader, this.cCode.payloadPointer, ModelSystem_Player_oot10.byteLength, evt.data, () => {
            /* Run our c function */
            this.cCode.runCreate(0, () => { });
        });
    }

    private isSegmented(addr: number) {
        return (addr >> 24) === 0x06;
    }

    triggerHandler(ModLoader: IModLoaderAPI, core: any, manager: ModelManagerClient): void {
        /* Check all model display lists for stubs. If a display list is stubbed replace it with the bank */
        manager.puppetModels.forEach((ref: IModelReference, age: AgeOrForm) => {
            if (ref.isLoaded && manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.isLoaded) {
                if (ref.hash === manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.hash) return;
                let start = 0x5020;
                let size = 256;
                let cur = 0;
                for (let i = 0; i < size; i++) {
                    cur = start + (i * 0x8);
                    cur += 0x4;
                    let addr = ModLoader.emulator.rdramRead32(manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.pointer + cur);
                    if (this.isSegmented(addr)) {
                        addr = manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.pointer + (addr & 0x00FFFFFF);
                    }
                    let op = ModLoader.emulator.rdramRead32(addr);
                    if (op === 0xDF000000) {
                        // This is a stub DL.
                        let rep = ModLoader.emulator.rdramRead32(ref.pointer + cur);
                        ModLoader.emulator.rdramWrite32(manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.pointer + cur, rep);
                    }
                }
            }
        });
        /* Calculate offset in array by age id. */
        let age = getAgeOrForm(core);
        let offset = age * 0x4;
        /* Write the pointer to the array. */
        ModLoader.emulator.rdramWrite32(manager.allocationManager.getLocalPlayerData().pointer + offset, manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.pointer);
        /* Write the array pointer to the system */
        ModLoader.emulator.rdramWrite32(this.cCode.instancePointer, manager.allocationManager.getLocalPlayerData().pointer);
    }

}