#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include <libzelda64.h>
#include "HaxEmbed.h"

typedef struct{
    Actor* inst;
    uint32_t update;
} Door_Data;

#define DOORS_MAX 0xFF

typedef struct{
    uint8_t index;
    Door_Data doors[DOORS_MAX];
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */