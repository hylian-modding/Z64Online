#include "Puppet.h"
#include "Defines.h"
#include "Tpose.h"

#if TARGET_GAME==Z64GAME_MM
void LinkPuppet_Init(LinkPuppet* thisx, PlayState* play) {
}

void LinkPuppet_Update(LinkPuppet* thisx, PlayState* play) {
}

void LinkPuppet_Draw(LinkPuppet* thisx, PlayState* play) {
}

void LinkPuppet_Destroy(LinkPuppet* thisx, PlayState* play) {
}

// SkelAnime_DrawFlexOpa_LimbCallback (always return 0?)
s32 LinkPuppet_OverrideLimbDrawOpa(PlayState* play, s32 limbIndex, Gfx** dList, Vec3f* pos, Vec3s* rot, LinkPuppet* thisx) {
    return 0;
}

// SkelAnime_DrawFlexOpa_SegTextureCallback (always return 1?)
s32 LinkPuppet_PostLimbDrawOpa(PlayState* play, s32 limbIndex, Gfx** dList, Vec3s* rot, LinkPuppet* thisx) {
    return 1;
}
#endif

