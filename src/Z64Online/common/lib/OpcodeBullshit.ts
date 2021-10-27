// encodes JAL instruction to jump to the address in data
export function JAL_ENCODE(data: number): number {
    return 0x0C000000 | ((data >> 2) & 0x3FFFFFF)
}

export function J_ENCODE(data: number): number {
    return 0x08000000 | ((data >> 2) & 0x3FFFFFF)
}

// returns the address that the instruction in data would JAL to
export function JAL_DECODE (data: Buffer): number {
    return ((data.readUInt32BE(0) & 0x3FFFFFF) << 2)
}

// encodes LUI/ORI instruction data to use immediate
export function LUIORI_ENCODE(data: Buffer, immediate: number): number {
    let instruction_base = data.readUInt16BE(0)
    data.writeUInt16BE(immediate, 2)
    return data.readUInt32BE(0)
}

// returns the immediate of a LUI/ORI in data
export function LUIORI_DECODE(data: Buffer): number {
    return data.readUInt16BE(2)
}

export enum OPCODE_DEFAULT {
    SPEC, BCOND,
    J, JAL, BEQ, BNE, BLEZ, BGTZ,
    ADDI, ADDIU,
    SLTI, SLTIU,
    ANDI, ORI, XORI, LUI,
    COP0, COP1, COP2, COP3,
    BEQL, BNEL, BLEZL, BGTZL,
    DADDI, DADDIU,
    LDL, LDR,
    OP34, OP35, OP36, OP37,
    LB, LH, LWL, LW, LBU, LHU, LWR, LWU,
    SB, SH, SWL, SW, SDL, SDR, SWR,
    CACHE, LL,
    LWC1, LWC2, LWC3,
    LLD, LDC1, LDC2, LD,
    SC, SWC1, SWC2, SWC3, SCD, SDC1, SDC2, SD,
    COUNT
};

export enum OPCODE_SPECIAL0 {
    SLL, SPEC01, SRL, SRA, SLLV, SPEC05, SRLV, SRAV,
    JR, JALR,
    SPEC12, SPEC13, SYSCALL,
    BREAK, SPEC16, SYNC,
    MFHI, MTHI, MFLO, MTLO,
    DSLLV, SPEC25, DSRLV, DSRAV,
    MULT, MULTU, DIV, DIVU, DMULT, DMULTU, DDIV, DDIVU,
    ADD, ADDU, SUB, SUBU,
    AND, OR, XOR, NOR,
    SPEC50, SPEC51, SLT, SLTU,
    DADD, DADDU, DSUB, DSUBU,
    TGE, TGEU, TLT, TLTU, TEQ,
    SPEC65, TNE, SPEC67,
    DSLL, SPEC71, DSRL, DSRA, DSLL32, SPEC75, DSRL32, DSRA32,
    COUNT
};

export enum OPCODE_SPECIAL1 {
    MAD,
    MADU,
    MUL,
    SPEC3,
    COUNT
}

export enum OPCODE_COND {
    BLTZ, BGEZ, BLTZL, BGEZL,
    UNKNOWN0, UNKNOWN1, UNKNOWN2, UNKNOWN3,
    TGEI, TGEIU, TLTI, TLTIU, TEQI,
    UNKNOWN4,
    TNEI,
    UNKNOWN5,
    BLTZAL, BGEZAL, BLTZALL, BGEZALL,
    UNKNOWN6, UNKNOWN7, UNKNOWN8, UNKNOWN9, UNKNOWN10, UNKNOWN11, UNKNOWN12, UNKNOWN13, UNKNOWN14, UNKNOWN15, UNKNOWN16, UNKNOWN17,
    COUNT
};

export enum OPCODETYPE {
    NONE,
    IMMEDIATE,
    JUMP,
    REGISTER,
    FR,
    COUNT
}

export enum OPCODEINDEXTYPE {
    NONE,
    DEFAULT,
    SPECIAL0,
    SPECIAL1,
    COND,
    COUNT
}

export enum REGISTER {
    R0, AT,
    V0, V1,
    A0, A1, A2, A3,
    T0, T1, T2, T3, T4, T5, T6, T7,
    S0, S1, S2, S3, S4, S5, S6, S7,
    T8, T9,
    K0, K1,
    GP, SP,
    S8, RA,
    COUNT
}

export class Instruction {
    type: OPCODEINDEXTYPE = OPCODEINDEXTYPE.NONE
    indx: number | OPCODE_DEFAULT | OPCODE_SPECIAL0 | OPCODE_SPECIAL1 | OPCODE_COND = 0
    data: Buffer = Buffer.alloc(4)
    uint: number = 0
    code: string = "NOP"
}

