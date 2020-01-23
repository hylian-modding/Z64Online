#include <z64ovl/oot/u10.h>
#include <z64ovl/z64ovl_helpers.h>
#include <z64ovl/oot/defines_limbs.h>
#include <z64ovl/oot/defines_oot.h>

#define get_addr_offset(l, o) ((uint32_t *)((uint32_t)l + (uint32_t)o))

enum HIT_EFFECTS
{
    BLUEBLOOD = 0,
    WOODSMOKE = 1,
    WOODSMOKEGREENBLOOD = 2,
    BOSSPOGREENSMOKE = 3,
    BUBBLE = 4,
    BOOM = 5,
    DEKUNUTFLASH = 6,
    FLASHREDBLOOD = 7,
    BILIBIRI = 8,
    TORCHCLASH = 9,
    NONE = 10,
    PEEHAT = 11,
    ROCKHIT = 12,
    WOOD = 13
};

typedef struct
{
    uint8_t r;
    uint8_t g;
    uint8_t b;
    uint8_t a;
} z_color;

typedef struct
{
    uint8_t isZZ;
    uint32_t skeleton;
    uint16_t eye_index;
    uint32_t eye_texture;
    uint32_t base;
} zz_playas;

typedef struct
{
    uint8_t bootsID;
    uint8_t strengthUpgradeID;
    z_color tunicColor;
    z_color gauntletColor;
    z_color bottleColor;
    zz_playas playasData;
    uint32_t age;
    uint8_t isHandClosed;
    uint8_t heldItemLeft;
    uint8_t heldItemRight;
    uint8_t backItem;
    uint8_t maskItem;
    uint16_t soundid;
} z_link_puppet;

typedef struct
{
    uint8_t prev_health;
    uint8_t invincibility;
    uint8_t passive;
    uint32_t shieldState; // 0x284
    uint8_t stunTimer; // 0x288
    uint8_t launchArrow; // 0x289
} pvp;

typedef struct
{
    z64_actor_t actor;
    uint8_t current_frame_data[0x86];
    z64_skelanime_t skelanime;
    z64_collider_cylinder_main_t cylinder;
    z_link_puppet puppetData;
    pvp pvpData;
    uint64_t end;
} entity_t;

z64_collider_cylinder_init_t Collision =
{
    .body = {
        .unk_0x14 = 0x07,
        .collider_flags = 0x40,
        .collide_flags = 0x09,
        .mask_a = 0x39,
        .mask_b = 0x10,
        .type = 0x01,
        .body_flags = 0x00,
        .toucher_mask = 0x00000000,
        .bumper_effect = 0x00,
        .toucher_damage = 0x04,
        .bumper_mask = 0xFFCFFFFF,
        .toucher_flags = 0x01,
        .bumper_flags = 0x05,
        .body_flags_2 = 0x05
        },
    .radius = 0x0015,
    .height = 0x0032,
    .y_shift = 0,
    .position = {.x = 0, .y = 0, .z = 0}
};

uint32_t unkchart[] =
{
    0x0100000F, 0x001E1E00
};

/*
    F = 4
    E = 2
    1 = 1
    D = 13
*/

uint8_t damagechart[] =
{
    0x10, 0xF2, 0x11, 0xF2, 0x11, 0xF2, 0xE2, 0x01,
    0x11, 0xE2, 0xE4, 0xF2, 0xD2, 0xF4, 0xF2, 0xF2,
    0xFF, 0x60, 0x60, 0x60, 0x00, 0x00, 0xE3, 0xE4,
    0xE5, 0xE5, 0xE5, 0xE6, 0xFA, 0x00, 0xE6, 0x00
};

