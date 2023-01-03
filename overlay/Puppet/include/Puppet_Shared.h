#ifndef PUPPET_PUPPET_SHARED_H
#define PUPPET_PUPPET_SHARED_H

#include <libzelda64.h>

typedef struct{
    u32 anims[9];
} EponaAnimBank;

typedef struct{
    EponaAnimBank* bank;
} EponaAnimBankHeader;

typedef struct
{
    /* 0x00 */ u32 adult;
    /* 0x04 */ u32 child;
    /* 0x08 */ u32 deku;
    /* 0x0C */ u32 goron;
    /* 0x10 */ u32 zora;
    /* 0x14 */ u32 fd;
    /* 0x18 */ u32 horse;
    /* 0x20 */ EponaAnimBankHeader* horseAnims;
    /* 0x24 */ u32 navi;
} PuppetModel; /* 0x28 */

typedef struct
{
    PosRot world;
    u16 timer;
    s16 disappearTimer;
} NaviSync;

typedef struct
{
    PosRot world;
} CustomEponaSync;

typedef struct
{
    PosRot world;
    u32 age;
    Color_RGBA8 tunicColor;
    Color_RGBA8 gauntlet1Color;
    Color_RGBA8 gauntlet2Color;
    u16 equips;
    u32 upgrades;
    Vec3s animeTable[PLAYER_LIMB_BUF_COUNT];
    u32 displayLists[PLAYER_LIMB_MAX];
    NaviSync navi;
    CustomEponaSync epona;
} PuppetSync;

typedef struct EnElf
{
    /* 0x0000 */ Actor actor;
    /* 0x014C */ SkelAnime skelAnime;
    /* 0x0190 */ Vec3s jointTable[15];
    /* 0x01EA */ Vec3s morphTable[15];
    /* 0x0244 */ Color_RGBAf innerColor;
    /* 0x0254 */ Color_RGBAf outerColor;
    /* 0x0264 */ LightInfo lightInfoGlow;
    /* 0x0274 */ LightNode *lightNodeGlow;
    /* 0x0278 */ LightInfo lightInfoNoGlow;
    /* 0x0288 */ LightNode *lightNodeNoGlow;
    /* 0x028C */ Vec3f unk_28C;
    /* 0x0298 */ u32 elfMsg;
    /* 0x029C */ f32 unk_29C;
    /* 0x02A0 */ f32 unk_2A0;
    /* 0x02A4 */ f32 unk_2A4;
    /* 0x02A8 */ s16 unk_2A8;
    /* 0x02AA */ s16 unk_2AA;
    /* 0x02AC */ s16 unk_2AC;
    /* 0x02AE */ s16 unk_2AE;
    /* 0x02B0 */ s16 unk_2B0;
    /* 0x02B4 */ f32 unk_2B4;
    /* 0x02B8 */ f32 unk_2B8;
    /* 0x02BC */ s16 unk_2BC;
    /* 0x02BE */ u16 timer;
    /* 0x02C0 */ s16 unk_2C0;
    /* 0x02C2 */ s16 disappearTimer;
    /* 0x02C4 */ u16 fairyFlags;
    /* 0x02C6 */ u8 unk_2C6;
    /* 0x02C7 */ u8 unk_2C7;
    /* 0x02C8 */ u32 func_2C8;
    /* 0x02CC */ u32 actionFunc;
} EnElf; // size = 0x02D0

#endif
