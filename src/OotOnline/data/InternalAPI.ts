export const enum OOTO_PRIVATE_EVENTS{
    ASSET_LOOKUP = "ASSET_LOOKUP",
    CLIENT_EVENT_DATA_GET = "CLIENT_EVENT_DATA_GET",
    SERVER_EVENT_DATA_GET = "SERVER_EVENT_DATA_GET",
    CLIENT_WALLET_GET = "CLIENT_WALLET_GET",
    CLIENT_WALLET_SET = "CLIENT_WALLET_SET",
    CLIENT_UNLOCK_TICKET = "CLIENT_UNLOCK_TICKET"
}

export interface RewardTicket {
    name: string;
    uuid: string;
    event: string;
    category: string;
    game: string;
}

export class OOTO_PRIVATE_ASSET_LOOKUP_OBJ{

    uuid: string;
    asset!: Buffer;
    ticket!: RewardTicket;

    constructor(uuid: string){
        this.uuid = uuid;
    }

}

export class OOTO_PRIVATE_COIN_LOOKUP_OBJ{
    coins: number;

    constructor(coins: number){
        this.coins = coins;
    }
}