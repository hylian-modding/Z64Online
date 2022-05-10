#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include "HaxEmbed.h"
#include "SoundManagement.h"

typedef struct{
    /* 0x00 */uint32_t inst;
    /* 0x04 */uint32_t enabled;
    /* 0x08 */uint32_t soundID;
    /* 0x0C */uint32_t dataPointer;
    /* 0x10 */uint32_t lastSound;
    SoundManagementIndexes_t data;
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */