import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import RomFlags from "@Z64Online/common/types/RomFlags";
import { Z64RomTools } from "Z64Lib/API/Utilities/Z64RomTools";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { optimize } from "Z64Lib/API/zzoptimize";
import { BANK_LOOKUP, BANK_OBJECTS, BANK_REPLACEMENTS, ZobjPiece } from "@Z64Online/common/cosmetics/UniversalAliasTable";
import { SmartBuffer } from 'smart-buffer';
import { AgeOrForm } from "Z64Lib/API/Common/Z64API";
import { SCENE_ARR_SIZE } from "../OotOnline";
import fs from 'fs';
import Zip from 'adm-zip';
import path from 'path';

class Signature {
    name: string = "";
    size_name: number = -1;
    offset_name: number = -1;

    addr: number = -1;
}

class Settings {
    name: string = "";
    offset_name: number = -1;
    offset_addr: number = -1;
    addr: number = -1;
    size_name: number = -1;
}

export const OotR_collectible_override_flags = "collectible_override_flags"; // u32 - pointer to the flags.
export const OotR_num_override_flags = "num_override_flags";                 // u16 - size of the buffer.
export const OotR_FLAG_SIZE_ADD = 100;                                       // Rando's asm adds this to the buffer size.
export const OotR_FAST_BUNNY_HOOD_ENABLED = "FAST_BUNNY_HOOD_ENABLED";       // u8  - if bunny hood go zoom.

export class OotR_SignatureManager {

    private parsed: Signature[] = [];
    private parsed2: Settings[] = [];
    private static instance: OotR_SignatureManager = new OotR_SignatureManager();

    static SignatureLookup: Map<string, number> = new Map();

    static checkAll(ModLoader: IModLoaderAPI) {
        ModLoader.logger.debug("Trying to find OotR symbols...");
        let found: boolean = false;
        let header = ModLoader.utils.hashBuffer(ModLoader.rom.romReadBuffer(0x20, 0x20)).toUpperCase();

        if (!fs.existsSync("./sigs")) {
            fs.mkdirSync("./sigs");
        }

        let process = (f: string) => {
            let sigs = new Zip(fs.readFileSync(f));

            let e = sigs.getEntries();

            for (let i = 0; i < e.length; i++) {
                let file = e[i].getData();
                if (this.instance.findSignatures(ModLoader, file, header)) {
                    let sigcheck = this.instance.loadSigs();
                    if (!sigcheck.failed) {
                        ModLoader.logger.debug(`Loaded symbols: ${e[i].entryName}`);
                        found = true;
                        this.SignatureLookup = sigcheck.Sigs;
                        break;
                    } else {
                        ModLoader.logger.debug(`${e[i].entryName} failed.`);
                    }
                }
            }
        };

        let zips = fs.readdirSync("./sigs");
        
        for (let i = 0; i < zips.length; i++){
            let z = path.resolve("./sigs", zips[i]);
            if (path.parse(z).ext === ".zip"){
                process(z);
            }
        }

        if (!found) {
            throw new Error("Failed to find OotR symbols. Check your sigs folder or if OotR updated recently file a bug report.");
        }
    }

    private loadSigs() {
        let Sigs: Map<string, number> = new Map();

        let failed = false;

        // Check sigs.
        for (let i = 0; i < this.parsed.length; i++) {
            Sigs.set(this.parsed[i].name, this.parsed[i].addr);
        }
        for (let i = 0; i < this.parsed2.length; i++) {
            Sigs.set(this.parsed2[i].name, this.parsed2[i].addr);
        }

        return { failed, Sigs };
    }

