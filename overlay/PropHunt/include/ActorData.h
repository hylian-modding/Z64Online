#ifndef __ACTOR_DATA_H__
#define __ACTOR_DATA_H__

#include <libzelda64.h>

typedef void (*ActorBehavior)(void* thisx, struct GlobalContext* globalCtx);

typedef struct {
    Actor* inst;
    Vec3f scale;
    PosRot pos;
    uint32_t draw;
    uint32_t update;
    ActorBehavior behavior;
} ActorData_t;

extern void setupActorData(Actor* actor, ActorData_t* data);
extern void setupHooks(Actor* actor, GlobalContext* globalCtx, void* update, void* draw, void* setup);
extern void makeActorInvisible(Actor* actor);
extern void yeet(Actor* actor);
extern void restoreActorToOriginalState(ActorData_t* data);
extern void wipeActorData(ActorData_t* data);

#endif /* __ACTOR_DATA_H__ */