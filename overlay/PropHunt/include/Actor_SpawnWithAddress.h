#ifndef __ACTOR_SPAWN_WITH_ADDRESS_H__
#define __ACTOR_SPAWN_WITH_ADDRESS_H__

#include <libzelda64.h>

#ifdef GAME_OOT
typedef void(*Actor_SpawnWithAddress)(GlobalContext* globalCtx, int16_t actorId, int16_t params, Vec3f* pos, Vec3s* rot, Actor* actor);
#elif defined GAME_MM
typedef Actor* (*Actor_SpawnWithAddress)(GlobalContext* globalCtx, int16_t index, int32_t params, Vec3f* pos, Vec3s* rot, Actor* actor);
#endif

#endif /* __ACTOR_SPAWN_WITH_ADDRESS_H__ */