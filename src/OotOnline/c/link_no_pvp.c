#include <z64ovl/oot/u10.h>
#include <z64ovl/z64ovl_helpers.h>
#include <z64ovl/defines_limbs.h>
#include <z64ovl/defines_oot.h>

#define get_addr_offset(l, o) ((uint32_t *)((uint32_t)l + (uint32_t)o))

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
    zz_playas playasData;
    uint32_t age;
    uint8_t tunicID;
    rgba8_t tunicColor;
    uint8_t swordID;
    uint8_t shieldID;
    uint8_t bootsID;
    uint8_t strengthUpgradeID;
    rgba8_t gauntletColor;
    rgba8_t bottleColor;
    uint8_t isHandClosed;
    uint8_t heldItemLeft;
    uint8_t heldItemRight;
    uint8_t backItem;
    uint8_t maskItem;
    uint16_t soundid;
    float dekuStickLength;
    uint8_t actionParam;
} z_link_puppet;

typedef struct
{
    /* 0x0000 */ z64_actor_t actor;
    /* 0x013C */ uint8_t current_frame_data[0x86];
    /* 0x01C4 */ z64_skelanime_t skelanime;
    /* 0x0204 */ z64_collider_cylinder_main_t cylinder;
    /* 0x0250 */ z_link_puppet puppetData;
    uint32_t end;
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
            .body_flags_2 = 0x05},
        .radius = 0x0015,
        .height = 0x0032,
        .y_shift = 0,
        .position = {.x = 0, .y = 0, .z = 0}};

static uint32_t isZobjLoaded(z64_obj_ctxt_t *obj_ctxt, int32_t id)
{
    int32_t index = z_scene_object_get_index(obj_ctxt, id);
    if (index < 0)
    {
        return 0;
    }
    else
    {
        return 1;
    }
}

static void init(entity_t *en, z64_global_t *global)
{
    rgba8_t white = {0xFF, 0xFF, 0xFF, 0xFF};

    /* General Initilization */
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

    if (en->puppetData.age == OOT_AGE_ADULT)
    {
        Collision.radius = 19;
        Collision.height = 50;
    }
    else
    {
        Collision.radius = 18;
        Collision.height = 32;
    }

    z_skelanime_init(global, 1, &en->skelanime, en->puppetData.playasData.skeleton, 0);

    z_skelanime_change_anim(&en->skelanime, 0, 0.0, 0.0, 0, 0);
    z_actor_set_scale(&en->actor, 0.01f);

    z_collider_cylinder_init(global, &en->cylinder, &en->actor, &Collision);

    en->puppetData.bottleColor = white;
    en->puppetData.gauntletColor = white;

    if (isZobjLoaded(&global->obj_ctxt, EPONA_OBJ))
    {
        uint32_t* param_pointer = (uint32_t*) 0x80600150;
        uint32_t id_addr = *param_pointer;
        uint16_t *seg2 = (uint16_t *)id_addr;
        z_actor_spawn_attached(&global->actor_ctxt, &en->actor, global, *seg2, en->actor.pos.x, en->actor.pos.y, en->actor.pos.z, en->actor.rot.x, en->actor.rot.y, en->actor.rot.z, en->actor.variable);
    }

    en->end = 0xDEADBEEF;
}

static void play(entity_t *en, z64_global_t *global)
{
    if (en->puppetData.playasData.isZZ)
    {
        const uint32_t eyes[3] = {en->puppetData.playasData.base + 0x00000000, en->puppetData.playasData.base + 0x00000800, en->puppetData.playasData.base + 0x00001000};
        en->puppetData.playasData.eye_texture = eyes[helper_eye_blink(&en->puppetData.playasData.eye_index)];
    }

    z_collider_cylinder_update(&en->actor, &en->cylinder);
    z_collider_set_ot(global, (uint32_t *)(AADDR(global, 0x11e60)), &en->cylinder);
}

static int Animate(z64_global_t *global, uint8_t limb_number, uint32_t *display_list, vec3f_t *translation, vec3s_t *rotation, entity_t *en)
{
    /* Initialize Limb and Transformations */
    z64_disp_buf_t *opa = &ZQDL(global, poly_opa);
    limb_number -= 1;
    if (limb_number == LIMB_ROOT)
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

    /* Right Forearm */
    if (limb_number == LIMB_FOREARM_R)
    {
        if (en->puppetData.age == OOT_AGE_ADULT)
        {
            if (en->puppetData.strengthUpgradeID > 1)
            {
                /* Set Environment to Gauntlet Color */
                gDPSetEnvColor(
                    opa->p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_WRIST_GAUNTLET));
                /* Restore Environment Color */
                gDPSetEnvColor(
                    opa->p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
            }
        }
    }

    /* Left Forearm */
    else if (limb_number == LIMB_FOREARM_L)
    {
        if (en->puppetData.age == OOT_AGE_CHILD)
        {
            if (en->puppetData.strengthUpgradeID > 0)
            {
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_GORON_BRACELET));
            }
        }
        else
        {
            if (en->puppetData.strengthUpgradeID > 1)
            {
                /* Set Environment to Gauntlet Color */
                gDPSetEnvColor(
                    opa->p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_WRIST_GAUNTLET));
                /* Restore Environment Color */
                gDPSetEnvColor(
                    opa->p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
            }
        }
    }

    /* Right Foot */
    else if (limb_number == LIMB_FOOT_R)
    {
        if (en->puppetData.age == OOT_ADULT)
        {
            if (en->puppetData.bootsID > 0)
            {
                if (en->puppetData.bootsID == 1)
                {
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_BOOT_IRON));
                }
                else if (en->puppetData.bootsID == 2)
                {
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_BOOT_HOVER));
                }
            }
        }
    }

    /* Left Foot */
    else if (limb_number == LIMB_FOOT_L)
    {
        if (en->puppetData.age == OOT_ADULT)
        {
            if (en->puppetData.bootsID > 0)
            {
                if (en->puppetData.bootsID == 1)
                {
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_BOOT_IRON));
                }
                else if (en->puppetData.bootsID == 2)
                {
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_BOOT_HOVER));
                }
            }
        }
    }

    else if (limb_number == LIMB_HAND_L) // Left Hand
    {
        if (en->puppetData.age == OOT_AGE_ADULT)
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
            matrix_push();
            z_matrix_translate_3f(translation->x, translation->y, translation->z, 1);
            z_matrix_rotate_3s(rotation->x, rotation->y, rotation->z, 1);
            switch (en->puppetData.heldItemLeft)
            {
            case 0:
                break;
            case 1:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_MASTER_SWORD_IN_HAND));
                break;
            case 2:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BIGGORON_SWORD_IN_HAND));
                break;
            case 3:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BROKEN_GIANTS_KNIFE_IN_HAND));
                break;
            case 4:
                break;
            case 5:
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.bottleColor.r, en->puppetData.bottleColor.g, en->puppetData.bottleColor.b, en->puppetData.bottleColor.a);
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BOTTLE));
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                break;
            case 7:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_MEGATON_HAMMER));
                break;
            }
            matrix_pop();

            if (en->puppetData.isHandClosed == 0)
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_OPEN);
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_GAUNTLET_OPEN));
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                }
            }
            else if (en->puppetData.isHandClosed == 1)
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_CLOSED);
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_GAUNTLET_CLOSED));
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                }
            }
            else
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_BOTTLE);
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

            matrix_push();
            z_matrix_translate_3f(translation->x, translation->y, translation->z, 1);
            z_matrix_rotate_3s(rotation->x, rotation->y, rotation->z, 1);
            switch (en->puppetData.heldItemLeft)
            {
            case 0:
                /* Nothing */
                break;
            case 4:
                /* Kokiri Sword */
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_KOKIRI_SWORD));
                break;
            case 5:
                /* Bottle */
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.bottleColor.r, en->puppetData.bottleColor.g, en->puppetData.bottleColor.b, en->puppetData.bottleColor.a);
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_BOTTLE));
                gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                break;
            case 6:
                /* Deku Stick */
                matrix_push();
                z_matrix_translate_3f(-428.26f, 267.20f, -33.82f, 1);
                z_matrix_rotate_3s(ROT16(180), ROT16(0), ROT16(90), 1);
                z_matrix_scale_3f(1.0f, en->puppetData.dekuStickLength, 1.0f, 1);
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_DEKU_STICK));
                matrix_pop();
                break;
            default:
                break;
            }
            matrix_pop();

            if (en->puppetData.isHandClosed == 0)
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_LEFT_HAND_OPEN);
            }
            else if (en->puppetData.isHandClosed == 1)
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_LEFT_HAND_CLOSED);
            }
            else
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_LEFT_HAND_BOTTLE);
            }
        }
    }

    else if (limb_number == LIMB_HAND_R) // Right Hand
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
        if (en->puppetData.age == OOT_AGE_ADULT)
        {
            matrix_push();
            z_matrix_translate_3f(translation->x, translation->y, translation->z, 1);
            z_matrix_rotate_3s(rotation->x, rotation->y, rotation->z, 1);
            switch (en->puppetData.heldItemRight)
            {
            case 0:
                break;
            case 1:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_HYLIAN_SHIELD_IN_HAND));
                break;
            case 2:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_MIRROR_SHIELD_IN_HAND));
                break;
            case 4:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_OCARINA_OF_TIME_IN_HAND));
                break;
            case 5:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_OCARINA_OF_TIME_IN_HAND));
                break;
            case 7:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_HOOK_SHOT_IN_HAND));
                break;
            case 8:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BOW_IN_HAND));
                break;
            }
            matrix_pop();

            if (en->puppetData.isHandClosed == 0)
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_OPEN);
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_GAUNTLET_OPEN));
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);
                }
            }
            else
            {
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_CLOSED);
                if (en->puppetData.strengthUpgradeID > 1)
                {
                    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.gauntletColor.r, en->puppetData.gauntletColor.g, en->puppetData.gauntletColor.b, en->puppetData.gauntletColor.a);
                    z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_GAUNTLET_CLOSED));
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

            matrix_push();
            z_matrix_translate_3f(translation->x, translation->y, translation->z, 1);
            z_matrix_rotate_3s(rotation->x, rotation->y, rotation->z, 1);
            switch (en->puppetData.heldItemRight)
            {
            case 0:
                break;
            case 3:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_DEKU_SHIELD));
                break;
            case 4:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_FAIRY_OCARINA));
                break;
            case 5:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_OCARINA_OF_TIME));
                break;
            case 9:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_SLINGSHOT));
            default:
                break;
            }
            matrix_pop();

            if (en->puppetData.isHandClosed == 0)
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_RIGHT_HAND_OPEN);
            else
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_RIGHT_HAND_CLOSED);
        }
    }
    else if (limb_number == LIMB_SHEATH) // Sheath
    {
        /*
        BACK IDS:
        00 = Nothing.
        01 = Hylian Shield / Master Sword
        02 = Mirror Shield / Master Sword
        07 = Master Sword / No Shield
        09 = No Shield / Master Sword Sheath
    */
        if (en->puppetData.age == OOT_AGE_ADULT)
        {
            switch (en->puppetData.backItem)
            {
            case 0:
                z_matrix_scale_3f(0, 0, 0, 1);
                break;
            case 1:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BACK_HYLIAN_SHIELD_MASTER_SWORD);
                break;
            case 2:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BACK_MIRROR_SHIELD_MASTER_SWORD);
                break;
            case 7:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BACK_MASTER_SWORD);
                break;
            case 9:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BACK_SHEATH);
                break;
            default:
                z_matrix_scale_3f(0, 0, 0, 1);
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
                z_matrix_scale_3f(0, 0, 0, 1);
                break;
            case 3:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_BACK_DEKU_SHIELD_KOKIRI_SWORD);
                break;
            case 4:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_BACK_KOKIRI_SWORD);
                break;
            case 5:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_BACK_DEKU_SHIELD);
                break;
            case 6:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_BACK_HYLIAN_SHIELD_KOKIRI_SWORD);
                break;
            case 10:
                *display_list = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_BACK_SHEATH);
                break;
            default:
                z_matrix_scale_3f(0, 0, 0, 1);
                break;
            }
        }
    }
    else if (limb_number == LIMB_HEAD)
    {
        if (en->puppetData.age == OOT_AGE_CHILD)
        {
            /*
                0 = No mask.
                1 = Keaton
                2 = Skull
                3 = Spooky
                4 = Bunny Hood
                5 = Goron
                6 = Zora
                7 = Gerudo
                8 = Mask of Truth
            */
            switch (en->puppetData.maskItem)
            {
            case OOT_MASK_ID_NONE:
                break;
            case OOT_MASK_ID_KEATON:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_KEATON));
                break;
            case OOT_MASK_ID_SKULL:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_SKULL));
                break;
            case OOT_MASK_ID_SPOOKY:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_SPOOKY));
                break;
            case OOT_MASK_ID_BUNNY_HOOD:
                //z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_BUNNY_HOOD));
                break;
            case OOT_MASK_ID_GORON:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_GORON));
                break;
            case OOT_MASK_ID_ZORA:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_ZORA));
                break;
            case OOT_MASK_ID_GERUDO:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_GERUDO));
                break;
            case OOT_MASK_ID_MASK_OF_TRUTH:
                z_cheap_proc_draw_opa(global, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_MASK_OF_TRUTH));
                break;
            default:
                break;
            }
        }
    }
    return 0;
}

