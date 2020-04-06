#include <z64ovl/oot/u10.h>
#include <z64ovl/oot/helpers.h>
#include <z64ovl/defines_oot.h>
#include <z64ovl/oot/sfx.h>
#include <z64ovl/zh/vec3f.h>
#include <z64ovl/zh/vec3s.h>
#include <z64ovl/z64_inputHandler.h>


#define WALLET_DEFAULT 0
#define WALLET_ADULT 1
#define WALLET_GIANT 2
#define WALLET_TYCOON 3
#define BANK_RUPEES 0x80718000

#define ANIM_IDLE 0
#define ANIM_HAPPY 1
#define ANIM_SAD 2

const z64_collider_cylinder_init_t Collision =
{
    .body = {
        .unk_0x14 = 0x0A, .collider_flags = 0x00, .collide_flags = 0x11, .mask_a = 0x39, .mask_b = 0x10, .type = 0x01, .body_flags = 0x00, .toucher_mask = 0x00000000, .bumper_effect = 0x00, .toucher_damage = 0x04, .bumper_mask = 0xFFCFFFFF, .toucher_flags = 0x00, .bumper_flags = 0x01, .body_flags_2 = 0x01},
    .radius = 0x0014,
    .height = 0x0028,
    .y_shift = 0,
    .position = {.x = 0, .y = 0, .z = 0}
};

typedef struct {
    int8_t hundreds, tens, ones;
    int16_t composite;
} rupee_amount_t;

typedef struct
{
    z64_actor_t actor;
    z64_collider_cylinder_main_t cylinder;
    uint8_t playerIsBusy;
    int8_t selected_digit; /* selected Number Index */
    rupee_amount_t rupee_amount;
    uint16_t lastTransaction;
    int8_t scale_counter;
    int8_t scale_flag;
    z64_debug_text_t dbg_txt;
    z64_debug_text_t money_txt;
    z64_inputHandler_t inputHandler;
    float scaledTimeAlive;
    int anim_state;
    int last_anim_state;
    float animTime;
    vec3f_t resetPosition;
    uint32_t end; /* Instance End */
} entity_t;

static void ChangeClampFlipRupeeIndex(rupee_amount_t* amount, int index, int direction) {
    ((int8_t*)amount)[index] += direction;

    if (((int8_t*)amount)[index] > 9) ((int8_t*)amount)[index] = 0;
    else if (((int8_t*)amount)[index] < 0) ((int8_t*)amount)[index] = 9;
}

static int16_t GetMaxRupees(entity_t *en, z64_global_t *global)
{
    int16_t* wallet_max_list = (uint16_t*)0x800F8CEC;
    uint32_t save_upgrades = AVAL(Z64GL_SAVE_CONTEXT, uint32_t, 0xA0);
    uint8_t wallet_now = ((save_upgrades & 0x3000) >> (0x0C & 0x1F));
    return wallet_max_list[wallet_now];
}

static void ChangeBankRupees(entity_t* en, z64_global_t* global, int16_t rupee_change) {
    uint16_t* rupees = (uint16_t*)AADDR(Z64GL_SAVE_CONTEXT, 0x0034);
    int change = rupee_change;
    if (rupee_change < 0) {
        if (*rupees + rupee_change >= 0) change = rupee_change;
        else change = -((int)(*rupees));
    }
    if (rupee_change > 0) {
        change = AVAL(BANK_RUPEES, int16_t, 0) - rupee_change >= 0 ? rupee_change : AVAL(BANK_RUPEES, int16_t, 0);
        if (*rupees + change > GetMaxRupees(en, global)) change = GetMaxRupees(en, global) - *rupees;
    }

    change_rupee_count_by(change);
    AVAL(BANK_RUPEES, int16_t, 0) -= change;
}

static inline void SetRupeeText(z64_debug_text_t* ts, rupee_amount_t* rupee_amount, int index, bool selected) {
    if (selected) debug_set_text_rgba(ts, 0, 255, 255, 255);
    debug_set_text_xy(ts, 17 + index, 8);
    debug_set_text_string(ts, "%01d", ((int8_t*)rupee_amount)[index]);
    debug_set_text_rgba(ts, 255, 255, 255, 255);
}

