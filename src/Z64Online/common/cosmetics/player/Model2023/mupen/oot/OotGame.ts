import { IModelReference, Z64OnlineEvents, Z64Online_ModelAllocation } from '@Z64Online/common/api/Z64API';
import { proxy_universal } from '@Z64Online/common/assets/proxy_universal';
import { ModelManagerClient } from '@Z64Online/common/cosmetics/player/ModelManager';
import { getManifestForEpona, getManifestForForm, UniversalAliasTable } from '@Z64Online/common/cosmetics/UniversalAliasTable';
import ArbitraryHook from '@Z64Online/common/lib/ArbitraryHook';
import { getAgeOrForm, getCommandBuffer } from '@Z64Online/common/types/GameAliases';
import { ModelSystem_Player_oot } from '@Z64Online/overlay/ModelSystem_Player';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { AgeOrForm } from 'Z64Lib/API/Common/Z64API';
import { OOTManifest } from 'Z64Lib/API/OoT/ModelData/OOTManfest';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import IModelSystemGame from '../../IModelSystemGame';
import { EventHandler, setupEventHandlers } from 'modloader64_api/EventHandler';
import { LinkHookEnum, LinkHookManager } from '../../LinkHookManager';
import { NormalSkelEpona } from '@Z64Online/overlay/CustomEponaObject';
import { EponaAnimBank } from '@Z64Online/overlay/EponaAnimBank';
import { CDNClient } from '@Z64Online/common/cdn/CDNClient';
import { adult, child } from '@Z64Online/overlay/LinkObjects';

export default class OotGame implements IModelSystemGame {

    cCode!: ArbitraryHook;
    adultRom: number = -1;
    childRom: number = -1;
    eponaAnimBank: number = -1;
    eponaStruct: number = -1;

    doGameInjects(ModLoader: IModLoaderAPI, rom: string | Buffer): void {
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
        // Link will be invisible following this code if nothing else is done.
        rom = buf;
    }

    doHandlerInjection(ModLoader: IModLoaderAPI, core: any, manager: ModelManagerClient): void {
        /* Start Hook manager */
        setupEventHandlers(this, ModLoader.publicBus);
        const hookManager = new LinkHookManager();
        hookManager.setup(ModLoader, core);
        /* Inject our overlay. */
        this.cCode = new ArbitraryHook("Model System Player Oot", ModLoader, core, ModelSystem_Player_oot);
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
        LinkHookManager.inject(evt.ModLoader, this.cCode.payloadPointer, ModelSystem_Player_oot.byteLength, evt.data, () => {
            /* Run our c function */
            this.cCode.runCreate(0, () => { });
        });
    }

    triggerHandler(ModLoader: IModLoaderAPI, core: any, manager: ModelManagerClient): void {
        /* Calculate offset in array by age id. */
        let age = getAgeOrForm(core);
        let offset = age * 0x4;
        /* Write the pointer to the array. */
        ModLoader.emulator.rdramWrite32(manager.allocationManager.getLocalPlayerData().pointer + offset, manager.allocationManager.getLocalPlayerData().AgesOrForms.get(age)!.pointer);
        /* Write the array pointer to the system */
        ModLoader.emulator.rdramWrite32(this.cCode.instancePointer, manager.allocationManager.getLocalPlayerData().pointer);
    }

}