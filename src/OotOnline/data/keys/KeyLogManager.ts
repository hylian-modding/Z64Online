import { KeyLogEntry, SavedLogEntry } from "./KeyLogEntry";
import { VANILLA_KEY_INDEXES, IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { ServerNetworkHandler, NetworkHandler, INetworkPlayer } from "modloader64_api/NetworkHandler";
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { IModLoaderAPI, IPlugin } from "modloader64_api/IModLoaderAPI";
import { OotOnlineStorage } from "../../OotOnlineStorage";
import { OotOnlineStorageClient } from "../../OotOnlineStorageClient";

export class KeyLogManager {
    indexes: any = {};
    bases: Map<number, KeyLogEntry> = new Map<number, KeyLogEntry>();
    ModLoader: IModLoaderAPI;
    parent: IPlugin;
    core: IOOTCore;

    constructor(ModLoader: IModLoaderAPI, parent: IPlugin, core: IOOTCore) {
        this.indexes["FOREST_TEMPLE"] = VANILLA_KEY_INDEXES.FOREST_TEMPLE;
        this.indexes["FIRE_TEMPLE"] = VANILLA_KEY_INDEXES.FIRE_TEMPLE;
        this.indexes["WATER_TEMPLE"] = VANILLA_KEY_INDEXES.WATER_TEMPLE;
        this.indexes["SHADOW_TEMPLE"] = VANILLA_KEY_INDEXES.SHADOW_TEMPLE;
        this.indexes["BOTTOM_OF_THE_WELL"] = VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL;
        this.indexes["GERUDO_TRAINING_GROUND"] = VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND;
        this.indexes["GERUDO_FORTRESS"] = VANILLA_KEY_INDEXES.GERUDO_FORTRESS;
        this.indexes["GANONS_CASTLE"] = VANILLA_KEY_INDEXES.GANONS_CASTLE;

        Object.keys(this.indexes).forEach((key: string) => {
            let index: number = this.indexes[key];
            this.bases.set(index, new KeyLogEntry(index, 0xFF));
        });

        this.ModLoader = ModLoader;
        this.parent = parent;
        this.core = core;
    }


    update(){
        Object.keys(this.indexes).forEach((key: string) => {
            let index: number = this.indexes[key];
            let entry: KeyLogEntry = this.bases.get(index)!;
            let count = this.core.save.keyManager.getKeyCountForIndex(index);
            if (count !== entry.keyCount){
                entry.keyCount = count;
                this.ModLoader.clientSide.sendPacket(new Ooto_KeyDeltaClientPacket(this.ModLoader.clientLobby, entry, this.core));
            }
        });
    }

    @ServerNetworkHandler("Ooto_KeyDeltaClientPacket")
    onPacketServer(packet: Ooto_KeyDeltaClientPacket) {
        let storage: OotOnlineStorage = this.ModLoader.lobbyManager.getLobbyStorage(
            packet.lobby,
            this.parent
          ) as OotOnlineStorage;
        if (packet.delta > 0) {
            if (storage.changelog.length > 0) {
                if (packet.timestamp > storage.changelog[storage.changelog.length - 1].timestamp) {
                    let s = new SavedLogEntry(packet.index, packet.delta, packet.timestamp);
                    storage.changelog.push(s);
                    this.ModLoader.serverSide.sendPacket(new Ooto_KeyDeltaServerPacket(s, packet.lobby, packet.player));
                }
            } else {
                let s = new SavedLogEntry(packet.index, packet.delta, packet.timestamp);
                storage.changelog.push(s);
                this.ModLoader.serverSide.sendPacket(new Ooto_KeyDeltaServerPacket(s, packet.lobby, packet.player));
            }
        }
    }

    @NetworkHandler("Ooto_KeyDeltaServerPacket")
    onPacketClient(packet: Ooto_KeyDeltaServerPacket) { 
        let storage: OotOnlineStorageClient = (this.parent as any)["clientStorage"];
        storage.changelog.push(packet.entry);
        if (this.core.save.keyManager.getKeyCountForIndex(packet.entry.index) === 0xFF){
            this.core.save.keyManager.setKeyCountByIndex(packet.entry.index, 0);
        }
        let count: number = this.core.save.keyManager.getKeyCountForIndex(packet.entry.index);
        count+=packet.entry.delta;
        this.core.save.keyManager.setKeyCountByIndex(packet.entry.index, count);
        let entry: KeyLogEntry = this.bases.get(packet.entry.index)!;
        entry.keyCount = count;
    }

    @NetworkHandler("Ooto_KeyRebuildPacket")
    onPacketRebuild(packet: Ooto_KeyRebuildPacket){
        for (let i = 0; i < packet.changelog.length; i++){
            let count: number = this.core.save.keyManager.getKeyCountForIndex(packet.changelog[i].index);
            count+=packet.changelog[i].delta;
            this.core.save.keyManager.setKeyCountByIndex(packet.changelog[i].index, count);
        }
    }
}

export class Ooto_KeyDeltaClientPacket extends Packet {

    index: number;
    delta: number;
    timestamp: number;

    constructor(lobby: string, entry: KeyLogEntry, core: IOOTCore) {
        super('Ooto_KeyDeltaClientPacket', 'OotOnline', lobby, false);
        this.index = entry.index;
        this.delta = entry.getDelta(core.save.keyManager.getKeyCountForIndex(entry.index));
        this.timestamp = entry.timestamp;
    }
}

export class Ooto_KeyDeltaServerPacket extends Packet{
    entry: SavedLogEntry;
    originalUser: INetworkPlayer;

    constructor(entry: SavedLogEntry, lobby: string, originalUser: INetworkPlayer){
        super('Ooto_KeyDeltaServerPacket', 'OotOnline', lobby, false);
        this.entry = entry;
        this.originalUser = originalUser;
    }
}

export class Ooto_KeyRebuildPacket extends Packet{
    changelog: Array<SavedLogEntry> = new Array<SavedLogEntry>();

    constructor(changelog: Array<SavedLogEntry>, lobby: string){
        super('Ooto_KeyRebuildPacket', 'OotOnline', lobby, false);
        this.changelog = changelog;
    }
}