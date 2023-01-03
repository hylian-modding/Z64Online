#ifndef PUPPET_MODULEINJECT_H
#define PUPPET_MODULEINJECT_H
#include "Puppet_Opts.h"
#include "Puppet.h"

typedef struct {
    /* 0x00 */ u32 LinkPuppet_New;
    /* 0x04 */ u32 LinkPuppet_Sleep;
    /* 0x08 */ u32 linkConsrFlag;
    /* 0x0C */ u32 timesConstructed;
} ModulePointers;

typedef struct {
    ModulePointers funcs;
    LinkPuppet* lastSpawned;
    PuppetStorage puppetStorage;
    PuppetList alivePuppets;
    PuppetSync playerData;
    Vec3f fakePos;
    Vec3s fakeRot;
    Actor testActor;
} ModuleInject;

extern ModuleInject* modulePointer;

#endif

