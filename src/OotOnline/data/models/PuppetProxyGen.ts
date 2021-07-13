export const PuppetProxyGen_Adult: any = {
    // Master Sword
    "0x590": "0x5138",
    "0x598": "0x5140",
    "0x5A0": "0x5130",
    // Biggoron Sword
    "0x5C0": "0x5148",
    "0x5C8": "0x5150",
    "0x5D0": Buffer.from('DF00000000000000', 'hex'),
    // Hylian Shield
    "0x5F0": "0x5160",
    // Mirror Shield
    "0x5F8": "0x5168",
    // Bow
    "0x600": "0x5180",
    // Hookshot
    "0x610": "0x5190",
    // Master Sword (sheathed)
    "0x620": [0x5238, 0x20, 0xC, 0x1C, 0x5138, 0x5130],
    // BGS (sheathed)
    "0x660": [0x5238, 0x20, 0xC, 0x1C, 0x5138, 0x5130],
    // Hylian Shield (back)
    "0x690": [0x5258, 0x10, 0xC, -1, 0x5160],
    // Mirror Shield (back)
    "0x6B0": [0x5268, 0x10, 0xC, -1, 0x5168],
    // Ocarina of Time
    "0x6D0": "0x5188",
    // Hookshot Hook
    "0x6D8": "0x5218",
    // Megaton Hammer
    "0x6E0": "0x5170"
};

export const PuppetProxyGen_Child: any = {
    // Kokiri Sword
    "0x5A8": "0x5180",
    "0x5B0": "0x5188",
    "0x5B8": "0x5178",
    // Deku Stick
    "0x5D8": "0x51A8",
    // Right Fist,
    "0x5E0": "0x5170",
    // Deku Shield
    "0x5E8": "0x50D0",
    // Slingshot
    "0x608": "0x5190",
    // Boomerang
    "0x618": "0x51B0",
    // Kokiri Sword (shealthed)
    "0x640": [0x5228, 0x20, 0xC, 0x1C, 0x5180, 0x5178],
    // Deku Shield (back)
    "0x680": [0x5268, 0x10, 0xC, -1, 0x50D0],
    // Hylian Shield (back)
    "0x6A0": "0x51B8",
    // Fairy Ocarina
    "0x6C0": "0x5198",
    // Ocarina of Time
    "0X6C8": "0x51A0"
};

export const EqManifestToOffsetMap_Puppet: any = {
    "sword0_hilt": "0x5A8",
    "sword0_blade": "0x5B0",
    "sword0_sheath": "0x5B8",
    "sword0_back": "0x640",
    "sword1_hilt": "0x590",
    "sword1_blade": "0x598",
    "sword1_sheath": "0x5A0",
    "sword1_back": "0x620",
    "sword2_hilt": "0x5C0",
    "sword2_blade": "0x5C8",
    "sword2_sheath": "0x5A0",
    "sword2_back": "0x660",
    "shield0_held": "0x5E8",
    "shield0_back": "0x680",
    "shield1_held": "0x5F0",
    "shield1_back": "0x690",
    "shield2_held": "0x5F8",
    "shield2_back": "0x6B0",
    "bow": "0x600",
    "hookshot": "0x610",
    "hookshot_hook": "0x6D8",
    "deku_stick": "0x5D8",
    "right_fist": "0x5E0",
    "slingshot": "0x608",
    "boomerang": "0x618",
    "ocarina_0": "0x6C0",
    "ocarina_1_c": "0x6C8",
    "ocarina_1_a": "0x6D0",
    "hammer": "0x6E0",
    // Matrix stuff
    "swordback_mtx": "0x6F0",
    "shieldback_mtx": "0x730"
};

export const EqManifestToOffsetMap_Link: any = {
    "sword0_hilt": "0x5180",
    "sword0_blade": "0x5188",
    "sword0_sheath": "0x5178",
    // "sword0_back": ,
    "sword1_hilt": "0x5138",
    "sword1_blade": "0x5140",
    "sword1_sheath": "0x5130",
    // "sword1_back": ,
    "sword2_hilt": "0x5148",
    "sword2_blade": "0x5150",
    "sword2_sheath": "0x5130",
    // "sword2_back": ,
    "shield0_held": "0x50D0",
    // "shield0_back": ,
    "shield1_held": "0x5160",
    // "shield1_back": ,
    "shield2_held": "0x5168",
    // "shield2_back": ,
    "bow": "0x5180",
    "hookshot": "0x5190",
    "hookshot_hook": "0x5218",
    "deku_stick": "0x51A8",
    "right_fist": "0x5170",
    "slingshot": "0x5190",
    "boomerang": "0x51B0",
    "ocarina_0": "0x5198",
    "ocarina_1_c": "0x51A0",
    "ocarina_1_a": "0x5188",
    "hammer": "0x5170",
    // Matrix stuff
    "swordback_mtx": "0x5010",
    "shieldback_mtx": "0x5050"
};

export const PuppetProxyGen_Matrix: any = {
    "0x6F0": "0x5010", // Hilt matrix
    "0x730": "0x5050" // Shield matrix
};

export const PuppetProxyGen_Matrix_Keys: Array<string> = [
    "swordback_mtx",
    "shieldback_mtx"
];