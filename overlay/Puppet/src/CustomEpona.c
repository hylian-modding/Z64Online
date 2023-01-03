#include "CustomEpona.h"
#include "ModuleInject.h"
#include "Defines.h"

void CustomEponaPuppet_Init(EponaPuppet_C *thisx, PlayState *play)
{
    #if TARGET_GAME == Z64GAME_OOT
    gSegments[6] = VIRTUAL_TO_PHYSICAL(thisx->modelContext->horse);
    SkelAnime_InitFlex(play, &thisx->skelAnime, SKEL_SECTION, thisx->modelContext->horseAnims->bank->anims[0], &thisx->jointTable, &thisx->morphTable, CUSTOM_EPONA_LIMB_MAX);
    #endif
}

void CustomEponaPuppet_Update(EponaPuppet_C *thisx, PlayState *play)
{
    if (thisx->skelAnime.update.normal == NULL)
        return;
    SkelAnime_Update(&thisx->skelAnime);
}

s32 CustomEponaPuppet_OverrideLimbDraw(PlayState* play, s32 limbIndex, Gfx** dList, Vec3f* pos, Vec3s* rot, void* arg){
    return 0;
}

void CustomEponaPuppet_PostLimbDraw(struct PlayState* play, s32 limbIndex, Gfx** dList, Vec3s* rot, void* arg){
}

void CustomEponaPuppet_Draw(EponaPuppet_C *thisx, PlayState *play)
{
#if TARGET_GAME == Z64GAME_OOT
    START_DISPS(play->state.gfxCtx);
    gSegments[6] = VIRTUAL_TO_PHYSICAL(thisx->modelContext->horse);
    gSPSegment(POLY_OPA_DISP++, 0x06, thisx->modelContext->horse);
    gSPSegment(POLY_XLU_DISP++, 0x06, thisx->modelContext->horse);

#ifndef USE_REAL_ACTORS
    Matrix_Translate(thisx->sync->epona.world.pos.x, thisx->sync->epona.world.pos.y, thisx->sync->epona.world.pos.z, MTXMODE_NEW);
    Matrix_RotateZYX(thisx->sync->epona.world.rot.x, thisx->sync->epona.world.rot.y, thisx->sync->epona.world.rot.z, MTXMODE_APPLY);
    Matrix_Scale(0.01f, 0.01f, 0.01f, MTXMODE_APPLY);
#endif

    SkelAnime_DrawFlexOpa(play, thisx->skelAnime.skeleton, &thisx->jointTable, thisx->skelAnime.dListCount, CustomEponaPuppet_OverrideLimbDraw, CustomEponaPuppet_PostLimbDraw, thisx);
    END_DISPS(play->state.gfxCtx);
#endif
}

void CustomEponaPuppet_Destroy(EponaPuppet_C *thisx, PlayState *play) {}