#ifndef PUPPET_PUPPET_H
#define PUPPET_PUPPET_H

#include <libzelda64.h>
#include "Equipment.h"
#include "Puppet_Shared.h"
#include "Navi.h"
#include "CustomEpona.h"

#define MAX_PUPPETS 0x10

typedef struct{
    Actor actor;
    u32 puppet;
} ProxyActor;

typedef struct {
    PuppetSync* syncPointer;
    PuppetModel* modelContext;
    u32 puppetID;
    u32 modelPointer;
    u32 timeAlive;
    u32 isAwake;
    PuppetSync sync;
    NaviPuppet navi;
    EponaPuppet_C epona;
    SkelAnime skelAnime1;
    SkelAnime skelAnime2;
    Vec3s jointTable[PLAYER_LIMB_BUF_COUNT];
    Vec3s morphTable[PLAYER_LIMB_BUF_COUNT];
} LinkPuppet;

typedef struct {
    LinkPuppet puppets[MAX_PUPPETS];
} PuppetStorage;

typedef struct {
    LinkPuppet* puppetsAlive[MAX_PUPPETS];
} PuppetList;

extern LinkPuppet* LinkPuppet_New(PlayState* play, PuppetModel* modelContext);
extern void LinkPuppet_Awake(LinkPuppet* thisx);
extern void LinkPuppet_Sleep(PlayState* play, LinkPuppet* thisx);
extern void PuppetList_Update(Player* actor, PlayState* play);
extern void PuppetList_Draw(Player* actor, PlayState* play);
extern void PuppetSync_Update(Player* actor, PlayState* play);

extern void LinkPuppet_Init(LinkPuppet* thisx, PlayState* play);
extern void LinkPuppet_Update(LinkPuppet* thisx, PlayState* play);
extern void LinkPuppet_Draw(LinkPuppet* thisx, PlayState* play);
extern void LinkPuppet_Destroy(LinkPuppet* thisx, PlayState* play);

#endif

