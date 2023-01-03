#ifndef PUPPET_MODULEEMBED_H
#define PUPPET_MODULEEMBED_H

#include <libzelda64.h>
#include "ModuleInject.h"

typedef struct {
    u32 start;
    u32 create;
    u32 destroy;
    u32 size;
    u32 end;
} ModuleEmbed;

extern void ModuleInject_Inject(ModuleInject* thisx, PlayState* play, u32 pointer);
extern void ModuleInject_Destroy(ModuleInject* thisx, PlayState* play, u32 pointer);

#endif

