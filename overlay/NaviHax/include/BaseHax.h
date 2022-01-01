#ifndef __OVL_EN_BASEHAX__
#define __OVL_EN_BASEHAX__

#include "HaxEmbed.h"

typedef struct{
    uint32_t status;
    uint32_t model;
    uint32_t update;
    uint32_t draw;
} En_BaseHax;

extern En_BaseHax* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_BASEHAX__ */