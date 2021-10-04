import { Heap } from 'modloader64_api/heap'
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI'
import { get_aligned, get_lower, get_upper } from "../../common/lib/CodeCave"
import { DecodeImmediate, DecodeJumpTarget, DecodeOpcode, DecodeRegisterTarget, Instruction, JAL_ENCODE, OPCODEINDEXTYPE, OPCODE_DEFAULT, OPCODE_SPECIAL0, REGISTER } from "../../common/lib/OpcodeBullshit"
import { IOOTCore } from 'Z64Lib/API/OoT/OOTAPI';

enum InitTHGA_Order {
    POLYOPA = 0,
    POLYXLU,
    POLYOVL,
    POLYWRK,
    COUNT
};

enum POLYWRITE {
    ADDR,
    ADDRALT,
    SIZE,
    COUNT
};

// original function
const Graph_InitTHGA_func = "27BDFFC8AFB0001400808025AFBF001CAFB100188E0E02D83C1980172739A64031CF0001000FC0C0030FC0210018C0C0030FC0210018C180030FC0210018C10003198821240812343C010001A62800000031082124095678A429240826250008AFA50030260402B80C027FB03406BF003401BF0802212821AFA5002C260402C80C027FB0240640003401FF0802212821AFA50028260402A80C027FB0240620003C01000134211F0802212821AFA50024260401B40C027FB0240604008FAA00308FA500248E0402E8AE0A00008FAB002CAE0B00048FAC0028AE0501B0AE0C0010048100043084000110800002000000002484FFFE0C0290F600000000AE0202DCAE0000148FBF001C8FB000148FB1001803E0000827BD0038";

// code-cave replacement for original
const Graph_InitTHGA_New_Func = "27BDFFE8AFBF00140FBB63BB000000008FBF001403E0000827BD001800000000" //"00000000001FC821000000000FBB63BB00000000000000000019F8210000000003E000080000000000000000";

// new function
const Graph_InitSUPERTHGA_Func = "27BDFFD8AFBF0024AFBE002003A0F025AFC400288FC200288C4302E8000317C3000217C2006218213063000100621023AFC200143C02ABDC3442DCBAAFC200183C02DEAD3442BEEFAFC200108FC2001410400004000000003C02BEEF3442DEADAFC200108FC20028244202B88FC30018006030258FC50010004020250C027FB0000000008FC200288FC30010AC4300003C02ABDC3442DCBAAFC200183C02DEAD3442BEEFAFC200108FC2001410400004000000003C02BEEF3442DEADAFC200108FC20028244202C88FC30018006030258FC50010004020250C027FB0000000008FC200288FC30010AC4300043C02ABDC3442DCBAAFC200183C02DEAD3442BEEFAFC200108FC2001410400004000000003C02BEEF3442DEADAFC200108FC20028244202A88FC30018006030258FC50010004020250C027FB0000000008FC200288FC30010AC4300103C02ABDC3442DCBAAFC200183C02DEAD3442BEEFAFC200108FC2001410400004000000003C02BEEF3442DEADAFC200108FC20028244201B48FC30018006030258FC50010004020250C027FB0000000008FC200288FC30010AC4301B08FC400140C0290F600000000004018258FC20028AC4302DC8FC20028AC4000140000000003C0E8258FBF00248FBE002027BD002803E0000800000000";

// JR RA
const JRRA = "000000000000000003E0000800000000";

const codecaveDummy = 0x0EED8EEC;
const sizeDummy0    = 0xABDC;
const sizeDummy1    = 0xDCBA;
const ptrDummy0     = 0xDEAD;
const ptrDummy1     = 0xBEEF;
const ptrDummyAlt0  = 0xBEEF;
const ptrDummyAlt1  = 0xDEAD;

const defaultOpa0 = 0x8016A648;
const defaultOpa1 = 0x8017CA58;
const defaultOpaS = 0x0000BF00;
const defaultXlu0 = 0x80176548;
const defaultXlu1 = 0x80188958;
const defaultXluS = 0x00004000;
const defaultOvl0 = 0x8017A548;
const defaultOvl1 = 0x8018C958;
const defaultOvlS = 0x00002000;
const defaultWrk0 = 0x8017C548;
const defaultWrk1 = 0x8018E958;
const defaultWrkS = 0x00000400;
const Graph_InitTHGA_Addr = 0x800A1130;

const BYTEPADDING = 0x20;

export class ThiccOpa {
    superPolyEnabled: boolean = false
    InitSUPERTHGA_Addr: number = 0;
    newOpa = 0;
    newXlu = 0;
    newOvl = 0;
    newWrk = 0;

    sizeOpa = defaultOpaS * 8;
    sizeXlu = defaultXluS * 8;
    sizeOvl = defaultOvlS; // Doesn't work? We're using the free space we get from moving the others for this!
    sizeWrk = defaultWrkS * 1;

    polylist = [
        // addr
        [
            defaultOpa0,
            defaultXlu0,
            defaultOvl0,
            defaultWrk0
        ],
        // addr alt
        [
            defaultOpa1,
            defaultXlu1,
            defaultOvl1,
            defaultWrk1
        ],
        // size
        [
            defaultOpaS,
            defaultXluS,
            defaultOvlS,
            defaultWrkS
        ]
    ]

