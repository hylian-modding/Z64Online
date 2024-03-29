#include "HaxBase.h"

void draw(void* thisx, PlayState* play)
{
    Player* player = thisx;
    u32 temp;

    if (haxPointer->inst == 0) return;

    START_DISPS(play->state.gfxCtx);

    // This is the model we want Link to wear.
    // Must put pointers in a temp variable because of macro fuckery.

    #if TARGET_GAME == Z64GAME_OOT
        temp = haxPointer->inst->child;
        if (gSaveContext.linkAge == 0) temp = haxPointer->inst->adult;
    #endif

    if (temp == 0){
         return;
    }

    haxPointer->segment = play->objectCtx.status[player->actor.objBankIndex].segment;

    // Set segment 06 to the new model.
    // Unclear why I have to set this since I thought that was what the below macros did, but it does not work otherwise.
    gSegments[6] = VIRTUAL_TO_PHYSICAL(temp);
    // Are both of these necessary? Decomp says this is how its done so I guess.
    gSPSegment(POLY_OPA_DISP++, 0x06, temp);
    gSPSegment(POLY_XLU_DISP++, 0x06, temp);

    // Force Link to use the skeleton of the new model.
    temp = 0x06005830;
    FlexSkeletonHeader* skel = (FlexSkeletonHeader*) SEGMENTED_TO_VIRTUAL(temp);
    temp = skel->sh.segment;
    temp = SEGMENTED_TO_VIRTUAL(temp);
    player->skelAnime.skeleton = temp;
    #if TARGET_GAME == Z64GAME_OOT
    player->skelAnime2.skeleton = temp;
    #elif TARGET_GAME == Z64GAME_MM
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

void update(void *thisx, PlayState *play)
{
}

void doInject(void *this, PlayState *play, u32 pointer)
{
    En_HaxBase *thisx = ((En_HaxBase *)this);

    thisx->inst = pointer;

    //linkHooks.update(update);
    linkHooks.draw(draw);

    haxPointer = thisx;
}

void doDestroy(void *this, PlayState *play, u32 pointer)
{
    En_HaxBase *thisx = ((En_HaxBase *)this);
    Lib_MemSet(haxPointer, sizeof(En_HaxBase), 0);
    haxPointer = 0;
}