#ifndef LHM_H
#define LHM_H

#include <libzelda64.h>

typedef void (*LinkHookFunc)(struct Actor* actor, struct GlobalContext* globalCtx);

typedef void (*AddUpdateHook)(LinkHookFunc* hook);
typedef void (*AddDrawHook)(LinkHookFunc* hook);

typedef struct{
    uint8_t tag[0x8];
    AddUpdateHook update;
    AddDrawHook draw;
    AddUpdateHook update_post;
    AddDrawHook draw_post;
} LinkHooks_t;

extern const LinkHooks_t linkHooks;

#endif