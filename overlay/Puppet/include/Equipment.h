#ifndef PUPPET_EQUIPMENT_H
#define PUPPET_EQUIPMENT_H

#include "Puppet.h"

#if TARGET_GAME==Z64GAME_OOT

// If these are currently equipped by Link.
#define IS_SWORDLESS ((puppet->sync.equips & 0x000F) == NULL)
#define IS_KOKIRI_SWORD (((puppet->sync.equips & 0x000F) & (1 << 0)))
#define IS_MASTER_SWORD (((puppet->sync.equips & 0x000F) & (1 << 1)))
#define IS_BIGGORON_SWORD (((puppet->sync.equips & 0x000F) & (1 << 2)))
#define IS_BIGGORON_SWORD_BROKEN (IS_BIGGORON_SWORD && puppet->sync.brokenSwordFlag > NULL)

#define IS_SHIELDLESS ((puppet->sync.equips & 0x00F0) == NULL)
#define IS_KOKIRI_SHIELD (((puppet->sync.equips & 0x00F0) & (1 << 4)))
#define IS_HYLIAN_SHIELD (((puppet->sync.equips & 0x00F0) & (1 << 5)))
#define IS_MIRROR_SHIELD (((puppet->sync.equips & 0x00F0) & (1 << 6)))

#define HAS_STRENGTH ((puppet->sync.upgrades & 0x000000F0) != NULL)
#define HAS_GORON_BRACLET ((puppet->sync.upgrades & 0x000000F0) == 0x40)
#define HAS_SILVER_GAUNTLETS ((puppet->sync.upgrades & 0x000000F0) == 0x80)
#define HAS_GOLDEN_GAUNTLETS ((puppet->sync.upgrades & 0x000000F0) == 0xC0)
#define HAS_GAUNTLETS ((HAS_SILVER_GAUNTLETS || HAS_GOLDEN_GAUNTLETS))

#define IS_ADULT ((puppet->sync.age) == 0)
#define IS_CHILD ((puppet->sync.age) == 1)

#endif // #if TARGET_GAME==Z64GAME_OOT

#endif

