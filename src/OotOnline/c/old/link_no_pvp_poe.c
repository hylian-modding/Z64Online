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
    uint32_t stateFlags1;
    uint8_t handStateL;
    uint8_t handStateR;
    uint8_t gi_obtain;
    void* gi_obj;
} z_link_puppet;

typedef struct
{
    /* 0x0000 */ z64_actor_t actor;
    /* 0x013C */ uint8_t current_frame_data[0x86];
    /* 0x01C4 */ z64_skelanime_t skelanime;
    /* 0x0204 */ z64_collider_cylinder_main_t cylinder;
    /* 0x0250 */ z_link_puppet puppetData;
} entity_t;

z64_collider_cylinder_init_t collider_init = {
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
    .position = {.x = 0, .y = 0, .z = 0}
  };

static void init(entity_t *en, z64_global_t* gl);
static void destroy(entity_t *en, z64_global_t* gl);
static void play(entity_t *en, z64_global_t* gl);
static void draw(entity_t *en, z64_global_t* gl);
static int limb_handler(z64_global_t* gl, uint8_t l, uint32_t* dl, vec3f_t* pos, vec3s_t* rot, entity_t* en);
static void timg_segment_handler(z64_global_t* gl, uint8_t l, uint32_t dl, vec3s_t* rot, entity_t *en);
static int32_t bottle_handler(int32_t action_param);
static void draw_bottle(z64_global_t* gl, entity_t* en, int32_t id);

static void init(entity_t *en, z64_global_t* gl)
{
    rgba8_t white = {0xFF, 0xFF, 0xFF, 0xFF};
    float shadow_radius = 0;

    /* General Initilization */
    en->puppetData.age = gl->link_age;
    en->puppetData.bottleColor = white;
    en->puppetData.gauntletColor = white;
    z_actor_set_scale(&en->actor, 0.01f);

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

    /* Initialize Collision Cylinder and Volume Dimensions */
    if (zh_link_is_adult())
    {
        collider_init.radius = 19;
        collider_init.height = 50;
        shadow_radius = 90.0f;
    }
    else
    {
        collider_init.radius = 18;
        collider_init.height = 32;
        shadow_radius = 60.0f;
    }
    z_actor_shadow_init(&(en->actor).rot_2, 0, &Z_SHADOW_TEARDROP, shadow_radius);
    //z_actor_shadow_init(&(en->actor).rot_2, 0, &Z_SHADOW_CIRCLE, shadow_radius);
    z_collider_cylinder_init(gl, &en->cylinder, &en->actor, &collider_init);

    /* Initialize Skeleton and Animation Structure */
    z_skelanime_init(gl, 1, &en->skelanime, en->puppetData.playasData.skeleton, 0);
    z_skelanime_change_anim(&en->skelanime, 0, 0.0, 0.0, 0, 0);

    /* If available, Initialize Epona Puppet */
    if (OBJ_IS_LOADED(&gl->obj_ctxt, EPONA_OBJ))
    {
        z_actor_spawn_attached(
          &gl->actor_ctxt
        , &en->actor
        , gl
        , (uint16_t*)(0x80600150)
        , en->actor.pos_2.x, en->actor.pos_2.y, en->actor.pos_2.z
        , en->actor.rot_2.x, en->actor.rot_2.y, en->actor.rot_2.z
        , en->actor.variable
      );
    }
}

static void destroy(entity_t *en, z64_global_t* gl)
{
    /* Remove Collision Cylinder*/
    z_collider_cylinder_free(gl, &en->cylinder);

    /* Kill attached actor process--Epona Puppet */
    if (en->actor.attached_b)
    {
        en->actor.attached_b->attached_a = 0;
        z_actor_kill(en->actor.attached_b);
        en->actor.attached_b = 0;
    }
}

