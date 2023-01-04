#ifndef LHM_H
#define LHM_H

#include <libzelda64.h>

typedef void (*LinkHookFunc)(struct Actor* actor, struct PlayState* play);
typedef void (*AddUpdateHook)(LinkHookFunc* hook);
typedef void (*AddDrawHook)(LinkHookFunc* hook);

typedef struct{
    u8 tag[0x8];
    AddUpdateHook update;
    AddDrawHook draw;
    AddUpdateHook update_post;
    AddDrawHook draw_post;
} LinkHooks_t;

extern const LinkHooks_t linkHooks;

extern u32 isGameReady;
asm("isGameReady = 0x800F13A0");

extern u8 doesLinkExist;
asm("doesLinkExist = 0x800E854E");

#endif