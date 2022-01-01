#include "BaseHax.h"
#include "NaviHax.h"

void update(void* thisx, GlobalContext* globalCtx)
{
    ((ActorFunc) haxPointer->update)(thisx, globalCtx);
}

void draw(void* thisx, GlobalContext* globalCtx)
{
    En_Header* header = ((En_Header*) haxPointer->model);
    Actor* actor = ((Actor*)thisx);
    DrawDlistOpa(&header->de);
}

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_BaseHax* thisx = ((En_BaseHax*)this);
    thisx->model = pointer;
    Player* player = GET_LINK(globalCtx);
    if (player->naviActor > 0){
        thisx->update = player->naviActor->update;
        thisx->draw = player->naviActor->draw;
        player->naviActor->update = &update;
        player->naviActor->draw = &draw;
        haxPointer = thisx;
        thisx->status = OK;
    }else{
        thisx->status = ERRORED;
    }
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_BaseHax* thisx = ((En_BaseHax*)this);
    if (pointer == 0){
        Player* player = GET_LINK(globalCtx);
        player->naviActor->update = thisx->update;
        player->naviActor->draw = thisx->draw;
        thisx->status = DEAD;
        return;
    }
}