#include "HaxBase.h"
#include "ActorData.h"

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
    actor->freezeTimer = 0xFFFF;
}

void restoreActorToOriginalState(ActorData_t* data){
    data->inst->update = data->update;
    data->inst->draw = data->draw;
    Actor_SetScale(data->inst, data->scale.x);
    data->inst->freezeTimer = 0;
    data->inst->world = data->pos;
}

void wipeActorData(ActorData_t* data){
    data->inst = 0;
    data->update = 0;
    data->draw = 0;
    data->behavior = 0;
    data->scale.x = 0;
    data->scale.y = 0;
    data->scale.z = 0;
    data->pos.pos.x = 0;
    data->pos.pos.y = 0;
    data->pos.pos.z = 0;
    data->pos.rot.x = 0;
    data->pos.rot.x = 0;
    data->pos.rot.x = 0;
}