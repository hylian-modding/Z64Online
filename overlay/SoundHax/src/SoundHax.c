#include "HaxBase.h"

extern float D_801333E0;
#ifdef GAME_OOT
asm("D_801333E0 = 0x801043A0");
#elif defined GAME_MM
asm("D_801333E0 = 0x801DB4B0");
#endif

extern s8 D_801333E8;
#ifdef GAME_OOT
asm("D_801333E8 = 0x801043A8");
#elif defined GAME_MM
asm("D_801333E8 = 0x801DB4B8");
#endif

void func_8002F7DC(Actor* actor, u16 sfxId) {
    if (actor->category == ACTORCAT_PLAYER && haxPointer->enabled > 0 && sfxId >> 12 == 6){
        haxPointer->soundID = sfxId;
        return;
    }
    Audio_PlaySoundGeneral(sfxId, &actor->projectedPos, 4, &D_801333E0, &D_801333E0, &D_801333E8);
}

void update(void* thisx, GlobalContext* globalCtx)
{
}

void draw(void* thisx, GlobalContext* globalCtx)
{
}

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    haxPointer = thisx;
    haxPointer->inst = &func_8002F7DC;
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
}