import { EventHandler } from "modloader64_api/EventHandler";
import { RPCEvents, RPC_Receieve_Event } from 'modloader64_api/RPC';

export class RPCClient{

    @EventHandler(RPCEvents.ON_RECEIVE)
    onRPC(evt: RPC_Receieve_Event){
        if (evt.req.url === "/OotO"){
            evt.response["OotO"] = "This is OotO";
        }
    }

}