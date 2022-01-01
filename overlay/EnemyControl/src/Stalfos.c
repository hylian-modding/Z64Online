#include "Stalfos.h"

void stalfos_walkingBehavior(Actor* actor, GlobalContext* globalCtx) {
    EnTest* stalfos = (EnTest*)actor;
    if (haxPointer->state != STALFOS_STATUS_WALKING) {
        Animation_PlayLoop(&stalfos->skelAnime, &gStalfosFastAdvanceAnim);
        if (haxPointer->dataLastFrame.vn) {
            Animation_Reverse(&stalfos->skelAnime);
        }
        haxPointer->state = STALFOS_STATUS_WALKING;
    }
}

void stalfos_setupWalking(Actor* actor, GlobalContext* globalCtx) {
    haxPointer->target.behavior = &stalfos_walkingBehavior;
}

void stalfos_idleBehavior(Actor* actor, GlobalContext* globalCtx) {
    EnTest* stalfos = (EnTest*)actor;
    if (haxPointer->state != STALFOS_STATUS_IDLE) {
        Animation_PlayLoop(&stalfos->skelAnime, &gStalfosMiddleGuardAnim);
        haxPointer->state = STALFOS_STATUS_IDLE;
    }
}

void stalfos_setupIdle(Actor* actor, GlobalContext* globalCtx) {
    haxPointer->target.behavior = &stalfos_idleBehavior;
}

void stalfos_sidestepBehavior(Actor* actor, GlobalContext* globalCtx) {
    EnTest *stalfos = (EnTest *)actor;
    if (haxPointer->state != STALFOS_STATUS_SIDESTEP) {
        Animation_PlayLoop(&stalfos->skelAnime, &gStalfosSidestepAnim);
        if (haxPointer->dataLastFrame.hn) {
            Animation_Reverse(&stalfos->skelAnime);
        }
        haxPointer->state = STALFOS_STATUS_SIDESTEP;
    }
}

void stalfos_setupSidestep(Actor* actor, GlobalContext* globalCtx) {
    haxPointer->target.behavior = &stalfos_sidestepBehavior;
}

void stalfos_swingSwordBehavior(Actor* actor, GlobalContext* globalCtx) {
    EnTest* stalfos = (EnTest*)actor;
    if (haxPointer->state != STALFOS_STATUS_SWORD) {
        // random is now HD
        if (Rand_S16Offset(0, 32768) < 16383) {
            Animation_PlayOnce(&stalfos->skelAnime, &gStalfosUpSlashAnim);
        }
        else {
            Animation_PlayOnce(&stalfos->skelAnime, &gStalfosDownSlashAnim);
        }
        haxPointer->state = STALFOS_STATUS_SWORD;
    }
    else if (stalfos->skelAnime.curFrame == stalfos->skelAnime.animLength - 1) {
        // Swing ended?
        stalfos_setupIdle(actor, globalCtx);
    }
}

void stalfos_setupSwingSword(Actor* actor, GlobalContext* globalCtx) {
    haxPointer->target.behavior = &stalfos_swingSwordBehavior;
}

void stalfos_shieldBehavior(Actor* actor, GlobalContext* globalCtx) {
    EnTest* stalfos = (EnTest *)actor;
    if (haxPointer->state != STALFOS_STATUS_SHIELD) {
        Animation_PlayOnce(&stalfos->skelAnime, &gStalfosBlockWithShieldAnim);
        haxPointer->state = STALFOS_STATUS_SHIELD;
    }
    if ((haxPointer->dataLastFrame.buttons & R_TRIG) == 0) {
        stalfos_setupIdle(actor, globalCtx);
    }
}

void stalfos_setupShield(Actor* actor, GlobalContext* globalCtx) {
    haxPointer->target.behavior = &stalfos_shieldBehavior;
}

