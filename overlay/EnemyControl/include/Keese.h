#ifndef __KEESE_H__
#define __KEESE_H__

#include <libzelda64.h>
#include "Imports.h"
#include "HaxBase.h"

typedef void (*EnFireflyActionFunc)(struct EnFirefly*, GlobalContext*);

typedef struct EnFirefly {
    Actor actor;
    Vec3f bodyPartsPos[3];
    SkelAnime skelAnime;
    EnFireflyActionFunc actionFunc;
    u8 auraType;
    u8 onFire;
    s16 timer;
    s16 targetPitch;
    Vec3s jointTable[28];
    Vec3s morphTable[28];
    f32 maxAltitude;
    ColliderJntSph collider;
    ColliderJntSphElement colliderItems[1];
} EnFirefly;

typedef enum {
    /* 0 */ KEESE_AURA_NONE,
    /* 1 */ KEESE_AURA_FIRE,
    /* 2 */ KEESE_AURA_ICE
} KeeseAuraType;

typedef enum {
    /* 0 */ KEESE_FIRE_FLY,
    /* 1 */ KEESE_FIRE_PERCH,
    /* 2 */ KEESE_NORMAL_FLY,
    /* 3 */ KEESE_NORMAL_PERCH,
    /* 4 */ KEESE_ICE_FLY
} KeeseType;

extern void setupDive(EnFirefly* this, GlobalContext* globalCtx);
extern void setupFlyIdle(EnFirefly* this, GlobalContext* globalCtx);
extern void flyBehavior(EnFirefly* this, GlobalContext* globalCtx);
extern void diveBehavior(EnFirefly* this, GlobalContext* globalCtx);
extern void EnFirefly_Extinguish(EnFirefly* this);
extern void EnFirefly_Ignite(EnFirefly* this);
extern void keeseUpdateHook(void* thisx, GlobalContext* globalCtx);
extern void keeseDrawHook(void* thisx, GlobalContext* globalCtx);
extern void postKeeseHook(Actor* actor, GlobalContext* globalCtx);

extern ActorPhysics_t keesePhysics;

#endif /* __KEESE_H__ */