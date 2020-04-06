#include <z64ovl/oot/u10.h>
#include <z64ovl/oot/helpers.h>
#include <z64ovl/defines_oot.h>
#include <z64ovl/z64_inputHandler.h>

typedef struct
{
    z64_actor_t actor;
    z64_collider_cylinder_main_t cylinder;
    uint16_t rupees; /* Global Max -- Bank Total */
    uint16_t max; /* Current Wallet Max */
    int8_t selected; /* Selected Number Index */
    int8_t hundreds;
    int8_t tens;
    int8_t ones;
    int16_t composite; /* Composite Amount */
    uint16_t lastTransaction;
    int8_t scale_counter;
    int8_t scale_flag;
    z64_debug_text_t dbg_txt;
    z64_debug_text_t money_txt;
    z64_inputHandler_t inputHandler;
    float scaledTimeAlive;
    uint32_t end; /* Instance End */
} entity_t;

const z64_collider_cylinder_init_t Collision =
    {
        .body = {
            .unk_0x14 = 0x0A, .collider_flags = 0x00, .collide_flags = 0x11, .mask_a = 0x39, .mask_b = 0x10, .type = 0x01, .body_flags = 0x00, .toucher_mask = 0x00000000, .bumper_effect = 0x00, .toucher_damage = 0x04, .bumper_mask = 0xFFCFFFFF, .toucher_flags = 0x00, .bumper_flags = 0x01, .body_flags_2 = 0x01},
        .radius = 0x0014,
        .height = 0x0028,
        .y_shift = 0,
        .position = {.x = 0, .y = 0, .z = 0}};

static void init(entity_t *en, z64_global_t *global)
{
    en->actor.text_id = 0x0006;
    z_actor_set_scale(&en->actor, 0.015f);
    z_collider_cylinder_init(global, &en->cylinder, &en->actor, &Collision);
    construct_z64_inputHandler_t(&en->inputHandler, &global->common.input[0].raw);
    en->scale_counter = 0;
    en->scale_flag = -1;
    en->end = 0xDEADBEEF;
}

#define WALLET_DEFAULT 0
#define WALLET_ADULT 1
#define WALLET_GIANT 2
#define WALLET_TYCOON 3

static void getMaxRupees(entity_t *en, z64_global_t *global)
{
    uint16_t* wallet_max_list = (uint16_t*)0x800F8CEC;
    uint32_t save_upgrades = AVAL(Z64GL_SAVE_CONTEXT, uint32_t, 0xA0);
    uint8_t wallet_now = ((save_upgrades & 0x3000) >> (0x0C & 0x1F));
    en->max = wallet_max_list[wallet_now];
}

static void giveRupees(entity_t *en, z64_global_t *global, uint16_t rupees_to_give)
{
    getMaxRupees(en, global);
    uint16_t *rupees_count_up = (uint16_t *)0x8011B99C;
    if (*rupees_count_up > 0)
    {
        return;
    }
    uint16_t *rupees_in_save = (uint16_t *)AADDR(zh_get_save_context(global), 0x0034);
    while ((*rupees_in_save + rupees_to_give) > en->max)
    {
        rupees_to_give--;
        if (rupees_to_give == 0)
        {
            break;
        }
    }
    while (rupees_to_give > en->rupees)
    {
        rupees_to_give--;
        if (rupees_to_give == 0)
        {
            break;
        }
    }
    en->rupees -= rupees_to_give;
    *rupees_count_up += rupees_to_give;
    en->lastTransaction = rupees_to_give;
}

static void takeRupees(entity_t *en, z64_global_t *global, uint16_t rupees_to_take)
{
    getMaxRupees(en, global);
    uint16_t *rupees_count_up = (uint16_t *)0x8011B99C;
    if (*rupees_count_up > 0)
    {
        return;
    }
    uint16_t *rupees_in_save = (uint16_t *)AADDR(zh_get_save_context(global), 0x0034);
    while (*rupees_in_save < rupees_to_take)
    {
        rupees_to_take--;
        if (rupees_to_take == 0)
        {
            break;
        }
    }
    while ((en->rupees + rupees_to_take) > 9999)
    {
        rupees_to_take--;
        if (rupees_to_take == 0)
        {
            break;
        }
    }
    en->rupees += rupees_to_take;
    uint16_t actualTake = 0xFFFF - (rupees_to_take - 1);
    *rupees_count_up += actualTake;
    en->lastTransaction = actualTake;
}

static void dpad_handler(entity_t *en, z64_global_t *global)
{
    en->scaledTimeAlive += ((float)AVAL(0x801C6FA1, uint8_t, 0x0) / 60);
    update_z64_inputHandler_t(&en->inputHandler, en->scaledTimeAlive);
    float drTime = en->scaledTimeAlive - en->inputHandler.dr.invokeTime;
    float dlTime = en->scaledTimeAlive - en->inputHandler.dl.invokeTime;
    float duTime = en->scaledTimeAlive - en->inputHandler.du.invokeTime;
    float ddTime = en->scaledTimeAlive - en->inputHandler.dd.invokeTime;

    if ((en->inputHandler.dr.buttonState > 0 && drTime >= 0.15f) || (en->inputHandler.dr.buttonState == STATE_PRESSED))
    {
        z_sfx_play_system(0x4809, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
        en->selected++;
        en->inputHandler.dr.invokeTime = en->scaledTimeAlive;
    }

    if ((en->inputHandler.dl.buttonState > 0 && dlTime >= 0.15f) || (en->inputHandler.dl.buttonState == STATE_PRESSED))
    {
        z_sfx_play_system(0x4809, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
        en->selected--;
        en->inputHandler.dl.invokeTime = en->scaledTimeAlive;
    }
    if ((en->inputHandler.du.buttonState > 0 && duTime >= 0.15f) || (en->inputHandler.du.buttonState == STATE_PRESSED))
    {
        z_sfx_play_system(0x482F, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
        if (en->selected == 0) /* Hundreds */
        {
          if (en->hundreds < 9)
            en->hundreds++;
          else
            en->hundreds = 0;
        }
        if (en->selected == 1) /* Tens */
        {
          if (en->tens < 9)
          en->tens++;
          else
            en->tens = 0;
        }
        if (en->selected == 2) /* Ones */
        {
          if (en->ones < 9)
            en->ones++;
          else
            en->ones = 0;
        }
        en->inputHandler.du.invokeTime = en->scaledTimeAlive;
    }

    if ((en->inputHandler.dd.buttonState > 0 && ddTime >= 0.15f) || (en->inputHandler.dd.buttonState == STATE_PRESSED))
    {
        z_sfx_play_system(0x482F, &(en->actor).pos_2, 4, AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x0), AVAL(0x801043A0, float, 0x8));
        if (en->selected == 0) /* Hundreds */
        {
          if (en->hundreds > 0)
            en->hundreds--;
          else
            en->hundreds = 9;
        }
        if (en->selected == 1) /* Tens */
        {
          if (en->tens > 0)
          en->tens--;
          else
            en->tens = 9;
        }
        if (en->selected == 2) /* Ones */
        {
          if (en->ones > 0)
            en->ones--;
          else
            en->ones = 9;
        }
        en->inputHandler.dd.invokeTime = en->scaledTimeAlive;
    }

    if (en->selected < 0)
        en->selected = 2;
    else if (en->selected > 2)
        en->selected = 0;

    en->composite = (en->hundreds * 100) + (en->tens * 10) + (en->ones);
}

static void play(entity_t *en, z64_global_t *global)
{
    z64_player_t* Link = zh_get_player(global);
    /* Set Z-Target Position*/
    (en->actor).pos_3.x = (en->actor).pos_2.x;
    (en->actor).pos_3.y = (en->actor).pos_2.y + 30.0f;
    (en->actor).pos_3.z = (en->actor).pos_2.z;
    (en->actor).rot_2.y = (en->actor).rot_toward_link_y;

    external_func_8002F2F4(&en->actor, global);
    /* Checks if Link is busy */
    if (player_talk_state(AADDR(global, 0x20D8)) == 4)
    {
        /* Checks if the player responded to the textbox */
        if (player_responded_to_textbox(global) == 1)
        {
            int v = zh_player_textbox_selection(global);
            if (v == 1)
            {
                takeRupees(en, global, 10);
            }
            else
            {
                giveRupees(en, global, 10);
            }
        }
    }
    dpad_handler(en, global);
    z_collider_cylinder_update(&en->actor, &en->cylinder);
    z_collider_set_ot(global, &global->hit_ctxt, &en->cylinder);
}

static void draw(entity_t *en, z64_global_t *global)
{
    en->scale_counter += en->scale_flag;
    if (ABS(en->scale_counter) >= 5) en->scale_flag = -en->scale_flag;
    en->actor.scale.x -= (float)(en->scale_counter / 90000.0f);
    en->actor.scale.y += (float)(en->scale_counter / 90000.0f);
    en->actor.scale.z -= (float)(en->scale_counter / 90000.0f);

    vec3f_t scale[3] = {0.3f, 0.3f, 0.3f};

    if (player_talk_state(AADDR(global, 0x20D8)) == 4)
    {
      /* Banking Menu */
      z64_disp_buf_t* ovl = &ZQDL(global, overlay);
      debug_init_text_struct(&en->dbg_txt);
      debug_do_text_struct(&en->dbg_txt, ovl->p);
      debug_set_text_rgba(&en->dbg_txt, 255, 255, 255, 255);
      debug_set_text_xy(&en->dbg_txt, 3, 7);
      debug_set_text_string(&en->dbg_txt, "Bank Balance: %d", en->rupees);
      debug_set_text_xy(&en->dbg_txt, 3, 8);
      debug_set_text_string(&en->dbg_txt, "Amount: ");
      ovl->p = (Gfx*)debug_update_text_struct(&en->dbg_txt);

      /* Money Handler */
      debug_init_text_struct(&en->money_txt);
      debug_do_text_struct(&en->money_txt, ovl->p);
      debug_set_text_rgba(&en->money_txt, 255, 255, 255, 255);
      if (en->selected == 0)
          debug_set_text_rgba(&en->money_txt, 0, 255, 255, 255);
      debug_set_text_xy(&en->money_txt, 17, 8);
      debug_set_text_string(&en->money_txt, "%01d", en->hundreds);
      debug_set_text_rgba(&en->money_txt, 255, 255, 255, 255);
      if (en->selected == 1)
          debug_set_text_rgba(&en->money_txt, 0, 255, 255, 255);
      debug_set_text_xy(&en->money_txt, 18, 8);
      debug_set_text_string(&en->money_txt, "%01d", en->tens);
      debug_set_text_rgba(&en->money_txt, 255, 255, 255, 255);
      debug_set_text_xy(&en->money_txt, 19, 8);
      if (en->selected == 2)
          debug_set_text_rgba(&en->money_txt, 0, 255, 255, 255);
      debug_set_text_string(&en->money_txt, "%01d", en->ones);
      debug_set_text_rgba(&en->money_txt, 255, 255, 255, 255);
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
    .draw = draw};