void stalfosUpdateHook(void* thisx, GlobalContext* globalCtx) {
    EnTest* stalfos = (EnTest*)thisx;
    PlayerUpdateReturn updateData;

    updateData.dirty = Actor_PlayerUpdate((Actor *)thisx, globalCtx);

    haxPointer->dataLastFrame = updateData;

    // walk forward / backward
    if (haxPointer->state != STALFOS_STATUS_SWORD && haxPointer->state != STALFOS_STATUS_SHIELD) {
        if (updateData.vp || updateData.vn) {
            if (haxPointer->state != STALFOS_STATUS_WALKING) {
                stalfos_setupWalking(&stalfos->actor, globalCtx);
            }
        }
        // strafe right / left
        else if (updateData.hp || updateData.hn) {
            if (haxPointer->state != STALFOS_STATUS_SIDESTEP) {
                stalfos_setupSidestep(&stalfos->actor, globalCtx);
            }
        }
        else {
            if (haxPointer->state != STALFOS_STATUS_IDLE) {
                stalfos_setupIdle(&stalfos->actor, globalCtx);
            }
        }
    }

    // do shielding
    if ((updateData.buttons & R_TRIG) != 0) {
        if (haxPointer->state != STALFOS_STATUS_SHIELD) stalfos_setupShield(&stalfos->actor, globalCtx);
    }
    // jump slash
    else if ((updateData.buttons & Z_TRIG) && (updateData.buttons & B_BUTTON) != 0) {
    }
    // swing sword
    else if ((updateData.buttons & B_BUTTON) != 0) {
        if (haxPointer->state != STALFOS_STATUS_SWORD) {
            stalfos_setupSwingSword(&stalfos->actor, globalCtx);
        }
    }
    // jump ?
    else if ((updateData.buttons & A_BUTTON) != 0) {
    }
    // taunt
    else if ((updateData.buttons & L_TRIG) != 0) {
    }

    haxPointer->target.behavior(thisx, globalCtx);

    SkelAnime_Update(&stalfos->skelAnime);
    SkelAnime_Update(&stalfos->upperSkelanime);
    Collider_UpdateCylinder(&stalfos->actor, &stalfos->bodyCollider);
    Collider_UpdateCylinder(&stalfos->actor, &stalfos->shieldCollider);
    CollisionCheck_SetAC(globalCtx, &globalCtx->colChkCtx, &stalfos->bodyCollider.base);
    CollisionCheck_SetOC(globalCtx, &globalCtx->colChkCtx, &stalfos->bodyCollider.base);
    CollisionCheck_SetAC(globalCtx, &globalCtx->colChkCtx, &stalfos->swordCollider.base);
    CollisionCheck_SetOC(globalCtx, &globalCtx->colChkCtx, &stalfos->swordCollider.base);
    CollisionCheck_SetAT(globalCtx, &globalCtx->colChkCtx, &stalfos->swordCollider.base); // ISG POG
    CollisionCheck_SetAC(globalCtx, &globalCtx->colChkCtx, &stalfos->shieldCollider.base);
    CollisionCheck_SetOC(globalCtx, &globalCtx->colChkCtx, &stalfos->shieldCollider.base);
}

void stalfosDrawHook(void* thisx, GlobalContext* globalCtx) {
    EnTest* stalfos = (EnTest *)thisx;
    stalfos->skelAnime.playSpeed = 1.0f;
    stalfos->upperSkelanime.playSpeed = 1.0f;
    ((ActorFunc)haxPointer->target.draw)(thisx, globalCtx);
    Collider_SetQuadVertices(&stalfos->swordCollider, &stalfos->swordCollider.dim.quad[0], &stalfos->swordCollider.dim.quad[1], &stalfos->swordCollider.dim.quad[2], &stalfos->swordCollider.dim.quad[3]);
}

void stalfosPostHook(Actor* actor, GlobalContext* globalCtx) {
    EnTest* stalfos = (EnTest*)actor;
    stalfos_setupIdle(actor, globalCtx);
    haxPointer->physics = stalfosPhysics;
    haxPointer->flags = 0;
}

ActorPhysics_t stalfosPhysics = {
    .frict = 1.5f,
    .accel = 2.0f,
    .maxSpeed = 5.0f,
    .speedRate = 1.5f,
    .orbitDist = 300.0f,
    .orbitOffset = {.x = 0.0f, .y = 120.0f, .z = 0.0f},
};
