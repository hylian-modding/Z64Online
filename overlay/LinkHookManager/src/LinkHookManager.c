#include "HaxBase.h"
#include "LinkHookManager.h"

extern void memset_fast_8(void *dest, u8 value, u32 length);

#if TARGET_GAME == Z64GAME_OOT

void update(void *thisx, PlayState *play)
{
    s32 index;
    En_HaxBase *hax = haxPointer;
    ActorFunc fn;

    if (hax == NULL)
    {
        return;
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        fn = hax->update_funcs[index];
        if (fn == NULL)
        {
            break;
        }
        else
        {
            fn(thisx, play);
        }
    }

    if (hax->update != NULL)
    {
        hax->update(thisx, play);
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        fn = hax->update_funcs_post[index];
        if (fn == NULL)
        {
            break;
        }
        else
        {
            fn(thisx, play);
        }
    }
}

void draw(void *thisx, PlayState *play)
{
    update(thisx, play);
    s32 index;
    En_HaxBase *hax = haxPointer;
    ActorFunc fn;

    if (hax == NULL)
    {
        return;
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        fn = hax->draw_funcs[index];
        if (fn == NULL)
        {
            break;
        }
        else
        {
            fn(thisx, play);
        }
    }

    if (hax->draw != NULL)
    {
        hax->draw(thisx, play);
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        fn = hax->draw_funcs_post[index];
        if (fn == NULL)
        {
            break;
        }
        else
        {
            fn(thisx, play);
        }
    }
}

void hook(PlayState *play)
{
    En_HaxBase *hax = haxPointer;

    u32* LinksWrappedDrawFunction = (u32*)0x8011D03C;

    if (hax->draw == 0 && *LinksWrappedDrawFunction > 0){
        hax->draw = *LinksWrappedDrawFunction;
    }

    if (hax->draw > 0){
        *LinksWrappedDrawFunction = draw;
    }

    hax->timer++;
}

void LinkHooks_AddUpdateHook(ActorFunc hook)
{
    s32 index;
    En_HaxBase *hax = haxPointer;

    if (hax == NULL)
    {
        return;
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        if (hax->update_funcs[index] == NULL)
        {
            hax->update_funcs[index] = hook;
            break;
        }
    }
}

void LinkHooks_AddUpdateHookPost(ActorFunc hook)
{
    s32 index;
    En_HaxBase *hax = haxPointer;

    if (hax == NULL)
    {
        return;
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        if (hax->update_funcs_post[index] == NULL)
        {
            hax->update_funcs_post[index] = hook;
            break;
        }
    }
}

void LinkHooks_AddDrawHook(ActorFunc hook)
{
    s32 index;
    En_HaxBase *hax = haxPointer;

    if (hax == NULL)
    {
        return;
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        if (hax->draw_funcs[index] == NULL)
        {
            hax->draw_funcs[index] = hook;
            break;
        }
    }
}

void LinkHooks_AddDrawHookPost(ActorFunc hook)
{
    s32 index;
    En_HaxBase *hax = haxPointer;

    if (hax == NULL)
    {
        return;
    }

    for (index = 0; index < HAXBASE_FUNCS_SIZE; index++)
    {
        if (hax->draw_funcs_post[index] == NULL)
        {
            hax->draw_funcs_post[index] = hook;
            break;
        }
    }
}

void Hax_Inject(En_HaxBase *thisx, PlayState *play, u32 pointer)
{
    memset_fast_8(thisx, 0, sizeof(En_HaxBase));
    thisx->hook = hook;
    haxPointer = thisx;
}

void Hax_Destroy(En_HaxBase *thisx, PlayState *play, u32 pointer)
{
    Actor *actor = play->actorCtx.actorLists[ACTORCAT_PLAYER].head;
    actor->draw = thisx->draw;
    actor->update = thisx->update;
    memset_fast_8(thisx, 0, sizeof(En_HaxBase));
    haxPointer = NULL;
}

const LinkHooks_t linkHooks = {
    .tag = {0x4C, 0x49, 0x4E, 0x4B, 0x48, 0x4F, 0x4F, 0x4B},
    .update = LinkHooks_AddUpdateHook,
    .draw = LinkHooks_AddDrawHook,
    .update_post = LinkHooks_AddUpdateHookPost,
    .draw_post = LinkHooks_AddDrawHookPost};

#endif