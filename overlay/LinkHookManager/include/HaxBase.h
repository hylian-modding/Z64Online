#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include <libzelda64.h>

#define HAXBASE_FUNCS_SIZE (0x10)

typedef struct{
    u32 timer;
    ActorFunc update;
    ActorFunc draw;
    u32 hook;
    ActorFunc update_funcs[HAXBASE_FUNCS_SIZE];
    ActorFunc draw_funcs[HAXBASE_FUNCS_SIZE];
    ActorFunc update_funcs_post[HAXBASE_FUNCS_SIZE];
    ActorFunc draw_funcs_post[HAXBASE_FUNCS_SIZE];
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, PlayState* play);
extern void draw(void* thisx, PlayState* play);

#endif /* __OVL_EN_HAXBASE__ */