#include "En_Door.h"

void update(void* thisx, GlobalContext* globalCtx)
{
    for (uint8_t i = 0; i < DOORS_MAX; i++){
        if (haxPointer->doors[i].inst == thisx){
            ((ActorFunc) haxPointer->doors[i].update)(thisx, globalCtx);
            break;
        }
    }
    #ifdef GAME_OOT
    EnDoor* door = ((EnDoor*)thisx);
    if (door->lockTimer == 0) return;
    if (Flags_GetSwitch(globalCtx, door->actor.params & 0x3F)){
        if (door->lockTimer > 0) door->lockTimer--;
    }
    #elif defined GAME_MM
    EnDoorMM* door = ((EnDoorMM*)thisx);
    if (door->lockTimer == 0) return;
    if (Flags_GetSwitch(globalCtx, door->actor.params & 0x3F)){
        if (door->lockTimer > 0) door->lockTimer--;
    }
    #endif
}

void draw(void* thisx, GlobalContext* globalCtx)
{
}

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    haxPointer = thisx;
    Actor* actor = ((Actor*)pointer);
    if (actor->update == &update){
        return;
    }
    #ifdef GAME_OOT
    s32 doorType = actor->params >> 7 & 7;
    if (doorType != DOOR_LOCKED){
        return;
    }
    #elif defined GAME_MM
    EnDoorMM* door = (EnDoorMM*) actor;
    u8 isDoorLocked = door->lockTimer;
    if (isDoorLocked != MM_IS_DOOR_LOCKED){
        return;
    }
    #endif
    for (uint8_t i = 0; i < DOORS_MAX; i++){
        if (thisx->doors[i].inst != NULL){
            if (thisx->doors[i].inst == actor){
                thisx->doors[i].inst = NULL;
                thisx->doors[i].update = NULL;
                break;
            }
        }
    }
    uint8_t slot = thisx->index++;
    thisx->doors[slot].inst = actor;
    thisx->doors[slot].update = actor->update;
    actor->update = &update;
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    for (uint8_t i = 0; i < DOORS_MAX; i++){
        if (thisx->doors[i].inst != NULL){
            thisx->doors[i].inst = NULL;
            thisx->doors[i].update = NULL;
            thisx->index = 0;
        }
    }
}