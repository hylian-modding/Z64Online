#include <z64ovl/oot/u10.h>
#include <z64ovl/z64ovl_helpers.h>
#include <z64ovl/oot/sfx.h>
#include <z64ovl/zh/vec3f.h>
#include <z64ovl/zh/vec3s.h>
#include <z64ovl/z64_inputHandler.h>

#define WALLET_DEFAULT 0
#define WALLET_ADULT 1
#define WALLET_GIANT 2
#define WALLET_TYCOON 3
#define BANK_RUPEES 0x8011B874
#define BANK_FOLLOW 0x80718000
#define BANK_TELEPORT 0x80718002

#define ANIM_IDLE 0
#define ANIM_HAPPY 1
#define ANIM_SAD 2
#define ANIM_IDLE2 3
#define ANIM_HOP 4
#define ANIM_KABOOM 5

#define player_is_busy(global) (player_talk_state(AADDR(global, 0x20D8)) == 4)
#define PFOP(p, i, e) ((p - i) / e) /*Percentage from offset percentage*/

/*const z64_collider_cylinder_init_t Collision =
{
    .body = {
        .unk_0x14 = 0x0A,
        .collider_flags = 0x00,
        .collide_flags = 0x11,
        .mask_a = 0x39, .mask_b = 0x10,
        .type = 0x01, .body_flags = 0x00,
        .toucher_mask = 0x00000000,
        .bumper_effect = 0x00,
        .toucher_damage = 0x04,
        .bumper_mask = 0xFFCFFFFF,
        .toucher_flags = 0x00,
        .bumper_flags = 0x01,
        .body_flags_2 = 0x01
    },
    .radius = 0x0014,
    .height = 0x0028,
    .y_shift = 0,
    .position = {.x = 0, .y = 0, .z = 0}
};*/

const z64_collider_cylinder_init_t Collision = {
    .body = {
        .flags_body = 0x0A,

        .toucher = {
            .flags = 0,
            .effect = 0,
            .damage = 4},

        .bumper = {.flags = 0x01, .effect = 0, .defense = 0},

        .flags_toucher = 0,
        .flags_bumper = 1,
        .flags_body_2 = 1},
    .dim = {.radius = 0x0014, .height = 0x0028, .y_shift = 0, .pos = {.x = 0, .y = 0, .z = 0}}};

typedef struct
{
    int8_t hundreds, tens, ones;
    int16_t composite;
} rupee_amount_t;

typedef struct
{
    z64_actor_t zzactor;
    z64_collider_cylinder_init_t cylinder;
    z64_inputHandler_t input_handler;
    z64_debug_text_t dbg_txt;
    z64_debug_text_t money_txt;
    rupee_amount_t rupee_amount;
    vec3f_t initial_follow_pos;
    vec3f_t target_follow_pos;
    vec3f_t reset_pos;
    vec3s_t reset_rot;
    bool toggle_follow;
    bool drop_money;
    int anim_state;
    int last_anim_state;
    int blastoff_frames;
    float target_follow_time;
    float blastoff_time;
    float scaled_time_alive;
    float anim_time;
    float despawn_end;
    // The implementation of these two members seems odd
    int8_t scale_counter;
    int8_t scale_flag;
    int8_t selected_digit; /* selected Number Index */
    uint32_t end;          /* Instance End */
} entity_t;

static void changeClampFlipRupeeIndex(rupee_amount_t *amount, int index, int direction)
{
    ((int8_t *)amount)[index] += direction;

    if (((int8_t *)amount)[index] > 9)
        ((int8_t *)amount)[index] = 0;
    else if (((int8_t *)amount)[index] < 0)
        ((int8_t *)amount)[index] = 9;
}

static int16_t getMaxRupees(entity_t *en, z64_global_t *global)
{
    int16_t *wallet_max_list = (uint16_t *)0x800F8CEC;
    uint32_t save_upgrades = AVAL(Z64GL_SAVE_CONTEXT, uint32_t, 0xA0);
    uint8_t wallet_now = ((save_upgrades & 0x3000) >> (0x0C & 0x1F));
    return wallet_max_list[wallet_now];
}

