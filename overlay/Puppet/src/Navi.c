#include "Navi.h"
#include "Puppet_Opts.h"

static s32 EnElf_OverrideLimbDraw(PlayState *play, s32 limbIndex, Gfx **dList, Vec3f *pos, Vec3s *rot, NaviPuppet *thisx, Gfx **gfx)
{
    Vec3f zeroVec = {0.0f, 0.0f, 0.0f};
    f32 scale;
    Vec3f mtxMult;

    if (limbIndex == 8)
    {
        scale = ((Math_SinS(thisx->syncPointer->navi.disappearTimer * 4096) * 0.1f) + 1.0f) * 0.012f;
        scale *= (thisx->scale.x * 124.99999f);
        Matrix_MultVec3f(&zeroVec, &mtxMult);
        Matrix_Translate(mtxMult.x, mtxMult.y, mtxMult.z, MTXMODE_NEW);
        Matrix_Scale(scale, scale, scale, MTXMODE_APPLY);
    }

    return 0;
}

void NaviPuppet_Init(NaviPuppet *thisx, PlayState *play)
{
    SkelAnime_Init(play, &thisx->skel, DEFAULT_NAVI_SKEL, DEFAULT_NAVI_ANIM, &thisx->jointTable, &thisx->morphTable, DEFAULT_NAVI_LIMBS_MAX);

    thisx->scale.x = 0.01f;
    thisx->scale.y = 0.01f;
    thisx->scale.z = 0.01f;
    thisx->outerColor.b = 0xFF;
}

void NaviPuppet_Update(NaviPuppet *thisx, PlayState *play)
{
    SkelAnime_Update(&thisx->skel);
}

void NaviPuppet_Draw(NaviPuppet *thisx, PlayState *play)
{
    f32 alphaScale;
    s32 envAlpha;

    START_DISPS(play->state.gfxCtx);

#ifndef USE_REAL_ACTORS
    // Push new MTX so the puppet renders at its own transformation
    Matrix_Translate(thisx->syncPointer->navi.world.pos.x, thisx->syncPointer->navi.world.pos.y, thisx->syncPointer->navi.world.pos.z, MTXMODE_NEW);
    Matrix_RotateZYX(thisx->syncPointer->navi.world.rot.x, thisx->syncPointer->navi.world.rot.y, thisx->syncPointer->navi.world.rot.z, MTXMODE_APPLY);
    Matrix_Scale(thisx->scale.x, thisx->scale.y, thisx->scale.z, MTXMODE_APPLY);
#endif

    envAlpha = (thisx->syncPointer->navi.timer * 50) & 0x1FF;
    envAlpha = (envAlpha > 255) ? 511 - envAlpha : envAlpha;

    alphaScale = thisx->syncPointer->navi.disappearTimer < 0 ? (thisx->syncPointer->navi.disappearTimer * (7.0f / 6000.0f)) + 1.0f : 1.0f;

    gDPSetEnvColor(POLY_XLU_DISP++, thisx->outerColor.r, thisx->outerColor.g, thisx->outerColor.b, (u8)(envAlpha * alphaScale));
    POLY_XLU_DISP = SkelAnime_Draw(play, thisx->skel.skeleton, &thisx->skel.jointTable, EnElf_OverrideLimbDraw, NULL, thisx, POLY_XLU_DISP);

    END_DISPS(play->state.gfxCtx);
}

void NaviPuppet_Destroy(NaviPuppet *thisx, PlayState *play)
{
}