import { openMemoryUtils3Tab } from "@Z64Online/common/compat/MemoryUtils3";
import { LinkHookEnum, LinkHookManager } from "@Z64Online/common/cosmetics/player/Model2023/LinkHookManager";
import ArbitraryHook from "@Z64Online/common/lib/ArbitraryHook";
import { getCommandBuffer, getCurrentSceneID } from "@Z64Online/common/types/GameAliases";
import { Puppet_mm, Puppet_oot10 } from "@Z64Online/overlay/Puppet";
import { IZ64Main } from 'Z64Lib/API/Common/IZ64Main';
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { Z64_GAME, Z64_GLOBAL_PTR } from 'Z64Lib/src/Common/types/GameAliases';
import { IModLoaderAPI } from 'modloader64_api//IModLoaderAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { EventHandler } from 'modloader64_api/EventHandler';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { onViUpdate, onTick } from 'modloader64_api/PluginLifecycle';
import { ModelAllocationManager } from '../../cosmetics/utils/ModelAllocationManager';
import PuppetOffsets from "./PuppetOffsets";
import { Z64OnlineEvents, Z64_PlayerScene } from "@Z64Online/common/api/Z64API";
import { ModelManagerClient } from "@Z64Online/common/cosmetics/player/ModelManager";
import { Z64O_PuppetPacket, Z64O_SceneRequestPacket } from "@Z64Online/common/network/Z64OPackets";
import { NetworkHandler, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { Z64Events } from "Z64Lib/API/Common/Z64API";
import { EventsClient } from 'modloader64_api/EventHandler';
/*                     evt.ModLoader.logger.debug(`Codecaving JAL at 0x8008BC54 (SkelAnime_InitLink)...`);
                    let s = new ScriptKiddy(evt.ModLoader);
                    s.CODECAVE_POST_JAL(0x8008BC54, `
                    .defineLabel triggerAddr,0x${(this.cCode.instancePointer + 0x8).toString(16)}
 
                    li s5,triggerAddr
                    sw a0,0(s5)
                    nop
                    li s5,0
                    `); */
class Puppet {
    pointer: number;
    currentScene: number;
    player: INetworkPlayer;

    constructor(player: INetworkPlayer, pointer: number, currentScene: number) {
        this.player = player;
        this.pointer = pointer;
        this.currentScene = currentScene;
    }

    sleep(ModLoader: IModLoaderAPI) {
        ModLoader.logger.debug(`Puppet ${this.player.nickname} is sleeping.`);
        let puppetPointer = this.pointer;
        ModLoader.emulator.rdramWrite32(puppetPointer + PuppetOffsets.offsets.get("LinkPuppet")!.members.get("isAwake")!.offset, 0);
    }

    wake(ModLoader: IModLoaderAPI) {
        ModLoader.logger.debug(`Puppet ${this.player.nickname} is now awake.`);
        let puppetPointer = this.pointer;
        ModLoader.emulator.rdramWrite32(puppetPointer + PuppetOffsets.offsets.get("LinkPuppet")!.members.get("isAwake")!.offset, 1);
    }
}

export default class PuppetClient {

    @ModLoaderAPIInject()
    private ModLoader!: IModLoaderAPI;
    @InjectCore()
    private core!: IZ64Main;
    private cCode!: ArbitraryHook;
    private makePuppet: number = -1;
    private destroyPuppet: number = -1;
    private makePuppetArgs: number = -1;
    private destroyPuppetArgs: number = -1;
    private testPuppetContext: number = -1;
    //
    private PlayerPuppetMap: Map<string, Puppet> = new Map();

    @EventHandler(LinkHookEnum.READY)
    private on_link_hook_ready(evt: { ModLoader: IModLoaderAPI, data: Buffer }) {

        this.cCode = new ArbitraryHook("Puppets!", this.ModLoader, this.core, Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME ? Puppet_oot10 : Puppet_mm);
        this.cCode.injectPromise().then(() => {
            LinkHookManager.inject(evt.ModLoader, this.cCode.payloadPointer, Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME ? Puppet_oot10.byteLength : Puppet_mm.byteLength, evt.data, () => {
                /* Run our c function */
                this.cCode.runCreate(0, () => {
                    this.makePuppet = this.ModLoader.emulator.rdramRead32(this.cCode.instancePointer + this.getOffset("ModuleInject", "funcs") + this.getOffset("ModulePointers", "LinkPuppet_New"));
                    this.destroyPuppet = this.ModLoader.emulator.rdramRead32(this.cCode.instancePointer + this.getOffset("ModuleInject", "funcs") + this.getOffset("ModulePointers", "LinkPuppet_Sleep"));
                    evt.ModLoader.logger.debug("Puppet system initialized!");
                    this.ModLoader.clientSide.sendPacket(new Z64O_SceneRequestPacket(this.ModLoader.clientLobby));
                });
            });
        });
    }

    @EventHandler(Z64OnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES)
    onRemoteSceneChange(evt: Z64_PlayerScene) {
        if (this.cCode === undefined || this.cCode.instancePointer === -1) return;
        if (!this.PlayerPuppetMap.has(evt.player.uuid)) {
            // Player is new and needs a puppet.
            ModelAllocationManager.singleton.allocatePlayer(evt.player, ModelManagerClient.singleton.puppetModels);
            if (this.makePuppetArgs <= 0) {
                this.makePuppetArgs = this.ModLoader.heap!.malloc(0x8);
            }
            this.ModLoader.emulator.rdramWrite32(this.makePuppetArgs + 0x0, this.ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
            this.ModLoader.emulator.rdramWrite32(this.makePuppetArgs + 0x4, ModelAllocationManager.singleton.getPlayer(evt.player)!.pointer);
            getCommandBuffer(this.core).arbitraryFunctionCall(this.makePuppet, this.makePuppetArgs, 2).then((buf: Buffer) => {
                let context = this.ModLoader.emulator.rdramReadBuffer(this.cCode.instancePointer + this.getOffset("ModuleInject", "lastSpawned"), 0x4).readUInt32BE();
                this.PlayerPuppetMap.set(evt.player.uuid, new Puppet(evt.player, context, evt.scene));
                this.ModLoader.logger.debug(`Created puppet for player ${evt.player.nickname}.`);
            });
        } else {
            this.PlayerPuppetMap.get(evt.player.uuid)!.currentScene = evt.scene;
            if (getCurrentSceneID(this.core) === evt.scene) {
                this.PlayerPuppetMap.get(evt.player.uuid)!.wake(this.ModLoader);
            } else {
                this.PlayerPuppetMap.get(evt.player.uuid)!.sleep(this.ModLoader);
            }
        }
    }

    @EventHandler(Z64Events.ON_SCENE_CHANGE)
    onSceneChange(scene: number) {
        this.PlayerPuppetMap.forEach((puppet: Puppet) => {
            if (puppet.currentScene === scene) {
                puppet.wake(this.ModLoader);
            } else {
                puppet.sleep(this.ModLoader);
            }
        });
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onLeave(player: INetworkPlayer) {
        if (this.PlayerPuppetMap.has(player.uuid)) {
            if (this.destroyPuppetArgs <= 0) {
                this.destroyPuppetArgs = this.ModLoader.heap!.malloc(0x8);
            }
            this.ModLoader.emulator.rdramWrite32(this.destroyPuppetArgs + 0x0, this.ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
            this.ModLoader.emulator.rdramWrite32(this.destroyPuppetArgs + 0x4, this.PlayerPuppetMap.get(player.uuid)!.pointer);
            getCommandBuffer(this.core).arbitraryFunctionCall(this.destroyPuppet, this.destroyPuppetArgs, 2).then((buf: Buffer) => {
                this.PlayerPuppetMap.delete(player.uuid);
                this.ModLoader.logger.debug(`Destroyed puppet for player ${player.nickname}.`);
            });
        }
    }

    @onTick()
    onTick() {
        if (this.cCode === undefined || this.cCode.instancePointer === -1) return;
        let off = this.getOffset("ModuleInject", "playerData");
        let addr = this.cCode.instancePointer + off;
        let size = this.getSize("ModuleInject", "playerData");
        let update = this.ModLoader.emulator.rdramReadBuffer(addr, size);
        this.ModLoader.clientSide.sendPacket(new Z64O_PuppetPacket(this.ModLoader.clientLobby, update));
    }

    @NetworkHandler('Z64O_PuppetPacket')
    onPacket(packet: Z64O_PuppetPacket) {
        if (this.PlayerPuppetMap.has(packet.player.uuid)) {
            let puppet = this.PlayerPuppetMap.get(packet.player.uuid)!;
            let puppetPointer = puppet.pointer;
            let syncPointer = this.ModLoader.emulator.rdramRead32(puppetPointer);
            this.ModLoader.emulator.rdramWriteBuffer(syncPointer, packet.update);
        }
    }

    getOffset(struct: string, member: string) {
        return PuppetOffsets.offsets.get(struct)!.members.get(member)!.offset;
    }

    getSize(struct: string, member: string) {
        return PuppetOffsets.offsets.get(struct)!.members.get(member)!.size;
    }

    //#ifdef IS_DEV_BUILD
    makeTestPuppet(ModLoader: IModLoaderAPI) {
        ModLoader.logger.debug("Testing makePuppet...");
        if (this.makePuppetArgs <= 0) {
            this.makePuppetArgs = ModLoader.heap!.malloc(0x8);
        }
        ModLoader.emulator.rdramWrite32(this.makePuppetArgs + 0x0, ModLoader.emulator.rdramRead32(Z64_GLOBAL_PTR));
        ModLoader.emulator.rdramWrite32(this.makePuppetArgs + 0x4, ModelAllocationManager.singleton.getLocalPlayerData().pointer);
        getCommandBuffer(this.core).arbitraryFunctionCall(this.makePuppet, this.makePuppetArgs, 2).then((buf: Buffer) => {
            let context = ModLoader.emulator.rdramReadBuffer(this.cCode.instancePointer + this.getOffset("ModuleInject", "lastSpawned"), 0x4).readUInt32BE();
            this.testPuppetContext = context;
        });
    }

    @onViUpdate()
    onVi() {
        if (this.testPuppetContext <= 0) {
            if (this.ModLoader.ImGui.begin("Puppet Debugger")) {
                if (this.ModLoader.ImGui.smallButton("SPAWN")) {
                    this.makeTestPuppet(this.ModLoader);
                }
                this.ModLoader.ImGui.end();
            }
            return;
        }
        if (this.ModLoader.ImGui.begin("Puppet Debugger")) {
            this.ModLoader.ImGui.inputText("Puppet struct", [this.testPuppetContext.toString(16)]);
            this.ModLoader.ImGui.inputText("Epona struct", [(this.testPuppetContext + this.getOffset("LinkPuppet", "epona")).toString(16)]);
            if (this.ModLoader.isModLoaded("MemoryUtils3")) {
                if (this.ModLoader.ImGui.smallButton("Open in MemoryUtils3")) {
                    openMemoryUtils3Tab(this.testPuppetContext);
                }
            }
            if (this.ModLoader.ImGui.smallButton("Move puppet to me")) {
                let pos = this.core.OOT!.link.position.getRawPos();
                let rot = this.core.OOT!.link.rotation.getRawRot();
                let sync = this.ModLoader.emulator.rdramRead32(this.testPuppetContext);

                this.ModLoader.emulator.rdramWriteBuffer(sync + this.getOffset("PuppetSync", "world"), pos);
                this.ModLoader.emulator.rdramWriteBuffer(sync + this.getOffset("PuppetSync", "world") + pos.byteLength, rot);
            }
            this.ModLoader.ImGui.end();
        }
    }
    //#endif
}