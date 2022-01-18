// !ML64_PROD_IGNORE
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";

export class CDNFileRequest_Packet extends Packet {

    model_id: string;
    has: boolean = false;

    constructor(model_id: string) {
        super('CDNFileRequest_Packet', 'CDNServer', "__GLOBAL__", false);
        this.model_id = model_id;
    }
}

export class CDNFileUpload_Packet extends Packet {

    id: string;
    buf: Buffer;
    done: boolean = false;

    constructor(id: string, buf: Buffer) {
        super('CDNFileUpload_Packet', 'CDNServer', "__GLOBAL__", false);
        this.id = id;
        this.buf = buf;
    }
}

export class CDNConfirm_Packet extends Packet{
    id: string;
    con: boolean = true;

    constructor(id: string){
        super('CDNConfirm_Packet', 'CDNServer', "__GLOBAL__", false);
        this.id = id;
    }
}

export class CDNFileDownload_Packet extends Packet{

    model_id: string;
    error: boolean = false;
    url: string = "";

    constructor(model_id: string){
        super('CDNFileDownload_Packet', 'CDNServer', "__GLOBAL__", false);
        this.model_id = model_id;
    }

}

export class CDNFileFailure_Packet extends Packet{

    id: string;

    constructor(id: string){
        super('CDNFileFailure_Packet', 'CDNServer', "__GLOBAL__", false);
        this.id = id;
    }

}