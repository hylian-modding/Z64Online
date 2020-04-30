import { KeyLogEntry, SavedLogEntry } from "./KeyLogEntry";
import { VANILLA_KEY_INDEXES, IOOTCore } from "modloader64_api/OOT/OOTAPI";
import { ServerNetworkHandler, NetworkHandler, INetworkPlayer } from "modloader64_api/NetworkHandler";
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { IModLoaderAPI, IPlugin } from "modloader64_api/IModLoaderAPI";
import { OotOnlineStorage } from "../../OotOnlineStorage";
import { OotOnlineStorageClient } from "../../OotOnlineStorageClient";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { InjectCore } from "modloader64_api/CoreInjection";

export class KeyLogManager {
    indexes: any = {};
    bases: Map<number, KeyLogEntry> = new Map<number, KeyLogEntry>();
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    parent: IPlugin;
    @InjectCore()
    core!: IOOTCore;

    constructor(parent: IPlugin) {
        this.indexes["FOREST_TEMPLE"] = VANILLA_KEY_INDEXES.FOREST_TEMPLE;
        this.indexes["FIRE_TEMPLE"] = VANILLA_KEY_INDEXES.FIRE_TEMPLE;
        this.indexes["WATER_TEMPLE"] = VANILLA_KEY_INDEXES.WATER_TEMPLE;
        this.indexes["SHADOW_TEMPLE"] = VANILLA_KEY_INDEXES.SHADOW_TEMPLE;
        this.indexes["SPIRIT_TEMPLE"] = VANILLA_KEY_INDEXES.SPIRIT_TEMPLE;
        this.indexes["BOTTOM_OF_THE_WELL"] = VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL;
        this.indexes["GERUDO_TRAINING_GROUND"] = VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND;
        this.indexes["GERUDO_FORTRESS"] = VANILLA_KEY_INDEXES.GERUDO_FORTRESS;
        this.indexes["GANONS_CASTLE"] = VANILLA_KEY_INDEXES.GANONS_CASTLE;

        Object.keys(this.indexes).forEach((key: string) => {
            let index: number = this.indexes[key];
            this.bases.set(index, new KeyLogEntry(index, 0));
        });

        this.parent = parent;
    }

    update() {
        Object.keys(this.indexes).forEach((key: string) => {
            let index: number = this.indexes[key];
            let entry: KeyLogEntry = this.bases.get(index)!;
            let count = this.core.save.keyManager.getKeyCountForIndex(index);
            if (count === 0xFF) {
                count = 0;
            }
            if (count !== entry.keyCount) {
                console.log("sending packet");
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
        if (packet.delta !== 0) {
            let s = new SavedLogEntry(packet.index, packet.delta, packet.timestamp);
            storage.changelog.push(s);
            this.ModLoader.serverSide.sendPacket(new Ooto_KeyDeltaServerPacket(s, packet.lobby, packet.player));
        }
    }

    @NetworkHandler("Ooto_KeyDeltaServerPacket")
    onPacketClient(packet: Ooto_KeyDeltaServerPacket) {
        if (packet.originalUser.uuid === this.ModLoader.me.uuid) {
            return;
        }
        let storage: OotOnlineStorageClient = (this.parent as any)["clientStorage"];
        storage.changelog.push(packet.entry);
        if (this.core.save.keyManager.getKeyCountForIndex(packet.entry.index) === 0xFF) {
            this.core.save.keyManager.setKeyCountByIndex(packet.entry.index, 0);
        }
        let count: number = this.core.save.keyManager.getKeyCountForIndex(packet.entry.index);
        count += packet.entry.delta;
        this.core.save.keyManager.setKeyCountByIndex(packet.entry.index, count);
        let entry: KeyLogEntry = this.bases.get(packet.entry.index)!;
        entry.keyCount = count;
    }

    @NetworkHandler("Ooto_KeyRebuildPacket")
    onPacketRebuild(packet: Ooto_KeyRebuildPacket) {
        Object.keys(this.indexes).forEach((key: string) => {
            let index: number = this.indexes[key];
            let entry: KeyLogEntry = this.bases.get(index)!;
            entry.keyCount = 0;
            this.core.save.keyManager.setKeyCountByIndex(index, entry.keyCount);
        });
        for (let i = 0; i < packet.changelog.length; i++) {
            let count: number = this.core.save.keyManager.getKeyCountForIndex(packet.changelog[i].index);
            if (count === 0xFF) {
                count = 0;
            }
            count += packet.changelog[i].delta;
            this.core.save.keyManager.setKeyCountByIndex(packet.changelog[i].index, count);
            let entry: KeyLogEntry = this.bases.get(packet.changelog[i].index)!;
            entry.keyCount = count;
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

export class Ooto_KeyDeltaServerPacket extends Packet {
    entry: SavedLogEntry;
    originalUser: INetworkPlayer;

    constructor(entry: SavedLogEntry, lobby: string, originalUser: INetworkPlayer) {
        super('Ooto_KeyDeltaServerPacket', 'OotOnline', lobby, false);
        this.entry = entry;
        this.originalUser = originalUser;
    }
}

export class Ooto_KeyRebuildPacket extends Packet {
    changelog: Array<SavedLogEntry> = new Array<SavedLogEntry>();

    constructor(changelog: Array<SavedLogEntry>, lobby: string) {
        super('Ooto_KeyRebuildPacket', 'OotOnline', lobby, false);
        this.changelog = changelog;
    }
}