static void init(entity_t *en, z64_global_t *global)
{
    en->puppetData.age = global->link_age;

    if (en->actor.variable < 0xFFFFFFFF)
    {
        en->puppetData.playasData.isZZ = 1;
        uint32_t base = ((((uint32_t)en->actor.variable) * 0x37800) + 0x80800000);
        en->puppetData.playasData.base = base;
        uint32_t skele = base + 0x0000500C;
        uint32_t *seg2 = (uint32_t *)skele;
        en->puppetData.playasData.skeleton = *seg2;
        en->puppetData.age = *((uint8_t *)base + 0x0000500B);
    }

    if (en->puppetData.age == 0) {
        Collision.radius = 0x13;
        Collision.height = 0x0032;
    }
    else {
        Collision.radius = 0x12;
        Collision.height = 0x0020;
    }

    skelanime_init_mtx(global,
        &en->skelanime,
        en->puppetData.playasData.skeleton,
        0,
        0, 0, 0);

    actor_anime_change(&en->skelanime, 0, 0.0, 0.0, 0, 0, 1);
    actor_set_scale(&en->actor, 0.01f);

    actor_collider_cylinder_init(global, &en->cylinder, &en->actor, &Collision);

    external_func_80061ED4(AADDR(&en->actor, 0x98), &damagechart, &unkchart); // damage chart

    en->puppetData.bottleColor.r = 0xFF;
    en->puppetData.bottleColor.g = 0xFF;
    en->puppetData.bottleColor.b = 0xFF;
    en->puppetData.bottleColor.a = 0xFF;

    en->puppetData.gauntletColor.r = 0xFF;
    en->puppetData.gauntletColor.g = 0xFF;
    en->puppetData.gauntletColor.b = 0xFF;
    en->puppetData.gauntletColor.a = 0xFF;

    en->actor.damage_color_timer = 0x0;
    en->actor.health = 20;
    en->pvpData.prev_health = 20;

    en->actor.room_index = 0xFF;
    en->actor.flags = 0x00002431;

    en->pvpData.passive = 0x1;
    en->end = 0xDEADBEEFBEEFDEAD;
}

static void pvp_update(entity_t *en, z64_global_t *global)
{
    if (en->pvpData.prev_health != en->actor.health) en->pvpData.prev_health = en->actor.health;

    actor_update_health(&en->actor);
    actor_collider_cylinder_update(&en->actor, &en->cylinder);

    if (en->actor.health != en->pvpData.prev_health && en->pvpData.invincibility == 0) // Damage
    {
        en->actor.damage_color = 0x5FF1;
        en->pvpData.invincibility = 0x1E;
        en->pvpData.stunTimer = 0x28;
    }
    if (en->actor.damage_effect == 0x01 && en->pvpData.invincibility == 0) // Stun
    {
        en->actor.damage_color = 0x1FF1;
        en->puppetData.soundid = 0x389E;
        en->pvpData.invincibility = 0x1E;
    }
    if (en->pvpData.invincibility > 0)
    {
        en->actor.damage_color = en->actor.damage_color - en->pvpData.invincibility;
        en->actor.damage_color_timer = en->pvpData.invincibility;
        en->pvpData.invincibility--;
    }
    if (en->pvpData.stunTimer > 0) en->pvpData.stunTimer--;
    if (en->actor.health <= 0) en->actor.health = 20;

    if (en->puppetData.heldItemLeft <= 1 || en->puppetData.heldItemLeft == 5) 
    {
        if (!((en->pvpData.shieldState == 0x00400000 || en->pvpData.shieldState == 0x00428000) 
        && actor_angle_link_in_range(&en->actor, en->puppetData.heldItemRight == 2 ? 10922 : 8192)) && en->pvpData.invincibility == 0)
        {
            actor_collision_check_set_ac(global, AADDR(global, 0x11E60), &en->cylinder);
        }
    }
    else if ((actor_angle_link_in_range(&en->actor, 16384)) && en->pvpData.invincibility == 0)
    {
        actor_collision_check_set_ac(global, AADDR(global, 0x11E60), &en->cylinder);
    }

    actor_collision_check_set_ot(global, (uint32_t *)(AADDR(global, 0x11e60)), &en->cylinder);
}

static void shoot_arrow(entity_t *en, z64_global_t *global) {
    //z64_actor_t* arrow = actor_spawn(global->actor_ctxt, global, 0x0016, en->actor.pos_2.x, en->actor.pos_2.y, en->actor.pos_2.z, 0, 0, 0, 0xFFFFFFFF);
    en->pvpData.launchArrow = 0;
}

