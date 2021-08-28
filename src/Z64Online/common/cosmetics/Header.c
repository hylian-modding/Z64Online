#include <stdint.h>

#define u8 uint8_t
#define u16 uint16_t
#define u32 uint32_t

typedef struct
{
    u8 MAGIC_STRING[0xB];
} Z64O_MagicString;

typedef struct
{
    Z64O_MagicString ms;
    u8 version;
    u32 dlistCount;
    u16 objID;
    void* embeddedOverlay;
    u8 proxyStatus;
    void* restoreList;
    u8 form;
    Z64O_SkeletonSection* skeletonSectionPointer;
} Z64O_Header;

typedef struct{
    void* pointer;
    u8 total;
    u32 visible;
    u8 pad[7];
} Z64_SkeletonHeader;

typedef struct
{
    Z64_SkeletonHeader skeleton0;
    Z64_SkeletonHeader skeleton1;
    Z64_SkeletonHeader skeleton2;
    Z64_SkeletonHeader skeleton3;
} Z64O_SkeletonSection;

typedef struct
{
    u8 unk0[0x10];
} Z64O_ZoraUnk;

typedef struct
{
    u8 data[0x120];
} Z64O_GoronCrouchData;

typedef struct{
    u32 df[0x2];
    u32 pad[0x2];
} Z64O_DF;

typedef struct{
    u8 mtx[0x40];
} Z64O_MTX;

typedef struct{
    u32 limb[0xFF];
} Z64O_LimbTable;

typedef struct
{
    Z64O_DF df;
    Z64O_SkeletonSection skeleton;
    Z64O_ZoraUnk unk0;
    Z64O_ZoraUnk unk1;
    Z64O_MTX SWORD_BACK0;
    Z64O_MTX SWORD_BACK1;
    Z64O_MTX SHIELD_BACK0;
    Z64O_MTX SHIELD_BACK1;
    Z64O_MTX SHIELD_WEIRD0;
    Z64O_MTX BUNNY0;
    Z64O_MTX BUNNY1;
    Z64O_LimbTable limbTable1;
    Z64O_LimbTable limbTable2;
    Z64O_LimbTable limbTable3;
    Z64O_LimbTable limbTable4;
    Z64O_GoronCrouchData goronStuff;
} Z64O_Footer;

typedef struct{
    u32 DE;
    u32 pointer;
} Z64O_Jump;

typedef struct{
    Z64O_Header header;
    Z64O_Jump aliases[256];
    Z64O_Footer footer;
} Z64O_Table;