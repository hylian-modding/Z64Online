#include "NaviHax.h"
#include <libzelda64.h>

static void destroy(En_NaviHax* thisx, GlobalContext* globalCtx, ModelPointer pointer)
{
    Player* player = globalCtx->actorCtx.actorLists[ACTORLIST_CATEGORY_PLAYER].head;
    player->naviActor->draw = thisx->draw;
    thisx->status = DEAD;
}

static void init(En_NaviHax* thisx, GlobalContext* globalCtx, ModelPointer pointer)
{
    if (pointer == 0){
        destroy(thisx, globalCtx, pointer);
        return;
    }
    thisx->model = pointer;
    Player* player = globalCtx->actorCtx.actorLists[ACTORLIST_CATEGORY_PLAYER].head;
    if (player->naviActor > 0){
        thisx->draw = player->naviActor->draw;
        player->naviActor->draw = &draw;
        haxPointer = thisx;

        En_Header* header = ((En_Header*) thisx->model);

        if (header->pointer > 0){
           En_Skel* skel = ((En_Skel*) header->pointer);
          if (skel->pointer > 0){
             thisx->hasSkeleton = true;
                SkelAnime_Init(globalCtx, &thisx->skelanime, skel->pointer, 0, &thisx->jointTable, &thisx->morphTable, skel->total);
            }
        }
        thisx->status = OK;
    }else{
        thisx->status = ERRORED;
    }
}

s32 SkelAnime_Update(SkelAnime* skelAnime) {
    return skelAnime->update(skelAnime);
}

static void update(void* thisx, GlobalContext* globalCtx)
{
}

static void draw(void* thisx, GlobalContext* globalCtx)
{
    if (haxPointer->hasSkeleton){
        SkelAnime_Update(&haxPointer->skelanime);
        SkelAnime_DrawOpa(globalCtx, haxPointer->skelanime.skeleton, &haxPointer->jointTable, 0, 0, thisx);
    }else{
        En_Header* header = ((En_Header*) haxPointer->model);
        DrawDlistOpa(&header->de);
    }
}

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