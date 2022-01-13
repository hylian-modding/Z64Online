#include "HaxBase.h"

extern AnimationEntry* AnimationContext_AddEntry(AnimationContext* animationCtx, AnimationType type);
asm("AnimationContext_AddEntry = 0x8008B48C");

void AnimationContext_SetLoadFrame(GlobalContext* globalCtx, LinkAnimationHeader* animation, s32 frame, s32 limbCount,
                                   Vec3s* frameTable) {
#ifdef GAME_OOT
        LinkAnimationHeader* linkAnimHeader = SEGMENTED_TO_VIRTUAL(animation);
        if ((linkAnimHeader->segment >> 24) == 7){
            AnimationEntry* entry = AnimationContext_AddEntry(&globalCtx->animationCtx, ANIMENTRY_LOADFRAME);
            if (entry != NULL) {
                u32 ram = frameTable;
                osCreateMesgQueue(&entry->data.load.msgQueue, &entry->data.load.msg, 1);
                DmaMgr_SendRequestImpl(&entry->data.load.req, ram, (linkAnimHeader->segment & 0x00FFFFFF) + ((sizeof(Vec3s) * limbCount + 2) * frame) + haxPointer->vrom, (sizeof(Vec3s) * limbCount + 2), 0, &entry->data.load.msgQueue, &entry->data.load.msg);
                haxPointer->debug[0] = 1;
            }
        }else{
            AnimationEntry* entry = AnimationContext_AddEntry(&globalCtx->animationCtx, ANIMENTRY_LOADFRAME);
            if (entry != NULL) {
                u32 ram = frameTable;
                osCreateMesgQueue(&entry->data.load.msgQueue, &entry->data.load.msg, 1);
                DmaMgr_SendRequestImpl(&entry->data.load.req, ram, (linkAnimHeader->segment) + ((sizeof(Vec3s) * limbCount + 2) * frame) + haxPointer->vromnew, (sizeof(Vec3s) * limbCount + 2), 0, &entry->data.load.msgQueue, &entry->data.load.msg);
                haxPointer->debug[0] = 2;
            }
        }
#elif defined GAME_MM
#endif
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
    haxPointer->inst = &AnimationContext_SetLoadFrame;
}

void doDestroy(void* this, GlobalContext* globalCtx, uint32_t pointer){
}