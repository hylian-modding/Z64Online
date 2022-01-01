#ifndef EN_DOOR_H
#define EN_DOOR_H

#include <libzelda64.h>
#include "Helpers.h"
#include "HaxBase.h"

typedef void (*EnDoorActionFunc)(struct EnDoor*, GlobalContext*);

typedef struct EnDoor {
    /* 0x0000 */ Actor actor;
    /* 0x014C */ SkelAnime skelAnime;
    /* 0x0190 */ u8 animStyle; // Must be at same offset as animStyle in DoorKiller due to the cast in func_80839800
    /* 0x0191 */ u8 playerIsOpening; // Must be at same offset as playerIsOpening in DoorKiller due to the cast in func_80839800
    /* 0x0192 */ u8 unk_192;
    /* 0x0193 */ s8 requiredObjBankIndex;
    /* 0x0194 */ s8 dListIndex;
    /* 0x0196 */ s16 lockTimer;
    /* 0x0198 */ Vec3s jointTable[5];
    /* 0x01B6 */ Vec3s morphTable[5];
    /* 0x01D4 */ EnDoorActionFunc actionFunc;
} EnDoor; // size = 0x01D8

#endif /* EN_DOOR_H */