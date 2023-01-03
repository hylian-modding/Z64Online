#include "ModuleInject.h"
#include "LinkHookManager.h"
#include "Navi.h"

void ModuleInject_Inject(ModuleInject *thisx, PlayState *play, u32 pointer)
{
    modulePointer = thisx;

    modulePointer->funcs.LinkPuppet_New = LinkPuppet_New;
    modulePointer->funcs.LinkPuppet_Sleep = LinkPuppet_Sleep;

#ifndef USE_REAL_ACTORS
    gLinkHooks.update_post(PuppetSync_Update);
    gLinkHooks.update_post(PuppetList_Update);
    gLinkHooks.draw_post(PuppetList_Draw);
#endif
}

void ModuleInject_Destroy(ModuleInject *thisx, PlayState *play, u32 pointer)
{
    modulePointer = NULL;
}