static void play(entity_t *en, z64_global_t *global)
{
    if (en->puppetData.playasData.isZZ)
    {
        const uint32_t eyes[3] = {en->puppetData.playasData.base + 0x00000000, en->puppetData.playasData.base + 0x00000800, en->puppetData.playasData.base + 0x00001000};
        en->puppetData.playasData.eye_texture = eyes[helper_eye_blink(&en->puppetData.playasData.eye_index)];
    }

    if (en->pvpData.passive)
    {
        actor_collider_cylinder_update(&en->actor, &en->cylinder);
        actor_collision_check_set_ot(global, (uint32_t *)(AADDR(global, 0x11e60)), &en->cylinder);
    }
    else pvp_update(en, global); //Run only if pvp is enabled
    if (en->pvpData.launchArrow) shoot_arrow(en, global);
}

static int Animate(z64_global_t *global, uint8_t limb_number, uint32_t *display_list, vec3f_t *translation, vec3s_t *rotation, entity_t *en)
{
    limb_number -= 1;
    if (limb_number == 0)
    {
        z64_rot_t *frame_translation = (z64_rot_t *)en->current_frame_data;
        translation->x += frame_translation->x;
        translation->y += en->puppetData.age == 0 ? frame_translation->y : (frame_translation->y * 0.66f);
        translation->z += frame_translation->z;
    }

    z64_rot_t *frame_limb_rotation = (z64_rot_t *)AADDR(&en->current_frame_data, 6 + (6 * limb_number));

    rotation->x += frame_limb_rotation->x;
    rotation->y += frame_limb_rotation->y;
    rotation->z += frame_limb_rotation->z;

    if (limb_number == RFOREARM)
    {
        if (en->puppetData.age == OOT_ADULT)
        {
            if (en->puppetData.strengthUpgradeID > 1)
            {
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_RIGHT_WRIST_GAUNTLET_ZZ : OOT_ADULT_RIGHT_WRIST_GAUNTLET); // R-Forearm.
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
            }
        }
    }
    else if (limb_number == LFOREARM)
    {
        if (en->puppetData.age == OOT_CHILD)
        {
            if (en->puppetData.strengthUpgradeID > 0)
            {
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_GORON_BRACELET_ZZ : OOT_CHILD_GORON_BRACELET); // Goron Bracelet
            }
        }
        else
        {
            if (en->puppetData.strengthUpgradeID > 1)
            {
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_WRIST_GAUNTLET_ZZ : OOT_ADULT_LEFT_WRIST_GAUNTLET); // L-Forearm.
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
            }
        }
    }
    else if (limb_number == RFOOT)
    {
        if (en->puppetData.age == OOT_ADULT)
        {
            if (en->puppetData.bootsID > 0)
            {
                if (en->puppetData.bootsID == 1)
                {
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_RIGHT_BOOT_IRON_ZZ : OOT_ADULT_RIGHT_BOOT_IRON); // Iron boots right foot.
                }
                else if (en->puppetData.bootsID == 2)
                {
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_RIGHT_BOOT_HOVER_ZZ : OOT_ADULT_RIGHT_BOOT_HOVER); // Hover boots right foot.
                }
            }
        }
    }
    else if (limb_number == LFOOT)
    {
        if (en->puppetData.age == OOT_ADULT)
        {
            if (en->puppetData.bootsID > 0)
            {
                if (en->puppetData.bootsID == 1)
                {
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_BOOT_IRON_ZZ : OOT_ADULT_LEFT_BOOT_IRON); // Iron boots left foot.
                }
                else if (en->puppetData.bootsID == 2)
                {
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_BOOT_HOVER_ZZ : OOT_ADULT_LEFT_BOOT_HOVER); // Hover boots left foot.
                }
            }
        }
    }
    else if (limb_number == LHAND) // Left Hand
    {
        if (en->puppetData.age == OOT_ADULT)
        {
            /*
             LEFT HAND IDS:
             00 = Nothing.
             01 = Master Sword.
             02 = Biggoron Sword.
             03 = Broken Giant's Knife
             05 = Bottle.
             07 = Megaton Hammer
            */
            matrix_translate3f(translation->x, translation->y, translation->z, 1);
            matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
            switch (en->puppetData.heldItemLeft)
            {
            case 0:
                break;
            case 1:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_MASTER_SWORD_IN_HAND_ZZ : OOT_ADULT_MASTER_SWORD_IN_HAND);
                break;
            case 2:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BIGGORON_SWORD_IN_HAND_ZZ : OOT_ADULT_BIGGORON_SWORD_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                break;
            case 3:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BROKEN_GIANTS_KNIFE_IN_HAND_ZZ : OOT_ADULT_BROKEN_GIANTS_KNIFE_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                break;
            case 4:
                break;
            case 5:
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.bottleColor.r, en->puppetData.bottleColor.g, en->puppetData.bottleColor.b, en->puppetData.bottleColor.a);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BOTTLE_ZZ : OOT_ADULT_BOTTLE);
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                break;
            case 7:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_MEGATON_HAMMER_ZZ : OOT_ADULT_MEGATON_HAMMER);
                matrix_scale3f(0, 0, 0, 1);
                break;
            }
            matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
            matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
            if (en->puppetData.isHandClosed == 0)
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_HAND_OPEN_ZZ : OOT_ADULT_LEFT_HAND_OPEN;
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_HAND_GAUNTLET_OPEN_ZZ : OOT_ADULT_LEFT_HAND_GAUNTLET_OPEN);
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                }
            }
            else if (en->puppetData.isHandClosed == 1)
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_HAND_CLOSED_ZZ : OOT_ADULT_LEFT_HAND_CLOSED;
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_HAND_GAUNTLET_CLOSED_ZZ : OOT_ADULT_LEFT_HAND_GAUNTLET_CLOSED);
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                }
            }
            else
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_HAND_BOTTLE_ZZ : OOT_ADULT_LEFT_HAND_BOTTLE;
            }
        }
        else
        {
            /*
             LEFT HAND IDS:
             00 = Nothing.
             04 = Kokiri Sword.
             05 = Bottle.
             06 = Deku Stick
            */

            switch (en->puppetData.heldItemLeft)
            {
            case 0:
                break;
            case 4:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_KOKIRI_SWORD_ZZ : OOT_CHILD_KOKIRI_SWORD);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 5:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.bottleColor.r, en->puppetData.bottleColor.g, en->puppetData.bottleColor.b, en->puppetData.bottleColor.a);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_BOTTLE_ZZ : OOT_CHILD_BOTTLE);
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 6:
                break;
            default:
                break;
            }

            if (en->puppetData.isHandClosed == 0)
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_LEFT_HAND_OPEN_ZZ : OOT_CHILD_LEFT_HAND_OPEN;
            }
            else if (en->puppetData.isHandClosed == 1)
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_LEFT_HAND_CLOSED_ZZ : OOT_CHILD_LEFT_HAND_CLOSED;
            }
            else
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_LEFT_HAND_BOTTLE_ZZ : OOT_CHILD_LEFT_HAND_BOTTLE;
            }
        }
    }
    else if (limb_number == RHAND) // Right Hand
    {
        /*
        RIGHT HAND IDS:
        00 = Nothing.
        01 = Hylian Shield
        02 = Mirror Shield
        05 = Ocarina of Time
        07 = Hookshot / Longshot.
        08 = Bow.
        */
        if (en->puppetData.age == OOT_ADULT)
        {
            switch (en->puppetData.heldItemRight)
            {
            case 0:
                break;
            case 1:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_HYLIAN_SHIELD_IN_HAND_ZZ : OOT_ADULT_HYLIAN_SHIELD_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 2:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_MIRROR_SHIELD_IN_HAND_ZZ : OOT_ADULT_MIRROR_SHIELD_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 4:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_OCARINA_OF_TIME_IN_HAND_ZZ : OOT_ADULT_OCARINA_OF_TIME_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 5:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_OCARINA_OF_TIME_IN_HAND_ZZ : OOT_ADULT_OCARINA_OF_TIME_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 7:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_HOOK_SHOT_IN_HAND_ZZ : OOT_ADULT_HOOK_SHOT_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 8:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BOW_IN_HAND_ZZ : OOT_ADULT_BOW_IN_HAND);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            }
            if (en->puppetData.isHandClosed == 0)
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_RIGHT_HAND_OPEN_ZZ : OOT_ADULT_RIGHT_HAND_OPEN;
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_RIGHT_HAND_GAUNTLET_OPEN_ZZ : OOT_ADULT_RIGHT_HAND_GAUNTLET_OPEN);
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                }
            }
            else
            {
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_RIGHT_HAND_CLOSED_ZZ : OOT_ADULT_RIGHT_HAND_CLOSED;
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_LEFT_HAND_GAUNTLET_CLOSED_ZZ : OOT_ADULT_LEFT_HAND_GAUNTLET_CLOSED);
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                }
            }
        }
        else
        {
            /*
            RIGHT HAND IDS:
            00 = Nothing.
            03 = Deku Shield
            04 = Fairy Ocarina
            05 = Ocarina of Time
            09 = Slingshot.
        */

            switch (en->puppetData.heldItemRight)
            {
            case 0:
                break;
            case 3:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_DEKU_SHIELD_ZZ : OOT_CHILD_DEKU_SHIELD);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 4:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_FAIRY_OCARINA_ZZ : OOT_CHILD_FAIRY_OCARINA);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 5:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_OCARINA_OF_TIME_ZZ : OOT_CHILD_OCARINA_OF_TIME);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
                break;
            case 9:
                matrix_translate3f(translation->x, translation->y, translation->z, 1);
                matrix_rotate3s(rotation->x, rotation->y, rotation->z, 1);
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_SLINGSHOT_ZZ : OOT_CHILD_SLINGSHOT);
                matrix_scale3f(0, 0, 0, 1);
                matrix_rotate3s(-rotation->x, -rotation->y, -rotation->z, 1);
                matrix_translate3f(-translation->x, translation->y, -translation->z, 1);
            default:
                break;
            }

            if (en->puppetData.isHandClosed == 0) *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_RIGHT_HAND_OPEN_ZZ : OOT_CHILD_RIGHT_HAND_OPEN;
            else *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_RIGHT_HAND_CLOSED_ZZ : OOT_CHILD_RIGHT_HAND_CLOSED;
        }
    }
    else if (limb_number == SHEATH) // Sheath
    {
        /*
        BACK IDS:
        00 = Nothing.
        01 = Hylian Shield / Master Sword
        02 = Mirror Shield / Master Sword
        07 = Master Sword / No Shield
        09 = No Shield / Master Sword Sheath
    */
        if (en->puppetData.age == OOT_ADULT)
        {
            switch (en->puppetData.backItem)
            {
            case 0:
                matrix_scale3f(0, 0, 0, 1);
                break;
            case 1:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BACK_HYLIAN_SHIELD_MASTER_SWORD_ZZ : OOT_ADULT_BACK_HYLIAN_SHIELD_MASTER_SWORD;
                break;
            case 2:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BACK_MIRROR_SHIELD_MASTER_SWORD_ZZ : OOT_ADULT_BACK_MIRROR_SHIELD_MASTER_SWORD;
                break;
            case 7:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BACK_MASTER_SWORD_ZZ : OOT_ADULT_BACK_MASTER_SWORD;
                break;
            case 9:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_ADULT_BACK_SHEATH_ZZ : OOT_ADULT_BACK_SHEATH;
                break;
            default:
                matrix_scale3f(0, 0, 0, 1);
                break;
            }
        }
        else
        {
            /*
        BACK IDS:
        00 = Nothing.
        03 = Deku Shield / Kokiri Sword
        04 = No Shield / Kokiri Sword
        05 = Deku Shield / No Sword
        06 = Hylian Shield / Kokiri Sword
        10 = No Shield / Kokiri Sword Sheath
    */
            switch (en->puppetData.backItem)
            {
            case 0:
                matrix_scale3f(0, 0, 0, 1);
                break;
            case 3:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_BACK_DEKU_SHIELD_KOKIRI_SWORD_ZZ : OOT_CHILD_BACK_DEKU_SHIELD_KOKIRI_SWORD;
                break;
            case 4:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_BACK_KOKIRI_SWORD_ZZ : OOT_CHILD_BACK_KOKIRI_SWORD;
                break;
            case 5:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_BACK_DEKU_SHIELD_ZZ : OOT_CHILD_BACK_DEKU_SHIELD;
                break;
            case 6:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_BACK_HYLIAN_SHIELD_KOKIRI_SWORD_ZZ : OOT_CHILD_BACK_HYLIAN_SHIELD_KOKIRI_SWORD;
                break;
            case 10:
                *display_list = en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_BACK_SHEATH_ZZ : OOT_CHILD_BACK_SHEATH;
                break;
            default:
                matrix_scale3f(0, 0, 0, 1);
                break;
            }
        }
    }
    else if (limb_number == HEAD)
    {
        if (en->puppetData.age == OOT_CHILD)
        {
            /*
                0 = No mask.
                1 = Keaton
                2 = Skull
                3 = Spooky
                4 = Bunny hood
                5 = Mask of Truth
                6 = Goron
                7 = Zora
                8 = Gerudo
            */
            switch (en->puppetData.maskItem)
            {
            case 0:
                break;
            case 1:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_KEATON_ZZ : OOT_CHILD_MASK_KEATON);
                break;
            case 2:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_SKULL_ZZ : OOT_CHILD_MASK_SKULL);
                break;
            case 3:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_SPOOKY_ZZ : OOT_CHILD_MASK_SPOOKY);
                break;
            case 4:
                //draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_BUNNY_HOOD_ZZ : OOT_CHILD_MASK_BUNNY_HOOD);
                break;
            case 5:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_MASK_OF_TRUTH_ZZ : OOT_CHILD_MASK_MASK_OF_TRUTH);
                break;
            case 6:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_GORON_ZZ : OOT_CHILD_MASK_GORON);
                break;
            case 7:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_ZORA_ZZ : OOT_CHILD_MASK_ZORA);
                break;
            case 8:
                draw_dlist_opa(global, en->puppetData.playasData.isZZ ? en->puppetData.playasData.base + OOT_CHILD_MASK_GERUDO_ZZ : OOT_CHILD_MASK_GERUDO);
                break;
            default:
                break;
            }
        }
    }
    return 0;
}

