#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include <libzelda64.h>
#include "HaxEmbed.h"

typedef struct{
    uint32_t inst;
    uint32_t alive;
    uint32_t last;
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */