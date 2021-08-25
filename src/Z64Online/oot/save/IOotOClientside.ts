import { OotOnlineStorageClient } from "@Z64Online/oot/storage/OotOnlineStorageClient";

export interface IOotOClientside {
    getClientStorage(): OotOnlineStorageClient | null;
}