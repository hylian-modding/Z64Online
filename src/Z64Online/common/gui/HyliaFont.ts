import fs from 'fs';
import { Font } from 'modloader64_api/Sylvain/Gfx';
import path from 'path';

export function getHylianFont(){
    return fs.readFileSync(path.resolve(__dirname, "HyliaSerifBeta-Regular.otf"));
}

export let HYLIAN_FONT_REF: Font;

export function setHylianFontRef(ref: Font){
    HYLIAN_FONT_REF = ref;
}