#ifndef __ML64_PLAYER_PUPPET__
#define __ML64_PLAYER_PUPPET__

/* Limbs */
#define PLAYER_LIMB_ROOT            (0 + 1)
#define PLAYER_LIMB_WAIST           (1 + 1)
#define PLAYER_LIMB_AFFECTOR_LOW    (2 + 1)
#define PLAYER_LIMB_THIGH_RIGHT     (3 + 1)
#define PLAYER_LIMB_SHIN_RIGHT      (4 + 1)
#define PLAYER_LIMB_FOOT_RIGHT      (5 + 1)
#define PLAYER_LIMB_THIGH_LEFT      (6 + 1)
#define PLAYER_LIMB_SHIN_LEFT       (7 + 1)
#define PLAYER_LIMB_FOOT_LEFT       (8 + 1)
#define PLAYER_LIMB_AFFECTOR_HIGH   (9 + 1)
#define PLAYER_LIMB_HEAD            (10 + 1)
#define PLAYER_LIMB_HAT             (11 + 1)
#define PLAYER_LIMB_COLLAR          (12 + 1)
#define PLAYER_LIMB_SHOULDER_LEFT   (13 + 1)
#define PLAYER_LIMB_FOREARM_LEFT    (14 + 1)
#define PLAYER_LIMB_HAND_LEFT       (15 + 1)
#define PLAYER_LIMB_SHOULDER_RIGHT  (16 + 1)
#define PLAYER_LIMB_FOREARM_RIGHT   (17 + 1)
#define PLAYER_LIMB_HAND_RIGHT      (18 + 1)
#define PLAYER_LIMB_SHEATH          (19 + 1)
#define PLAYER_LIMB_TORSO           (20 + 1)

/* Limb Aliases */
#define PLAYER_LIMB_SWORD            PLAYER_LIMB_HAND_LEFT
#define PLAYER_LIMB_SHIELD           PLAYER_LIMB_HAND_RIGHT
#define PLAYER_LIMB_NECK             PLAYER_LIMB_HEAD
#define PLAYER_LIMB_CONTROL_LEGS     PLAYER_LIMB_AFFECTOR_LOW
#define PLAYER_LIMB_CONTROL_BODY     PLAYER_LIMB_AFFECTOR_HIGH

enum tunic_index {
    PLAYER_TUNIC_GREEN
    , PLAYER_TUNIC_RED
    , PLAYER_TUNIC_BLUE
    , PLAYER_TUNIC_MAX
};

enum boots_index {
    PLAYER_BOOTS_NORMAL
    , PLAYER_BOOTS_IRON
    , PLAYER_BOOTS_HOVER
    , PLAYER_BOOTS_MAX
};

enum mask_index {
    PLAYER_MASK_NONE
    , PLAYER_MASK_KEATON
    , PLAYER_MASK_SKULL
    , PLAYER_MASK_SPOOKY
    , PLAYER_MASK_BUNNY
    , PLAYER_MASK_GORON
    , PLAYER_MASK_ZORA
    , PLAYER_MASK_GERUDO
    , PLAYER_MASK_TRUTH
    , PLAYER_MASK_MAX
};

enum age_index {
    PLAYER_AGE_ADULT
    , PLAYER_AGE_CHILD
    , PLAYER_AGE_MAX
}

//#define ADULT PLAYER_AGE_ADULT
//#define CHILD PLAYER_AGE_CHILD

/* Return ZZ Display List definition given an age parameter and display list parameter. (e.g. ZZDL(ADULT, LFIST_MASTER_SWORD);)*/
#define ZZDL(DLARG0, DLARG1) (DL_##DLARG0##_##DLARG1##_ZZ)

/* Display Lists */

/* Left Hand */
#define DL_ADULT_LFIST                      0x06021CE8
#define DL_ADULT_LFIST_ZZ                   0x00005110
#define DL_ADULT_LHAND                      0x06021AA8
#define DL_ADULT_LHAND_ZZ                   0x00005108
#define DL_ADULT_LHAND_BOTTLE               0x06024B58
#define DL_ADULT_LHAND_BOTTLE_ZZ            0x00005118

#define DL_CHILD_LFIST                      0x06013E18
#define DL_CHILD_LFIST_ZZ                   0x00005158
#define DL_CHILD_LHAND                      0x06013CB0
#define DL_CHILD_LHAND_ZZ                   0x00005150
#define DL_CHILD_LHAND_BOTTLE               0x06015FD0
#define DL_CHILD_LHAND_BOTTLE_ZZ            0x00005160

/* Right Hand */
#define DL_ADULT_RFIST                      0x060226E0
#define DL_ADULT_RFIST_ZZ                   0x00005128
#define DL_ADULT_RHAND                      0x06022498
#define DL_ADULT_RHAND_ZZ                   0x00005120

