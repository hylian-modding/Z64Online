#ifndef PUPPET_LINKHOOKMANAGER_H
#define PUPPET_LINKHOOKMANAGER_H

#include <libzelda64.h>

typedef void (*LinkHookFunc)(Actor* actor, PlayState* play);

typedef void (*AddUpdateHook)(LinkHookFunc* hook);
typedef void (*AddDrawHook)(LinkHookFunc* hook);

typedef struct {
    /* 0x00 */ u8 tag[0x8];
    /* 0x08 */ AddUpdateHook update;
    /* 0x0C */ AddDrawHook draw;
    /* 0x10 */ AddUpdateHook update_post;
    /* 0x14 */ AddDrawHook draw_post;
} LinkHooks; /* 0x18 */

extern const LinkHooks gLinkHooks;

#endif

