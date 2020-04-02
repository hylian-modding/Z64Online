import fs from 'fs';
import path from 'path';

class PuppetDataType{
    name: string;
    size: string;
    offset: string;

    constructor(name: string, size: number, offset: number){
        this.name = name;
        this.size = "0x" + size.toString(16);
        this.offset = "0x" + offset.toString(16);
    }
}

class PuppetDataStructure{
    name!: string;
    fields: Array<PuppetDataType> = [];
}

class PuppetDataGenerator{
    file: string;
    sizeMap: any = {
        "uint32_t": 0x4,
        "uint8_t": 0x1,
        "rgba8_t": 0x4,
        "uint16_t": 0x4,
        "float": 0x4,
        "z64_actor_t": 0x013C,
        "z64_skelanime_t": 0x40,
        "z64_collider_cylinder_main_t": 0x4C
    };

    constructor(file: string){
        this.file = file;
    }

    generate(){

        let last_keyword: string = "entity_t";
        let start_struct_keyword: string = "typedef struct";
        let end_struct_keyword: string = "}";
        let ignore_characters: Array<string> = ["{"];
        let remove_characters: Array<string> = [";"];
        let array_start_keyword: string = "[";
        let array_end_keyword: string = "]";

        let lines: Array<string> = fs.readFileSync(this.file).toString().split("\r\n");
        let currentStruct: PuppetDataStructure = new PuppetDataStructure();
        let structs: Array<PuppetDataStructure> = [];
        let inStruct: boolean = false;
        let curOffset = 0;
        for (let i = 0; i < lines.length; i++){
            let line: string = lines[i].trim();
            if (line.indexOf(start_struct_keyword) > -1){
                currentStruct = new PuppetDataStructure();
                inStruct = true;
                console.log("Entering new struct");
                continue;
            }
            if (line.indexOf(end_struct_keyword) > -1){
                if (!inStruct){
                    continue;
                }
                currentStruct.name = line.replace(end_struct_keyword, "").replace(" ", "").replace(";", "");
                structs.push(currentStruct);
                let total: number = 0;
                for (let j = 0; j < currentStruct.fields.length; j++){
                    total+=parseInt(currentStruct.fields[j].size);
                }
                this.sizeMap[currentStruct.name] = total;
                inStruct = false;
                curOffset = 0;
                console.log("Ending struct: " + currentStruct.name);
                continue;
            }
            if (ignore_characters.indexOf(line) > -1){
                continue;
            }
            for (let j = 0; j < remove_characters.length; j++){
                line = line.replace(remove_characters[j], "");
            }
            if (!inStruct){
                continue;
            }
            if (line.indexOf(last_keyword) > -1){
                console.log("Hit end of struct defs");
                break;
            }
            let split: Array<string> = line.split(" ");
            let type: string = split[0];
            let name: string = split[1];
            let size: number = 0;
            console.log(name + " | " + type);
            if (this.sizeMap.hasOwnProperty(type)){
                size = this.sizeMap[type];
                if (line.indexOf(array_start_keyword) > -1){
                    console.log("This is an array");
                    let array_qty: number = parseInt(name.split(array_start_keyword)[1].split(array_end_keyword)[0]);
                    size = size * array_qty;
                    name = name.split(array_start_keyword)[0];
                }
                console.log("Size: " + size);
            }else{
                console.log("Error: unknown size for type " + type);
            }
            currentStruct.fields.push(new PuppetDataType(name, size, curOffset));
            curOffset+=size;
        }
        console.log("Generating output map...");
        console.log(JSON.stringify(structs, null, 2));
    }
}

new PuppetDataGenerator("./src/OotOnline/c/link_no_pvp.c").generate();