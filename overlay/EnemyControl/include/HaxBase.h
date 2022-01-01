#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include <libzelda64.h>
#include "HaxEmbed.h"
#include "ActorData.h"

enum {
    HAXFLAGS_FLY = (1 << 0)
};

typedef struct {
    float frict;
    float accel;
    float maxSpeed;
    float speedRate;
    float orbitDist;
    Vec3f orbitOffset;
} ActorPhysics_t;

typedef struct{
    ActorData_t link;
    ActorData_t target;
    Vec3f euler;
    uint32_t flags;
    uint32_t state;
    ActorPhysics_t physics;
    PlayerUpdateReturn dataLastFrame;
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void init(void* thisx, GlobalContext* globalCtx);
extern void destroy(void* thisx, GlobalContext* globalCtx);
extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */