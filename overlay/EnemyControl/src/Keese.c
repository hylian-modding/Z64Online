#include "Keese.h"

void keeseUpdateHook(void* thisx, GlobalContext* globalCtx){
    EnFirefly* keese = ((EnFirefly*)thisx);
    PlayerUpdateReturn updateData;

    updateData.dirty = Actor_PlayerUpdate(&keese->actor, globalCtx);

    if ((updateData.buttons & Z_TRIG) != 0 && haxPointer->target.behavior != &diveBehavior) {
        setupDive(keese, globalCtx);
        haxPointer->physics.maxSpeed = 3.0f;
    }
    else if ((updateData.buttons & Z_TRIG) == 0 && haxPointer->target.behavior != &flyBehavior) {
        setupFlyIdle(keese, globalCtx);
        haxPointer->physics.maxSpeed = 2.5f;
    }

    haxPointer->target.behavior(keese, globalCtx);
    SkelAnime_Update(&keese->skelAnime);
}

void keeseDrawHook(void* thisx, GlobalContext* globalCtx){
    ((ActorFunc) haxPointer->target.draw)(thisx, globalCtx);
}

void postKeeseHook(Actor* actor, GlobalContext* globalCtx){
    setupFlyIdle((EnFirefly*)actor, globalCtx);
    haxPointer->flags |= HAXFLAGS_FLY;
    haxPointer->physics = keesePhysics;
}

void setupDive(EnFirefly* this, GlobalContext* globalCtx){
    haxPointer->target.behavior = &diveBehavior;
}

void setupFlyIdle(EnFirefly* this, GlobalContext* globalCtx){
    haxPointer->target.behavior = &flyBehavior;
}

void flyBehavior(EnFirefly* this, GlobalContext* globalCtx){
    this->skelAnime.playSpeed = 1.0f;
}

void diveBehavior(EnFirefly* this, GlobalContext* globalCtx){
    if (Animation_OnFrame(&this->skelAnime, 4.0f)) {
        this->skelAnime.playSpeed = 0.0f;
        this->skelAnime.curFrame = 4.0f;
    }
}

void EnFirefly_Extinguish(EnFirefly* this) {
    this->actor.params += 2;
    this->collider.elements[0].info.toucher.effect = 0; // None
    this->auraType = KEESE_AURA_NONE;
    this->onFire = false;
    this->actor.naviEnemyId = 0x12; // Keese
}

void EnFirefly_Ignite(EnFirefly* this) {
    if (this->actor.params == KEESE_ICE_FLY) {
        this->actor.params = KEESE_FIRE_FLY;
    } else {
        this->actor.params -= 2;
    }
    this->collider.elements[0].info.toucher.effect = 1; // Fire
    this->auraType = KEESE_AURA_FIRE;
    this->onFire = true;
    this->actor.naviEnemyId = 0x11; // Fire Keese
}

ActorPhysics_t keesePhysics = {
    .frict = 0.5f,
    .accel = 1.0f,
    .maxSpeed = 3.0f,
    .speedRate = 1.5f,
    .orbitDist = 175.0f,
    .orbitOffset = {
        .x = 0.0f,
        .y = 0.0f,
        .z = 0.0f
    }
};

