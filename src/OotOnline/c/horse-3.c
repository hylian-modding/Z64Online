#include <z64ovl/oot/u10.h>
#include <z64ovl/oot/helpers.h>

// Epona
#define EPONA_OBJ 0x001A
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

typedef struct
{
    z64_actor_t actor;
    z64_skelanime_weighted_t pony_skelanime;
    uint8_t anim_id;
    uint8_t isServerControlled;
    uint8_t wasServerControlledLastFrame;
    uint16_t horse_obj;
    uint32_t horse_skl;
    uint32_t anim_ids[9];
    uint16_t eye_index;
    uint32_t eye_texture;
    uint8_t lastKnownAnim;
    z64_collider_cylinder_main_t cylinder;
} entity_t;

static void init(entity_t *en, z64_global_t *global)
{
    en->isServerControlled = 0;

    /*
    0: Run
    1: Jump
    2: High Jump
    3: Walk
    4: Rearing
    5: Stop then Rearing
    6: Shake Head
    7: Idle
    8: Slow Walk
    */

    en->horse_obj = EPONA_OBJ;
    en->horse_skl = EPONA_SKL;

    en->anim_ids[0] = EPONA_RUN;
    en->anim_ids[1] = EPONA_JUMPING;
    en->anim_ids[2] = EPONA_HIGH_JUMP;
    en->anim_ids[3] = EPONA_WALKING;
    en->anim_ids[4] = EPONA_REARING;
    en->anim_ids[5] = EPONA_STOP_AND_REARING;
    en->anim_ids[6] = EPONA_SHAKE_HEAD;
    en->anim_ids[7] = EPONA_IDLE;
    en->anim_ids[8] = EPONA_SLOW_WALK;

    en->anim_id = 7;

    skelanime_init_weighted(
        &en->actor,
        &en->pony_skelanime,
        en->horse_skl,
        en->anim_ids[en->anim_id],
        0, 0, 0);

    actor_collider_cylinder_init(global, &en->cylinder, &en->actor, &Collision);
}

static void setanim(entity_t *en, uint8_t anim_id)
{
    en->anim_id = anim_id;
    actor_anime_set(&en->pony_skelanime.skelanime, en->anim_ids[en->anim_id]);
}

static void play(entity_t *en, z64_global_t *global)
{
    // Server is driving, do nothing but relay server commands.
    if (en->isServerControlled == 1)
    {
        if (en->lastKnownAnim != en->anim_id)
        {
            setanim(en, en->anim_id);
        }
        en->wasServerControlledLastFrame = 1;
    }
    else
    {
        // Server was controlling but is no longer. Reset everything.
        if (en->wasServerControlledLastFrame == 1)
        {
            setanim(en, 7);
            en->wasServerControlledLastFrame = 0;
        }
    }

    // Run anims.
    actor_anime_frame_update_mtx(&en->pony_skelanime.skelanime);
    en->lastKnownAnim = en->anim_id;

    const uint32_t eyes[3] = {EPONA_EYES_OPEN, EPONA_EYES_HALF, EPONA_EYES_CLOSED};
    en->eye_texture = eyes[helper_eye_blink(&en->eye_index)];
    actor_collision_check_set_ot(global, (uint32_t *)(AADDR(global, 0x11e60)), &en->cylinder);
}

static int set_textures(entity_t *en, z64_global_t *global)
{
    z64_disp_buf_t *opa = &GFX_POLY_OPA;
    gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_8, zh_seg2ram(en->eye_texture));
    return 1;
}

static void draw(entity_t *en, z64_global_t *global)
{
    skelanime_draw_weighted_unk(
        en,
        global,
        &en->pony_skelanime,
        0, &set_textures, 1);

    // Draw Shadow
    vec3f_t shadowPos = en->actor.pos_2;
    shadowPos.y += 20.0f;
    vec3f_t shadowScale = {0.35f, 0.01f, 0.87f};
    actor_shadow_circle(&shadowPos, &shadowScale, 0x00FF, global);
}

static void destroy(entity_t *en, z64_global_t *global)
{
    actor_collider_cylinder_free(global, &en->cylinder);
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
