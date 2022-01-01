#ifndef __OVL_EN_HAXBASE__
#define __OVL_EN_HAXBASE__

#include "HaxEmbed.h"
#include "ActorData.h"
#include "Actor_SpawnWithAddress.h"

typedef struct{
    // I don't think any actor will be thiccer than this?
    uint8_t pad[0xA94];
} En_CloneSpace_t;

typedef struct{
    Actor_SpawnWithAddress Actor_SpawnWithAddress;
    ActorData_t player;
    ActorData_t target;
    ActorData_t clone;
    En_CloneSpace_t CLONE_SPACE;
} En_HaxBase;

extern En_HaxBase* haxPointer;

extern void update(void* thisx, GlobalContext* globalCtx);
extern void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_HAXBASE__ */