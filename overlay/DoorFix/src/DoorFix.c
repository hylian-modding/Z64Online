#include "En_Door.h"

void update(void *thisx, GlobalContext *globalCtx)
{
    haxPointer->alive++;
    Actor *actor = ((Actor *)thisx);
#ifdef GAME_OOT
    switch (actor->id)
    {
    case 0x0009:
    {
        EnDoor *door = ((EnDoor *)thisx);
        door->ext.update(thisx, globalCtx);
        if (door->lockTimer == 0)
            return;
        if (Flags_GetSwitch(globalCtx, door->actor.params & 0x3F))
        {
            if (door->lockTimer > 0)
                door->lockTimer--;
        }
        break;
    }
    case 0x002E:
    {
        DoorShutter *door = ((EnDoor *)thisx);
        door->ext.update(thisx, globalCtx);
        if (door->lockTimer == 0)
            return;
        if (Flags_GetSwitch(globalCtx, door->dyna.actor.params & 0x3F))
        {
            if (door->lockTimer > 0)
                door->lockTimer--;
        }
        break;
    }
    }
#elif defined GAME_MM
    DoorShutterMM *door = ((DoorShutterMM *)thisx);
    door->ext.update(thisx, globalCtx);
    if (door->unk_166 == 0)
        return;
    if (Flags_GetSwitch(globalCtx, DOORSHUTTER_GET_7F(&door->actor)))
    {
        if (door->unk_166 > 0)
            door->unk_166--;
    }
#endif
}

void draw(void *thisx, GlobalContext *globalCtx)
{
}

void setupEnDoor(EnDoor *door)
{
    door->ext.label = 0x444F4F52;
    door->ext.update = door->actor.update;
    door->actor.update = &update;
}

void setupShutterDoor(DoorShutter *door)
{
    door->ext.label = 0x444F4F52;
    door->ext.update = door->dyna.actor.update;
    door->dyna.actor.update = &update;
}

void setupDoorMM(DoorShutterMM* door){
    door->ext.label = 0x444F4F52;
    door->ext.update = door->actor.update;
    door->actor.update = &update;
}

void doInject(void *this, GlobalContext *globalCtx, uint32_t pointer)
{
    En_HaxBase *thisx = ((En_HaxBase *)this);
    haxPointer = thisx;
    haxPointer->inst = 0x444F4F52;
    Actor *actor = ((Actor *)pointer);
    if (actor->update == &update)
    {
        return;
    }
    haxPointer->last = actor;
#ifdef GAME_OOT
    switch(actor->id){
        case 0x0009:{
            setupEnDoor(actor);
            break;
        }
        case 0x002E:{
            setupShutterDoor(actor);
            break;
        }
    }
#elif defined GAME_MM
    setupDoorMM(actor);
#endif
}

void doDestroy(void *this, GlobalContext *globalCtx, uint32_t pointer)
{
}