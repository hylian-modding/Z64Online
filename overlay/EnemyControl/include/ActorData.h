#ifndef __ACTOR_DATA_H__
#define __ACTOR_DATA_H__

#include <libzelda64.h>

typedef void (*ActorBehavior)(void* this, struct GlobalContext* globalCtx);

typedef struct {
    Actor* inst;
    Vec3f scale;
    PosRot pos;
    uint32_t draw;
    uint32_t update;
    ActorBehavior behavior;
} ActorData_t;

typedef union {
    struct {
        uint16_t buttons;
        struct {
            int8_t vp : 1;
            int8_t vn : 1;
            int8_t hp : 1;
            int8_t hn : 1;
            int8_t jp : 1;
            int8_t jn : 1;
            uint8_t unused_6 : 1;
            uint8_t unused_7 : 1;
        };
        uint8_t pad;
    };
    uint32_t dirty;
} PlayerUpdateReturn;

extern void setupActorData(Actor* actor, ActorData_t* data);
extern void setupHooks(Actor* actor, GlobalContext* globalCtx, void* update, void* draw, void* setup);
extern void makeActorInvisible(Actor* actor);
extern void Vec3fNormalize_Local(Vec3f* vec);
extern uint32_t Actor_PlayerUpdate(Actor* this, GlobalContext* globalCtx);
extern void yeet(Actor* actor);

#endif /* __ACTOR_DATA_H__ */