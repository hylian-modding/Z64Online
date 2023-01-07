#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include "HaxEmbed.h"
#include "LinkHookManager.h"

typedef struct{
    /* 0x00 */ u32 adult;
    /* 0x04 */ u32 child;
    /* 0x08 */ u32 deku;
    /* 0x0C */ u32 goron;
    /* 0x10 */ u32 zora;
    /* 0x14 */ u32 fd;
} En_Forms; /* 0x18 */

typedef struct{
    /* 0x00 */ En_Forms* inst;
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void draw(void* thisx, PlayState* play);
extern void update(void* thisx, PlayState* play);

#endif /* __OVL_EN_HAXBASE__ */