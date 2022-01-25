#include "HaxBase.h"

void update(void* thisx, GlobalContext* globalCtx)
{
    ((ActorFunc) haxPointer->update)(thisx, globalCtx);
}

void draw(void* thisx, GlobalContext* globalCtx)
{
    ((ActorFunc) haxPointer->draw)(thisx, globalCtx);
}

#define GANON_BATTLE_ARENA 0x004F

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    haxPointer = thisx;
    thisx->inst = pointer;
    Actor* actor = ((Actor*)thisx->inst);
    thisx->update = actor->update;
    thisx->draw = actor->draw;
    actor->update = &update;
    actor->draw = &draw;
    if (globalCtx->sceneNum == GANON_BATTLE_ARENA) return;
    if (actor->category != ACTORLIST_CATEGORY_CHEST){
        Actor_RemoveFromCategory(globalCtx, &globalCtx->actorCtx, actor);
        Actor_AddToCategory(&globalCtx->actorCtx, actor, ACTORLIST_CATEGORY_CHEST);
    }
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
}