static void checkForFollowEnd(entity_t *en, z64_global_t *global)
{
    if ((en->scaled_time_alive > en->despawn_end) && en->despawn_end > 0)
    {
        AVAL(BANK_FOLLOW, uint8_t, 0) = en->toggle_follow;
        AVAL(BANK_TELEPORT, uint8_t, 0) = 1;
    }
    if (!en->toggle_follow)
    {
        return;
    }
    uint16_t *rupees = (uint16_t *)AADDR(Z64GL_SAVE_CONTEXT, 0x0034);
    if (*rupees < getMaxRupees(en, global))
    {
        en->toggle_follow = false;
        z_actor_spawn_attached(&global->actor_ctxt, &en->zzactor, global, 0x009E, en->zzactor.pos.x, en->zzactor.pos.y, en->zzactor.pos.z, en->zzactor.rot.x, en->zzactor.rot.y, en->zzactor.rot.z, 0x0000);
        en->despawn_end = en->scaled_time_alive + 3.0f;
    }
}

static void checkForFollowStart(entity_t *en, z64_global_t *global)
{
    uint16_t *rupees = (uint16_t *)AADDR(Z64GL_SAVE_CONTEXT, 0x0034);
    if (*rupees == getMaxRupees(en, global))
    {
        en->toggle_follow = true;
        AVAL(BANK_FOLLOW, uint8_t, 0) = en->toggle_follow;
    }
}

static void changeBankRupees(entity_t *en, z64_global_t *global, int16_t rupee_change)
{
    uint16_t *rupees = (uint16_t *)AADDR(Z64GL_SAVE_CONTEXT, 0x0034);
    int change = rupee_change;
    if (rupee_change < 0)
    {
        if (*rupees + rupee_change >= 0)
            change = rupee_change;
        else
            change = -((int)(*rupees));
    }
    if (rupee_change > 0)
    {
        change = AVAL(BANK_RUPEES, int16_t, 0) - rupee_change >= 0 ? rupee_change : AVAL(BANK_RUPEES, int16_t, 0);
        if (*rupees + change > getMaxRupees(en, global))
            change = getMaxRupees(en, global) - *rupees;
    }

    change_rupee_count_by(change);
    AVAL(BANK_RUPEES, int16_t, 0) -= change;
}

static inline void setRupeeText(z64_debug_text_t *ts, rupee_amount_t *rupee_amount, int index, bool selected)
{
    if (selected)
        debug_set_text_rgba(ts, 0, 255, 255, 255);
    debug_set_text_xy(ts, 17 + index, 8);
    debug_set_text_string(ts, "%01d", ((int8_t *)rupee_amount)[index]);
    debug_set_text_rgba(ts, 255, 255, 255, 255);
}

