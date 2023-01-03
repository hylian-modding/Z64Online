#include "Puppet.h"
#include "Defines.h"
#include "ModuleInject.h"
#include "Tpose.h"

const float form_height_adjustments[2] = {
    1.0f,
    0.65f};

/* IMPORTANT: Any time you use SEGMENTED_TO_VIRTUAL or VIRTUAL_TO_PHYSICAL you have to put the pointer into a temporary variable.
 *             This is because of macro fuckery that I don't entirely understand.
 */

#if TARGET_GAME == Z64GAME_OOT
void LinkPuppet_Init(LinkPuppet *thisx, PlayState *play)
{
    thisx->syncPointer = &thisx->sync;
    thisx->timeAlive = 0;
#ifdef HAS_LINK
    u32 temp;
    if (thisx->sync.age > 0)
    {
        temp = thisx->modelContext->child;
    }
    else
    {
        temp = thisx->modelContext->adult;
    }
    thisx->modelPointer = temp;

    gSegments[6] = VIRTUAL_TO_PHYSICAL(thisx->modelPointer);
    thisx->sync.tunicColor.a = 0xFF;
    thisx->sync.gauntlet1Color.a = 0xFF;
    thisx->sync.gauntlet2Color.a = 0xFF;

    SkelAnime_InitFlex(play, &thisx->skelAnime1, SKEL_SECTION, NULL, &thisx->morphTable, &thisx->jointTable, PLAYER_LIMB_BUF_COUNT);

    memcpy(&thisx->jointTable, &gTPose_Anim, gTPose_Anim_Size);
#endif

#ifdef HAS_FAIRY
    thisx->navi.syncPointer = thisx->syncPointer;
    NaviPuppet_Init(&thisx->navi, play);
#endif

#ifdef HAS_HORSE
    thisx->epona.sync = thisx->syncPointer;
    thisx->epona.modelContext = thisx->modelContext;
    CustomEponaPuppet_Init(&thisx->epona, play);
#endif
}

void LinkPuppet_Update(LinkPuppet *thisx, PlayState *play)
{
    if (thisx->isAwake == 0) return;
#ifdef HAS_LINK
    u32 temp;
    if (thisx->sync.age > 0)
    {
        temp = thisx->modelContext->child;
    }
    else
    {
        temp = thisx->modelContext->adult;
    }
    if (thisx->modelPointer != temp){
        LinkPuppet_Init(thisx, play);
    }
    /* Copy animation into morph tables */
    memcpy(&thisx->jointTable, &thisx->sync.animeTable, sizeof(thisx->jointTable) - 0x0A);
    memcpy(&thisx->morphTable, &thisx->sync.animeTable, sizeof(thisx->jointTable) - 0x0A);
#endif

#ifdef HAS_FAIRY
    NaviPuppet_Update(&thisx->navi, play);
#endif
#ifdef HAS_HORSE
    CustomEponaPuppet_Update(&thisx->epona, play);
#endif
}

#ifdef HAS_LINK
s32 LinkPuppet_OverrideLimbDrawOpa(PlayState *play, s32 limbIndex, Gfx **dList, Vec3f *pos, Vec3s *rot, LinkPuppet *puppet)
{
    START_DISPS(play->state.gfxCtx);

    if (limbIndex == 1)
    {
        pos->y *= form_height_adjustments[puppet->sync.age];
    }

    /* Handle Swordless properly */
    if (limbIndex == PLAYER_LIMB_SHEATH && IS_SWORDLESS && IS_SHIELDLESS)
    {
        puppet->sync.displayLists[limbIndex] = DL_DF;
    }
    else if (limbIndex == PLAYER_LIMB_L_FOREARM)
    {
        if (IS_CHILD)
        {
            if (HAS_STRENGTH)
            {
                gSPDisplayList(POLY_OPA_DISP++, DL_GORON_BRACELET);
            }
        }
        else if (HAS_GAUNTLETS)
        {
            if (HAS_SILVER_GAUNTLETS)
            {
                gDPSetEnvColor(POLY_OPA_DISP++, puppet->sync.gauntlet1Color.r, puppet->sync.gauntlet1Color.g, puppet->sync.gauntlet1Color.b, puppet->sync.gauntlet1Color.a);
            }
            else if (HAS_GOLDEN_GAUNTLETS)
            {
                gDPSetEnvColor(POLY_OPA_DISP++, puppet->sync.gauntlet2Color.r, puppet->sync.gauntlet2Color.g, puppet->sync.gauntlet2Color.b, puppet->sync.gauntlet2Color.a);
            }
            gSPDisplayList(POLY_OPA_DISP++, DL_UPGRADE_LFOREARM);
            gDPSetEnvColor(POLY_OPA_DISP++, puppet->sync.tunicColor.r, puppet->sync.tunicColor.g, puppet->sync.tunicColor.b, puppet->sync.tunicColor.a);
        }
    }
    else if (limbIndex == PLAYER_LIMB_R_FOREARM)
    {
        if (IS_ADULT)
        {
            if (HAS_SILVER_GAUNTLETS || HAS_GOLDEN_GAUNTLETS)
            {
                gSPDisplayList(POLY_OPA_DISP++, DL_UPGRADE_RFOREARM);
            }
        }
    }
    if (puppet->sync.displayLists[limbIndex] > 0)
    {
        *dList = puppet->sync.displayLists[limbIndex];
    }

    END_DISPS(play->state.gfxCtx);
    return 0;
}

s32 LinkPuppet_PostLimbDrawOpa(PlayState *play, s32 limbIndex, Gfx **dList, Vec3s *rot, LinkPuppet *puppet)
{
    START_DISPS(play->state.gfxCtx);

    /* Draw the eyes and mouth */
    gSPSegment(POLY_OPA_DISP++, 0x08, puppet->modelPointer);
    gSPSegment(POLY_OPA_DISP++, 0x09, puppet->modelPointer + 0x4000);
    END_DISPS(play->state.gfxCtx);
    return 1;
}
#endif

void LinkPuppet_Draw(LinkPuppet *thisx, PlayState *play)
{
    if (thisx->isAwake == 0) return;
#ifdef HAS_LINK
    START_DISPS(play->state.gfxCtx);
    gSegments[6] = VIRTUAL_TO_PHYSICAL(thisx->modelPointer);
    gSPSegment(POLY_OPA_DISP++, 0x06, thisx->modelPointer);
    gSPSegment(POLY_XLU_DISP++, 0x06, thisx->modelPointer);

#ifndef USE_REAL_ACTORS
    Matrix_Translate(thisx->sync.world.pos.x, thisx->sync.world.pos.y, thisx->sync.world.pos.z, MTXMODE_NEW);
    Matrix_RotateZYX(thisx->sync.world.rot.x, thisx->sync.world.rot.y, thisx->sync.world.rot.z, MTXMODE_APPLY);
    Matrix_Scale(0.01f, 0.01f, 0.01f, MTXMODE_APPLY);
#endif

#ifdef HAS_TUNIC_COLOR
    gDPSetEnvColor(POLY_OPA_DISP++, thisx->sync.tunicColor.r, thisx->sync.tunicColor.g, thisx->sync.tunicColor.b, thisx->sync.tunicColor.a);
#endif
    SkelAnime_DrawFlexOpa(play, thisx->skelAnime1.skeleton, thisx->jointTable, thisx->skelAnime1.dListCount, LinkPuppet_OverrideLimbDrawOpa, LinkPuppet_PostLimbDrawOpa, thisx);

    END_DISPS(play->state.gfxCtx);
#endif

#ifdef HAS_FAIRY
    NaviPuppet_Draw(&thisx->navi, play);
#endif
#ifdef HAS_HORSE
    CustomEponaPuppet_Draw(&thisx->epona, play);
#endif
}

void LinkPuppet_Destroy(LinkPuppet *thisx, PlayState *play)
{
#ifdef HAS_LINK
#endif
#ifdef HAS_FAIRY
    NaviPuppet_Destroy(&thisx->navi, play);
#endif
#ifdef HAS_HORSE
    CustomEponaPuppet_Destroy(&thisx->epona, play);
#endif
}
#endif