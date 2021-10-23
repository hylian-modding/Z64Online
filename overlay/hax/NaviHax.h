#ifndef __OVL_EN_NAVIHAX__
#define __OVL_EN_NAVIHAX__

#include <libzelda64.h>

static uint32_t haxPointer = 0;

static void init(void* thisx, GlobalContext* globalCtx);
static void destroy(void* thisx, GlobalContext* globalCtx);
static void update(void* thisx, GlobalContext* globalCtx);
static void draw(void* thisx, GlobalContext* globalCtx);

#endif /* __OVL_EN_NAVIHAX__ */