#define GFX_POLY_OPA ZQDL(global, poly_opa)

static void otherCallback(z64_global_t *global, uint8_t limb, uint32_t dlist, vec3s_t *rotation, entity_t *en)
{
    z64_disp_buf_t *opa = &GFX_POLY_OPA;
    if (en->puppetData.playasData.isZZ)
    {
        gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_8, en->puppetData.playasData.eye_texture);
        gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_9, en->puppetData.playasData.base + 0x00004000);
    }
    else
    {
        gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_8, zh_seg2ram(0x06000000));
        gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_9, zh_seg2ram(0x06004000));
    }

    gMoveWd(opa->p++, G_MW_SEGMENT, G_MWO_SEGMENT_C, 0x800F7A68);

    return 1;
}

static void draw(entity_t *en, z64_global_t *global)
{
    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);

    skelanime_draw_mtx(
        global,
        en->skelanime.limb_index,
        en->skelanime.unk5,
        en->skelanime.dlist_count,
        &Animate, &otherCallback,
        &en->actor);

    vec3f_t Scale[3] = {0.2, 0.2, 0.2};
    actor_shadow_circle(&en->actor.pos_2, Scale, 0x00FF, global);

    if (en->puppetData.soundid > 0)
    {
        sound_play_position(global, &en->actor.pos_2, 0x41c80000, en->puppetData.soundid);
        en->puppetData.soundid = 0;
    }
}

static void destroy(entity_t *en, z64_global_t *global)
{
    actor_collider_cylinder_free(global, &en->cylinder);
}

/* .data */
const z64_actor_init_t init_vars = {
    .number = 0x01,
    .padding = 0x00,
    .type = 0x4,
    .room = 0xFF,
    .flags = 0x00002431,
    .object = 0x01,
    .instance_size = sizeof(entity_t),
    .init = init,
    .dest = destroy,
    .main = play,
    .draw = draw
};