static void play(entity_t *en, z64_global_t* gl)
{
  float bounds_above = 40.0f;

  if (zh_link_is_adult())
  {
    bounds_above = 56.0f;
  }

  z_actor_find_bounds(gl, &en->actor, 26.0f, 6.0f, bounds_above, 7);
  z_collider_cylinder_update(&en->actor, &en->cylinder);
  z_collider_set_ot(gl, &gl->hit_ctxt, &en->cylinder);
}

static int limb_handler(z64_global_t* gl, uint8_t l, uint32_t* dl, vec3f_t* pos, vec3s_t* rot, entity_t* en)
{
    z64_disp_buf_t *opa = &ZQDL(gl, poly_opa);
    z64_disp_buf_t *xlu = &ZQDL(gl, poly_xlu);
    /* Initialize Limb and Transformations */
    l -= 1;
    if (l == LIMB_ROOT)
    {
        vec3s_t* frame_pos = (vec3s_t*)en->current_frame_data;
        pos->x += frame_pos->x;
        pos->y += en->puppetData.age == 0 ? frame_pos->y : (frame_pos->y * 0.66f);
        pos->z += frame_pos->z;
    }

    vec3s_t* frame_limb_rot = (vec3s_t*)AADDR(&en->current_frame_data, sizeof(vec3s_t) + (sizeof(vec3s_t) * l));
    rot->x += frame_limb_rot->x;
    rot->y += frame_limb_rot->y;
    rot->z += frame_limb_rot->z;

    /* If adult Link, continue. */
    if (zh_link_is_adult())
    {
      /* Boots */
      if (en->puppetData.bootsID != OOT_BOOT_ID_NORMAL)
      {
        if (l == LIMB_FOOT_L)
        {
          if (en->puppetData.bootsID == OOT_BOOT_ID_IRON)
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_BOOT_IRON));
          else
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_BOOT_HOVER));
        }
        else if (l == LIMB_FOOT_R)
        {
          if (en->puppetData.bootsID == OOT_BOOT_ID_IRON)
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_BOOT_IRON));
          else
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_BOOT_HOVER));
        }
      }

      /* Gauntlets */
      if (en->puppetData.strengthUpgradeID > 1)
      {
        /* Set Environment to Gauntlet Color */
        gDPSetEnvColor(
            opa->p++
          , en->puppetData.gauntletColor.r
          , en->puppetData.gauntletColor.g
          , en->puppetData.gauntletColor.b
          , en->puppetData.gauntletColor.a
        );
        if (l == LIMB_FOREARM_R)
          z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_WRIST_GAUNTLET));
        else if (l == LIMB_FOREARM_L)
          z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_WRIST_GAUNTLET));
        /* Restore Enviornment Color -- Tunic Color */
        gDPSetEnvColor(
            opa->p++
          , en->puppetData.tunicColor.r
          , en->puppetData.tunicColor.g
          , en->puppetData.tunicColor.b
          , en->puppetData.tunicColor.a
        );
      }

      /* Left Hand */
      if (l == LIMB_HAND_L)
      {
        if ((en->actor).xz_speed > 2.0f)
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_CLOSED);
        else
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_OPEN);

        /* Hand Gauntlets */
        if (en->puppetData.strengthUpgradeID > 1)
        {
          /* Set Environment to Gauntlet Color */
          gDPSetEnvColor(
              opa->p++
            , en->puppetData.gauntletColor.r
            , en->puppetData.gauntletColor.g
            , en->puppetData.gauntletColor.b
            , en->puppetData.gauntletColor.a
          );
          if (*dl == OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_CLOSED))
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_GAUNTLET_CLOSED));
          else
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_GAUNTLET_OPEN));
          /* Restore Enviornment Color -- Tunic Color */
          gDPSetEnvColor(
              opa->p++
            , en->puppetData.tunicColor.r
            , en->puppetData.tunicColor.g
            , en->puppetData.tunicColor.b
            , en->puppetData.tunicColor.a
          );
        }

        /* Bottle */
        if (en->puppetData.actionParam > 0x1D && en->puppetData.actionParam < 0x2B)
        {
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_LEFT_HAND_BOTTLE);
          /* Bottle Contents */
          draw_bottle(gl, en, bottle_handler(en->puppetData.actionParam));
        }
      }

      /* Right Hand */
      if (l == LIMB_HAND_R)
      {
        if ((en->actor).xz_speed > 2.0f)
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_CLOSED);
        else
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_OPEN);

        /* Hand Gauntlets */
        if (en->puppetData.strengthUpgradeID > 1)
        {
          /* Set Environment to Gauntlet Color */
          gDPSetEnvColor(
              opa->p++
            , en->puppetData.gauntletColor.r
            , en->puppetData.gauntletColor.g
            , en->puppetData.gauntletColor.b
            , en->puppetData.gauntletColor.a
          );
          if (*dl == OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_CLOSED))
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_GAUNTLET_CLOSED));
          else
            z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_RIGHT_HAND_GAUNTLET_OPEN));
          /* Restore Enviornment Color -- Tunic Color */
          gDPSetEnvColor(
              opa->p++
            , en->puppetData.tunicColor.r
            , en->puppetData.tunicColor.g
            , en->puppetData.tunicColor.b
            , en->puppetData.tunicColor.a
          );
        }
      }

    }
    else /* If child Link, continue. */
    {
      /* Goron Bracelet */
      if (en->puppetData.strengthUpgradeID > 0 && l == LIMB_FOREARM_L)
      {
          z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_GORON_BRACELET));
      }

      /* Masks */
      if (en->puppetData.maskItem > 0)
      {
        if (l == LIMB_HEAD)
        {
          switch (en->puppetData.maskItem)
          {
            case OOT_MASK_ID_KEATON:
                z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_KEATON));
                break;
            case OOT_MASK_ID_SKULL:
                z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_SKULL));
                break;
            case OOT_MASK_ID_SPOOKY:
                z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_SPOOKY));
                break;
            case OOT_MASK_ID_BUNNY_HOOD:
                //z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_BUNNY_HOOD));
                break;
            case OOT_MASK_ID_GORON:
                z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_GORON));
                break;
            case OOT_MASK_ID_ZORA:
                z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_ZORA));
                break;
            case OOT_MASK_ID_GERUDO:
                z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_GERUDO));
                break;
            case OOT_MASK_ID_MASK_OF_TRUTH:
                z_cheap_proc_draw_opa(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_MASK_MASK_OF_TRUTH));
                break;
            default:
                break;
          }
        }
      }

      /* Left Hand */
      if (l == LIMB_HAND_L)
      {
        //if ((en->puppetData.handStateL == 0) && ((en->actor).xz_speed > 2.0f) && (-1 < (en->puppetData.stateFlags1 << 4)))
        if ((en->actor).xz_speed > 2.0f)
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_LEFT_HAND_CLOSED);
        else
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_LEFT_HAND_OPEN);

        matrix_push();
        z_matrix_translate_3f(pos->x, pos->y, pos->z, 1);
        z_matrix_rotate_3s(rot->x, rot->y, rot->z, 1);
        /* Deku Stick*/
        if (en->puppetData.actionParam == OOT_ACTION_DEKU_STICK)
        {
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_LEFT_HAND_CLOSED);
          matrix_push();
          z_matrix_translate_3f(-428.26f, 267.20f, -33.82f, 1);
          z_matrix_rotate_3s(ROT16(-180), ROT16(0), ROT16(90), 1);
          z_matrix_scale_3f(1.0f, en->puppetData.dekuStickLength, 1.0f, 1);
          z_cheap_proc_draw_xlu(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_DEKU_STICK));
          matrix_pop();
        }
        /* Bottle */
        if (en->puppetData.actionParam > 0x1D && en->puppetData.actionParam < 0x2B)
        {
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_LEFT_HAND_BOTTLE);
          /* Bottle Contents */
          draw_bottle(gl, en, bottle_handler(en->puppetData.actionParam));
        }
        if (en->puppetData.actionParam == OOT_ACTION_SWORD_1 || en->puppetData.actionParam == OOT_ACTION_SWORD_2)
        {
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_KOKIRI_SWORD);
        }
        matrix_pop();
      }

      /* Right Hand */
      if (l == LIMB_HAND_R)
      {
        //if ((en->puppetData.handStateR == 8) && ((en->actor).xz_speed > 2.0f) && (-1 < (en->puppetData.stateFlags1 << 4)))
        if ((en->actor).xz_speed > 2.0f)
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_RIGHT_HAND_CLOSED);
        else
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_RIGHT_HAND_OPEN);

        if (en->puppetData.actionParam == OOT_ACTION_DEKU_STICK)
        {
          *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_RIGHT_HAND_CLOSED);
        }

        matrix_push();
        z_matrix_translate_3f(pos->x, pos->y, pos->z, 1);
        z_matrix_rotate_3s(rot->x, rot->y, rot->z, 1);

        if (en->puppetData.handStateR == 10)
        {
          if (en->puppetData.shieldID == 0)
            *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_DEKU_SHIELD);
          else if (en->puppetData.shieldID == 3)
            *dl = OOT_ZZ_PUPPET_DLIST(OOT_CHILD_RIGHT_HAND_CLOSED);
        }

        matrix_pop();
      }
    }


    return 0;
}

