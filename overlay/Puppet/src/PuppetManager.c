#include "ModuleInject.h"
#include "Puppet.h"

/* I generated this with AI lol. */
void move_zeros_to_end(u32 *arr, u32 n)
{
    u32 num_zeros = 0; // Keep track of the number of zeros we have seen so far
    u32 index;

    // Loop through the array and move all non-zero elements to the front
    for (index = 0; index < n; ++index)
    {
        if (arr[index] != 0)
        {
            arr[num_zeros++] = arr[index];
        }
    }

    // Fill the remaining elements with zeros
    for (index = num_zeros; index < n; ++index)
    {
        arr[index] = 0;
    }
}

#ifdef USE_REAL_ACTORS

void Wrapped_Init(ProxyActor *actor, PlayState *play)
{
    LinkPuppet_Init(actor->puppet, play);
}

void Wrapped_Update(ProxyActor *actor, PlayState *play)
{
    LinkPuppet_Update(actor->puppet, play);
}

void Wrapped_Draw(ProxyActor *actor, PlayState *play)
{
    LinkPuppet_Draw(actor->puppet, play);
}

void Wrapped_Destroy(ProxyActor *actor, PlayState *play)
{
}

extern void Actor_AddToCategory(ActorContext *actorCtx, Actor *actorToAdd, u8 actorCategory);
extern void Actor_Init(Actor *actor, PlayState *play);

void setupProxyActor(PlayState *play, LinkPuppet *thisx)
{
    thisx->dummyActor.actor.id = 5;
    thisx->dummyActor.actor.init = Wrapped_Init;
    thisx->dummyActor.actor.update = Wrapped_Update;
    thisx->dummyActor.actor.draw = Wrapped_Draw;
    thisx->dummyActor.actor.destroy = Wrapped_Destroy;
    thisx->dummyActor.puppet = thisx;
    Actor_Init(&thisx->dummyActor, play);
    Actor_AddToCategory(&play->actorCtx, &thisx->dummyActor, ACTORCAT_NPC);
}
#endif

LinkPuppet *LinkPuppet_New(PlayState *play, PuppetModel *modelContext)
{
    LinkPuppet *puppet;
    u32 index;

    for (index = 0; index < MAX_PUPPETS; index++)
    {
        if (modulePointer->puppetStorage.puppets[index].timeAlive == 0)
        {
            puppet = &modulePointer->puppetStorage.puppets[index];
            puppet->modelContext = modelContext;
            puppet->puppetID = index;
#ifdef USE_REAL_ACTORS
            setupProxyActor(play, puppet);
#else
            LinkPuppet_Init(puppet, play);
#endif
            LinkPuppet_Awake(puppet);
            modulePointer->lastSpawned = puppet;
            return puppet;
        }
    }
    modulePointer->lastSpawned = 0;
    return NULL;
}

void LinkPuppet_Awake(LinkPuppet *entry)
{
    u32 index;

    for (index = 0; index < MAX_PUPPETS; index++)
    {
        if (modulePointer->alivePuppets.puppetsAlive[index] == 0)
        {
            modulePointer->alivePuppets.puppetsAlive[index] = entry;
            modulePointer->alivePuppets.puppetsAlive[index]->timeAlive++;
            break;
        }
    }
}

void LinkPuppet_Sleep(PlayState *play, LinkPuppet *entry)
{
    u32 index;
    LinkPuppet *puppet;

    for (index = 0; index < MAX_PUPPETS; index++)
    {
        if (modulePointer->alivePuppets.puppetsAlive[index] == entry)
        {
            puppet = &modulePointer->puppetStorage.puppets[index];
            LinkPuppet_Destroy(puppet, play);
            modulePointer->alivePuppets.puppetsAlive[index] = 0;
            break;
        }
    }

    Lib_MemSet(entry, sizeof(LinkPuppet), 0);
    move_zeros_to_end(&modulePointer->alivePuppets.puppetsAlive, MAX_PUPPETS);
}

void PuppetSync_Update(Player *player, PlayState *play)
{
#if TARGET_GAME == Z64GAME_OOT
    u32 index;

#ifdef HAS_LINK
    memcpy(&modulePointer->playerData.world, &player->actor.world, sizeof(PosRot));
    memcpy(&modulePointer->playerData.world.rot, &player->actor.shape.rot, sizeof(Vec3s));
    memcpy(&modulePointer->playerData.animeTable, 0x801DAA30 + 0x1F0, 0x86);
    modulePointer->playerData.age = gSaveContext.linkAge;
    memcpy(&modulePointer->playerData.tunicColor, 0x800F7AD8, 0x3);
    memcpy(&modulePointer->playerData.gauntlet1Color, 0x800F7AE4, 0x3);
    memcpy(&modulePointer->playerData.gauntlet1Color, 0x800F7AE4, 0x3);
    modulePointer->playerData.equips = gSaveContext.equips.equipment;
    modulePointer->playerData.upgrades = gSaveContext.inventory.upgrades;

    for (index = 0; index < PLAYER_LIMB_MAX; index++)
    {
        Lib_MemSet(&modulePointer->fakePos, 0, sizeof(Vec3f));
        Lib_MemSet(&modulePointer->fakeRot, 0, sizeof(Vec3s));
        Player_OverrideLimbDrawGameplayDefault(play, index, &modulePointer->playerData.displayLists[index], &modulePointer->fakePos, &modulePointer->fakeRot, player);
    }
#endif

#ifdef HAS_FAIRY
    if (player->naviActor != NULL)
    {
        memcpy(&modulePointer->playerData.navi.world, &player->naviActor->world, sizeof(PosRot));
        memcpy(&modulePointer->playerData.navi.world.rot, &player->naviActor->shape.rot, sizeof(Vec3s));
        modulePointer->playerData.navi.timer = ((EnElf *)player->naviActor)->timer;
        modulePointer->playerData.navi.disappearTimer = ((EnElf *)player->naviActor)->disappearTimer;
    }
#endif
#endif
}

void PuppetList_Update(Player *actor, PlayState *play)
{
    u32 index;
    LinkPuppet *puppet = NULL;
#ifdef RECONSTRUCT_PUPPETS_ON_LINK_INIT
    if (modulePointer->funcs.linkConsrFlag)
    {
        for (index = 0; index < MAX_PUPPETS; index++)
        {
            puppet = modulePointer->alivePuppets.puppetsAlive[index];
            if (puppet != NULL)
            {
                LinkPuppet_Init(puppet, play);
                modulePointer->funcs.timesConstructed++;
            }
            else
            {
                break;
            }
        }

        modulePointer->funcs.linkConsrFlag = 0;
    }
#endif

    for (index = 0; index < MAX_PUPPETS; index++)
    {
        if (modulePointer->alivePuppets.puppetsAlive[index] == 0)
        {
            break;
        }

        puppet = &modulePointer->puppetStorage.puppets[index];
        LinkPuppet_Update(puppet, play);
        puppet->timeAlive++;
    }
}

void PuppetList_Draw(Player *actor, PlayState *play)
{
    u32 index;
    LinkPuppet *puppet;

    for (index = 0; index < MAX_PUPPETS; index++)
    {
        if (modulePointer->alivePuppets.puppetsAlive[index] == 0)
        {
            break;
        }
        puppet = &modulePointer->puppetStorage.puppets[index];
        LinkPuppet_Draw(puppet, play);
    }
}