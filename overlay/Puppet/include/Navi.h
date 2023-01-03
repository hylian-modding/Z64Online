#ifndef PUPPET_NAVI_H
#define PUPPET_NAVI_H

#include <libzelda64.h>
#include "Puppet_Shared.h"

#define DEFAULT_NAVI_SKEL 0x04016EE8
#define DEFAULT_NAVI_ANIM 0x04015044
#define DEFAULT_NAVI_LIMBS_MAX 15

typedef struct {
    u8 r;
    u8 g;
    u8 b;
    float a;
} RGB8Af;

typedef struct {
    PuppetSync* syncPointer;
    SkelAnime skel;
    Vec3f scale;
    RGB8Af outerColor;
    Vec3s jointTable[DEFAULT_NAVI_LIMBS_MAX];
    Vec3s morphTable[DEFAULT_NAVI_LIMBS_MAX];
} NaviPuppet;

extern void NaviPuppet_Init(NaviPuppet* puppet, PlayState* play);
extern void NaviPuppet_Update(NaviPuppet* puppet, PlayState* play);
extern void NaviPuppet_Draw(NaviPuppet* puppet, PlayState* play);
extern void NaviPuppet_Destroy(NaviPuppet* puppet, PlayState* play);

#endif