static int32_t bottle_handler(int32_t action_param)
{
  int32_t bottle_id = (action_param - OOT_ACTION_BOTTLE_EMPTY);
  if ((-1 < bottle_id) && (bottle_id < 13))
  {
    return bottle_id;
  }
  return -1;
}

static void draw_bottle(z64_global_t* gl, entity_t* en, int32_t id)
{
  z64_disp_buf_t* xlu = &ZQDL(gl, poly_xlu);
  /* Bottle + Contents */
  rgb8_t bottle_colors[] = {
     {0xFF, 0xFF, 0xFF} /* Empty Bottle */
   , {0x50, 0x50, 0xFF} /* Fish */
   , {0xFF, 0x64, 0xFF} /* Blue Fire */
   , {0x00, 0x00, 0xFF} /* Bugs */
   , {0xFF, 0x00, 0xFF} /* Poe */
   , {0xFF, 0x00, 0xFF} /* Big Poe */
   , {0xC8, 0xC8, 0x64} /* Ruto's Letter */
   , {0xFF, 0x00, 0x00} /* Red Potion */
   , {0x00, 0x00, 0xFF} /* Blue Potion */
   , {0x00, 0xFF, 0x00} /* Green Potion */
   , {0xFF, 0xFF, 0xFF} /* Milk (Full) */
   , {0xFF, 0xFF, 0xFF} /* Milk (Half) */
   , {0x50, 0x50, 0xFF} /* Fairy */
 };

  /* Set Environment Color */
  gDPSetEnvColor(
   xlu->p++
  , bottle_colors[id].r
  , bottle_colors[id].g
  , bottle_colors[id].b
  , 255
  );
  if (zh_link_is_adult())
    z_cheap_proc_draw_xlu(gl, OOT_ZZ_PUPPET_DLIST(OOT_ADULT_BOTTLE));
  else
    z_cheap_proc_draw_xlu(gl, OOT_ZZ_PUPPET_DLIST(OOT_CHILD_BOTTLE));
  /* Restore Environment Color */
  gDPSetEnvColor(
   xlu->p++
  , en->puppetData.tunicColor.r
  , en->puppetData.tunicColor.g
  , en->puppetData.tunicColor.b
  , en->puppetData.tunicColor.a
  );
}

