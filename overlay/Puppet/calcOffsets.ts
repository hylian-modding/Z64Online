import fs from 'fs';

console.log("Generating c...");

const TARGET_HEADER: string = "./include/ModuleInject.h";
const TARGET_TOP: string = "typedef struct";
const INCLUDE_ME: string = "ModuleInject.h";
const IGNORE: string = "{";

const output: string[] = [];

output.push(`#define GENERATE_OFFSET_MAP
#ifdef GENERATE_OFFSET_MAP
#include "${INCLUDE_ME}"

#define OFFSETOF(TYPE, ELEMENT) ((u32)&(((TYPE*)0)->ELEMENT))
`);

const ALEADY_TRIED: string[] = [];

const FINISHED_STRUCTS: string[] = [];

function generateStructOffsets(target: string) {

    if (ALEADY_TRIED.indexOf(target) > -1) return;

    console.log(`Trying ${target}`);

    ALEADY_TRIED.push(target);

    const TARGET_STRUCT: string = `} ${target};`;

    let file = fs.readFileSync(TARGET_HEADER).toString();
    let split = file.split("\n");

    const ALREADY_LOADED_H: string[] = [];
    let load_h = (header: string) => {
        if (ALREADY_LOADED_H.indexOf(header) > -1) return;
        console.log(`Loading ${header}...`);
        ALREADY_LOADED_H.push(header);
        let file = fs.readFileSync(header).toString();
        let h = file.split("\n");
        let includes: string[] = [];
        /* Look for includes */
        for (let i = 0; i < h.length; i++) {
            if (h[i].indexOf("#include") > -1) {
                if (h[i].indexOf("<") === -1) {
                    includes.push(h[i]);
                }
            }
        }
        for (let i = 0; i < includes.length; i++) {
            let temp = fs.readFileSync(`./include/${includes[i].split(" ")[1].replace(/['"]+/g, "").trim()}`).toString().split("\n");
            for (let j = 0; j < temp.length; j++) {
                split.push(temp[j]);
            }
            load_h(`./include/${includes[i].split(" ")[1].replace(/['"]+/g, "").trim()}`);
        }
    };

    load_h(TARGET_HEADER);

    let structBottomIndex: number = -1;
    let structTopIndex: number = -1;

    /* Find the bottom of the struct */
    for (let i = 0; i < split.length; i++) {
        if (structBottomIndex > -1) break;

        structBottomIndex = split[i].indexOf(TARGET_STRUCT);
        if (structBottomIndex > -1) {
            structBottomIndex = i
        }
    }

    if (structBottomIndex === -1) return;

    /* Go in reverse and find the top */
    for (let i = 0; i < split.length; i++) {
        if (structTopIndex > -1) break;

        let index = structBottomIndex - i;
        let str = split[index];
        structTopIndex = str.indexOf(TARGET_TOP);
        if (structTopIndex > -1) structTopIndex = index;
    }

    if (structTopIndex === -1) return;

    const STRUCT_NAME_CLEAN: string = `${TARGET_STRUCT.replace("}", "").replace(";", "").trim()}`;

    const TAG: Buffer = Buffer.alloc(0x10, 0xFF);
    const TAG_CONTENT: Buffer = Buffer.from(STRUCT_NAME_CLEAN);
    TAG_CONTENT.copy(TAG);

    output.push(`typedef struct
{
    u8 main_tag[${TAG.byteLength}];
    u32 totalTags;`);

    const members: { name: string, ctype: string, multi: string, IS_POINTER: boolean }[] = [];

    /* Crawl the struct */
    for (let i = structTopIndex; i < structBottomIndex; i++) {
        if (split[i].indexOf(TARGET_TOP) > -1) continue; /* Ignore the top of the struct */
        if (split[i].indexOf(IGNORE) > -1) continue; /* Ignore the opening curly brace */

        let str = split[i].trim();
        str = str.replace(/\/\*(.*)\*\//gs, "").trim();
        const IS_POINTER = str.indexOf("*") > -1;
        str = str.replace("*", "");
        str = str.replace(";", "");
        let multi: string = "0";
        if (str.indexOf("[") > -1) {
            let f = str.indexOf("[");
            let s = str.indexOf("]");
            let n = str.substring(f + 1, s);
            multi = n;
            str = str.substring(0, str.indexOf("["));
        }
        const ctype = str.split(" ")[0].trim();
        const name = str.split(" ")[1].trim();
        members.push({ name, ctype, multi, IS_POINTER });
    }

    for (let i = 0; i < members.length; i++) {
        let b = Buffer.alloc(0x10, 0xFF);
        Buffer.from(members[i].name).copy(b);
        output.push(`   u8 ${members[i].name}_tag[${b.byteLength}];`);
        output.push(`   u32 ${members[i].name}_offset;`);
        output.push(`   u32 ${members[i].name}_size;`);
    }

    output.push(`} ${STRUCT_NAME_CLEAN}_OffsetMap_t;`);

    let t_s: string = "";
    for (let j = 0; j < TAG.byteLength; j++) {
        t_s += `0x${TAG[j].toString(16).padStart(2, '0')},`;
    }

    output.push(`

const ${STRUCT_NAME_CLEAN}_OffsetMap_t ${STRUCT_NAME_CLEAN}_offsetMap = {
    .main_tag = {${t_s}},
    .totalTags = ${members.length},`);

    for (let i = 0; i < members.length; i++) {
        let b = Buffer.alloc(0x10, 0xFF);
        Buffer.from(members[i].name).copy(b);
        let b_s: string = "";
        for (let j = 0; j < b.byteLength; j++) {
            b_s += `0x${b[j].toString(16).padStart(2, '0')},`;
        }
        output.push(`   .${members[i].name}_tag = {${b_s}},`);
        output.push(`   .${members[i].name}_offset = OFFSETOF(${TARGET_STRUCT.replace("}", "").replace(";", "").trim()}, ${members[i].name}),`);
        if (members[i].multi === "0") {
            if (members[i].IS_POINTER) {
                output.push(`   .${members[i].name}_size = sizeof(u32),`);
            } else {
                output.push(`   .${members[i].name}_size = sizeof(${members[i].ctype}),`);
            }
        } else {
            if (members[i].IS_POINTER) {
                output.push(`   .${members[i].name}_size = sizeof(${members[i].ctype}*[${members[i].multi}]),`);
            } else {
                output.push(`   .${members[i].name}_size = sizeof(${members[i].ctype}[${members[i].multi}]),`);
            }
        }
    }

    output.push(`};
    `);

    FINISHED_STRUCTS.push(`${STRUCT_NAME_CLEAN}_offsetMap`);

    for (let i = 0; i < members.length; i++) {
        generateStructOffsets(members[i].ctype);
    }

}

function generateIndex() {
    output.push(`typedef struct{
    u8 tag[0x10];
    u32 total;`);

    FINISHED_STRUCTS.forEach((struct: string) => {
        output.push(`   u32 ${struct};`);
    });
    output.push(`} OffsetMapIndex_t;
    `);

    output.push(`const OffsetMapIndex_t mapIndex = {`);

    let b = Buffer.alloc(0x10, 0xFF);
    Buffer.from("DEBUGINDEX").copy(b);
    let b_s: string = "";
    for (let j = 0; j < b.byteLength; j++) {
        b_s += `0x${b[j].toString(16).padStart(2, '0')},`;
    }

    output.push(`   .tag = {${b_s}},`);
    output.push(`   .total = ${FINISHED_STRUCTS.length},`);

    FINISHED_STRUCTS.forEach((struct: string) => {
        output.push(`   .${struct} = &${struct},`);
    });

    output.push(`};`);

}

generateStructOffsets("ModuleInject");
generateIndex();

output.push("#endif");

fs.writeFileSync(`./src/OffsetMaps.c`, output.join("\n"));