static void actorAnimate(entity_t *en)
{
    float deltaTime, p;

    if (en->anim_state > 0)
    {
        deltaTime = en->scaled_time_alive - en->anim_time;
        p = deltaTime / 1.75f;
    }

    if (en->anim_state != en->last_anim_state)
    {
        en->last_anim_state = en->anim_state;
        en->anim_time = en->scaled_time_alive;
        z_actor_set_scale(&en->zzactor, 0.015f);
        en->scale_counter = 0;
        en->scale_flag = -1;
    }

    if (p >= 1 && en->anim_state != ANIM_IDLE2)
    {
        en->anim_state = ANIM_IDLE;
        en->zzactor.pos = en->reset_pos;
        z_actor_set_scale(&en->zzactor, 0.015f);
    }

    if (en->anim_state == ANIM_IDLE)
    {
        en->reset_pos = en->zzactor.pos;
        en->reset_rot = en->zzactor.rot;
        en->zzactor.scale.x -= (float)(en->scale_counter * 0.00001f);
        en->zzactor.scale.y += (float)(en->scale_counter * 0.00001f);
        en->zzactor.scale.z -= (float)(en->scale_counter * 0.00001f);
    }
    else if (en->anim_state == ANIM_HAPPY)
    {
        if (p <= 0.1f)
        { // Prepare to jump
            p = PFOP(p, 0, 0.1f);
            en->zzactor.scale.x = 0.015f + (0.005 * p);
            en->zzactor.scale.y = 0.015f - (0.0075f * p);
            en->zzactor.scale.z = 0.015f + (0.005 * p);
        }
        else if (p <= 0.6f)
        { // Jump and half spin
            p = PFOP(p, 0.1, 0.5f);
            en->zzactor.pos.y = en->reset_pos.y + (15 * p);
            en->zzactor.rot.y = (en->zzactor).rot_toward_link_y + ((405 * DEG2S) * p);
            en->zzactor.scale.x = 0.015f + (0.005f * (1 - p));
            en->zzactor.scale.y = 0.015f + (0.005f * p);
            en->zzactor.scale.z = 0.015f + (0.005f * (1 - p));
        }
        else if (p <= 0.75f)
        { // Fall
            p = PFOP(p, 0.6f, 0.15f);
            en->zzactor.pos.y = en->reset_pos.y + (15 * (1 - p));
            en->zzactor.rot.y = (en->zzactor).rot_toward_link_y + ((405 * DEG2S) - ((52 * DEG2S) * p));
            en->zzactor.scale.y = 0.015f + (0.005f * (1 - p));
        }
        else if (p <= 0.925f)
        { // Compress and expand
            p = PFOP(p, 0.8f, 0.125f);
            en->zzactor.rot.y = (en->zzactor).rot_toward_link_y - ((8 * DEG2S) * (1 - p));
            en->zzactor.scale.x = 0.015f + (0.005f * p);
            en->zzactor.scale.y = 0.015f - (0.0025f * p);
            en->zzactor.scale.z = 0.015f + (0.005f * p);
        }
        else
        { // Decompress and return
            p = z_sinf(PFOP(p, 0.925f, 0.075f) * HPI);
            en->zzactor.scale.x = 0.015f + (0.005f * (1 - p));
            en->zzactor.scale.y = 0.015f - (0.0025f * (1 - p));
            en->zzactor.scale.z = 0.015f + (0.005f * (1 - p));
        }
    }
    else if (en->anim_state == ANIM_SAD)
    {
        if (p <= 0.2f)
        { // Puff
            p = PFOP(p, 0, 0.2f);
            en->zzactor.scale.x = 0.015f + (0.0025f * p);
            en->zzactor.scale.y = 0.015f + (0.0025f * p);
            en->zzactor.scale.z = 0.015f + (0.0025f * p);
        }
        else if (p <= 0.3f)
        { // Normal
            p = PFOP(p, 0.2f, 0.1f);
            en->zzactor.scale.x = 0.015f + (0.0025f * (1 - p));
            en->zzactor.scale.y = 0.015f + (0.0025f * (1 - p));
            en->zzactor.scale.z = 0.015f + (0.0025f * (1 - p));
        }
        else if (p <= 0.55f)
        { // Flatten
            p = PFOP(p, 0.3f, 0.25f);
            en->zzactor.scale.x = 0.015f + (0.005f * p);
            en->zzactor.scale.y = 0.015f - (0.0125f * p);
            en->zzactor.scale.z = 0.015f + (0.005f * p);
        }
        else if (p <= 0.7f)
        { // Boing
            p = PFOP(p, 0.55f, 0.15f);
            en->zzactor.scale.x = 0.015f + (0.005f + (-0.005f * p));
            en->zzactor.scale.y = 0.015f - (0.0125f + (-0.0025f * p));
            en->zzactor.scale.z = 0.015f + (0.005f + (-0.005f * p));
        }
        else if (p <= 0.85f)
        { // Boing 2
            p = PFOP(p, 0.7f, 0.15f);
            en->zzactor.scale.x = 0.015f + (0.005f + (-0.005f * (1 - p)));
            en->zzactor.scale.y = 0.015f - (0.0125f + (-0.0025f * (1 - p)));
            en->zzactor.scale.z = 0.015f + (0.005f + (-0.005f * (1 - p)));
        }
        else
        { // Return
            p = PFOP(p, 0.85f, 0.15f);
            en->zzactor.scale.x = 0.015f + (0.005f * (1 - p));
            en->zzactor.scale.y = 0.015f - (0.0125f * (1 - p));
            en->zzactor.scale.z = 0.015f + (0.005f * (1 - p));
        }
    }
    else if (en->anim_state == ANIM_IDLE2)
    {
        p = deltaTime / 3.0f;

        if (p >= 1)
        {
            en->anim_state = ANIM_IDLE;
            en->zzactor.pos = en->reset_pos;
            z_actor_set_scale(&en->zzactor, 0.015f);
        }

        if (p < 0.3333)
        { // Look left and squeeze
            p = PFOP(p, 0, 0.3333f);
            p = p * p * p;

            en->zzactor.scale.x = 0.015f - (0.0025f * p);
            en->zzactor.scale.y = 0.015f + (0.002f * p);
            en->zzactor.scale.z = 0.015f - (0.0025f * p);

            en->zzactor.rot.y = en->reset_rot.y - ((50 * DEG2S) * p);
        }
        else if (p < 0.5f)
        { // Center
            p = PFOP(p, 0.3333f, 0.16666f);

            en->zzactor.scale.x = 0.015f - (0.0025f * (1 - p));
            en->zzactor.scale.y = 0.015f + (0.002f * (1 - p));
            en->zzactor.scale.z = 0.015f - (0.0025f * (1 - p));

            en->zzactor.rot.y = en->reset_rot.y - ((50 * DEG2S) * (1 - p));
        }
        else if (p < 0.6666f)
        { // Look right
            p = PFOP(p, 0.5f, 0.16666f);

            en->zzactor.scale.x = 0.015f - (0.0025f * p);
            en->zzactor.scale.y = 0.015f + (0.002f * p);
            en->zzactor.scale.z = 0.015f - (0.0025f * p);

            en->zzactor.rot.y = en->reset_rot.y + ((50 * DEG2S) * p);
        }
        else if (p < 1.0f)
        { // Center
            p = PFOP(p, 0.6666f, 0.3333f);

            en->zzactor.scale.x = 0.015f - (0.0025f * (1 - p));
            en->zzactor.scale.y = 0.015f + (0.002f * (1 - p));
            en->zzactor.scale.z = 0.015f - (0.0025f * (1 - p));

            en->zzactor.rot.y = en->reset_rot.y + ((50 * DEG2S) * (1 - p));
        }
    }
}

static void menu_input_update(entity_t *en, z64_global_t *global)
{
    en->scaled_time_alive += ((float)AVAL(0x801C6FA1, uint8_t, 0x0) / 60);
    update_z64_inputHandler_t(&en->input_handler, en->scaled_time_alive);
    float drTime = en->scaled_time_alive - en->input_handler.dr.invokeTime;
    float dlTime = en->scaled_time_alive - en->input_handler.dl.invokeTime;
    float duTime = en->scaled_time_alive - en->input_handler.du.invokeTime;
    float ddTime = en->scaled_time_alive - en->input_handler.dd.invokeTime;

    if (player_is_busy(global))
    {
        if ((en->input_handler.dr.buttonState > 0 && drTime >= 0.15f) || (en->input_handler.dr.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_CURSOR, &(en->zzactor).pos, 4, AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x8));
            en->selected_digit++;
            en->input_handler.dr.invokeTime = en->scaled_time_alive;
        }

        if ((en->input_handler.dl.buttonState > 0 && dlTime >= 0.15f) || (en->input_handler.dl.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_CURSOR, &(en->zzactor).pos, 4, AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x8));
            en->selected_digit--;
            en->input_handler.dl.invokeTime = en->scaled_time_alive;
        }

        if (en->selected_digit < 0)
            en->selected_digit = 2;
        else if (en->selected_digit > 2)
            en->selected_digit = 0;

        if ((en->input_handler.du.buttonState > 0 && duTime >= 0.15f) || (en->input_handler.du.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_RUPY_COUNT, &(en->zzactor).pos, 4, AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x8));
            changeClampFlipRupeeIndex(&en->rupee_amount, en->selected_digit, 1);
            en->input_handler.du.invokeTime = en->scaled_time_alive;
        }

        if ((en->input_handler.dd.buttonState > 0 && ddTime >= 0.15f) || (en->input_handler.dd.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_RUPY_COUNT, &(en->zzactor).pos, 4, AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x8));
            changeClampFlipRupeeIndex(&en->rupee_amount, en->selected_digit, -1);
            en->input_handler.dd.invokeTime = en->scaled_time_alive;
        }

        en->rupee_amount.composite = ((int16_t)en->rupee_amount.hundreds * 100) + (en->rupee_amount.tens * 10) + (en->rupee_amount.ones);
    }
}

static void init(entity_t *en, z64_global_t *global)
{
    //AVAL(BANK_RUPEES, int16_t, 0) = 8999;
    en->zzactor.text_id = 0x0006;
    z_actor_set_scale(&en->zzactor, 0.015f);
    z_collider_cylinder_init(global, &en->cylinder, &en->zzactor, &Collision);
    construct_z64_inputHandler_t(&en->input_handler, &global->common.input[0].raw);
    en->toggle_follow = false;
    en->target_follow_time = 0;
    en->initial_follow_pos = en->zzactor.pos;
    en->target_follow_pos = en->zzactor.pos;
    en->scaled_time_alive = 0;
    en->blastoff_time = 0;
    en->blastoff_frames = 0;
    en->scale_counter = 0;
    en->scale_flag = -1;
    en->anim_state = 0;
    en->last_anim_state = 0;
    en->anim_time = 0;
    if (en->zzactor.variable > 0)
    {
        switch (en->zzactor.variable)
        {
        case 1:
            en->toggle_follow = true;
            break;
        case 2:
            en->drop_money = true;
            break;
        case 3:
            en->toggle_follow = true;
            en->drop_money = true;
            break;
        }
    }
    en->end = 0xDEADBEEF;
}

static void play(entity_t *en, z64_global_t *global)
{
    z64_actor_t *rupee;
    z64_player_t *Link = zh_get_player(global);
    vec3f_t temp;
    uint32_t smoke_inner_color, smoke_outer_color;
    int i, idx;
    float p, result;

    checkForFollowStart(en, global);
    checkForFollowEnd(en, global);

    /* Set Z-Target Position*/
    en->zzactor.pos_focus = en->zzactor.pos;
    (en->zzactor).pos_focus.y += 30.0f;

    external_func_8002F2F4(&en->zzactor, global); /* Textbox */

    /* Checks if Link is busy */
    if (player_is_busy(global))
    {
        /* Checks if the player responded to the textbox */
        if (player_responded_to_textbox(global) == 1)
        {
            temp = vec3f_zero;
            smoke_inner_color = 0xFFFFFFFF;
            smoke_outer_color = 0x00969696;
            if (AVAL(BANK_RUPEES, int16_t, 0) % 420 == 0)
            {
                smoke_inner_color = 0x007E00FF;
                smoke_outer_color = 0x00003600;
            }

            if (zh_player_textbox_selection(global))
            {
                changeBankRupees(en, global, en->rupee_amount.composite); /* Withdraw */
                en->anim_state = ANIM_SAD;
                en->anim_time = en->scaled_time_alive;
                z_actor_play_sfx2(&en->zzactor, NA_SE_EN_PO_SISTER_DEAD);
                z_effect_spawn_dead_db(global, &en->zzactor.pos, &temp, &temp, 250, 0, RED32(smoke_inner_color), GREEN32(smoke_inner_color), BLUE32(smoke_inner_color), ALPHA32(smoke_inner_color), RED24(smoke_outer_color), GREEN24(smoke_outer_color), BLUE24(smoke_outer_color), 10, 15, /* Frames */ 10);
            }
            else
            {
                changeBankRupees(en, global, -en->rupee_amount.composite); /* Deposit */
                en->anim_state = ANIM_HAPPY;
                en->anim_time = en->scaled_time_alive;
                z_actor_play_sfx2(&en->zzactor, NA_SE_EN_PO_LAUGH);
                z_effect_spawn_dead_db(global, &en->zzactor.pos, &temp, &temp, 250, 0, RED32(smoke_inner_color), GREEN32(smoke_inner_color), BLUE32(smoke_inner_color), ALPHA32(smoke_inner_color), RED24(smoke_outer_color), GREEN24(smoke_outer_color), BLUE24(smoke_outer_color), 1, 30, /* Frames */ 1);
            }

            en->rupee_amount.hundreds = 0;
            en->rupee_amount.tens = 0;
            en->rupee_amount.ones = 0;
        }
    }

    if (en->zzactor.dist_from_link_xz > 500.0f && en->scaled_time_alive - en->anim_time > 6.0f + z_math_frand(10.0f))
    {
        en->anim_state = ANIM_IDLE2;
        en->anim_time = en->scaled_time_alive;
    }

    /*if (en->cylinder.base.colliding_actor->actor_id == 0x0016) { // TODO? -> results in crash
        en->anim_state = ANIM_HAPPY;
        en->anim_time = en->scaled_time_alive;
        z_actor_play_sfx2(&en->zzactor, NA_SE_EN_PO_SISTER_DEAD);
    }*/

    if (en->toggle_follow && en->anim_state != ANIM_KABOOM)
    {
        if (en->zzactor.dist_from_link_xz > 75.0f && en->target_follow_time == 0)
        {
            en->initial_follow_pos = en->zzactor.pos;
            en->target_follow_pos = vec3f_add(Link->actor.pos, Link->actor.velocity);
            en->target_follow_time = en->scaled_time_alive;
            en->anim_state = ANIM_HOP;
            z_actor_play_sfx2(&en->zzactor, NA_SE_EN_STAL_JUMP);
            idx = z_lib_math_rand_s16_offset(0, 5);
            idx = idx < 3 ? idx : idx + 0x10;
            if (en->drop_money)
            {
                z_item_drop(global, &en->zzactor.pos, idx);
            }
        }

        if (en->target_follow_time != 0)
        {
            p = (en->scaled_time_alive - en->target_follow_time) / 0.5f;

            if (p >= 1)
            {
                en->target_follow_time = 0;
                en->anim_state = ANIM_IDLE;
                en->zzactor.rot.x = 0;
            }
            else
            {
                temp = en->zzactor.pos;
                temp.y += 10.0f;

                result = math_raycast(&global->col_ctxt, &i, &idx, &en->zzactor, &temp);

                en->zzactor.pos = vec3f_add(en->initial_follow_pos, vec3f_mul_f(vec3f_sub(en->target_follow_pos, en->initial_follow_pos), p));
                if (p < 0.25f)
                {
                    p = PFOP(p, 0, 0.25f);
                    en->zzactor.pos.y = RAYCAST_SUCCESS(result) ? result : en->initial_follow_pos.y;
                    en->zzactor.rot.x = (DEG2S * 45.0f) * p;
                }
                else if (p < 0.666f)
                {
                    p = PFOP(p, 0.25f, 0.416f);
                    en->zzactor.pos.y = RAYCAST_SUCCESS(result) ? result + (30 * p) : Link->actor.pos.y + (30 * p);
                    en->zzactor.rot.x = (DEG2S * 45.0f) * (1 - p);
                }
                else if (p < 0.9f)
                {
                    p = PFOP(p, 0.666f, 0.234f);
                    en->zzactor.pos.y = RAYCAST_SUCCESS(result) ? result + (30 * (1 - p)) : Link->actor.pos.y + (30 * (1 - p));
                    en->zzactor.rot.x = (DEG2S * -45.0f) * p;
                }
                else
                {
                    p = PFOP(p, 0.9f, 0.1f);
                    en->zzactor.pos.y = RAYCAST_SUCCESS(result) ? result : Link->actor.pos.y;
                    en->zzactor.rot.x = (DEG2S * -45.0f) * (1 - p);
                }
            }
        }
    }

    if (AVAL(BANK_RUPEES, int16_t, 0) > 9000)
    { // BLAST OFF
        en->anim_state = 0;
        en->anim_time = 0;
        if (!en->blastoff_time)
        {
            en->blastoff_time = en->scaled_time_alive;
            en->anim_state = ANIM_KABOOM;
        }
        else
        {
            temp = vec3f_zero;
            if (en->scaled_time_alive - en->blastoff_time <= 5)
            {
                if (en->blastoff_frames == 80)
                    z_sfx_play_system(NA_SE_SY_WARNING_COUNT_E, &en->zzactor.pos, 4, AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x8));
                else if (en->blastoff_frames % 20 == 0)
                    z_sfx_play_system(NA_SE_SY_WARNING_COUNT_N, &en->zzactor.pos, 4, AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x0), AVAL(0x801043A0, float *, 0x8));
            }
            else if (en->scaled_time_alive - en->blastoff_time <= 30)
            {
                if (en->blastoff_frames == 100)
                {
                    if (en->drop_money)
                    {
                        rupee = z_actor_spawn(&global->actor_ctxt, global, 0x131, en->zzactor.pos.x, en->zzactor.pos.y + 60.0f, en->zzactor.pos.z, 0, 0, 0, 0x0001);
                        for (i = 0; i <= 36; i++)
                        {
                            idx = z_lib_math_rand_s16_offset(0, 5);
                            idx = idx < 3 ? idx : idx + 0x10;
                            temp = vec3f_new_f(z_cosf(DTOR(i * 10.0f)) * 4.0f * i, z_sinf(i) * 5.0f, z_sinf(DTOR(i * 10.0f)) * 4.0f * i);
                            temp = vec3f_add(temp, en->zzactor.pos);
                            temp.y = Link->actor.pos.y + 5.0f;
                            z_item_drop(global, &en->zzactor.pos, idx);
                        }
                    }
                }
                if (en->blastoff_frames % 5 == 0)
                {
                    z_actor_play_sfx2(en, NA_SE_IT_BOMB_EXPLOSION);
                    z_effect_spawn_bomb2(global, &en->zzactor.pos, &temp, &temp, 33.0f, 0x14);
                }
                en->zzactor.pos.y += 3 * (en->scaled_time_alive - en->blastoff_time);
                en->zzactor.rot.y += (3 * DEG2S) * (en->scaled_time_alive - en->blastoff_time);
            }
            else
            {
                z_actor_kill(en);
            }
            en->blastoff_frames++;
        }
    }

    menu_input_update(en, global);
    z_collider_cylinder_update(&en->zzactor, &en->cylinder);
    z_collider_set_ot(global, &global->hit_ctxt, &en->cylinder);
}

static void draw(entity_t *en, z64_global_t *global)
{
    vec3f_t scale;
    z64_disp_buf_t *ovl;

    en->scale_counter += en->scale_flag;
    if (ABS(en->scale_counter) >= 5)
        en->scale_flag = -en->scale_flag;
    if (en->zzactor.dist_from_link_xz <= 500.0f)
        (en->zzactor).rot.y = (en->zzactor).rot_toward_link_y;

    actorAnimate(en);

    scale = vec3f_new_f(en->zzactor.scale.x * 17.5f, en->zzactor.scale.y * 17.5f, en->zzactor.scale.z * 17.5f);

    if (player_talk_state(AADDR(global, 0x20D8)) == 4)
    {
        ovl = &ZQDL(global, overlay);
        debug_init_text_struct(&en->dbg_txt);
        debug_do_text_struct(&en->dbg_txt, ovl->p);
        debug_set_text_rgba(&en->dbg_txt, 255, 255, 255, 255);
        debug_set_text_xy(&en->dbg_txt, 3, 7);
        debug_set_text_string(&en->dbg_txt, "Bank Balance: %d", AVAL(BANK_RUPEES, int16_t, 0));
        debug_set_text_xy(&en->dbg_txt, 9, 8);
        debug_set_text_string(&en->dbg_txt, "Amount:");
        ovl->p = (Gfx *)debug_update_text_struct(&en->dbg_txt);

        debug_init_text_struct(&en->money_txt);
        debug_do_text_struct(&en->money_txt, ovl->p);
        debug_set_text_rgba(&en->money_txt, 255, 255, 255, 255);

        setRupeeText(&en->money_txt, &en->rupee_amount, 0, en->selected_digit == 0);
        setRupeeText(&en->money_txt, &en->rupee_amount, 1, en->selected_digit == 1);
        setRupeeText(&en->money_txt, &en->rupee_amount, 2, en->selected_digit == 2);

        ovl->p = (Gfx *)debug_update_text_struct(&en->money_txt);
    }

    /* Draw Postbox */
    z_cheap_proc_draw_opa(global, 0x807FE0F0);
    z_actor_shadow_draw_vec3f(&(en->zzactor).pos, &scale, 0xFF, global);
}

static void destroy(entity_t *en, z64_global_t *global)
{
    z_collider_cylinder_free(global, &en->cylinder);
}

/* .data */
const z64_actor_init_t init_vars = {
    .number = 0x03,
    .type = 0x04,
    .room = 0xFF,
    .flags = 0x00000019,
    .object = 0x1,
    .padding = 0x00,
    .instance_size = sizeof(entity_t),
    .init = init,
    .dest = destroy,
    .main = play,
    .draw = draw};