static void timg_segment_handler(z64_global_t* gl, uint8_t l, uint32_t dl, vec3s_t* rot, entity_t *en)
{
    z64_disp_buf_t *opa = &ZQDL(gl, poly_opa);

    const uint32_t eyes[8] = {
      0x00000000
    , 0x00000800
    , 0x00001000
    , 0x00001800
    , 0x00002000
    , 0x00002800
    , 0x00003000
    , 0x00003800
    };

    const uint32_t mouth[4] = {
      0x00004000
    , 0x00004400
    , 0x00004800
    , 0x00004C00
    };

    /*
    0b00000000 : Automatic Eyes
    0b00000001 : Open Eyes
    0b00000010 : Half Open Eyes
    0b00000011 : Closed Eyes
    0b00000100 : Look Left
    0b00000101 : Look Right
    0b00000110 : Shocked / Surprised
    0b00000111 : Look Down
    0b00001000 : Tightly Closed Eyes

    0b00000000 : Automatic Mouth
    0b00010000 : Closed Mouth
    0b00100000 : Open Mouth (Slight, Playing Ocarina)
    0b00110000 : Open Mouth (Wide, Shouting)
    0b01000000 : Open Mouth (Smile, Item Get)
    */


    if (en->puppetData.playasData.isZZ)
    {
        uint8_t face_byte = en->current_frame_data[0x84];
        uint32_t eye_index = (face_byte & 0x0F);
        uint32_t mouth_index = ((face_byte >> 4) & 0x0F);
        if (face_byte == 0x00)
        {
          eye_index = helper_eye_blink(&en->puppetData.playasData.eye_index);
          mouth_index = 0x01;
        }
        gSPSegment(opa->p++, 8, &en->puppetData.playasData + eyes[eye_index - 1]);
        gSPSegment(opa->p++, 9, &en->puppetData.playasData + mouth[mouth_index - 1]);
    }
    else
    {
        gSPSegment(opa->p++, 8, zh_seg2ram(0x06000000));
        gSPSegment(opa->p++, 9, zh_seg2ram(0x06004000));
    }

    return 1;
}