#define DL_CHILD_RFIST                      0x06014320
#define DL_CHILD_RFIST_ZZ                   0x00005170
#define DL_CHILD_RHAND                      0x060141C0
#define DL_CHILD_RHAND_ZZ                   0x00005168

/* Gauntlets */
#define DL_ADULT_LFIST_UPGRADE              0x06025438
#define DL_ADULT_LFIST_UPGRADE_ZZ           0x000051A8
#define DL_ADULT_LFOREARM_UPGRADE           0x06025218
#define DL_ADULT_LFOREARM_UPGRADE_ZZ        0x00005198
#define DL_ADULT_LHAND_UPGRADE              0x060252D8
#define DL_ADULT_LHAND_UPGRADE_ZZ           0x000051A0

#define DL_ADULT_RFIST_UPGRADE              0x060257B8
#define DL_ADULT_RFIST_UPGRADE_ZZ           0x000051C0
#define DL_ADULT_RFOREARM_UPGRADE           0x06025598
#define DL_ADULT_RFOREARM_UPGRADE_ZZ        0x000051B0
#define DL_ADULT_RHAND_UPGRADE              0x06025658
#define DL_ADULT_RHAND_UPGRADE_ZZ           0x000051C0

/* Boots */
#define DL_ADULT_LFOOT_HOVER                0x06025DB0
#define DL_ADULT_LFOOT_HOVER_ZZ             0x000051D8
#define DL_ADULT_LFOOT_IRON                 0x06025918
#define DL_ADULT_LFOOT_IRON_ZZ              0x000051C8
#define DL_ADULT_RFOOT_HOVER                0x06025BA8
#define DL_ADULT_RFOOT_HOVER_ZZ             0x000051E0
#define DL_ADULT_RFOOT_IRON                 0x06025A60
#define DL_ADULT_RFOOT_IRON_ZZ              0x000051D0

/* Goron Bracelet */
#define DL_CHILD_LFOREARM_UPGRADE           0x06016118
#define DL_CHILD_LFOREARM_UPGRADE_ZZ        0x000051D0

/* Left Fist + Kokiri Sword */
#define DL_CHILD_LFIST_KOKIRI_SWORD         0x06013F38
#define DL_CHILD_KOKIRI_SWORD_BLADE_ZZ      0x00005188
#define DL_CHILD_LFIST_KOKIRI_SWORD_ZZ      0x000052F8

/* Left Fist + Master Sword */
#define DL_ADULT_LFIST_MASTER_SWORD         0x06021F78
#define DL_ADULT_LFIST_MASTER_SWORD_ZZ      0x000052B8
#define DL_ADULT_MASTER_SWORD_BLADE_ZZ      0x000052C0

/* Left Fist + Biggoron Sword */
#define DL_ADULT_BIGGORON_SWORD_BLADE_ZZ    0x000052D8
#define DL_ADULT_LFIST_BIGGORON_SWORD       0x060238C8
#define DL_ADULT_LFIST_BIGGORON_SWORD_ZZ    0x000052D0
#define DL_CHILD_LHAND_PEDSWORD             0x00005300
#define DL_CHILD_PEDSWORD_ZZ                0x00005310

/* Left Fist + Broken Giant's Knife */
#define DL_ADULT_LFIST_GKNIFE_BROKEN        0x06023D50
#define DL_ADULT_LFIST_GKNIFE_BROKEN_ZZ     0x000052E8

/* Right Fist + Deku Shield */
#define DL_CHILD_RFIST_DEKU_SHIELD          0x06016740
#define DL_CHILD_RFIST_DEKU_SHIELD_ZZ       0x00005340

/* Right Fist + Hylian Shield */
#define DL_ADULT_RFIST_HYLIAN_SHIELD        0x06022970
#define DL_ADULT_RFIST_HYLIAN_SHIELD_ZZ     0x00005310

/* Right Fist + Mirror Shield */
#define DL_ADULT_RFIST_MIRROR_SHIELD        0x060241C0
#define DL_ADULT_RFIST_MIRROR_SHIELD_ZZ     0x00005320

/* Kokiri Sword / Sheath */
#define DL_CHILD_SHEATH                     0x06015408
#define DL_CHILD_SHEATH_ZZ                  0x00005178
#define DL_CHILD_SHEATH_SWORD               0x06015248
#define DL_CHILD_SHEATH_SWORD_ZZ            0x00005248

/* Master Sword / Sheath */
#define DL_ADULT_SHEATH_SWORD               0x06023160
#define DL_ADULT_SHEATH_ZZ                  0x00005130
#define DL_ADULT_SHEATH                     0x060249D8
#define DL_ADULT_SHEATH_SWORD_ZZ            0x00005238

