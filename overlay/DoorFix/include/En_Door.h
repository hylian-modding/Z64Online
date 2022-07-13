#ifndef EN_DOOR_H
#define EN_DOOR_H

#include <libzelda64.h>
#include "Helpers.h"
#include "HaxBase.h"

#define PlayState GlobalContext

typedef void (*EnDoorActionFunc)(struct EnDoor*, GlobalContext*);
typedef void (*DoorShutterActionFunc)(struct DoorShutter*, PlayState*);

typedef struct EnDoor_Ext{
    u32 label;
    ActorFunc update;
    u8 padding[0x8];
} EnDoor_Ext;

typedef struct DoorShutter {
    /* 0x0000 */ DynaPolyActor dyna;
    /* 0x0164 */ s16 unk_164;
    /* 0x0166 */ s16 unk_166;
    /* 0x0168 */ s16 unk_168;
    /* 0x016A */ u8 doorType;
    /* 0x016B */ u8 unk_16B;
    /* 0x016C */ u8 unk_16C;
    /* 0x016D */ s8 requiredObjBankIndex;
    /* 0x016E */ s8 lockTimer; // verified.
    /* 0x016F */ s8 unk_16F;
    /* 0x0170 */ f32 unk_170;
    /* 0x0174 */ DoorShutterActionFunc actionFunc;
                 EnDoor_Ext ext;
} DoorShutter; // size = 0x0178

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
                 EnDoor_Ext ext;
} EnDoor; // size = 0x01D8

#define UNK_TYPE1 u8

#define DOORSHUTTER_GET_7F(thisx) ((thisx)->params & 0x7F)

typedef struct DoorShutterMM {
    /* 0x0000 */ Actor actor;
    /* 0x0144 */ UNK_TYPE1 unk144[0x18];
    /* 0x015C */ s16 unk_15C;
    /* 0x015E */ s16 unk_15E;
    /* 0x0160 */ s16 unk_160;
    /* 0x0162 */ u8 doorType;
    /* 0x0163 */ u8 unk_163;
    /* 0x0164 */ u8 unk_164;
    /* 0x0165 */ s8 requiredObjBankIndex;
    /* 0x0166 */ s8 unk_166; // lock timer?
    /* 0x0167 */ s8 unk_167;
    /* 0x0168 */ f32 unk_168;
    /* 0x016C */ DoorShutterActionFunc actionFunc;
                 EnDoor_Ext ext;
} DoorShutterMM; // size = 0x170

#endif /* EN_DOOR_H */