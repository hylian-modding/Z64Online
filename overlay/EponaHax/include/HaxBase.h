#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include "HaxEmbed.h"

typedef struct{
    uint32_t inst; // 0x0
    uint32_t update; // 0x4
    uint32_t draw; // 0x8
    uint32_t model; // 0xC
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */