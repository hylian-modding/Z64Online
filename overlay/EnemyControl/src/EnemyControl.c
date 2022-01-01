#include <libzelda64.h>
#include "GetLink.h"
#include "Imports.h"
#include "HaxBase.h"
#include "Enemies.h"

void update(void* thisx, GlobalContext* globalCtx) {
    ((ActorFunc) haxPointer->link.update)(thisx, globalCtx);
}

void draw(void* thisx, GlobalContext* globalCtx) {
    // Run Link's normal draw function so the game doesn't explode.
    ((ActorFunc) haxPointer->link.draw)(thisx, globalCtx);
}

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer) {
    // Setup context pointer.
    En_HaxBase* thisx = ((En_HaxBase*)this);
    Player* link;
    Actor* target;

    haxPointer = thisx;
    
    link = GET_LINK(globalCtx);
    setupActorData(&link->actor, &thisx->link);
    makeActorInvisible(&link->actor);
    Actor_Kill(link->naviActor);
    target = (Actor*)pointer;
    setupActorData(target, &thisx->target);

    setupHooks(thisx->link.inst, globalCtx, &update, &draw, 0);
    setupHooks(thisx->target.inst, globalCtx, &stalfosUpdateHook, &stalfosDrawHook, &stalfosPostHook);
    
    thisx->target.inst->world = thisx->link.inst->world;
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer) {
    En_HaxBase* thisx = ((En_HaxBase*)this);
    if (pointer == 0){
        return;
    }
}