import { IZ64Clientside } from "@OotOnline/common/lib/IZ64Clientside";
import { IZ64OnlineHelpers } from "@OotOnline/common/lib/IZ64OnlineHelpers";

export const enum OOTO_PRIVATE_EVENTS {
    ASSET_LOOKUP = "ASSET_LOOKUP",
    CLIENT_EVENT_DATA_GET = "CLIENT_EVENT_DATA_GET",
    SERVER_EVENT_DATA_GET = "SERVER_EVENT_DATA_GET",
    CLIENT_WALLET_GET = "CLIENT_WALLET_GET",
    CLIENT_WALLET_SET = "CLIENT_WALLET_SET",
    CLIENT_UNLOCK_TICKET = "CLIENT_UNLOCK_TICKET",
    CLIENT_UNLOCK_DOES_HAVE = "CLIENT_UNLOCK_DOES_HAVE",
    MOVED_SCENE_TABLE = "MOVED_SCENE_TABLE",
    UPDATE_KEY_HASH = "UPDATE_KEY_HASH",
    SERVER_ASSET_DATA_GET = "SERVER_ASSET_DATA_GET",
    CLIENT_ASSET_DATA_GET = "CLIENT_ASSET_DATA_GET",
    REGISTER_ANIM_BANKS_WITH_COSTUME_MANAGER = "REGISTER_ANIM_BANKS_WITH_COSTUME_MANAGER",
    DOING_SYNC_CHECK = "DOING_SYNC_CHECK",
    LOCK_ITEM_NOTIFICATIONS = "LOCK_ITEM_NOTIFICATIONS",
    SAVE_EXTERNAL_EVENT_DATA = "SAVE_EXTERNAL_EVENT_DATA",
    GET_EXTERNAL_EVENT_DATA = "GET_EXTERNAL_EVENT_DATA",
    TOGGLE_COSTUME_LOCK = "TOGGLE_COSTUME_LOCK"
}

export interface RewardTicket {
    name: string;
    uuid: string;
    event: string;
    category: string;
    game: string;
    scripted: boolean | undefined;
    displayname: string;
    price: number;
}

export class OOTO_PRIVATE_ASSET_LOOKUP_OBJ {

    uuid: string;
    asset!: Buffer;
    ticket!: RewardTicket;

    constructor(uuid: string) {
        this.uuid = uuid;
    }

}

export class OOTO_PRIVATE_ASSET_HAS_CHECK {

    ticket: RewardTicket;
    has: boolean = false;

    constructor(ticket: RewardTicket) {
        this.ticket = ticket;
    }

}

export class OOTO_PRIVATE_COIN_LOOKUP_OBJ {
    coins: number;

    constructor(coins: number) {
        this.coins = coins;
    }
}

export class ExternalEventData{
    tag: string;
    data: any;

    constructor(tag: string, data: any){
        this.tag = tag;
        this.data = data;
    }
}

export interface IOotUtility extends IZ64OnlineHelpers, IZ64Clientside{}