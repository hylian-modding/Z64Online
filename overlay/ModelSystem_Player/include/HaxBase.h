#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include "HaxEmbed.h"
#include "LinkHookManager.h"

typedef struct{
    /* 0x00 */ uint32_t adult;
    /* 0x04 */ uint32_t child;
    /* 0x08 */ uint32_t deku;
    /* 0x0C */ uint32_t goron;
    /* 0x10 */ uint32_t zora;
    /* 0x14 */ uint32_t fd;
} En_Forms; /* 0x18 */

typedef struct{
    /* 0x00 */ En_Forms* inst;
    /* 0x04 */ uint32_t segment;
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void draw(void* thisx, GlobalContext* globalCtx);
extern void update(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */