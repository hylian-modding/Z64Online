#ifndef __OVL_EN_NAVIHAX__
#define __OVL_EN_NAVIHAX__

#include <libzelda64.h>

#define ModelPointer uint32_t
#define FuncPointer uint32_t
#define boolean uint8_t
#define true 1;
#define false 0;

typedef struct{
    uint8_t stuff_I_dont_care_about_right_now[0x1C];
    uint32_t pointer;
    uint32_t de;
    uint32_t model;
} En_Header;

typedef struct{
    uint32_t pointer;
    uint8_t total;
    uint32_t visible;
    uint8_t pad[7];
} En_Skel;

typedef struct{
    ModelPointer model;
    FuncPointer draw;
    boolean hasSkeleton;
    SkelAnime skelanime;
    Vec3s jointTable[PLAYER_LIMB_BUF_COUNT];
    Vec3s morphTable[PLAYER_LIMB_BUF_COUNT];
} En_NaviHax;

static En_NaviHax* haxPointer = 0;

static void init(En_NaviHax* thisx, GlobalContext* globalCtx, ModelPointer pointer);
static void destroy(En_NaviHax* thisx, GlobalContext* globalCtx);
static void update(void* thisx, GlobalContext* globalCtx);
static void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_NAVIHAX__ */