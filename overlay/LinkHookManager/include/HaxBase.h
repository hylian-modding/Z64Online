#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include <libzelda64.h>

#define HAXBASE_FUNCS_SIZE (0x10)

typedef struct{
    /* 0x000 */ u32 timer;
    /* 0x004 */ ActorFunc update;
    /* 0x008 */ ActorFunc draw;
    /* 0x00C */ u32 hook;
    /* 0x010 */ ActorFunc update_funcs[HAXBASE_FUNCS_SIZE];
    /* 0x050 */ ActorFunc draw_funcs[HAXBASE_FUNCS_SIZE];
    /* 0x090 */ ActorFunc update_funcs_post[HAXBASE_FUNCS_SIZE];
    /* 0x0D0 */ ActorFunc draw_funcs_post[HAXBASE_FUNCS_SIZE];
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */