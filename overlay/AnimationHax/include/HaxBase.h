#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include "HaxEmbed.h"

typedef struct AnimationOverride{
    uint32_t frames;
    uint32_t pointer;
} AnimationOverride;

typedef struct{
    uint32_t inst;
    uint32_t vrom;
    uint32_t vromnew;
    uint32_t debug[1];
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */