#include <z64ovl/oot/u10.h>
#include <z64ovl/oot/helpers.h>
#include <z64ovl/defines_oot.h>

// Epona
#define EPONA_SKL 0x06009D74
#define EPONA_RUN 0x06001E2C
#define EPONA_JUMPING 0x06002470
#define EPONA_HIGH_JUMP 0x06002c38
#define EPONA_WALKING 0x060032b0
#define EPONA_REARING 0x06003cec
#define EPONA_STOP_AND_REARING 0x06004dec
#define EPONA_SHAKE_HEAD 0x06005584
#define EPONA_IDLE 0x06006d50
#define EPONA_SLOW_WALK 0x060075f0

#define EPONA_EYES_OPEN 0x06009F80
#define EPONA_EYES_HALF 0x0600A180
#define EPONA_EYES_CLOSED 0X0600A380

#define GFX_POLY_OPA ZQDL(global, poly_opa)

const z64_collider_cylinder_init_t Collision =
    {
        .body = {
            .unk_0x14 = 0x0A, .collider_flags = 0x00, .collide_flags = 0x11, .mask_a = 0x39, .mask_b = 0x10, .type = 0x01, .body_flags = 0x00, .toucher_mask = 0x00000000, .bumper_effect = 0x00, .toucher_damage = 0x04, .bumper_mask = 0xFFCFFFFF, .toucher_flags = 0x00, .bumper_flags = 0x01, .body_flags_2 = 0x01},
        .radius = 0x0018,
        .height = 0x0028,
        .y_shift = 0,
        .position = {.x = 0, .y = 0, .z = 0}};

const uint32_t eyes[] = {EPONA_EYES_OPEN, EPONA_EYES_HALF, EPONA_EYES_CLOSED};

typedef struct
{
    z64_actor_t actor;
    z64_skelanime_weighted_t pony_skelanime;
    uint32_t anim;
    uint32_t lastKnownAnim;
    uint16_t eye_index;
    uint32_t eye_texture;
    z64_collider_cylinder_main_t cylinder;
    uint32_t end;
} entity_t;

static void init(entity_t *en, z64_global_t *global)
{
    en->anim = EPONA_IDLE;

    skelanime_init_weighted(&en->actor, &en->pony_skelanime, EPONA_SKL, 0, 0, 0, 0);

    z_collider_cylinder_init(global, &en->cylinder, &en->actor, &Collision);

    en->end = 0xDEADBEEF;
    //textbox_begin(global, 0x0200, &en->actor);
}

static void setanim(entity_t *en, uint8_t anim)
{
    z_skelanime_anim_set(&en->pony_skelanime.skelanime, en->anim);
    en->lastKnownAnim = anim;
}

static void play(entity_t *en, z64_global_t *global)
{
    if (en->lastKnownAnim != en->anim)
    {
        setanim(en, en->anim);
    }

    // Run anims.
    z_skelanime_draw_table(&en->pony_skelanime.skelanime);

    en->eye_texture = eyes[helper_eye_blink(&en->eye_index)];
    z_collider_set_ot(global, (uint32_t *)(AADDR(global, 0x11e60)), &en->cylinder);
}

static int set_textures(entity_t *en, z64_global_t *global)
{
    z64_disp_buf_t *opa = &GFX_POLY_OPA;
    gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_8, zh_seg2ram(en->eye_texture));
    return 1;
}

static void draw(entity_t *en, z64_global_t *global)
{
    skelanime_draw_weighted_unk(en, global, &en->pony_skelanime, 0, &set_textures, 1);
}

static void destroy(entity_t *en, z64_global_t *global)
{
    z_collider_cylinder_free(global, &en->cylinder);
}

/* .data */
const z64_actor_init_t init_vars = {
    .number = 0x03,
    .padding = 0x00,
    .type = 0x4,
    .room = 0x00,
    .flags = 0x00000001,
    .object = EPONA_OBJ,
    .instance_size = sizeof(entity_t),
    .init = init,
    .dest = destroy,
    .main = play,
    .draw = draw};