#define PFOP(p, i, e) ((p - i) / e) /*Percentage from offset percentage*/

static void ActorAnimate(entity_t* en) {
    float deltaTime, p;

    if (en->anim_state > 0) {
        deltaTime = en->scaledTimeAlive - en->animTime;
        p = deltaTime / 1.75f;
    }  

    if (en->anim_state != en->last_anim_state) {
        en->last_anim_state = en->anim_state;
        en->animTime = en->scaledTimeAlive;
        z_actor_set_scale(&en->actor, 0.015f);
        en->scale_counter = 0;
        en->scale_flag = -1;
    }

    if (p >= 1) {
        en->anim_state = ANIM_IDLE;
        en->actor.pos_2 = en->resetPosition;
        z_actor_set_scale(&en->actor, 0.015f);
    }

    if (en->anim_state == ANIM_IDLE) {
        en->resetPosition = en->actor.pos_2;
        en->actor.scale.x -= (float)(en->scale_counter * 0.00001f);
        en->actor.scale.y += (float)(en->scale_counter * 0.00001f);
        en->actor.scale.z -= (float)(en->scale_counter * 0.00001f);
    }
    else if (en->anim_state == ANIM_HAPPY) {
        if (p <= 0.1f) { // Prepare to jump
            p = PFOP(p, 0, 0.1f);
            en->actor.scale.x = 0.015f + (0.005 * p);
            en->actor.scale.y = 0.015f - (0.0075f * p);
            en->actor.scale.z = 0.015f + (0.005 * p);
        }
        else if (p <= 0.6f) { // Jump and half spin
            p = PFOP(p, 0.1, 0.5f);
            en->actor.pos_2.y = 15 * p;
            en->actor.rot_2.y = (en->actor).rot_toward_link_y + ((405 * DEG2S) * p);
            en->actor.scale.x = 0.015f + (0.005f * (1 - p));
            en->actor.scale.y = 0.015f + (0.005f * p);
            en->actor.scale.z = 0.015f + (0.005f * (1 - p));
        }
        else if (p <= 0.75f) { // Fall
            p = PFOP(p, 0.6f, 0.15f);
            en->actor.pos_2.y = 15 * (1 - p);
            en->actor.rot_2.y = (en->actor).rot_toward_link_y + ((405 * DEG2S) - ((52 * DEG2S) * p));
            en->actor.scale.y = 0.015f + (0.005f * (1 - p));
        }
        else if (p <= 0.925f) { // Compress and expand
            p = PFOP(p, 0.8f, 0.125f);
            en->actor.rot_2.y = (en->actor).rot_toward_link_y - ((8 * DEG2S) * (1 - p));
            en->actor.scale.x = 0.015f + (0.005f * p);
            en->actor.scale.y = 0.015f - (0.0025f * p);
            en->actor.scale.z = 0.015f + (0.005f * p);
        }
        else { // Decompress and return
            p = z_sin_f(PFOP(p, 0.925f, 0.075f) * HPI);
            en->actor.scale.x = 0.015f + (0.005f * (1 - p));
            en->actor.scale.y = 0.015f - (0.0025f * (1 - p));
            en->actor.scale.z = 0.015f + (0.005f * (1 - p));
        }
    }
    else if (en->anim_state == ANIM_SAD) {
        if (p <= 0.2f) { // Puff
            p = PFOP(p, 0, 0.2f);
            en->actor.scale.x = 0.015f + (0.0025f * p);
            en->actor.scale.y = 0.015f + (0.0025f * p);
            en->actor.scale.z = 0.015f + (0.0025f * p);
        }
        else if (p <= 0.3f) { // Normal
            p = PFOP(p, 0.2f, 0.1f);
            en->actor.scale.x = 0.015f + (0.0025f * (1 - p));
            en->actor.scale.y = 0.015f + (0.0025f * (1 - p));
            en->actor.scale.z = 0.015f + (0.0025f * (1 - p));
        }
        else if (p <= 0.55f) { // Flatten
            p = PFOP(p, 0.3f, 0.25f);
            en->actor.scale.x = 0.015f + (0.005f * p);
            en->actor.scale.y = 0.015f - (0.0125f * p);
            en->actor.scale.z = 0.015f + (0.005f * p);
        }
        else if (p <= 0.7f) { // Boing
            p = PFOP(p, 0.55f, 0.15f);
            en->actor.scale.x = 0.015f + (0.005f + (-0.005f * p));
            en->actor.scale.y = 0.015f - (0.0125f + (-0.0025f * p));
            en->actor.scale.z = 0.015f + (0.005f + (-0.005f * p));
        }
        else if (p <= 0.85f) { // Boing 2
            p = PFOP(p, 0.7f, 0.15f);
            en->actor.scale.x = 0.015f + (0.005f + (-0.005f * (1 - p)));
            en->actor.scale.y = 0.015f - (0.0125f + (-0.0025f * (1 - p)));
            en->actor.scale.z = 0.015f + (0.005f + (-0.005f * (1 - p)));
        }
        else { // Return
            p = PFOP(p, 0.85f, 0.15f);
            en->actor.scale.x = 0.015f + (0.005f * (1 - p));
            en->actor.scale.y = 0.015f - (0.0125f * (1 - p));
            en->actor.scale.z = 0.015f + (0.005f * (1 - p));
        }
    }
}

