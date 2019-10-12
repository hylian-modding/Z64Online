import { OotOnlineStorageBase } from "./OotOnlineStorageBase";
import { InventoryItem } from "modloader64_api/OOT/OOTAPI";

export class OotOnlineStorageClient extends OotOnlineStorageBase{
    autoSaveHash: string = "!";
    needs_update = false;
    first_time_sync = true;
    sent_download_request = false;
    lastKnownSkullCount = -1;
    bottleCache: Array<InventoryItem> = [InventoryItem.NONE, InventoryItem.NONE, InventoryItem.NONE, InventoryItem.NONE];
}