export function DecodeOpcode(inst: Buffer): Instruction
{
    let instruction_index = 0
    let instruction = new Instruction()
    instruction.data = inst
    instruction.uint = inst.readUInt32BE(0)
    instruction.type = OPCODEINDEXTYPE.DEFAULT

    if (instruction.uint === 0) {
        instruction.code = "NOP"
        return instruction
    }

    instruction_index = instruction.uint >> 26
    if (instruction_index < OPCODE_DEFAULT.COUNT) instruction.code = OPCODE_DEFAULT[instruction_index]
    else instruction.code = "UNKNOWN"

    if (instruction_index === OPCODE_DEFAULT.SPEC) {
        instruction_index = instruction.uint & 0b111111
        instruction.type = OPCODEINDEXTYPE.SPECIAL0
        instruction.code = OPCODE_SPECIAL0[instruction_index]
    }
    else if (instruction_index === OPCODE_DEFAULT.COUNT) { //SPECIAL2
        instruction_index = instruction.uint & 0b111111
        instruction.type = OPCODEINDEXTYPE.SPECIAL1
        instruction.code = OPCODE_SPECIAL1[instruction_index]
    }
    else if (instruction_index === OPCODE_DEFAULT.BCOND) {
        instruction_index = instruction.uint & 0b111111
        instruction.type = OPCODEINDEXTYPE.COND
        instruction.code = OPCODE_COND[instruction_index]
    }

    instruction.indx = instruction_index

    return instruction
}

export function EncodeOffset(inst: Instruction, offset: number): Instruction {
    // TODO
    return DecodeOpcode(inst.data)
}

export function DecodeOffset(inst: Instruction): number {
    return (inst.uint & 0x0000FFFF) << 2
}

export function EncodeShift(inst: Instruction, shift: number): Instruction {
    // TODO
    return DecodeOpcode(inst.data)
}

export function DecodeShift(inst: Instruction): number {
    return (inst.uint >> 6) & 0x1F
}

export function EncodeRegisterDestination(inst: Instruction, register: REGISTER): Instruction {
    // TODO
    return DecodeOpcode(inst.data)
}

export function DecodeRegisterDestination(inst: Instruction): REGISTER {
    return ((inst.uint >> 11) & 0x1F) as REGISTER
}

export function EncodeRegisterTarget(inst: Instruction, target: REGISTER): Instruction {
    // TODO
    return DecodeOpcode(inst.data)
}

export function DecodeRegisterTarget(inst: Instruction): REGISTER {
    return (inst.uint >> 16) & 0x1F
}

export function EncodeRegisterSource(inst: Instruction, source: REGISTER): Instruction {
    // TODO
    return DecodeOpcode(inst.data)
}

export function DecodeRegisterSource(inst: Instruction): REGISTER {
    return (inst.uint >> 21) & 0x1F
}

export function EncodeImmediate(inst: Instruction, immediate: number): Instruction {
    inst.data.writeUInt16BE(immediate & 0x0000FFFF, 2)
    return DecodeOpcode(inst.data)
}

export function DecodeImmediate(inst: Instruction): number {
    return inst.data.readUInt16BE(2)
}

export function EncodeJumpTarget(inst: Instruction, target: number): Instruction {
    inst.data.writeUInt32BE(0x0C000000 | ((target >> 2) & 0x3FFFFFF), 0)
    return DecodeOpcode(inst.data)
}

export function DecodeJumpTarget(inst: Instruction): number {
    return ((inst.uint & 0x3FFFFFF) << 2)
}

export function EncodeInstruction(data: number[]): Instruction {
    let encoded: number = 0
    let index: number = 0
    let buf = Buffer.alloc(4)

    for (index = 0; index < data.length; index++) {
        encoded |= data[index]
    }

    buf.writeUInt32BE(encoded, 0)

    return DecodeOpcode(buf)
}

export function GetOpcodeName(inst: Instruction): string {
    if (inst.type === OPCODEINDEXTYPE.DEFAULT) return OPCODE_DEFAULT[inst.indx]
    else if (inst.type === OPCODEINDEXTYPE.SPECIAL0) return OPCODE_SPECIAL0[inst.indx]
    else if (inst.type === OPCODEINDEXTYPE.SPECIAL1) return OPCODE_SPECIAL1[inst.indx]
    else return OPCODE_COND[inst.indx]
}

