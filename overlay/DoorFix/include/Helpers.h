#ifndef __HELPERS_H__
#define __HELPERS_H__

#include <libzelda64.h>

extern s32 Flags_GetSwitch(GlobalContext* globalCtx, s32 flag);
asm("Flags_GetSwitch = 0x8002049C");

#endif /* __HELPERS_H__ */