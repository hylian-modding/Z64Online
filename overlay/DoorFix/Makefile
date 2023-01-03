PROGRAM = DoorFix
ADDRESS = 0x80800000

OOT_BIN_PATH = bin_oot
MM_BIN_PATH = bin_mm
BIN_PATH = bin

SRC_DIRS  = src
C_FILES   = $(foreach dir,$(SRC_DIRS),$(wildcard $(dir)/*.c))
S_FILES   = $(foreach dir,$(SRC_DIRS),$(wildcard $(dir)/*.s))
OOT_O_FILES := $(foreach file,$(C_FILES) $(S_FILES),$(OOT_BIN_PATH)/$(file).o)
MM_O_FILES := $(foreach file,$(C_FILES) $(S_FILES),$(MM_BIN_PATH)/$(file).o)

ifeq ($(shell type mips64-gcc >/dev/null 2>/dev/null; echo $$?), 0)
    CROSS := mips64-
else ifeq ($(shell type mips-linux-gnu-gcc >/dev/null 2>/dev/null; echo $$?), 0)
    CROSS := mips-linux-gnu-
else
    CROSS := mips64-elf-
endif

CC = $(CROSS)gcc
AS = $(CROSS)as
LD = $(CROSS)ld
OBJDUMP	= $(CROSS)objdump
NOVL	= nOVL

I_FLAGS = -I$(LIBZ64_PATH) -Iinclude -I$(LIBZ64_PATH)/../ultralib/include
D_FLAGS = -D_LANGUAGE_C -DF3DEX_GBI_2 -D_MLDEBUG
OPT_FLAGS = -Os
OPT_FLAGS2 = -mfix4300 -mdivide-breaks -mframe-header-opt -mno-split-addresses -mno-explicit-relocs -mno-check-zero-division
OPT_FLAGS3 = -fno-toplevel-reorder -fno-unsafe-math-optimizations -fno-zero-initialized-in-bss -fno-stack-protector -fno-inline-functions -fno-unroll-loops -falign-functions=16 -fmerge-all-constants -ffast-math -fmodulo-sched -fmodulo-sched-allow-regmoves -fira-hoist-pressure -fweb -floop-interchange -fsplit-paths -fallow-store-data-races
ARCH_FLAGS = -mips3 -mtune=vr4300 -march=vr4300 -mabi=32

AS_FLAGS = -EB $(ARCH_FLAGS)
CFLAGS = -G 0 -nostdlib -nostdinc $(I_FLAGS) $(D_FLAGS) $(OPT_FLAGS) $(ARCH_FLAGS) $(OPT_FLAGS2) $(OPT_FLAGS3) -mno-shared -mno-abicalls -fno-common -fno-PIC -ffreestanding -w

LDFLAGS = -L$(LIBZ64_PATH) -T libzelda64.ld --emit-relocs

default: entry dirs $(PROGRAM)

$(OOT_BIN_PATH)/%.c.o: %.c dirs
	$(CC) -c $(CFLAGS) -DGAME_OOT -DGAME_VERSION_1_0 -o $@ $<

$(MM_BIN_PATH)/%.c.o: %.c dirs
	$(CC) -c $(CFLAGS) -DGAME_MM -DGAME_VERSION_1_0 -D_FINALROM -o $@ $<

$(OOT_BIN_PATH)/%.s.o: %.s dirs
	$(AS) $(AS_FLAGS) -o $@ $<

$(MM_BIN_PATH)/%.s.o: %.s dirs
	$(AS) $(AS_FLAGS) -o $@ $<

$(OOT_BIN_PATH)/$(PROGRAM).oot: $(OOT_O_FILES)
	@echo Building $(PROGRAM) for OOT...
	$(LD) $(LDFLAGS) -o $@.elf $(OOT_O_FILES)
	$(NOVL) -s -c -A $(ADDRESS) -o $@.ovl $@.elf

$(MM_BIN_PATH)/$(PROGRAM).mm: $(MM_O_FILES)
	@echo Building $(PROGRAM) for MM...
	$(LD) $(LDFLAGS) -o $@.elf $(MM_O_FILES)
	$(NOVL) -s -c -A $(ADDRESS) -o $@.ovl $@.elf

$(PROGRAM): $(OOT_BIN_PATH)/$(PROGRAM).oot $(MM_BIN_PATH)/$(PROGRAM).mm
	cp $(OOT_BIN_PATH)/$(PROGRAM).oot.ovl $(BIN_PATH)/$(PROGRAM)_oot.ovl
	cp $(MM_BIN_PATH)/$(PROGRAM).mm.ovl $(BIN_PATH)/$(PROGRAM)_mm.ovl
	@echo
	@echo Successfully cross-compiled $(PROGRAM) for OOT and MM!
	@echo

dirs: entry
	mkdir -p $(BIN_PATH)
	$(foreach dir,$(SRC_DIRS),$(shell mkdir -p $(OOT_BIN_PATH)/$(dir)))
	$(foreach dir,$(SRC_DIRS),$(shell mkdir -p $(MM_BIN_PATH)/$(dir)))

entry:
	@echo -n "ENTRY_POINT = "$(ADDRESS) > entry.ld
	@echo ";" >> entry.ld
	@echo "Generated entry.ld"

clean:
	rm -rf $(OOT_BIN_PATH)
	rm -rf $(MM_BIN_PATH)
	rm -rf bin

