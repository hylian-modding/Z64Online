#ifndef __OVL_EN_NAVIHAX__
#define __OVL_EN_NAVIHAX__

#include <libzelda64.h>
#include "HaxInject.h"

#define ModelPointer uint32_t
#define FuncPointer uint32_t
#define boolean uint8_t
#define true 1;
#define false 0;

enum NAVIHAX_STATUS{
    UNINITIALIZED,
    OK,
    ERRORED,
    DEAD
};

typedef struct{
    uint8_t stuff_I_dont_care_about_right_now[0x1C];
    uint32_t pointer;
    uint32_t de;
    uint32_t model;
} En_Header;

typedef struct{
    uint32_t status;
    ModelPointer model;
    FuncPointer update;
    FuncPointer draw;
} En_NaviHax;

static En_NaviHax* haxPointer = 0;

static void init(void* thisx, GlobalContext* globalCtx);
static void destroy(void* thisx, GlobalContext* globalCtx);
static void update(void* thisx, GlobalContext* globalCtx);
static void draw(void* thisx, GlobalContext* globalCtx);

/** Why doesn't this work in MM? */
static Player* GET_LINK(GlobalContext* globalCtx){
#ifdef GAME_OOT
    Player* player = globalCtx->actorCtx.actorLists[ACTORLIST_CATEGORY_PLAYER].head;
    return player;
#elif defined GAME_MM
    return ((Player*)0x803FFDB0);
#endif
}

#endif /* __OVL_EN_NAVIHAX__ */