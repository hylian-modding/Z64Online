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

void SoundHack1(Actor* actor, u16 sfxId) {
    u16 id = sfxId & 0xF0FF;
    haxPointer->lastSound = id;
    u8 c = 1;
    for (u32 i = 0; i < haxPointer->data.size; i++){
        if (haxPointer->data.replacedIDs[i] < 0xFFFF){
            if (haxPointer->data.replacedIDs[i] == id){
                c = 0;
                haxPointer->soundID = id;
                break;
            }
        }else{
            break;
        }
    }
    if (c == 1){
        Audio_PlaySoundGeneral(sfxId, &actor->projectedPos, 4, &D_801333E0, &D_801333E0, &D_801333E8);
    }
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
    haxPointer->inst = &SoundHack1;
    haxPointer->data.size = 1530;
    haxPointer->dataPointer = &haxPointer->data;
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
}