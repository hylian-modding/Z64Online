#include "GetLink.h"
#include "HaxBase.h"

void update(void *thisx, GlobalContext *globalCtx) {
  ((ActorFunc)haxPointer->player.update)(thisx, globalCtx);
}

void draw(void *thisx, GlobalContext *globalCtx) {
  ((ActorFunc)haxPointer->player.draw)(thisx, globalCtx);
}

void updateClone(void *thisx, GlobalContext *globalCtx) {
  haxPointer->clone.inst->world.pos = haxPointer->player.inst->world.pos;
  haxPointer->clone.inst->world.rot = haxPointer->player.inst->world.rot;
  haxPointer->clone.inst->shape.rot = haxPointer->player.inst->shape.rot;
}

void drawClone(void *thisx, GlobalContext *globalCtx) {
  ((ActorFunc)haxPointer->clone.draw)(thisx, globalCtx);
}

void doInject(void *this, GlobalContext *globalCtx, uint32_t pointer) {
  // Setup pointer.
  En_HaxBase *thisx = ((En_HaxBase *)this);
  haxPointer = thisx;
  Player *player = GET_LINK(globalCtx);
  Actor *target = ((Actor *)pointer);

  setupActorData(&player->actor, &thisx->player);
  setupActorData(target, &thisx->target);

  thisx->Actor_SpawnWithAddress(globalCtx, target->id, target->params,
                                &target->home.pos, &target->home.rot,
                                ((Actor *)thisx->CLONE_SPACE.pad));

  setupActorData(((Actor *)thisx->CLONE_SPACE.pad), &thisx->clone);

  setupHooks(thisx->player.inst, globalCtx, &update, &draw, 0);
  setupHooks(thisx->clone.inst, globalCtx, &updateClone, &drawClone, 0);

  yeet(thisx->target.inst);

  makeActorInvisible(&player->actor);
}

void doDestroy(void *this, GlobalContext *globalCtx, uint32_t pointer) {

  if (haxPointer == 0) return;

  En_HaxBase *thisx = ((En_HaxBase *)this);

  restoreActorToOriginalState(&thisx->player);
  restoreActorToOriginalState(&thisx->target);
  restoreActorToOriginalState(&thisx->clone);

  Actor_Kill(thisx->clone.inst);

  wipeActorData(&thisx->player);
  wipeActorData(&thisx->target);
  wipeActorData(&thisx->clone);

  haxPointer = 0;
  
}