import { serialize, deserialize } from 'bson';
import zlib from 'zlib';

export default class Z64Serialize{

    static serializeSync(obj: any): Buffer{
        return zlib.deflateSync(serialize(obj));
    }

    static deserializeSync(buf: Buffer): any{
        return deserialize(zlib.inflateSync(buf), {promoteBuffers: true, promoteValues: true});
    }

    static deserialize(buf: Buffer): Promise<any>{
        return new Promise((accept, reject)=>{
            zlib.inflate(buf, (error: Error | null, result: Buffer)=>{
                if (error){
                    reject("Failed to deserialize data.");
                    return;
                }
                accept(deserialize(result, {promoteBuffers: true, promoteValues: true}));
            });
        });
    }
    
    static serialize(obj: any): Promise<Buffer>{
        return new Promise((accept, reject)=>{
            zlib.deflate(serialize(obj), (error: Error | null, result: Buffer)=>{
                if (error){
                    reject("Failed to serialize data");
                    return;
                }
                accept(result);
            });
        });
    }

}