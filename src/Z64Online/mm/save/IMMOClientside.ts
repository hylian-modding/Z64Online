import { MMOnlineStorageClient } from "@Z64Online/MM/storage/MMOnlineStorageClient";

export interface IMMOClientside {
    getClientStorage(): MMOnlineStorageClient | null;
}