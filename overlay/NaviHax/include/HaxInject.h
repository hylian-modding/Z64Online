#ifndef __HAX_INJECT_H__
#define __HAX_INJECT_H__

#include "NaviHax.h"
#include <libzelda64.h>

static void doInject(void* thisx, GlobalContext* globalCtx, uint32_t pointer);
static void doDestroy(void* thisx, GlobalContext* globalCtx, uint32_t pointer);

#endif /* __HAX_INJECT_H__ */