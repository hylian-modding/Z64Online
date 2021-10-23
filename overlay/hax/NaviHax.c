#include "NaviHax.h"
#include <libzelda64.h>

static void init(void* thisx, GlobalContext* globalCtx)
{
    haxPointer = ((uint32_t)thisx);
    Player* player = globalCtx->actorCtx.actorLists[ACTORLIST_CATEGORY_PLAYER].head;
    player->naviActor->draw = &draw;
}

static void destroy(void* thisx, GlobalContext* globalCtx)
{
}

static void update(void* thisx, GlobalContext* globalCtx)
{
}

static void draw(void* thisx, GlobalContext* globalCtx)
{
    DrawDlistOpa(haxPointer);
}

ActorInit initVars = {
    .id = 5
    , .category = ACTORLIST_CATEGORY_NPC
    , .flags = (ACTORFLAG_NOP)
    , .objectId = 1
    , .instanceSize = sizeof(Actor)
    , .init = init
    , .destroy = destroy
    , .update = update
    , .draw = draw
};