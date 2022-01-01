#include "HaxBase.h"

void update(void* thisx, GlobalContext* globalCtx)
{
    ((ActorFunc) haxPointer->update)(thisx, globalCtx);
}

void draw(void* thisx, GlobalContext* globalCtx)
{
    if (haxPointer->model > 0){
        DrawDlistOpa(haxPointer->model + 0x4C0);
    }else{
        ((ActorFunc) haxPointer->draw)(thisx, globalCtx);
    }
}

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    haxPointer = thisx;
    Actor* actor = ((Actor*)thisx->inst);
    thisx->update = actor->update;
    thisx->draw = actor->draw;
    thisx->model = pointer;

    actor->update = &update;
    actor->draw = &draw;
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    if (pointer == 0){
        Actor* actor = ((Actor*)thisx->inst);
        actor->update = thisx->update;
        actor->draw = thisx->draw;
        return;
    }
}