static void otherCallback(z64_global_t *global, uint8_t limb, uint32_t dlist, vec3s_t *rotation, entity_t *en)
{
    z64_disp_buf_t *opa = &ZQDL(global, poly_opa);
    if (en->puppetData.playasData.isZZ)
    {
        gSPSegment(opa->p++, 8, en->puppetData.playasData.eye_texture);
        gSPSegment(opa->p++, 9, en->puppetData.playasData.base + 0x00004000);
    }
    else
    {
        gSPSegment(opa->p++, 8, zh_seg2ram(0x06000000));
        gSPSegment(opa->p++, 9, zh_seg2ram(0x06004000));
    }

    return 1;
}

static void draw(entity_t *en, z64_global_t *global)
{

/*     z64_disp_buf_t *opa = &ZQDL(global, poly_opa);
    static Gfx cull_back_dl[] = {
        gsSPSetGeometryMode(G_CULL_BACK),
        gsSPEndDisplayList()};

    gSPSegment(opa->p++, 0x0C, &cull_back_dl); */

    gDPSetEnvColor(global->common.gfx_ctxt->poly_opa.p++, en->puppetData.tunicColor.r, en->puppetData.tunicColor.g, en->puppetData.tunicColor.b, en->puppetData.tunicColor.a);

    z_skelanime_draw(global, 0x12, en, &en->skelanime, &Animate, &otherCallback);

    vec3f_t Scale[3] = {0.2, 0.2, 0.2};
    actor_shadow_circle(&en->actor.pos, Scale, 0x00FF, global);

    if (en->puppetData.soundid > 0)
    {
        z_sfx_play_position(global, &en->actor.pos, 25.0, en->puppetData.soundid);
        en->puppetData.soundid = 0;
    }
}

static void destroy(entity_t *en, z64_global_t *global)
{
    z_collider_cylinder_free(global, &en->cylinder);
    if (en->actor.attached_b)
    {
        en->actor.attached_b->attached_a = 0;
        z_actor_kill(en->actor.attached_b);
        en->actor.attached_b = 0;
    }
}

/* .data */
const z64_actor_init_t init_vars = {
    .number = 0x05,
    .padding = 0x00,
    .type = 0x4,
    .room = 0xFF,
    .flags = 0x00002431,
    .object = 0x01,
    .instance_size = sizeof(entity_t),
    .init = init,
    .dest = destroy,
    .main = play,
    .draw = draw};