    private findSignatures(ModLoader: IModLoaderAPI, sigfile: Buffer, header: string): boolean {

        this.parsed.length = 0;
        this.parsed2.length = 0;

        let sigs = new SmartBuffer().writeBuffer(sigfile);

        // Read the header.
        let _header = sigs.readBuffer(0x20);
        let items = _header.readUInt32BE(0x0C);
        let items2 = _header.readUInt32BE(0x10);
        let rom_header_hash = sigs.readBuffer(0x10).toString('hex').toUpperCase();

        if (rom_header_hash !== header) {
            //return false;
        }

        // Parse the table.
        for (let i = 0; i < items; i++) {
            let s1 = sigs.readUInt32BE();
            let o1 = sigs.readUInt32BE();
            let s2 = sigs.readUInt32BE();
            let o2 = sigs.readUInt32BE();

            let sig = new Signature();
            sig.offset_name = o1;
            sig.size_name = s1;
            sig.addr = s2;

            this.parsed.push(sig);
        }

        for (let i = 0; i < items2; i++) {
            let s1 = sigs.readUInt32BE();
            let o1 = sigs.readUInt32BE();
            let s2 = sigs.readUInt32BE();
            let o2 = sigs.readUInt32BE();

            let sig = new Settings();
            sig.offset_name = o1;
            sig.offset_addr = o2;
            sig.size_name = s1;
            sig.addr = s2;

            this.parsed2.push(sig);
        }

        // Gather data from table pointers.
        for (let i = 0; i < this.parsed.length; i++) {
            sigs.readOffset = this.parsed[i].offset_name;
            this.parsed[i].name = sigs.readString(this.parsed[i].size_name);
        }

        for (let i = 0; i < this.parsed2.length; i++) {
            sigs.readOffset = this.parsed2[i].offset_name;
            this.parsed2[i].name = sigs.readString(this.parsed2[i].size_name);
        }

        return true;
    }

}

export class OotR_PotsanityHelper {

    static hasPotsanity(): boolean {
        return OotR_SignatureManager.SignatureLookup.has(OotR_collectible_override_flags);
    }

    static getFlagArraySize(ModLoader: IModLoaderAPI): number {
        return ModLoader.emulator.rdramRead16(OotR_SignatureManager.SignatureLookup.get(OotR_num_override_flags)!) + OotR_FLAG_SIZE_ADD;
    }

    static getFlagBuffer(ModLoader: IModLoaderAPI): Buffer {
        if (!this.hasPotsanity()) return Buffer.alloc(1);
        return ModLoader.emulator.rdramReadBuffer(OotR_SignatureManager.SignatureLookup.get(OotR_collectible_override_flags)!, this.getFlagArraySize(ModLoader));
    }

    static setFlagBuffer(ModLoader: IModLoaderAPI, buf: Buffer): void {
        if (!this.hasPotsanity()) return;
        ModLoader.emulator.rdramWriteBuffer(OotR_SignatureManager.SignatureLookup.get(OotR_collectible_override_flags)!, buf);
    }

}

export class TriforceHuntHelper {

    static getTriforcePieces(ModLoader: IModLoaderAPI) {
        if (RomFlags.isRando) {
            return ModLoader.emulator.rdramRead16(0x8011AE96);
        } else {
            return 0;
        }
    }

    static setTriforcePieces(ModLoader: IModLoaderAPI, pieces: number) {
        if (RomFlags.isRando) {
            ModLoader.emulator.rdramWrite16(0x8011AE96, pieces);
        }
    }

    static incrementTriforcePieces(ModLoader: IModLoaderAPI) {
        if (RomFlags.isRando) {
            ModLoader.emulator.rdramWrite16(0x8011AE96, ModLoader.emulator.rdramRead16(0x8011AE96) + 1);
        }
    }

}

export class OotR_BadSyncData {

    static saveBitMask: Buffer = Buffer.alloc(SCENE_ARR_SIZE, 0xFF);

    static blacklistu32(offset: number): void {
        this.saveBitMask.writeUInt32BE(0, (offset * 0x1C) + 0x10);
    }

}

OotR_BadSyncData.blacklistu32(0x30);
OotR_BadSyncData.blacklistu32(0x31);
OotR_BadSyncData.blacklistu32(0x32);
OotR_BadSyncData.blacklistu32(0x33);
OotR_BadSyncData.blacklistu32(0x34);
OotR_BadSyncData.blacklistu32(0x35);

export class OotRCosmeticHelper {