/* Deku Shield + No Sword */
#define DL_CHILD_BACK_DEKU_SHIELD           0x06015010
#define DL_CHILD_BACK_DEKU_SHIELD_ZZ        0x00005278

/* Deku Shield + Kokiri Sword */
#define DL_CHILD_SHEATH_SWORD_DEKU          0x06014D68
#define DL_CHILD_SHEATH_SWORD_DEKU_ZZ       0x000052A8

/* Hylian Shield + Kokiri Sword */
#define DL_CHILD_SHEATH_SWORD_HYLIAN        0x060148A8
#define DL_CHILD_SHEATH_SWORD_HYLIAN_ZZ     0x00005280

/* Hylian Shield + Master Sword */
#define DL_ADULT_SHEATH_SWORD_HYLIAN        0x06020A78
#define DL_ADULT_SHEATH_SWORD_HYLIAN_ZZ     0x00005278

/* Mirror Shield + Master Sword */
#define DL_ADULT_SHEATH_SWORD_MIRROR        0x060211B8
#define DL_ADULT_SHEATH_SWORD_MIRROR_ZZ     0x00005288

/* Bottle */
#define DL_ADULT_BOTTLE                     0x0602AD58
#define DL_ADULT_BOTTLE_ZZ                  0x00005178
#define DL_CHILD_BOTTLE                     0x06018478
#define DL_CHILD_BOTTLE_ZZ                  0x000051C0

/* Fairy / Ocarina / of Time */
#define DL_ADULT_RHAND_OCARINA_TIME         0x06024698
#define DL_ADULT_RHAND_OCARINA_TIME_ZZ      0x00005350
#define DL_CHILD_RHAND_OCARINA_FAIRY        0x06017AF0
#define DL_CHILD_RHAND_OCARINA_FAIRY_ZZ     0x00005370
#define DL_CHILD_RHAND_OCARINA_TIME         0x060178A0
#define DL_CHILD_RHAND_OCARINA_TIME_ZZ      0x00005388

/* Fairy Slingshot */
#define DL_CHILD_RFIST_SLINGSHOT            0x06017D38
#define DL_CHILD_RFIST_SLINGSHOT_ZZ         0x00005348
#define DL_CHILD_SLINGSHOT_ZZ               0x00005358
#define DL_CHILD_SLINGSHOT_STRING           0x060221A8
#define DL_CHILD_SLINGSHOT_STRING_ZZ        0x000051E0

/* Fairy Bow */
#define DL_ADULT_RFIST_BOW                  0x06022DA8
#define DL_ADULT_RFIST_BOW_ZZ               0x00005330

/* Boomerang */
#define DL_CHILD_LFIST_BOOMERANG            0x06014660
#define DL_CHILD_LFIST_BOOMERANG_ZZ         0x00005328

/* Hookshot / Longshot */
#define DL_ADULT_RFIST_HOOKSHOT             0x06024D70
#define DL_ADULT_RFIST_HOOKSHOT_ZZ          0x00005340

/* Megaton Hammer */
#define DL_ADULT_LFIST_HAMMER               0x060233E0
#define DL_ADULT_LFIST_HAMMER_ZZ            0x00005300

/* Deku Stick */
#define DL_CHILD_DEKU_STICK                 0x06006CC0
#define DL_CHILD_DEKU_STICK_ZZ              0x000051A8

/* Masks */
#define DL_CHILD_MASK_BUNNY                 0x0602CA38
#define DL_CHILD_MASK_BUNNY_ZZ              0x000051E8
#define DL_CHILD_MASK_GERUDO                0x0602B788
#define DL_CHILD_MASK_GERUDO_ZZ             0x000051F0
#define DL_CHILD_MASK_GORON                 0x0602B350
#define DL_CHILD_MASK_GORON_ZZ              0x000051F8
#define DL_CHILD_MASK_KEATON                0x0602B060
#define DL_CHILD_MASK_KEATON_ZZ             0x00005200
#define DL_CHILD_MASK_SKULL                 0x0602AD40
#define DL_CHILD_MASK_SKULL_ZZ              0x00005220
#define DL_CHILD_MASK_SPOOKY                0x0602AF70
#define DL_CHILD_MASK_SPOOKY_ZZ             0x00005208
#define DL_CHILD_MASK_TRUTH                 0x0602B1F0
#define DL_CHILD_MASK_TRUTH_ZZ              0x00005210
#define DL_CHILD_MASK_ZORA                  0x0602B580
#define DL_CHILD_MASK_ZORA_ZZ               0x00005218

#endif /* __ML64_PLAYER_PUPPET__ */