static void menu_input_update(entity_t *en, z64_global_t *global)
{
    en->scaledTimeAlive += ((float)AVAL(0x801C6FA1, uint8_t, 0x0) / 60);
    update_z64_inputHandler_t(&en->inputHandler, en->scaledTimeAlive);
    float drTime = en->scaledTimeAlive - en->inputHandler.dr.invokeTime;
    float dlTime = en->scaledTimeAlive - en->inputHandler.dl.invokeTime;
    float duTime = en->scaledTimeAlive - en->inputHandler.du.invokeTime;
    float ddTime = en->scaledTimeAlive - en->inputHandler.dd.invokeTime;

    if (en->playerIsBusy)
    {
        if ((en->inputHandler.dr.buttonState > 0 && drTime >= 0.15f) || (en->inputHandler.dr.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_CURSOR, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
            en->selected_digit++;
            en->inputHandler.dr.invokeTime = en->scaledTimeAlive;
        }

        if ((en->inputHandler.dl.buttonState > 0 && dlTime >= 0.15f) || (en->inputHandler.dl.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_CURSOR, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
            en->selected_digit--;
            en->inputHandler.dl.invokeTime = en->scaledTimeAlive;
        }

        if (en->selected_digit < 0) en->selected_digit = 2;
        else if (en->selected_digit > 2) en->selected_digit = 0;

        if ((en->inputHandler.du.buttonState > 0 && duTime >= 0.15f) || (en->inputHandler.du.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_RUPY_COUNT, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
            ChangeClampFlipRupeeIndex(&en->rupee_amount, en->selected_digit, 1);
            en->inputHandler.du.invokeTime = en->scaledTimeAlive;
        }

        if ((en->inputHandler.dd.buttonState > 0 && ddTime >= 0.15f) || (en->inputHandler.dd.buttonState == STATE_PRESSED))
        {
            z_sfx_play_system(NA_SE_SY_RUPY_COUNT, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
            ChangeClampFlipRupeeIndex(&en->rupee_amount, en->selected_digit, -1);
            en->inputHandler.dd.invokeTime = en->scaledTimeAlive;
        }

        en->rupee_amount.composite = ((int16_t)en->rupee_amount.hundreds * 100) + (en->rupee_amount.tens * 10) + (en->rupee_amount.ones);
    }
}

static void init(entity_t *en, z64_global_t *global)
{
    en->actor.text_id = 0x0006;
    z_actor_set_scale(&en->actor, 0.015f);
    z_collider_cylinder_init(global, &en->cylinder, &en->actor, &Collision);
    construct_z64_inputHandler_t(&en->inputHandler, &global->common.input[0].raw);
    en->scale_counter = 0;
    en->scale_flag = -1;
    en->anim_state = 0;
    en->last_anim_state = 0;
    en->animTime = 0;
    en->end = 0xDEADBEEF;
}

static void play(entity_t *en, z64_global_t *global)
{
    z64_player_t* Link = zh_get_player(global);
    /* Set Z-Target Position*/
    en->actor.pos_3 = en->actor.pos_2;
    (en->actor).pos_3.y += 30.0f;

    external_func_8002F2F4(&en->actor, global); /* Textbox */

    /* Checks if Link is busy */
    if (player_talk_state(AADDR(global, 0x20D8)) == 4)
    {
        en->playerIsBusy = 1; /* True */
        /* Checks if the player responded to the textbox */
        if (player_responded_to_textbox(global) == 1)
        {
            int v = zh_player_textbox_selection(global);
            if (v == 0) {
                ChangeBankRupees(en, global, en->rupee_amount.composite); /* Withdraw */
                en->anim_state = ANIM_SAD;
                en->animTime = en->scaledTimeAlive;
                z_actor_play_sfx2(&en->actor, NA_SE_EN_PO_SISTER_DEAD);
            }
            else {
                ChangeBankRupees(en, global, -en->rupee_amount.composite); /* Deposit */
                en->anim_state = ANIM_HAPPY;
                en->animTime = en->scaledTimeAlive;
                z_actor_play_sfx2(&en->actor, NA_SE_EN_PO_LAUGH);
            }

            en->rupee_amount.hundreds = 0;
            en->rupee_amount.tens = 0;
            en->rupee_amount.ones = 0;
        }
    }
    else en->playerIsBusy = 0;

    menu_input_update(en, global);
    z_collider_cylinder_update(&en->actor, &en->cylinder);
    z_collider_set_ot(global, &global->hit_ctxt, &en->cylinder);
}

static void draw(entity_t *en, z64_global_t *global)
{
    en->scale_counter += en->scale_flag;
    if (ABS(en->scale_counter) >= 5) en->scale_flag = -en->scale_flag;

    (en->actor).rot_2.y = (en->actor).rot_toward_link_y;
    ActorAnimate(en);

    vec3f_t scale = vec3f_new_f(0.3f, 0.3f, 0.3f);

    if (player_talk_state(AADDR(global, 0x20D8)) == 4)
    {
      /* Banking Menu */
      z64_disp_buf_t* ovl = &ZQDL(global, overlay);
      debug_init_text_struct(&en->dbg_txt);
      debug_do_text_struct(&en->dbg_txt, ovl->p);
      debug_set_text_rgba(&en->dbg_txt, 255, 255, 255, 255);
      debug_set_text_xy(&en->dbg_txt, 3, 7);
      debug_set_text_string(&en->dbg_txt, "Bank Balance: %d", AVAL(BANK_RUPEES, int16_t, 0));
      debug_set_text_xy(&en->dbg_txt, 3, 8);
      debug_set_text_string(&en->dbg_txt, "Amount: ");
      ovl->p = (Gfx*)debug_update_text_struct(&en->dbg_txt);

      /* Money Handler */
      debug_init_text_struct(&en->money_txt);
      debug_do_text_struct(&en->money_txt, ovl->p);
      debug_set_text_rgba(&en->money_txt, 255, 255, 255, 255);

      SetRupeeText(&en->money_txt, &en->rupee_amount, 0, en->selected_digit == 0);
      SetRupeeText(&en->money_txt, &en->rupee_amount, 1, en->selected_digit == 1);
      SetRupeeText(&en->money_txt, &en->rupee_amount, 2, en->selected_digit == 2);

      ovl->p = (Gfx*)debug_update_text_struct(&en->money_txt);
    }
    /* Draw Postbox */
    z_cheap_proc_draw_opa(global, 0x807FE0F0);
    z_actor_shadow_draw_vec3f(&(en->actor).pos_2, &scale, 0xFF, global);
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
    .draw = draw
};