    static extractFAs(ModLoader: IModLoaderAPI, evt: { rom: Buffer }, dlist: number, target: string, offset: number = 0, offset_target: number = 0, age: AgeOrForm = AgeOrForm.ADULT) {
        // Step 0 : Make sure we're extracting the right thing.
        let tools = new Z64RomTools(ModLoader, Z64LibSupportedGames.OCARINA_OF_TIME);
        let adult = tools.decompressDMAFileFromRom(evt.rom, age === AgeOrForm.ADULT ? 502 : 503);
        if (adult.indexOf(Buffer.from("MODLOADER64")) > -1 || adult.indexOf(Buffer.from("HEYLOOKHERE")) > -1) {
            ModLoader.logger.debug("This rom has a modified Link model in it. Cosmetic extraction failed!");
            return;
        }
        // Step 1: Extract the mirror shield from OotR.
        let a = age === AgeOrForm.ADULT ? "adult" : "child";
        let op = optimize(adult, [dlist + offset]);
        let p = new ZobjPiece(op.zobj, op.oldOffs2NewOffs.get(dlist)!);
        let sb = new SmartBuffer().writeBuffer(p.piece);

        // Step 2: Extract all the FA commands from the shield.
        sb.readOffset = p.offset;
        let fas: Array<Buffer> = [];
        while (sb.remaining() > 0) {
            let buf = sb.readBuffer(8);
            let cmd = buf.readUInt8(0);
            if (cmd === 0xFA) {
                fas.push(buf);
            }
        }

        // Step 3: Clone the bank shield and copy the FA commands into it in order.
        let hash = BANK_LOOKUP.get(a)!.get(target)!;
        let bank_item = BANK_OBJECTS.get(hash)!;
        if (BANK_REPLACEMENTS.has(hash)) {
            bank_item = BANK_REPLACEMENTS.get(hash)!;
        }
        let sb2 = new SmartBuffer().writeBuffer(bank_item.piece);
        sb2.readOffset = bank_item.offset;
        sb2.writeOffset = bank_item.offset;
        sb2.readOffset += offset_target;
        sb2.writeOffset += offset_target;
        while (sb2.remaining() > 0) {
            sb2.writeOffset = sb2.readOffset;
            let buf = sb2.readBuffer(8);
            let cmd = buf.readUInt8(0);
            if (cmd === 0xFA) {
                let buf2 = fas.shift()!;
                sb2.writeBuffer(buf2);
            }
        }
        p.piece = sb2.toBuffer();
        p.offset = bank_item.offset;
        BANK_REPLACEMENTS.set(hash, p);
    }

    static extractMirrorShield(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        this.extractFAs(ModLoader, evt, 0x241C0, "Shield.3");
        this.extractFAs(ModLoader, evt, 0x215C0, "Shield.3", 0, 0x1B8);
        ModLoader.logger.info("Loaded OotR Mirror Shield colors.");
    }

}

export class RomansCosmeticHelper {

    static extractAllRomanCosmetics(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        this.extractMegatonHammer(ModLoader, evt);
        this.extractBiggoronSword(ModLoader, evt);
        this.extractMasterSword(ModLoader, evt);
        this.extractKokiriSword(ModLoader, evt);
        this.extractBoomerang(ModLoader, evt);
        this.extractGauntlets(ModLoader, evt);
        this.extractBow(ModLoader, evt);
        ModLoader.logger.info("Loaded Roman's cosmetic colors.");
    }

    private static extractMegatonHammer(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x233E0, "Hammer");
    }

    private static extractBiggoronSword(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x23A80, "Blade.3");
    }

    private static extractMasterSword(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x21FE8, "Blade.2");
    }

    private static extractKokiriSword(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x14168, "Blade.1", 0, 0, AgeOrForm.CHILD);
    }

    private static extractBoomerang(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x14660, "Boomerang", 0, 0, AgeOrForm.CHILD);
    }

    private static extractGauntlets(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x252D8, "Gauntlet.Fist.L");
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x252D8, "Gauntlet.Hand.L");
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x25658, "Gauntlet.Fist.R");
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x25658, "Gauntlet.Hand.R");
    }

    private static extractBow(ModLoader: IModLoaderAPI, evt: { rom: Buffer }) {
        OotRCosmeticHelper.extractFAs(ModLoader, evt, 0x22DA8, "Bow");
    }

}