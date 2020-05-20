#include <z64ovl/oot/u10.h>
#include <z64ovl/oot/helpers.h>
#include <z64ovl/defines_oot.h>

#define GFX_POLY_OPA ZQDL(global, poly_opa)

typedef struct
{
    z64_actor_t actor;
} entity_t;

static void init(entity_t *en, z64_global_t *global)
{
}

static int bit_test(char bit, char byte)
{
    bit = 1 << bit;
    return (bit & byte);
}

void bit_reset(char bit, char *byte)
{
    bit = 1 << bit;
    bit ^= 0xff;
    *byte = *byte & bit;
}

static void windmill(entity_t *en, z64_global_t *global)
{
    uint32_t *data = AADDR(Z64GL_SAVE_CONTEXT, 0xEE1);
    if (bit_test(5, *data) > 0)
    {
        // Windmill is going fast.
        z64_player_t *player = zh_get_player(global);
        if (player->state_flags_1 < 1)
        {
            // Player is in control.
            bit_reset(5, data);
        }
    }
}

static void elevator(entity_t *en, z64_global_t *global)
{
    uint8_t *p = AADDR(global, 0x001D28);
    // Player is within 100 units of the actor.
    if (en->actor.dist_from_link_xz < 100)
    {
        // Purple torch is on but elevator is down.
        if (bit_test(3, *p) > 0 && bit_test(4, *p) > 0)
        {
            bit_reset(3, p);
        }
    }
}

static void zelda_guards(entity_t *en, z64_global_t *global)
{
    uint8_t *p = AADDR(Z64GL_SAVE_CONTEXT, 0xEE5);
    // Player is within 100 units of the actor.
    if (en->actor.dist_from_link_xz < 100)
    {
        // Guard flag is set.
        if (bit_test(0, *p) > 0)
        {
            bit_reset(0, p);
        }
    }
}

static void ingo_is_a_bastard(entity_t *en, z64_global_t *global)
{
    uint8_t *p = AADDR(0x80600000, 0x144);
    *p = 0x1;
}

static void play(entity_t *en, z64_global_t *global)
{
    switch (global->scene_index)
    {
    case 0x3: // Forest Temple
        elevator(en, global);
        break;
    case 0x52: // Kakariko Village
        windmill(en, global);
        break;
    case 0x5F: // Hyrule Castle
        zelda_guards(en, global);
        break;
    case 0x63: // Lon Lon Ranch
        ingo_is_a_bastard(en, global);
        break;
    }
}

static void draw(entity_t *en, z64_global_t *global)
{
}

static void destroy(entity_t *en, z64_global_t *global)
{
}

/* .data */
const z64_actor_init_t init_vars = {
    .number = 0x05,
    .padding = 0x00,
    .type = 0x4,
    .room = 0xFF,
    .flags = 0x41900000,
    .object = 0x1,
    .instance_size = sizeof(entity_t),
    .init = init,
    .dest = destroy,
    .main = play,
    .draw = draw};