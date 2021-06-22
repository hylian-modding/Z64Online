import { OotOnlineStorageClient } from "@OotOnline/OotOnlineStorageClient";


export interface IZ64Clientside {
    getClientStorage(): OotOnlineStorageClient | null;
}
