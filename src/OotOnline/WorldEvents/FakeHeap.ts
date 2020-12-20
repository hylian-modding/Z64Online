import IMemory from "modloader64_api/IMemory";

export class FakeHeap{

    private size: number;
    private start: number;
    private current: number;
    private mem: IMemory;
    private used: number = 0;

    constructor(mem: IMemory, start: number, size: number){
        this.mem = mem;
        this.start = start;
        this.size = size;
        this.current = start;
    }
    
    malloc(size: number): number{
        if ((this.used + size) > this.size){
            return 0;
        }
        this.used+=size;
        let c = this.current;
        this.current+=size;
        return c;
    }

    clear(){
        this.current = this.start;
        this.used = 0;
        this.mem.rdramWriteBuffer(this.current, Buffer.alloc(this.size));
    }

}