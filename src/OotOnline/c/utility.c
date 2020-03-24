#include <z64ovl/oot/u10.h>
#include <z64ovl/oot/helpers.h>
#include <z64ovl/defines_oot.h>

typedef struct
{
    z64_actor_t actor;
    uint32_t addr;
    uint32_t end;
} entity_t;

static void init(entity_t *en, z64_global_t *global)
{
    en->end = 0xDEADBEEF;
    uint32_t slot = -1;
    if (global->link_age == 0)
    {
        slot = 0x0014;
    }
    else
    {
        slot = 0x0015;
    }
    en->addr = zh_get_pointer_to_object_data(slot, global);
}

static void play(entity_t *en, z64_global_t *global)
{
    z_actor_kill(&en->actor);
}

static void draw(entity_t *en, z64_global_t *global)
{
}

static void destroy(entity_t *en, z64_global_t *global)
{
}

/* .data */
const z64_actor_init_t init_vars = {
    .number = 0x03,
    .padding = 0x00,
    .type = 0x4,
    .room = 0x00,
    .flags = 0x00000001,
    .object = 0x1,
    .instance_size = sizeof(entity_t),
    .init = init,
    .dest = destroy,
    .main = play,
    .draw = draw};