    toggleSuperPoly(heap: Heap, ModLoader: IModLoaderAPI) {
        ModLoader.emulator.invalidateCachedCode();
        this.superPolyEnabled = !this.superPolyEnabled;

        if (this.superPolyEnabled) {
            let opcode: Instruction = new Instruction();
            let codeCave = Buffer.from(Graph_InitTHGA_New_Func, 'hex');
            let newFunc = Buffer.from(Graph_InitSUPERTHGA_Func, 'hex');
            let index = 0;
            let addr = 0;

            // Full buffer we are allocating requires us to double the size; since the game has 2 frame buffers
            let fullOpa = this.sizeOpa * 2;
            let fullXlu = this.sizeXlu * 2;
            let fullOvl = this.sizeOvl * 1;
            let fullWrk = this.sizeWrk * 2;

            if (this.InitSUPERTHGA_Addr === 0) {
                this.InitSUPERTHGA_Addr = heap.malloc(newFunc.byteLength + BYTEPADDING);
                this.newOpa = heap.malloc(fullOpa);
                this.newXlu = heap.malloc(fullXlu);
                this.newOvl = heap.malloc(fullOvl);
                this.newWrk = heap.malloc(fullWrk);

                // first buffer, top, pad from second buffer by bytepadding
                this.polylist[POLYWRITE.ADDR][InitTHGA_Order.POLYOPA] = this.newOpa + fullOpa;
                this.polylist[POLYWRITE.ADDR][InitTHGA_Order.POLYXLU] = this.newXlu + fullXlu;
                this.polylist[POLYWRITE.ADDR][InitTHGA_Order.POLYOVL] = defaultOvl0 //- (0xFF08 / 2); // use new free space of a single GfxPool buffer?
                this.polylist[POLYWRITE.ADDR][InitTHGA_Order.POLYWRK] = this.newWrk + fullWrk;

                // second buffer, top, pad from second buffer by bytepadding
                this.polylist[POLYWRITE.ADDRALT][InitTHGA_Order.POLYOPA] = this.newOpa + this.sizeOpa;
                this.polylist[POLYWRITE.ADDRALT][InitTHGA_Order.POLYXLU] = this.newXlu + this.sizeXlu;
                this.polylist[POLYWRITE.ADDRALT][InitTHGA_Order.POLYOVL] = defaultOvl1;
                this.polylist[POLYWRITE.ADDRALT][InitTHGA_Order.POLYWRK] = this.newWrk + this.sizeWrk;

                // size
                this.polylist[POLYWRITE.SIZE][InitTHGA_Order.POLYOPA] = this.sizeOpa
                this.polylist[POLYWRITE.SIZE][InitTHGA_Order.POLYXLU] = this.sizeXlu
                this.polylist[POLYWRITE.SIZE][InitTHGA_Order.POLYOVL] = defaultOvlS //+ (0xFF08 / 2); // use new free space of a single GfxPool buffer?
                this.polylist[POLYWRITE.SIZE][InitTHGA_Order.POLYWRK] = this.sizeWrk
            }

            // Replace bogus JAL in codecave to the address of our new function
            for (index = 0; index < codeCave.length; index += 4) {
                opcode = DecodeOpcode(codeCave.slice(index, index + 4))
                if (opcode.code === "JAL") {
                    addr = DecodeJumpTarget(opcode)
                    if (addr === codecaveDummy) {
                        codeCave.writeUInt32BE(JAL_ENCODE(this.InitSUPERTHGA_Addr), index);
                    }
                }
            }

            // Iterate through each poly pointer in our function to write the correct address of the data
            let currentPoly = InitTHGA_Order.POLYOPA;
            let alt = 0;
            for (index = 0; index < newFunc.length; index += 4) {
                if (currentPoly === InitTHGA_Order.COUNT) break;

                opcode = DecodeOpcode(newFunc.slice(index, index + 4))
                if (opcode.code === "LUI" || opcode.code === "ORI") {
                    let immediate = DecodeImmediate(opcode);

                    if (alt) {
                        if (immediate === ptrDummyAlt0) {
                            newFunc.writeUInt16BE(get_upper(this.polylist[POLYWRITE.ADDRALT][currentPoly]), index + 2)
                        }
                        else if (immediate === ptrDummyAlt1) {
                            newFunc.writeUInt16BE(get_lower(this.polylist[POLYWRITE.ADDRALT][currentPoly]), index + 2)
                            alt = 1 - alt;
                            currentPoly++;
                        }
                    }
                    else {
                        if (immediate === ptrDummy0) {
                            newFunc.writeUInt16BE(get_upper(this.polylist[POLYWRITE.ADDR][currentPoly]), index + 2)
                        }
                        else if (immediate === ptrDummy1) {
                            newFunc.writeUInt16BE(get_lower(this.polylist[POLYWRITE.ADDR][currentPoly]), index + 2)
                            alt = 1 - alt;
                        }
                        else if (immediate === sizeDummy0) {
                            newFunc.writeUInt16BE(get_upper(this.polylist[POLYWRITE.SIZE][currentPoly]), index + 2)
                        }
                        else if (immediate === sizeDummy1) {
                            newFunc.writeUInt16BE(get_lower(this.polylist[POLYWRITE.SIZE][currentPoly]), index + 2)
                        }
                    }
                }
            }

            // write our codecave to our new function, and our new function
            ModLoader.emulator.rdramWriteBuffer(this.InitSUPERTHGA_Addr, newFunc);
            ModLoader.emulator.rdramWriteBuffer(Graph_InitTHGA_Addr, codeCave);
        }
        else {
            // if it is toggles, untoggle it
            ModLoader.emulator.rdramWriteBuffer(Graph_InitTHGA_Addr, Buffer.from(Graph_InitTHGA_func, 'hex'));
        }
    }

    onTick(frame: number, core: IOOTCore, ModLoader: IModLoaderAPI) {
        if (core.helper.isPaused()) {
            if (this.superPolyEnabled) this.toggleSuperPoly(ModLoader.heap!, ModLoader)
        }
        else {
            if (!this.superPolyEnabled) this.toggleSuperPoly(ModLoader.heap!, ModLoader)
        }
    }

}

