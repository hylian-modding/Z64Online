#include "HaxBase.h"

void draw(void* thisx, PlayState* play)
{
    u32 temp;
    Player* player = thisx;
    START_DISPS(play->state.gfxCtx);

    if (haxPointer->inst == 0) return;

    // Force Link to use the skeleton of the new model.
    temp = 0x06005830;
    FlexSkeletonHeader* skel = (FlexSkeletonHeader*) SEGMENTED_TO_VIRTUAL(temp);
    temp = skel->sh.segment;
    temp = SEGMENTED_TO_VIRTUAL(temp);
    player->skelAnime.skeleton = temp;
    #ifdef GAME_OOT
    player->skelAnime2.skeleton = temp;
    #elif defined GAME_MM
    player->unk_284.skeleton = temp;
    // Check for Goron's second Skeleton.
    temp = 0x06005830;
    temp += 0x10;
    FlexSkeletonHeader* skel2 = (FlexSkeletonHeader*) SEGMENTED_TO_VIRTUAL(temp);
    if (skel2->sh.segment > 0){
        temp = skel->sh.segment;
        temp = SEGMENTED_TO_VIRTUAL(temp);
        player->unk_2C8.skeleton = temp;
    }
    #endif
    END_DISPS(play->state.gfxCtx);
}

void update(void* thisx, PlayState* play){
    Player* player = thisx;
    u32 temp;
    #ifdef GAME_OOT
        temp = haxPointer->inst->child;
        if (gSaveContext.linkAge == 0) temp = haxPointer->inst->adult;
    #elif defined GAME_MM
    #endif
    if (temp == 0){
         return;
    }
    play->objectCtx.status[player->actor.objBankIndex].segment = temp;
}

void doInject(void* this, PlayState* play, u32 pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);

    thisx->inst = pointer;

    linkHooks.update(update);
    linkHooks.draw(draw);

    haxPointer = thisx;
}

void doDestroy(void* this, PlayState* play, u32 pointer){
    En_HaxBase* thisx = ((En_HaxBase*)this);
    Lib_MemSet(haxPointer, sizeof(En_HaxBase), 0);
    haxPointer = 0;
}