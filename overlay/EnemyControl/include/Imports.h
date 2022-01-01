#ifndef __IMPORTS_H__
#define __IMPORTS_H__

#include <libzelda64.h>

extern s32 SkelAnime_Update(SkelAnime* skelAnime);
asm("SkelAnime_Update = 0x8008C9C0");

extern s32 Animation_OnFrame(SkelAnime* skelAnime, f32 frame);
asm("Animation_OnFrame = 0x8008D6A8");

extern void Collider_SetQuadVertices(ColliderQuad* collider, Vec3f* a, Vec3f* b, Vec3f* c, Vec3f* d);
asm("Collider_SetQuadVertices = 0x80050B64");

extern void Animation_Change(SkelAnime* skelAnime, AnimationHeader* animation, f32 playSpeed, f32 startFrame, f32 endFrame, u8 mode, f32 morphFrames);
asm("Animation_Change = 0x8008CFC0");

extern void Animation_PlayLoop(SkelAnime* skelAnime, AnimationHeader* animation);
asm("Animation_PlayLoop = 0x8008D2D4");

extern void Animation_Reverse(SkelAnime* skelAnime);
asm("Animation_Reverse = 0x8008D3E4");

extern void Animation_PlayOnce(SkelAnime* skelAnime, AnimationHeader* animation);
asm("Animation_PlayOnce = 0x8008D1C4");


#define false 0
#define true 1

#endif /* __IMPORTS_H__ */