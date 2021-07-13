import { JAL_ENCODE, JAL_DECODE, DecodeOpcode } from "./OpcodeBullshit"
import { Heap } from 'modloader64_api/heap'
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';

export function get_upper(input: number): number {
    return Math.abs((input >> 16) & 0x0000FFFF)
}

export function get_lower(input: number): number {
    return Math.abs(input & 0x0000FFFF)
}

export  function get_aligned(input: number, alignment: number): number {
    return input + (alignment - input % alignment)
}

enum CODECAVE_TYPE {
    CAVETO = 0,             // jump to then return
    CAVETOANDJAL,           // jump to; prepend or append a call to input; then return
    CAVEMAKE,               // jump to (new) procedure then return
    CAVEMAKEANDJAL,         // jump to (new) procedure; prepend or append a call to input; then return
    CAVEMAKEBEGJAL,         // jump to (new) procedure; begin procedure with call to input; then return
    COUNT
}

/*
Note "@" in the names below represent a symbol that we created
To further illustrate the codecave types,
Let's say we are caving the JAL to UpdateLook in this procedure:

MainLoop:
    ADDIU SP, SP, -0x10
    JAL UpdateLoop
    NOP
    ADDIU SP, SP, 0x10
    JR RA
    NOP


Using CAVETO:

MainLoop:
    ADDIU SP, SP, -0x10
    JAL @TO # User-defined procedure to cave to
    NOP
    ADDIU SP, SP, 0x10
    JR RA
    NOP

Using CAVETOANDJAL:

MainLoop:
    ADDIU SP, SP, -0x10
    JAL @TO # User-defined procedure to cave to
    NOP
    JAL @INPUT # User-defined procedure to call
    NOP
    ADDIU SP, SP, 0x10
    JR RA
    NOP

Using CAVEMAKE:

MainLoop:
    ADDIU SP, SP, -0x10
    JAL @NEW # This would be an address that is freshly alloc'd
    NOP
    ADDIU SP, SP, 0x10
    JR RA
    NOP

Using CAVEMAKEANDJAL:

MainLoop:
    ADDIU SP, SP, -0x10
    JAL @NEW # This would be an address that is freshly alloc'd
    NOP
    JAL @INPUT # User-defined procedure to call
    NOP
    ADDIU SP, SP, 0x10
    JR RA
    NOP

@NEW:
    NOP
    JR RA

Using CAVEMAKEBEGJAL:

MainLoop:
    ADDIU SP, SP, -0x10
    JAL @NEW # This would be an address that is freshly alloc'd
    NOP
    ADDIU SP, SP, 0x10
    JR RA
    NOP

@NEW:
    JAL @INPUT # User-defined procedure to call
    NOP
    JR RA
    NOP


*/

// Do not use, this is not ready to be toyed with!
export function do_codecave(address: number = 0, parambuf: number[] = [], type: CODECAVE_TYPE, ModLoader: IModLoaderAPI, heap: Heap): number {
    let address_buf = ModLoader.emulator.rdramReadBuffer(address, 4)
    let inst = DecodeOpcode(address_buf)
    let input = 0
    let to = 0
    let newproc = 0
    let newprocp = 0

    if (inst.code !== "JAL") ModLoader.logger.warn("Caving a non JAL instruction!")

    // Cave-To
    if (type <= CODECAVE_TYPE.CAVETOANDJAL) to = parambuf[0]
    if (type === CODECAVE_TYPE.CAVETOANDJAL || type === CODECAVE_TYPE.CAVEMAKEANDJAL || type === CODECAVE_TYPE.CAVEMAKEBEGJAL) input = parambuf[1]
    if (type >= 2) {
        newproc = get_aligned(heap.malloc(0x200), 4)
        newprocp = newproc
    }

    // Encode new jal instructions
    if (to) to = JAL_ENCODE(to)
    if (input) input = JAL_ENCODE(input)
    if (newproc) to = JAL_ENCODE(to)

    if (to) {
        ModLoader.emulator.rdramWrite32(address, to)
        ModLoader.emulator.rdramWrite32(address + 4, 0)
    }

    // TODO: Make function to correctly shift address's procedure
    // FIXME: Might have to also realloc the shifted procedure, then progressively replace all calls to it to the realloc'd procedure
    if (input && type !== CODECAVE_TYPE.CAVEMAKEBEGJAL) {
        ModLoader.emulator.rdramWrite32(address + 8, input)
        ModLoader.emulator.rdramWrite32(address + 0xC, 0)
    }
    else if (input) {
        ModLoader.emulator.rdramWrite32(newprocp +=4, input)
        ModLoader.emulator.rdramWrite32(newprocp +=4, 0)
    }

    if (newproc) {
        ModLoader.emulator.rdramWrite32(newprocp +=4, 0x03E00008) // JR RA
        ModLoader.emulator.rdramWrite32(newprocp +=4, 0)
    }

    return 0
}

