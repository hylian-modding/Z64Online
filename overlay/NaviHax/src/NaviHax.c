#include "NaviHax.h"
#include <libzelda64.h>

static void init(void* thisx, GlobalContext* globalCtx)
{
}

static void destroy(void* thisx, GlobalContext* globalCtx)
{
}

static void update(void* thisx, GlobalContext* globalCtx)
{
    ((ActorFunc) haxPointer->update)(thisx, globalCtx);
}

static void draw(void* thisx, GlobalContext* globalCtx)
{
    En_Header* header = ((En_Header*) haxPointer->model);
    DrawDlistOpa(&header->de);
}

static void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_NaviHax* thisx = ((En_NaviHax*)this);
    thisx->model = pointer;
    Player* player = GET_LINK(globalCtx);
    if (player->naviActor > 0){
        thisx->update = player->naviActor->update;
        thisx->draw = player->naviActor->draw;
        player->naviActor->draw = &draw;
        haxPointer = thisx;
        En_Header* header = ((En_Header*) thisx->model);
        thisx->status = OK;
    }else{
        thisx->status = ERRORED;
    }
}

static void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_NaviHax* thisx = ((En_NaviHax*)this);
    if (pointer == 0){
        Player* player = GET_LINK(globalCtx);
        player->naviActor->update = thisx->update;
        player->naviActor->draw = thisx->draw;
        thisx->status = DEAD;
        return;
    }
}

#include "HaxEmbed.h"

ActorInit initVars = {
    .id = 5
    , .category = ACTORLIST_CATEGORY_NPC
    , .flags = (ACTORFLAG_NOP)
    , .objectId = 1
    , .instanceSize = sizeof(En_NaviHax)
    , .init = init
    , .destroy = destroy
    , .update = update
    , .draw = draw
};