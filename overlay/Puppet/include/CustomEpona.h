#ifndef CUSTOM_EPONA_MODEL_H
#define CUSTOM_EPONA_MODEL_H

#include <libzelda64.h>
#include "Puppet_Shared.h"

#define CUSTOM_EPONA_LIMB_MAX 0x30

typedef struct
{
	PuppetSync *sync;
	PuppetModel *modelContext;
	SkelAnime skelAnime;
	Vec3s jointTable[CUSTOM_EPONA_LIMB_MAX];
	Vec3s morphTable[CUSTOM_EPONA_LIMB_MAX];
} EponaPuppet_C;

extern void CustomEponaPuppet_Init(EponaPuppet_C *thisx, PlayState *play);
extern void CustomEponaPuppet_Update(EponaPuppet_C *thisx, PlayState *play);
extern void CustomEponaPuppet_Draw(EponaPuppet_C *thisx, PlayState *play);
extern void CustomEponaPuppet_Destroy(EponaPuppet_C *thisx, PlayState *play);
#endif