static void draw(entity_t *en, z64_global_t* gl)
{
    z64_disp_buf_t *opa = &ZQDL(gl, poly_opa);
    z64_disp_buf_t *xlu = &ZQDL(gl, poly_xlu);
    /* Set Environment Color */
    gDPSetEnvColor(
      opa->p++
    , en->puppetData.tunicColor.r
    , en->puppetData.tunicColor.g
    , en->puppetData.tunicColor.b
    , en->puppetData.tunicColor.a
    );

    /* Draw Matrix Skeleton */
    z_skelanime_draw(gl, LIMB_TOTAL_DLIST, en, &en->skelanime, &limb_handler, &timg_segment_handler);

    /* Draw Shadow */
    /*vec3f_t Scale[3] = {0.2, 0.2, 0.2};
    z_actor_shadow_draw_vec3f(&en->actor.pos_2, Scale, 0x00FF, gl);*/

    /* Sound Effects */
    if (en->puppetData.soundid > 0)
    {
        z_sfx_play_position(gl, &en->actor.pos_2, 25.0f, en->puppetData.soundid);
        en->puppetData.soundid = 0;
    }

    /* Get Item Models */
    if (en->puppetData.gi_obtain > 0)
    {
      /* external_func_800909B4 */
      int id = en->puppetData.gi_obtain;
      if (id < 0)
        id--;
      /* z_player_lib_get_item */
      float gi_y;
      if (zh_link_is_adult())
        gi_y = 14.0f;
      else
        gi_y = 6.0f;
      gSPSegment(opa->p++, 6, en->puppetData.gi_obj);
      gSPSegment(xlu->p++, 6, en->puppetData.gi_obj);
      matrix_push();
      z_matrix_translate_3f(
        z_sin_s(en->actor.rot_2.y) * 3.3f + en->actor.pos_2.x
        , en->actor.pos_2.y + gi_y
        , z_cos_s(en->actor.rot_2.y)
        , 1
      );
      z_matrix_rotate_3s(0, (gl->gameplay_frames * 0x03E8), 0, 1);
      z_matrix_scale_3f(0.2f, 0.2f, 0.2f, 1);
      z_draw_gi_model(gl, (en->puppetData.gi_obtain - 1));
      matrix_pop();
    }
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
