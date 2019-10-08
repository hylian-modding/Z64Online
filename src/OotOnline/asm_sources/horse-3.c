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

#define CHILD_EPONA_OBJ 0x00A0
#define CHILD_EPONA_SKL 0x06007B20
#define CHILD_EPONA_ANIM1 0x06002F98
#define CHILD_EPONA_ANIM2 0x0600360C
#define CHILD_EPONA_ANIM3 0x060043E4
#define CHILD_EPONA_ANIM4 0x06004B08
#define CHILD_EPONA_ANIM5 0x060053F0

// Ganon's Horse
#define GANON_OBJ 0x002D
#define GANON_SKL 0x06008668
#define GANON_RUN 0x06002650
#define GANON_WALK 0x06002CE4
#define GANON_REARING 0x06003858
#define GANON_IDLE 0x06004AA4
#define GANON_SHAKE_HEAD 0x06005264
#define GANON_SLOW_WALK 0x06005B78

// Generic Horse
#define HORSE_OBJ 0x0027
#define HORSE_SKL 0x06009FAC
#define HORSE_WALK 0x06001A1C
#define HORSE_RUN 0x06000608
#define HORSE_JUMP 0x06000C20
#define HORSE_HIGH_JUMP 0x060013A8
#define HORSE_REARING 0x06002458
#define HORSE_STOP_AND_REARING 0x060035D4
#define HORSE_SHAKE_HEAD 0x06004C20
#define HORSE_SLOW_WALK 0x060054BC
#define HORSE_IDLE 0x06004580

#define GFX_POLY_OPA ZQDL(global, poly_opa)

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
} entity_t;

extern void skelanime_draw_weighted_unk(entity_t *entity, z64_global_t *global, z64_skelanime_weighted_t *pony_skelanime, void *callback1, void *callback2, uint32_t unk0);
#if OOT_DEBUG
asm("skelanime_draw_weighted_unk = 0x800A6360");
#elif OOT_U_1_0
asm("skelanime_draw_weighted_unk = 0x8008E204");
#endif

static void init(entity_t *en, z64_global_t *global)
{
    en->isServerControlled = 0;

    if (en->actor.variable == 0)
    {
        en->horse_obj = EPONA_OBJ;
        en->horse_skl = EPONA_SKL;
    }
    else if (en->actor.variable == 1)
    {
        en->horse_obj = GANON_OBJ;
        en->horse_skl = GANON_SKL;
    }
    else if (en->actor.variable == 2)
    {
        en->horse_obj = HORSE_OBJ;
        en->horse_skl = HORSE_SKL;
    }
    else if (en->actor.variable == 3)
    {
        en->horse_obj = CHILD_EPONA_OBJ;
        en->horse_skl = CHILD_EPONA_SKL;
    }

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

    if (en->horse_obj == EPONA_OBJ)
    {
        en->anim_ids[0] = EPONA_RUN;
        en->anim_ids[1] = EPONA_JUMPING;
        en->anim_ids[2] = EPONA_HIGH_JUMP;
        en->anim_ids[3] = EPONA_WALKING;
        en->anim_ids[4] = EPONA_REARING;
        en->anim_ids[5] = EPONA_STOP_AND_REARING;
        en->anim_ids[6] = EPONA_SHAKE_HEAD;
        en->anim_ids[7] = EPONA_IDLE;
        en->anim_ids[8] = EPONA_SLOW_WALK;
    }
    else if (en->horse_obj == GANON_OBJ)
    {
        en->anim_ids[0] = GANON_RUN;
        en->anim_ids[1] = GANON_REARING;
        en->anim_ids[2] = GANON_REARING;
        en->anim_ids[3] = GANON_WALK;
        en->anim_ids[4] = GANON_REARING;
        en->anim_ids[5] = GANON_REARING;
        en->anim_ids[6] = GANON_SHAKE_HEAD;
        en->anim_ids[7] = GANON_IDLE;
        en->anim_ids[8] = GANON_SLOW_WALK;
    }
    else if (en->horse_obj == HORSE_OBJ)
    {
        en->anim_ids[0] = HORSE_RUN;
        en->anim_ids[1] = HORSE_JUMP;
        en->anim_ids[2] = HORSE_HIGH_JUMP;
        en->anim_ids[3] = HORSE_WALK;
        en->anim_ids[4] = HORSE_REARING;
        en->anim_ids[5] = HORSE_STOP_AND_REARING;
        en->anim_ids[6] = HORSE_SHAKE_HEAD;
        en->anim_ids[7] = HORSE_IDLE;
        en->anim_ids[8] = HORSE_SLOW_WALK;
    }
    else if (en->horse_obj == CHILD_EPONA_OBJ)
    {
        en->anim_ids[0] = CHILD_EPONA_ANIM1;
        en->anim_ids[1] = CHILD_EPONA_ANIM2;
        en->anim_ids[2] = CHILD_EPONA_ANIM3;
        en->anim_ids[3] = CHILD_EPONA_ANIM4;
        en->anim_ids[4] = CHILD_EPONA_ANIM5;
        en->anim_ids[5] = CHILD_EPONA_ANIM1;
        en->anim_ids[6] = CHILD_EPONA_ANIM1;
        en->anim_ids[7] = CHILD_EPONA_ANIM3;
        en->anim_ids[8] = CHILD_EPONA_ANIM1;
    }

    en->anim_id = 7;

    if (!object_is_loaded(&global->obj_ctxt, object_get_index(&global->obj_ctxt, en->horse_obj)))
    {
        object_load(&global->obj_ctxt, en->horse_obj);
    }

    en->actor.alloc_index = object_get_index(&global->obj_ctxt, en->horse_obj);
    actor_set_object(global, &en->actor);

    if (en->horse_obj == CHILD_EPONA_OBJ)
    {
        actor_set_scale(&en->actor, 0.0064f);
    }

    skelanime_init_weighted(
        &en->actor,
        &en->pony_skelanime,
        en->horse_skl,
        en->anim_ids[en->anim_id],
        0, 0, 0);
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

    if (en->horse_obj == EPONA_OBJ)
    {
        const uint32_t eyes[3] = {EPONA_EYES_OPEN, EPONA_EYES_HALF, EPONA_EYES_CLOSED};
        en->eye_texture = eyes[helper_eye_blink(&en->eye_index)];
    }
}

static int set_textures(entity_t *en, z64_global_t *global)
{
    z64_disp_buf_t *opa = &GFX_POLY_OPA;
    gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_8, zh_seg2ram(en->eye_texture));
    return 1;
}

static void draw(entity_t *en, z64_global_t *global)
{
    if (en->horse_obj == EPONA_OBJ)
    {
        skelanime_draw_weighted_unk(
            en,
            global,
            &en->pony_skelanime,
            0, &set_textures, 1);
    }
    else
    {
        skelanime_draw_weighted(&en->actor, global, &en->pony_skelanime, 0, 1);
    }

    // Draw Shadow
    vec3f_t shadowPos = en->actor.pos_2;
    shadowPos.y += 20.0f;
    vec3f_t shadowScale = {0.35f, 0.01f, 0.87f};
    actor_shadow_circle(&shadowPos, &shadowScale, 0x00FF, global);
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
    .object = 0x01,
    .instance_size = sizeof(entity_t),
    .init = init,
    .dest = destroy,
    .main = play,
    .draw = draw};
