import { MMOnlineStorageClient } from "@Z64Online/mm/storage/MMOnlineStorageClient";

export interface IMMOClientside {
    getClientStorage(): MMOnlineStorageClient | null;
}