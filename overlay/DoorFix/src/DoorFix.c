#include "En_Door.h"

void update(void* thisx, GlobalContext* globalCtx)
{
    ((ActorFunc) haxPointer->update)(thisx, globalCtx);
    EnDoor* door = ((EnDoor*)thisx);
    if (door->lockTimer == 0) return;
    if (Flags_GetSwitch(globalCtx, door->actor.params & 0x3F)){
        if (door->lockTimer > 0) door->lockTimer--;
    }
}

void draw(void* thisx, GlobalContext* globalCtx)
{
    ((ActorFunc) haxPointer->draw)(thisx, globalCtx);

}

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    haxPointer = thisx;
    thisx->inst = pointer;
    Actor* actor = ((Actor*)thisx->inst);
    thisx->update = actor->update;
    thisx->draw = actor->draw;
    actor->update = &update;
    actor->draw = &draw;
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
}