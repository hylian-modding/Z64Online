PROGRAM = EnemyControl
ADDRESS = 0x80800000

OOT_BIN_PATH = bin_oot
MM_BIN_PATH = bin_mm
BIN_PATH = bin

SRC_DIRS  = src
C_FILES   = $(foreach dir,$(SRC_DIRS),$(wildcard $(dir)/*.c))
OOT_O_FILES := $(foreach file,$(C_FILES),$(OOT_BIN_PATH)/$(file).o)
MM_O_FILES := $(foreach file,$(C_FILES),$(MM_BIN_PATH)/$(file).o)

ifeq ($(shell type mips64-gcc >/dev/null 2>/dev/null; echo $$?), 0)
	CROSS := mips64-
else ifeq ($(shell type mips-linux-gnu-gcc >/dev/null 2>/dev/null; echo $$?), 0)
	CROSS := mips-linux-gnu-
else
	CROSS := mips64-elf-
endif

CC		= $(CROSS)gcc
LD		= $(CROSS)ld
OBJDUMP	= $(CROSS)objdump
NOVL	= nOVL

CFLAGS = -I$(LIBZ64_PATH) -Iinclude -I$(LIBZ64_PATH)/libultra -D_LANGUAGE_C -DF3DEX_GBI_2 -D_MLDEBUG -G 0 -Ofast	\
-std=gnu11 -mtune=vr4300 -march=vr4300 -mabi=32 -mips3							\
-mno-shared -mdivide-breaks -mno-explicit-relocs -mno-memcpy					\
-mno-check-zero-division -ffreestanding -fno-reorder-blocks -w

LDFLAGS = -L$(LIBZ64_PATH) -T libzelda64.ld --emit-relocs

default: entry dirs $(PROGRAM)

$(OOT_BIN_PATH)/%.c.o: %.c dirs
	$(CC) -c $(CFLAGS) -DGAME_OOT -DGAME_VERSION_1_0 -o $@ $<

$(MM_BIN_PATH)/%.c.o: %.c dirs
	$(CC) -c $(CFLAGS) -DGAME_MM -DGAME_VERSION_1_0 -D_FINALROM -o $@ $<

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

