#ifndef __STALFOS_H__
#define __STALFOS_H__

#include <libzelda64.h>
#include "Imports.h"
#include "HaxBase.h"

struct EnTest;

typedef void (*EnTestActionFunc)(struct EnTest*, GlobalContext*);

typedef enum {
    /* 0x00 */ STALFOS_LIMB_NONE,
    /* 0x01 */ STALFOS_LIMB_ROOT,
    /* 0x02 */ STALFOS_LIMB_UPPERBODY_ROOT,
    /* 0x03 */ STALFOS_LIMB_CORE_LOWER_ROOT,
    /* 0x04 */ STALFOS_LIMB_CORE_UPPER_ROOT,
    /* 0x05 */ STALFOS_LIMB_NECK_ROOT,
    /* 0x06 */ STALFOS_LIMB_HEAD_ROOT,
    /* 0x07 */ STALFOS_LIMB_7,
    /* 0x08 */ STALFOS_LIMB_8,
    /* 0x09 */ STALFOS_LIMB_JAW_ROOT,
    /* 0x0A */ STALFOS_LIMB_JAW,
    /* 0x0B */ STALFOS_LIMB_HEAD,
    /* 0x0C */ STALFOS_LIMB_NECK_UPPER,
    /* 0x0D */ STALFOS_LIMB_NECK_LOWER,
    /* 0x0E */ STALFOS_LIMB_CORE_UPPER,
    /* 0x0F */ STALFOS_LIMB_CHEST,
    /* 0x10 */ STALFOS_LIMB_SHOULDER_R_ROOT,
    /* 0x11 */ STALFOS_LIMB_SHOULDER_ARMOR_R_ROOT,
    /* 0x12 */ STALFOS_LIMB_SHOULDER_ARMOR_R,
    /* 0x13 */ STALFOS_LIMB_SHOULDER_L_ROOT,
    /* 0x14 */ STALFOS_LIMB_SHOULDER_ARMOR_L_ROOT,
    /* 0x15 */ STALFOS_LIMB_SHOULDER_ARMOR_L,
    /* 0x16 */ STALFOS_LIMB_ARM_L_ROOT,
    /* 0x17 */ STALFOS_LIMB_UPPERARM_L_ROOT,
    /* 0x18 */ STALFOS_LIMB_FOREARM_L_ROOT,
    /* 0x19 */ STALFOS_LIMB_HAND_L_ROOT,
    /* 0x1A */ STALFOS_LIMB_HAND_L,
    /* 0x1B */ STALFOS_LIMB_SHIELD,
    /* 0x1C */ STALFOS_LIMB_FOREARM_L,
    /* 0x1D */ STALFOS_LIMB_UPPERARM_L,
    /* 0x1E */ STALFOS_LIMB_ARM_R_ROOT,
    /* 0x1F */ STALFOS_LIMB_UPPERARM_R_ROOT,
    /* 0x20 */ STALFOS_LIMB_FOREARM_R_ROOT,
    /* 0x21 */ STALFOS_LIMB_HAND_R_ROOT,
    /* 0x22 */ STALFOS_LIMB_SWORD,
    /* 0x23 */ STALFOS_LIMB_HAND_R,
    /* 0x24 */ STALFOS_LIMB_FOREARM_R,
    /* 0x25 */ STALFOS_LIMB_UPPERARM_R,
    /* 0x26 */ STALFOS_LIMB_CORE_LOWER,
    /* 0x27 */ STALFOS_LIMB_LOWERBODY_ROOT,
    /* 0x28 */ STALFOS_LIMB_WAIST_ROOT,
    /* 0x29 */ STALFOS_LIMB_LEGS_ROOT,
    /* 0x2A */ STALFOS_LIMB_LEG_L_ROOT,
    /* 0x2B */ STALFOS_LIMB_THIGH_L_ROOT,
    /* 0x2C */ STALFOS_LIMB_LOWERLEG_L_ROOT,
    /* 0x2D */ STALFOS_LIMB_ANKLE_L_ROOT,
    /* 0x2E */ STALFOS_LIMB_ANKLE_L,
    /* 0x2F */ STALFOS_LIMB_FOOT_L_ROOT,
    /* 0x30 */ STALFOS_LIMB_FOOT_L,
    /* 0x31 */ STALFOS_LIMB_LOWERLEG_L,
    /* 0x32 */ STALFOS_LIMB_THIGH_L,
    /* 0x33 */ STALFOS_LIMB_LEG_R_ROOT,
    /* 0x34 */ STALFOS_LIMB_THIGH_R_ROOT,
    /* 0x35 */ STALFOS_LIMB_LOWERLEG_R_ROOT,
    /* 0x36 */ STALFOS_LIMB_ANKLE_R_ROOT,
    /* 0x37 */ STALFOS_LIMB_ANKLE_R,
    /* 0x38 */ STALFOS_LIMB_FOOT_R_ROOT,
    /* 0x39 */ STALFOS_LIMB_FOOT_R,
    /* 0x3A */ STALFOS_LIMB_LOWERLEG_R,
    /* 0x3B */ STALFOS_LIMB_THIGH_R,
    /* 0x3C */ STALFOS_LIMB_WAIST,
    /* 0x3D */ STALFOS_LIMB_MAX
} StalfosLimb;

typedef struct {
    /* 0x00 */ MtxF* matrices;
    /* 0x04 */ s16* objectIds;
    /* 0x08 */ s16 count;
    /* 0x0C */ Gfx** dLists;
    /* 0x10 */ s32 val; // used for various purposes: both a status indicator and counter
    /* 0x14 */ s32 prevLimbIndex;
} BodyBreak;

typedef struct EnTest {
    /* 0x000 */ Actor actor;
    /* 0x14C */ Vec3s bodyPartsPos[10];
    /* 0x188 */ SkelAnime skelAnime;
    /* 0x1CC */ Vec3s jointTable[STALFOS_LIMB_MAX];
    /* 0x33A */ Vec3s morphTable[STALFOS_LIMB_MAX];
    /* 0x4A8 */ SkelAnime upperSkelanime;
    /* 0x4EC */ Vec3s upperJointTable[STALFOS_LIMB_MAX];
    /* 0x65A */ Vec3s upperMorphTable[STALFOS_LIMB_MAX];
    /* 0x7C8 */ u8 unk_7C8;
    /* 0x7CC */ EnTestActionFunc actionFunc;
    /* 0x7D0 */ Vec3s headRot;
    /* 0x7D6 */ Vec3s headRotOffset;
    /* 0x7DC */ u8 unk_7DC;
    /* 0x7DD */ char unk_7DD[0x1];
    /* 0x7DE */ u8 unk_7DE;
    /* 0x7E0 */ s16 iceTimer;
    /* 0x7E2 */ u8 lastDamageEffect;
    /* 0x7E4 */ s32 unk_7E4;
    /* 0x7E8 */ s32 timer;
    /* 0x7EC */ f32 unk_7EC;
    /* 0x7F0 */ BodyBreak bodyBreak;
    /* 0x808 */ s8 swordState;
    /* 0x80C */ s32 effectIndex;
    /* 0x810 */ ColliderCylinder bodyCollider;
    /* 0x85C */ ColliderQuad swordCollider;
    /* 0x8DC */ ColliderCylinder shieldCollider;
} EnTest; // size = 0x928

typedef enum {
    /* 0 */ STALFOS_TYPE_INVISIBLE,
    /* 1 */ STALFOS_TYPE_1,
    /* 2 */ STALFOS_TYPE_2,
    /* 3 */ STALFOS_TYPE_CEILING,
    /* 4 */ STALFOS_TYPE_4,
    /* 5 */ STALFOS_TYPE_5
} StalfosType;

typedef enum {
    STALFOS_STATUS_NONE,
    STALFOS_STATUS_IDLE,
    STALFOS_STATUS_WALKING,
    STALFOS_STATUS_SIDESTEP,
    STALFOS_STATUS_SWORD,
    STALFOS_STATUS_SHIELD
} Stalfos_State;

extern AnimationHeader gStalfosFlinchFromHitBehindAnim;
asm("gStalfosFlinchFromHitBehindAnim = 0x06000444");
extern AnimationHeader gStalfosFallOverBackwardsAnim;
asm("gStalfosFallOverBackwardsAnim = 0x06001420");
extern AnimationHeader gStalfosJumpBackwardsAnim;
asm("gStalfosJumpBackwardsAnim = 0x06001978");
extern AnimationHeader gStalfosBlockWithShieldAnim;
asm("gStalfosBlockWithShieldAnim = 0x06001C20");
extern AnimationHeader gStalfosStandAttentionAnim;
asm("gStalfosStandAttentionAnim = 0x06002188");
extern AnimationHeader gStalfosFastAdvanceAnim;
asm("gStalfosFastAdvanceAnim = 0x060026D4");
extern AnimationHeader gStalfosMiddleGuardAnim;
asm("gStalfosMiddleGuardAnim = 0x0600316C");
extern AnimationHeader gStalfosSlowAdvanceAnim;
asm("gStalfosSlowAdvanceAnim = 0x060081B4");
extern AnimationHeader gStalfosFlinchFromHitFrontAnim;
asm("gStalfosFlinchFromHitFrontAnim = 0x06008604");
extern AnimationHeader gStalfosFallOverForwardsAnim;
asm("gStalfosFallOverForwardsAnim = 0x06009A90");
extern AnimationHeader gStalfosLeapAnim;
asm("gStalfosLeapAnim = 0x06009E50");
extern AnimationHeader gStalfosJumpAnim;
asm("gStalfosJumpAnim = 0x0600A324");
extern AnimationHeader gStalfosJumpslashAnim;
asm("gStalfosJumpslashAnim = 0x0600A99C");
extern AnimationHeader gStalfosDownSlashAnim;
asm("gStalfosDownSlashAnim = 0x0600B00C");
extern AnimationHeader gStalfosRecoverFromDownSlashAnim;
asm("gStalfosRecoverFromDownSlashAnim = 0x0600B4E4");
extern AnimationHeader gStalfosUpSlashAnim;
asm("gStalfosUpSlashAnim = 0x0600BE4C");
extern AnimationHeader gStalfosLandFromLeapAnim;
asm("gStalfosLandFromLeapAnim = 0x0600C438");
extern AnimationHeader gStalfosLaughAnim;
asm("gStalfosLaughAnim = 0x0600C8A0");
extern AnimationHeader gStalfosLookAroundAnim;
asm("gStalfosLookAroundAnim = 0x0600DCF0");
extern AnimationHeader gStalfosSidestepAnim;
asm("gStalfosSidestepAnim = 0x0600E2B0");
extern AnimationHeader gStalfosReleaseAttentionAnim;
asm("gStalfosReleaseAttentionAnim = 0x0600E7E4");

extern void stalfosUpdateHook(void* thisx, GlobalContext* globalCtx);
extern void stalfosDrawHook(void* thisx, GlobalContext* globalCtx);
extern void stalfosPostHook(Actor* actor, GlobalContext* globalCtx);

extern ActorPhysics_t stalfosPhysics;

#endif /* __STALFOS_H__ */