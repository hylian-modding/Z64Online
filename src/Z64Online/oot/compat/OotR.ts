import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { zeldaString } from 'Z64Lib/API/Common/ZeldaString';
import { IOOTCore } from "Z64Lib/API/OoT/OOTAPI";
import { IOOTSaveContext } from "@Z64Online/common/types/OotAliases";
import { Z64OnlineEvents, Z64_PlayerScene } from "@Z64Online/common/api/Z64API";
import { EventHandler } from "modloader64_api/EventHandler";
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { InjectCore } from "modloader64_api/CoreInjection";
import RomFlags from "@Z64Online/oot/compat/RomFlags";
import { IZ64Main } from "Z64Lib/API/Common/IZ64Main";
import { IZ64Clientside } from "@Z64Online/common/storage/Z64Storage";

export class MultiWorld_ItemPacket extends Packet {

    item: MultiworldItem;

    constructor(lobby: string, item: MultiworldItem) {
        super('MultiWorld_ItemPacket', 'Multiworld', lobby, true);
        this.item = item;
    }
}

export class Multiworld {
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI
    @ParentReference()
    parent!: IZ64Clientside;
    @InjectCore()
    core!: IZ64Main;
    contextPointer: number = 0x801C8464;
    itemsInQueue: Array<MultiWorld_ItemPacket> = [];

    @NetworkHandler('MultiWorld_ItemPacket')
    onIncomingItem(packet: MultiWorld_ItemPacket) {
        if (this.parent.getClientStorage()!.world === packet.item.dest) {
            this.setPlayerName(packet.player.nickname, packet.player.data.world);
            this.itemsInQueue.push(packet);
        }
    }

    @EventHandler(Z64OnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES)
    onPlayerChangedScenes(change: Z64_PlayerScene) {
        if (!RomFlags.isMultiworld) return;
        this.setPlayerName(change.player.nickname, change.player.data.world);
    }

    isRomMultiworld() {
        return this.ModLoader.emulator.rdramRead32(this.contextPointer) > 0;
    }

    setPlayerName(playerName: string, playerNumber: number) {
        let player_names_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 20;
        playerName = playerName.substr(0, 8).padEnd(8, " ");
        var offset = player_names_addr + (8 * playerNumber);
        this.ModLoader.emulator.rdramWriteBuffer(offset, zeldaString.encode(playerName));
    }

    doesPlayerNameExist(playerNumber: number) {
        let player_names_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 20;
        var offset = player_names_addr + (8 * playerNumber);
        return this.ModLoader.emulator.rdramRead8(offset) !== 0xDF;
    }

    getOutgoingItem(): MultiworldItem | undefined {
        let outgoing_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 16;
        let outgoing_player_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 18;
        let id = this.ModLoader.emulator.rdramRead16(outgoing_addr);
        if (id > 0) {
            let player = this.ModLoader.emulator.rdramRead16(outgoing_player_addr);
            this.ModLoader.emulator.rdramWrite16(outgoing_addr, 0);
            this.ModLoader.emulator.rdramWrite16(outgoing_player_addr, 0);
            return new MultiworldItem(id, player);
        }
        return undefined;
    }

    processIncomingItem(item: MultiworldItem, save: IOOTSaveContext) {
        let incoming_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 8;
        let incoming_player_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 6;
        if (item.item > 0) {
            this.ModLoader.emulator.rdramWrite16(incoming_addr, item.item);
            this.ModLoader.emulator.rdramWrite16(incoming_player_addr, item.dest);
        }
    }
}

export class MultiworldItem {
    item: number;
    dest: number;

    constructor(item: number, dest: number) {
        this.item = item;
        this.dest = dest;
    }
}

export class TriforceHuntHelper {

    static getTriforcePieces(ModLoader: IModLoaderAPI) {
        if (RomFlags.isOotR) {
            return ModLoader.emulator.rdramRead16(0x8011AE96);
        } else {
            return 0;
        }
    }

    static setTriforcePieces(ModLoader: IModLoaderAPI, pieces: number) {
        if (RomFlags.isOotR) {
            ModLoader.emulator.rdramWrite16(0x8011AE96, pieces);
        }
    }

    static incrementTriforcePieces(ModLoader: IModLoaderAPI) {
        if (RomFlags.isOotR) {
            ModLoader.emulator.rdramWrite16(0x8011AE96, ModLoader.emulator.rdramRead16(0x8011AE96) + 1);
        }
    }

}