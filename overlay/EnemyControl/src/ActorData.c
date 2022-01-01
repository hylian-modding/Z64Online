#include <libzelda64.h>
#include "ActorData.h"
#include "HaxBase.h"

void setupActorData(Actor* actor, ActorData_t* data){
    data->inst = actor;
    data->scale = actor->scale;
    data->pos = actor->world;
    data->update = actor->update;
    data->draw = actor->draw;
}

void setupHooks(Actor* actor, GlobalContext* globalCtx, void* update, void* draw, void* setup){
    actor->update = update;
    actor->draw = draw;
    if (setup > 0){
        ((ActorBehavior)setup)(actor, globalCtx);
    }
}

void makeActorInvisible(Actor* actor){
    Actor_SetScale(actor, 0);
}

void yeet(Actor* actor){
    actor->world.pos.x = 8192.0f;
    actor->world.pos.y = -2048.0f;
    actor->world.pos.z = 8192.0f;
}

__attribute__((always_inline)) inline void Vec3fNormalize_Local(Vec3f* vec) {
    float norm = sqrt((vec->x * vec->x) + (vec->y * vec->y) + (vec->z * vec->z));

    if (norm != 0.0f) {
        vec->x /= norm;
        vec->y /= norm;
        vec->z /= norm;
    }
    else {
        vec->x = vec->y = vec->z = 0.0f;
    }
}

uint32_t Actor_PlayerUpdate(Actor* this, GlobalContext* globalCtx) {
    Input* cont0 = &globalCtx->game.input[0];
    Camera* cam = globalCtx->cameraPtrs[globalCtx->activeCamera];
    Vec3f fwd;
    Vec3f rgh;
    Vec3f up;
    Vec3f wishdir;
    float v = 0.0f;
    float h = 0.0f;
    float j = 0.0f;
    float speed = 0.0f;
    float newSpeed = 0.0f;
    PlayerUpdateReturn result;

    globalCtx->actorCtx.actorLists[ACTORCAT_PLAYER].head->freezeTimer = 2;

    // THE CAMERA IS OURS
    cam->setting = 33;
    cam->mode = 18;

    if ((cont0->cur.button & R_TRIG) != 0) {
        j += 1.0f;
        result.jp = 1;
    }

    if ((cont0->cur.button & L_TRIG) != 0) {
        j -= 1.0f;
        result.jn = 1;
    }

    if ((cont0->cur.button & U_CBUTTONS) != 0) {
        v += 1.0f;
        result.vp = 1;
    }

    if ((cont0->cur.button & R_CBUTTONS) != 0) {
        h += 1.0f;
        result.hp = 1;
    }

    if ((cont0->cur.button & D_CBUTTONS) != 0) {
        v -= 1.0f;
        result.vn = 1;
    }

    if ((cont0->cur.button & L_CBUTTONS) != 0) {
        h -= 1.0f;
        result.hn = 1;
    }

    up = cam->up;
    fwd = cam->at;
    fwd.x -= (cam->eye.x + wishdir.x + haxPointer->physics.orbitOffset.x);
    fwd.y -= (cam->eye.y + wishdir.y + haxPointer->physics.orbitOffset.y);
    fwd.z -= (cam->eye.z + wishdir.z + haxPointer->physics.orbitOffset.z);

    Vec3fNormalize_Local(&fwd);

    // cross fwd by up to make right
    rgh.x = fwd.y * up.z - up.y * fwd.z;
    rgh.y = fwd.z * up.x - up.z * fwd.x;
    rgh.z = fwd.x * up.y - up.x * fwd.y;

    wishdir.x = (fwd.x * v) + (rgh.x * h) + (up.x * j);
    wishdir.y = (fwd.y * v) + (rgh.y * h) + (up.y * j);
    wishdir.z = (fwd.z * v) + (rgh.z * h) + (up.z * j);

    if ((haxPointer->flags & HAXFLAGS_FLY) == 0) {
        wishdir.y = 0;
    }
    Vec3fNormalize_Local(&wishdir);

    speed = Math3D_Vec3fMagnitude(&this->velocity);
    newSpeed = speed - haxPointer->physics.frict;

    if (speed <= 0.0f) speed = 0.0f;
    if (newSpeed <= 0.0f) newSpeed = 0.0f;

    // if there is no input
    if (v == 0 && h == 0 && j == 0) {
        if (speed != 0) {
            // unit vector for vel becomes wishdir
            wishdir.x = this->velocity.x / speed;
            wishdir.y = this->velocity.y / speed;
            wishdir.z = this->velocity.z / speed;
        }
        else {
            // otherwise camera direction is the unit vector for vel :shrug:
            wishdir.x = fwd.x;
            wishdir.y = fwd.y;
            wishdir.z = fwd.z;
        }
    }
    else if (newSpeed < haxPointer->physics.maxSpeed) {
        newSpeed += haxPointer->physics.accel;
    }

    // newSpeed is just speed with frict applied, and accell added if we are moving
    this->velocity.x = wishdir.x * newSpeed;
    this->velocity.y = wishdir.y * newSpeed;
    this->velocity.z = wishdir.z * newSpeed;

    // Handle NaN
    if (this->world.pos.x != this->world.pos.x) {
        this->world.pos.x = 0.0f;
        this->world.pos.y = 0.0f;
        this->world.pos.z = 0.0f;
    }

    if (this->velocity.x != this->velocity.x) {
        this->velocity.x = 0.0f;
        this->velocity.y = 0.0f;
        this->velocity.z = 0.0f;
    }

    // Update position
    this->world.pos.x += (this->velocity.x * haxPointer->physics.speedRate);
    this->world.pos.y += (this->velocity.y * haxPointer->physics.speedRate);
    this->world.pos.z += (this->velocity.z * haxPointer->physics.speedRate);
    this->focus.pos.x = this->world.pos.x;
    this->focus.pos.y = this->world.pos.y + this->shape.yOffset;
    this->focus.pos.z = this->world.pos.z;

    // divide by 128 to normalize from 0->1, multiply by 0.25 to make it not super fast?
    haxPointer->euler.x += (((float)cont0->cur.stick_y) * 0.0078125f) * 0.25f;
    haxPointer->euler.y += (((float)cont0->cur.stick_x) * -0.0078125f) * 0.25f;
    
    this->world.rot.y = ((uint16_t)(haxPointer->euler.y * RAD2S) - 0x8000);
    this->shape.rot.y = this->world.rot.y;

    if ((haxPointer->flags & HAXFLAGS_FLY) == 0) {
        this->world.rot.x = haxPointer->euler.x * RAD2S;
        this->shape.rot.x = this->world.rot.x;
    }

    // wishdir is now orbit's forward vector
    wishdir.x = (Math_CosF(haxPointer->euler.x) * Math_SinF(haxPointer->euler.y)) * haxPointer->physics.orbitDist;
    wishdir.y = (Math_SinF(haxPointer->euler.x)) * haxPointer->physics.orbitDist;
    wishdir.z = (Math_CosF(haxPointer->euler.x) * Math_CosF(haxPointer->euler.y)) * haxPointer->physics.orbitDist;

    cam->at = this->focus.pos;
    cam->eye.x = cam->at.x + wishdir.x + haxPointer->physics.orbitOffset.x;
    cam->eye.y = cam->at.y + wishdir.y + haxPointer->physics.orbitOffset.y;
    cam->eye.z = cam->at.z + wishdir.z + haxPointer->physics.orbitOffset.z;

    result.buttons = cont0->cur.button;
    return result.dirty;
}
