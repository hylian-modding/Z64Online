#include "HaxBase.h"

void update(void* thisx, GlobalContext* globalCtx)
{
}

void draw(void* thisx, GlobalContext* globalCtx)
{
}

extern void func_80146F5C(GlobalContext* globalCtx);
asm("func_80146F5C = 0x80146F5C");

void doInject(void* this, GlobalContext* globalCtx, uint32_t pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    haxPointer = thisx;
    uint16_t cutsceneId = 0xFFF7;
    #ifdef GAME_OOT
                gSaveContext.nextCutsceneIndex = cutsceneId;
    #elif defined GAME_MM
                func_80146F5C(globalCtx);
                gSaveContext.unk_3F4A = cutsceneId;
    #endif
                globalCtx->nextEntranceIndex = 0x1C00;
                globalCtx->sceneLoadFlag = 0x14;
                globalCtx->fadeTransition = 0;
#ifdef GAME_OOT
                globalCtx->linkAgeOnLoad = gSaveContext.linkAge;
#endif
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
}