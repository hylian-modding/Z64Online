#include <libzelda64.h>

#include "GetLink.h"

/** Why doesn't this work in MM? */
Player* GET_LINK(GlobalContext* globalCtx) {
#ifdef GAME_OOT
    return (Player*)globalCtx->actorCtx.actorLists[ACTORLIST_CATEGORY_PLAYER].head;
#elif defined GAME_MM
    return ((Player*)0x803FFDB0);
#endif
}