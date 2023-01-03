# Config
PROJECTNAME = EponaAnimBank
ENTRY_ADDRESS = 0x80800000

# Everything else

ifeq ($(LIBZ64_PATH),)
    $(error make sure LIBZ64_PATH is set!)
endif

# -I$(LIBZ64_PATH)/ultralib/include
I_FLAGS = -I$(LIBZ64_PATH) -Iinclude -Isrc
D_FLAGS = -D_LANGUAGE_C -DF3DEX_GBI_2 -D_MLDEBUG
OPT_FLAGS = -Os
OPT_FLAGS2 = -mfix4300 -mdivide-breaks -mframe-header-opt -mno-split-addresses -mno-explicit-relocs -mno-check-zero-division
OPT_FLAGS3 = -fno-toplevel-reorder -fno-unsafe-math-optimizations -fno-zero-initialized-in-bss -fno-stack-protector -fno-inline-functions -fno-unroll-loops -falign-functions=16 -fmerge-all-constants -ffast-math -fmodulo-sched -fmodulo-sched-allow-regmoves -fira-hoist-pressure -fweb -floop-interchange -fsplit-paths -fallow-store-data-races
ARCH_FLAGS = -mips3 -mtune=vr4300 -march=vr4300 -mabi=32
PIC_FLAGS = -nostdlib -nostdinc -mno-shared -mno-abicalls -fno-common -fno-PIC -ffreestanding -Wimplicit-function-declaration -Werror=implicit-function-declaration
AS_FLAGS = -EB $(ARCH_FLAGS)
C_FLAGS = -G 0 $(PIC_FLAGS) $(D_FLAGS) $(OPT_FLAGS) $(ARCH_FLAGS) $(OPT_FLAGS2) $(OPT_FLAGS3) $(I_FLAGS)
LD_FLAGS = -L$(LIBZ64_PATH) -T libzelda64.ld --emit-relocs

BIN_PATH = bin
OOT_10_BIN_PATH = $(BIN_PATH)/oot_10
OOT_DEBUG_BIN_PATH = $(BIN_PATH)/oot_debug
MM_BIN_PATH = $(BIN_PATH)/mm

SRC_DIRS = src
C_FILES = $(foreach dir,$(SRC_DIRS),$(wildcard $(dir)/*.c))
S_FILES = $(foreach dir,$(SRC_DIRS),$(wildcard $(dir)/*.s))
OOT_10_O_FILES = $(foreach file,$(C_FILES) $(S_FILES),$(OOT_10_BIN_PATH)/$(file).o)
OOT_DEBUG_O_FILES = $(foreach file,$(C_FILES) $(S_FILES),$(OOT_DEBUG_BIN_PATH)/$(file).o)
MM_O_FILES = $(foreach file,$(C_FILES) $(S_FILES),$(MM_BIN_PATH)/$(file).o)

ifeq ($(shell type mips64-o32-gcc >/dev/null 2>/dev/null; echo $$?), 0)
    CROSS := mips64-o32-
else ifeq ($(shell type mips64-gcc >/dev/null 2>/dev/null; echo $$?), 0)
    CROSS := mips64-
else ifeq ($(shell type mips-linux-gnu-gcc >/dev/null 2>/dev/null; echo $$?), 0)
    CROSS := mips-linux-gnu-
else
    CROSS := mips64-elf-
endif

AS = $(CROSS)as
CC = $(CROSS)gcc
LD = $(CROSS)ld
OBJDUMP = $(CROSS)objdump
OBJCOPY = $(CROSS)objcopy
NOVL = nOVL

default: entry dirs $(PROJECTNAME)

entry:
	@echo -n "ENTRY_POINT = "$(ENTRY_ADDRESS) > entry.ld
	@echo ";" >> entry.ld
	@echo "Generated entry.ld"

dirs: entry
	@mkdir -p $(BIN_PATH)
	$(foreach dir,$(SRC_DIRS),$(shell mkdir -p $(OOT_10_BIN_PATH)/$(dir)))
	$(foreach dir,$(SRC_DIRS),$(shell mkdir -p $(OOT_DEBUG_BIN_PATH)/$(dir)))
	$(foreach dir,$(SRC_DIRS),$(shell mkdir -p $(MM_BIN_PATH)/$(dir)))

clean:
	rm -rf $(BIN_PATH)

# Assembly and compilation
$(OOT_10_BIN_PATH)/%.s.o: %.s
	$(AS) $(AS_FLAGS) -o $@ $<

$(OOT_DEBUG_BIN_PATH)/%.s.o: %.s
	$(AS) $(AS_FLAGS) -o $@ $<

$(MM_BIN_PATH)/%.s.o: %.s
	$(AS) $(AS_FLAGS) -o $@ $<

$(OOT_10_BIN_PATH)/%.c.o: %.c
	$(CC) -c $(C_FLAGS) -I$(LIBZ64_PATH)/oot_10/include -DTARGET_GAME=0 -DGAME_VERSION=0x10 -o $@ $<

$(OOT_DEBUG_BIN_PATH)/%.c.o: %.c
	$(CC) -c $(C_FLAGS) -I$(LIBZ64_PATH)/oot_debug/include -DTARGET_GAME=0 -DGAME_VERSION=0x44 -o $@ $<

$(MM_BIN_PATH)/%.c.o: %.c
	$(CC) -c $(C_FLAGS) -I$(LIBZ64_PATH)/mm/include -I$(LIBZ64_PATH)/mm/assets -DTARGET_GAME=1 -DGAME_VERSION=0x10 -o $@ $<

# Linking and novl
$(OOT_10_BIN_PATH)/$(PROJECTNAME): entry dirs $(OOT_10_O_FILES)
	@echo Building $(PROJECTNAME) for OOT 1.0...
	$(LD) $(LD_FLAGS) -Map $(PROJECTNAME).map -T oot_10.ld -o $@.elf $(OOT_10_O_FILES)
	$(NOVL) -s -c -A $(ENTRY_ADDRESS) -o $@.zobj $@.elf

$(OOT_DEBUG_BIN_PATH)/$(PROJECTNAME): entry dirs $(OOT_DEBUG_O_FILES)
	@echo Building $(PROJECTNAME) for OOT debug...
	$(LD) $(LD_FLAGS) -T oot_db.ld -o $@.elf $(OOT_DEBUG_O_FILES)

$(MM_BIN_PATH)/$(PROJECTNAME): entry dirs $(MM_O_FILES)
	@echo Building $(PROJECTNAME) for MM...
	$(LD) $(LD_FLAGS) -T mm.ld -o $@.elf $(MM_O_FILES)

# "packaging"
$(PROJECTNAME): entry dirs $(OOT_10_BIN_PATH)/$(PROJECTNAME) $(OOT_DEBUG_BIN_PATH)/$(PROJECTNAME) $(MM_BIN_PATH)/$(PROJECTNAME)
	@cp $(OOT_10_BIN_PATH)/$(PROJECTNAME).zobj $(BIN_PATH)/$(PROJECTNAME).zobj
	flips.exe --create ./object_horse ./bin/EponaAnimBank.zobj ./bin/EponaAnimBank.bps
	@echo
	@echo Successfully cross-compiled $(PROJECTNAME) for OOT and MM!
	@echo

