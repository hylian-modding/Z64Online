import {
  Ocarina,
  Hookshot,
  InventoryItem,
  ISaveContext,
  ISwords,
  IShields,
  ITunics,
  IBoots,
  IQuestStatus,
  Wallet,
  AmmoUpgrade,
  IInventoryFields,
  ZoraScale,
  Strength,
  UpgradeCountLookup,
  Magic,
  VANILLA_KEY_INDEXES,
} from 'modloader64_api/OOT/OOTAPI';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents } from '../OotoAPI/OotoAPI';
import { IDungeonItemContainer } from 'modloader64_api/OOT/IDungeonItemContainer';
import { IDungeonItemManager } from 'modloader64_api/OOT/IDungeonItemManager';

export function isAdultTradeItem(item: InventoryItem) {
  return (
    item === InventoryItem.POCKET_EGG ||
    item === InventoryItem.COJIRO ||
    item === InventoryItem.ODD_MUSHROOM ||
    item === InventoryItem.ODD_POTION ||
    item === InventoryItem.POACHERS_SAW ||
    item === InventoryItem.BROKEN_GORON_SWORD ||
    item === InventoryItem.CLAIM_CHECK
  );
}

export interface IDungeonItemSave extends IDungeonItemManager {}

export class OotoDungeonItemContainer implements IDungeonItemContainer {
  bossKey = false;
  compass = false;
  map = false;
}

export class OotoDungeonItemContext implements IDungeonItemSave {
  DEKU_TREE: IDungeonItemContainer = new OotoDungeonItemContainer();
  DODONGOS_CAVERN: IDungeonItemContainer = new OotoDungeonItemContainer();
  JABJ_JABUS_BELLY: IDungeonItemContainer = new OotoDungeonItemContainer();
  FOREST_TEMPLE: IDungeonItemContainer = new OotoDungeonItemContainer();
  FIRE_TEMPLE: IDungeonItemContainer = new OotoDungeonItemContainer();
  WATER_TEMPLE: IDungeonItemContainer = new OotoDungeonItemContainer();
  SPIRIT_TEMPLE: IDungeonItemContainer = new OotoDungeonItemContainer();
  SHADOW_TEMPLE: IDungeonItemContainer = new OotoDungeonItemContainer();
  BOTTOM_OF_THE_WELL: IDungeonItemContainer = new OotoDungeonItemContainer();
  ICE_CAVERN: IDungeonItemContainer = new OotoDungeonItemContainer();
  GANONS_CASTLE: IDungeonItemContainer = new OotoDungeonItemContainer();
}

export function createDungeonItemDataFromContext(
  context: IDungeonItemManager
): IDungeonItemSave {
  let m: IDungeonItemSave = new OotoDungeonItemContext();
  m.DEKU_TREE.bossKey = context.DEKU_TREE.bossKey;
  m.DEKU_TREE.compass = context.DEKU_TREE.compass;
  m.DEKU_TREE.map = context.DEKU_TREE.map;

  m.DODONGOS_CAVERN.bossKey = context.DODONGOS_CAVERN.bossKey;
  m.DODONGOS_CAVERN.compass = context.DODONGOS_CAVERN.compass;
  m.DODONGOS_CAVERN.map = context.DODONGOS_CAVERN.map;

  m.JABJ_JABUS_BELLY.bossKey = context.JABJ_JABUS_BELLY.bossKey;
  m.JABJ_JABUS_BELLY.compass = context.JABJ_JABUS_BELLY.compass;
  m.JABJ_JABUS_BELLY.map = context.JABJ_JABUS_BELLY.map;

  m.FOREST_TEMPLE.bossKey = context.FOREST_TEMPLE.bossKey;
  m.FOREST_TEMPLE.compass = context.FOREST_TEMPLE.compass;
  m.FOREST_TEMPLE.map = context.FOREST_TEMPLE.map;

  m.FIRE_TEMPLE.bossKey = context.FIRE_TEMPLE.bossKey;
  m.FIRE_TEMPLE.compass = context.FIRE_TEMPLE.compass;
  m.FIRE_TEMPLE.map = context.FIRE_TEMPLE.map;

  m.WATER_TEMPLE.bossKey = context.WATER_TEMPLE.bossKey;
  m.WATER_TEMPLE.compass = context.WATER_TEMPLE.compass;
  m.WATER_TEMPLE.map = context.WATER_TEMPLE.map;

  m.SPIRIT_TEMPLE.bossKey = context.SPIRIT_TEMPLE.bossKey;
  m.SPIRIT_TEMPLE.compass = context.SPIRIT_TEMPLE.compass;
  m.SPIRIT_TEMPLE.map = context.SPIRIT_TEMPLE.map;

  m.SHADOW_TEMPLE.bossKey = context.SHADOW_TEMPLE.bossKey;
  m.SHADOW_TEMPLE.compass = context.SHADOW_TEMPLE.compass;
  m.SHADOW_TEMPLE.map = context.SHADOW_TEMPLE.map;

  m.BOTTOM_OF_THE_WELL.bossKey = context.BOTTOM_OF_THE_WELL.bossKey;
  m.BOTTOM_OF_THE_WELL.compass = context.BOTTOM_OF_THE_WELL.compass;
  m.BOTTOM_OF_THE_WELL.map = context.BOTTOM_OF_THE_WELL.map;

  m.ICE_CAVERN.bossKey = context.ICE_CAVERN.bossKey;
  m.ICE_CAVERN.compass = context.ICE_CAVERN.compass;
  m.ICE_CAVERN.map = context.ICE_CAVERN.map;

  m.GANONS_CASTLE.bossKey = context.GANONS_CASTLE.bossKey;
  m.GANONS_CASTLE.compass = context.GANONS_CASTLE.compass;
  m.GANONS_CASTLE.map = context.GANONS_CASTLE.map;

  return m;
}

export function mergeDungeonItemData(
  storage: IDungeonItemManager,
  incoming: IDungeonItemSave
) {
  if (incoming.DEKU_TREE.bossKey && !storage.DEKU_TREE.bossKey) {
    storage.DEKU_TREE.bossKey = incoming.DEKU_TREE.bossKey;
  }
  if (incoming.DEKU_TREE.compass && !storage.DEKU_TREE.compass) {
    storage.DEKU_TREE.compass = incoming.DEKU_TREE.compass;
  }
  if (incoming.DEKU_TREE.map && !storage.DEKU_TREE.map) {
    storage.DEKU_TREE.map = incoming.DEKU_TREE.map;
  }

  if (incoming.DODONGOS_CAVERN.bossKey && !storage.DODONGOS_CAVERN.bossKey) {
    storage.DODONGOS_CAVERN.bossKey = incoming.DODONGOS_CAVERN.bossKey;
  }
  if (incoming.DODONGOS_CAVERN.compass && !storage.DODONGOS_CAVERN.compass) {
    storage.DODONGOS_CAVERN.compass = incoming.DODONGOS_CAVERN.compass;
  }
  if (incoming.DODONGOS_CAVERN.map && !storage.DODONGOS_CAVERN.map) {
    storage.DODONGOS_CAVERN.map = incoming.DODONGOS_CAVERN.map;
  }

  if (incoming.JABJ_JABUS_BELLY.bossKey && !storage.JABJ_JABUS_BELLY.bossKey) {
    storage.JABJ_JABUS_BELLY.bossKey = incoming.JABJ_JABUS_BELLY.bossKey;
  }
  if (incoming.JABJ_JABUS_BELLY.compass && !storage.JABJ_JABUS_BELLY.compass) {
    storage.JABJ_JABUS_BELLY.compass = incoming.JABJ_JABUS_BELLY.compass;
  }
  if (incoming.JABJ_JABUS_BELLY.map && !storage.JABJ_JABUS_BELLY.map) {
    storage.JABJ_JABUS_BELLY.map = incoming.JABJ_JABUS_BELLY.map;
  }

  if (incoming.FOREST_TEMPLE.bossKey && !storage.FOREST_TEMPLE.bossKey) {
    storage.FOREST_TEMPLE.bossKey = incoming.FOREST_TEMPLE.bossKey;
  }
  if (incoming.FOREST_TEMPLE.compass && !storage.FOREST_TEMPLE.compass) {
    storage.FOREST_TEMPLE.compass = incoming.FOREST_TEMPLE.compass;
  }
  if (incoming.FOREST_TEMPLE.map && !storage.FOREST_TEMPLE.map) {
    storage.FOREST_TEMPLE.map = incoming.FOREST_TEMPLE.map;
  }

  if (incoming.FIRE_TEMPLE.bossKey && !storage.FIRE_TEMPLE.bossKey) {
    storage.FIRE_TEMPLE.bossKey = incoming.FIRE_TEMPLE.bossKey;
  }
  if (incoming.FIRE_TEMPLE.compass && !storage.FIRE_TEMPLE.compass) {
    storage.FIRE_TEMPLE.compass = incoming.FIRE_TEMPLE.compass;
  }
  if (incoming.FIRE_TEMPLE.map && !storage.FIRE_TEMPLE.map) {
    storage.FIRE_TEMPLE.map = incoming.FIRE_TEMPLE.map;
  }

  if (incoming.WATER_TEMPLE.bossKey && !storage.WATER_TEMPLE.bossKey) {
    storage.WATER_TEMPLE.bossKey = incoming.WATER_TEMPLE.bossKey;
  }
  if (incoming.WATER_TEMPLE.compass && !storage.WATER_TEMPLE.compass) {
    storage.WATER_TEMPLE.compass = incoming.WATER_TEMPLE.compass;
  }
  if (incoming.WATER_TEMPLE.map && !storage.WATER_TEMPLE.map) {
    storage.WATER_TEMPLE.map = incoming.WATER_TEMPLE.map;
  }

  if (incoming.SPIRIT_TEMPLE.bossKey && !storage.SPIRIT_TEMPLE.bossKey) {
    storage.SPIRIT_TEMPLE.bossKey = incoming.SPIRIT_TEMPLE.bossKey;
  }
  if (incoming.SPIRIT_TEMPLE.compass && !storage.SPIRIT_TEMPLE.compass) {
    storage.SPIRIT_TEMPLE.compass = incoming.SPIRIT_TEMPLE.compass;
  }
  if (incoming.SPIRIT_TEMPLE.map && !storage.SPIRIT_TEMPLE.map) {
    storage.SPIRIT_TEMPLE.map = incoming.SPIRIT_TEMPLE.map;
  }

  if (incoming.SHADOW_TEMPLE.bossKey && !storage.SHADOW_TEMPLE.bossKey) {
    storage.SHADOW_TEMPLE.bossKey = incoming.SHADOW_TEMPLE.bossKey;
  }
  if (incoming.SHADOW_TEMPLE.compass && !storage.SHADOW_TEMPLE.compass) {
    storage.SHADOW_TEMPLE.compass = incoming.SHADOW_TEMPLE.compass;
  }
  if (incoming.SHADOW_TEMPLE.map && !storage.SHADOW_TEMPLE.map) {
    storage.SHADOW_TEMPLE.map = incoming.SHADOW_TEMPLE.map;
  }

  if (
    incoming.BOTTOM_OF_THE_WELL.bossKey &&
    !storage.BOTTOM_OF_THE_WELL.bossKey
  ) {
    storage.BOTTOM_OF_THE_WELL.bossKey = incoming.BOTTOM_OF_THE_WELL.bossKey;
  }
  if (
    incoming.BOTTOM_OF_THE_WELL.compass &&
    !storage.BOTTOM_OF_THE_WELL.compass
  ) {
    storage.BOTTOM_OF_THE_WELL.compass = incoming.BOTTOM_OF_THE_WELL.compass;
  }
  if (incoming.BOTTOM_OF_THE_WELL.map && !storage.BOTTOM_OF_THE_WELL.map) {
    storage.BOTTOM_OF_THE_WELL.map = incoming.BOTTOM_OF_THE_WELL.map;
  }

  if (incoming.ICE_CAVERN.bossKey && !storage.ICE_CAVERN.bossKey) {
    storage.ICE_CAVERN.bossKey = incoming.ICE_CAVERN.bossKey;
  }
  if (incoming.ICE_CAVERN.compass && !storage.ICE_CAVERN.compass) {
    storage.ICE_CAVERN.compass = incoming.ICE_CAVERN.compass;
  }
  if (incoming.ICE_CAVERN.map && !storage.ICE_CAVERN.map) {
    storage.ICE_CAVERN.map = incoming.ICE_CAVERN.map;
  }

  if (incoming.GANONS_CASTLE.bossKey && !storage.GANONS_CASTLE.bossKey) {
    storage.GANONS_CASTLE.bossKey = incoming.GANONS_CASTLE.bossKey;
  }
  if (incoming.GANONS_CASTLE.compass && !storage.GANONS_CASTLE.compass) {
    storage.GANONS_CASTLE.compass = incoming.GANONS_CASTLE.compass;
  }
  if (incoming.GANONS_CASTLE.map && !storage.GANONS_CASTLE.map) {
    storage.GANONS_CASTLE.map = incoming.GANONS_CASTLE.map;
  }
}

export function applyDungeonItemDataToContext(
  incoming: IDungeonItemSave,
  context: IDungeonItemManager
) {
  context.DEKU_TREE.bossKey = incoming.DEKU_TREE.bossKey;
  context.DEKU_TREE.compass = incoming.DEKU_TREE.compass;
  context.DEKU_TREE.map = incoming.DEKU_TREE.map;

  context.DODONGOS_CAVERN.bossKey = incoming.DODONGOS_CAVERN.bossKey;
  context.DODONGOS_CAVERN.compass = incoming.DODONGOS_CAVERN.compass;
  context.DODONGOS_CAVERN.map = incoming.DODONGOS_CAVERN.map;

  context.JABJ_JABUS_BELLY.bossKey = incoming.JABJ_JABUS_BELLY.bossKey;
  context.JABJ_JABUS_BELLY.compass = incoming.JABJ_JABUS_BELLY.compass;
  context.JABJ_JABUS_BELLY.map = incoming.JABJ_JABUS_BELLY.map;

  context.FOREST_TEMPLE.bossKey = incoming.FOREST_TEMPLE.bossKey;
  context.FOREST_TEMPLE.compass = incoming.FOREST_TEMPLE.compass;
  context.FOREST_TEMPLE.map = incoming.FOREST_TEMPLE.map;

  context.FIRE_TEMPLE.bossKey = incoming.FIRE_TEMPLE.bossKey;
  context.FIRE_TEMPLE.compass = incoming.FIRE_TEMPLE.compass;
  context.FIRE_TEMPLE.map = incoming.FIRE_TEMPLE.map;

  context.WATER_TEMPLE.bossKey = incoming.WATER_TEMPLE.bossKey;
  context.WATER_TEMPLE.compass = incoming.WATER_TEMPLE.compass;
  context.WATER_TEMPLE.map = incoming.WATER_TEMPLE.map;

  context.SPIRIT_TEMPLE.bossKey = incoming.SPIRIT_TEMPLE.bossKey;
  context.SPIRIT_TEMPLE.compass = incoming.SPIRIT_TEMPLE.compass;
  context.SPIRIT_TEMPLE.map = incoming.SPIRIT_TEMPLE.map;

  context.SHADOW_TEMPLE.bossKey = incoming.SHADOW_TEMPLE.bossKey;
  context.SHADOW_TEMPLE.compass = incoming.SHADOW_TEMPLE.compass;
  context.SHADOW_TEMPLE.map = incoming.SHADOW_TEMPLE.map;

  context.BOTTOM_OF_THE_WELL.bossKey = incoming.BOTTOM_OF_THE_WELL.bossKey;
  context.BOTTOM_OF_THE_WELL.compass = incoming.BOTTOM_OF_THE_WELL.compass;
  context.BOTTOM_OF_THE_WELL.map = incoming.BOTTOM_OF_THE_WELL.map;

  context.ICE_CAVERN.bossKey = incoming.ICE_CAVERN.bossKey;
  context.ICE_CAVERN.compass = incoming.ICE_CAVERN.compass;
  context.ICE_CAVERN.map = incoming.ICE_CAVERN.map;

  context.GANONS_CASTLE.bossKey = incoming.GANONS_CASTLE.bossKey;
  context.GANONS_CASTLE.compass = incoming.GANONS_CASTLE.compass;
  context.GANONS_CASTLE.map = incoming.GANONS_CASTLE.map;
}

// As much as I want to pull some Object.keys bullshit here to make writing this less verbose, I don't want any sneaky bugs.
// So, we write it all verbose as hell.
export function mergeInventoryData(
  save: IInventoryFields,
  incoming: IInventoryFields
) {
  if (incoming.dekuSticks) {
    save.dekuSticks = true;
  }
  if (incoming.dekuNuts) {
    save.dekuNuts = true;
  }
  if (incoming.bombs) {
    save.bombs = true;
  }
  if (incoming.bombchus) {
    save.bombchus = true;
  }
  if (incoming.magicBeans) {
    save.magicBeans = true;
  }
  if (incoming.fairySlingshot) {
    save.fairySlingshot = true;
  }
  if (incoming.fairyBow) {
    save.fairyBow = true;
  }
  if (incoming.fireArrows) {
    save.fireArrows = true;
  }
  if (incoming.iceArrows) {
    save.iceArrows = true;
  }
  if (incoming.lightArrows) {
    save.lightArrows = true;
  }
  if (incoming.dinsFire) {
    save.dinsFire = true;
  }
  if (incoming.faroresWind) {
    save.faroresWind = true;
  }
  if (incoming.nayrusLove) {
    save.nayrusLove = true;
  }
  if (incoming.ocarina > save.ocarina) {
    save.ocarina = incoming.ocarina;
  }
  if (incoming.hookshot > save.hookshot) {
    save.hookshot = incoming.hookshot;
  }
  if (incoming.boomerang) {
    save.boomerang = true;
  }
  if (incoming.lensOfTruth) {
    save.lensOfTruth = true;
  }
  if (incoming.megatonHammer) {
    save.megatonHammer = true;
  }

  //-----------------------------------------------------
  // Child trade item
  // TODO: Add actual flag checks to make SOLD_OUT safe.
  //-----------------------------------------------------

  // Catchup code first.
  if (
    incoming.childTradeItem !== InventoryItem.NONE &&
    save.childTradeItem === InventoryItem.NONE
  ) {
    save.childTradeItem = incoming.childTradeItem;
  }

  // Logic
  if (
    incoming.childTradeItem === InventoryItem.WEIRD_EGG &&
    save.childTradeItem === InventoryItem.NONE
  ) {
    save.childTradeItem = InventoryItem.WEIRD_EGG;
  } else if (
    incoming.childTradeItem === InventoryItem.CHILD_CUCCO &&
    save.childTradeItem === InventoryItem.WEIRD_EGG
  ) {
    save.childTradeItem = InventoryItem.CHILD_CUCCO;
  } else if (
    incoming.childTradeItem === InventoryItem.ZELDAS_LETTER &&
    save.childTradeItem === InventoryItem.CHILD_CUCCO
  ) {
    save.childTradeItem = InventoryItem.ZELDAS_LETTER;
  } else if (
    incoming.childTradeItem === InventoryItem.KEATON_MASK &&
    save.childTradeItem === InventoryItem.ZELDAS_LETTER
  ) {
    save.childTradeItem = InventoryItem.KEATON_MASK;
  } else if (
    incoming.childTradeItem === InventoryItem.SOLD_OUT &&
    save.childTradeItem === InventoryItem.KEATON_MASK
  ) {
    save.childTradeItem = InventoryItem.SOLD_OUT;
  } else if (
    incoming.childTradeItem === InventoryItem.SKULL_MASK &&
    save.childTradeItem === InventoryItem.SOLD_OUT
  ) {
    save.childTradeItem = InventoryItem.SKULL_MASK;
  } else if (
    incoming.childTradeItem === InventoryItem.SOLD_OUT &&
    save.childTradeItem === InventoryItem.SKULL_MASK
  ) {
    save.childTradeItem = InventoryItem.SOLD_OUT;
  } else if (
    incoming.childTradeItem === InventoryItem.SPOOKY_MASK &&
    save.childTradeItem === InventoryItem.SOLD_OUT
  ) {
    save.childTradeItem = InventoryItem.SPOOKY_MASK;
  } else if (
    incoming.childTradeItem === InventoryItem.SOLD_OUT &&
    save.childTradeItem === InventoryItem.SPOOKY_MASK
  ) {
    save.childTradeItem = InventoryItem.SOLD_OUT;
  } else if (
    incoming.childTradeItem === InventoryItem.BUNNY_HOOD &&
    save.childTradeItem === InventoryItem.SOLD_OUT
  ) {
    save.childTradeItem = InventoryItem.BUNNY_HOOD;
  }

  //-----------------------------------------------------
  // Adult trade item
  //-----------------------------------------------------

  // Catchup code first.
  if (
    incoming.adultTradeItem !== InventoryItem.NONE &&
    save.adultTradeItem === InventoryItem.NONE
  ) {
    save.adultTradeItem = incoming.adultTradeItem;
  }

  // Logic
  if (
    incoming.adultTradeItem === InventoryItem.POCKET_CUCCO &&
    save.adultTradeItem === InventoryItem.NONE
  ) {
    save.adultTradeItem = InventoryItem.POCKET_CUCCO;
  } else if (
    incoming.adultTradeItem === InventoryItem.COJIRO &&
    save.adultTradeItem === InventoryItem.POCKET_CUCCO
  ) {
    save.adultTradeItem = InventoryItem.COJIRO;
  } else if (
    incoming.adultTradeItem === InventoryItem.ODD_MUSHROOM &&
    save.adultTradeItem === InventoryItem.COJIRO
  ) {
    save.adultTradeItem = InventoryItem.ODD_MUSHROOM;
  } else if (
    incoming.adultTradeItem === InventoryItem.ODD_POTION &&
    save.adultTradeItem === InventoryItem.ODD_MUSHROOM
  ) {
    save.adultTradeItem = InventoryItem.ODD_POTION;
  } else if (
    incoming.adultTradeItem === InventoryItem.POACHERS_SAW &&
    save.adultTradeItem === InventoryItem.ODD_POTION
  ) {
    save.adultTradeItem = InventoryItem.POACHERS_SAW;
  } else if (
    incoming.adultTradeItem === InventoryItem.BROKEN_GORON_SWORD &&
    save.adultTradeItem === InventoryItem.POACHERS_SAW
  ) {
    save.adultTradeItem = InventoryItem.BROKEN_GORON_SWORD;
  } else if (
    incoming.adultTradeItem === InventoryItem.CLAIM_CHECK &&
    save.adultTradeItem === InventoryItem.BROKEN_GORON_SWORD
  ) {
    save.adultTradeItem = InventoryItem.CLAIM_CHECK;
  }

  // Allow people to bottle dupe over CLAIM_CHECK.
  if (
    !isAdultTradeItem(incoming.adultTradeItem) &&
    save.adultTradeItem === InventoryItem.CLAIM_CHECK
  ) {
    save.adultTradeItem = incoming.adultTradeItem;
  }

  //-----------------------------------------------------
  // Bottles
  //-----------------------------------------------------
  if (incoming.bottle_1 !== InventoryItem.NONE) {
    save.bottle_1 = incoming.bottle_1;
  }
  if (incoming.bottle_2 !== InventoryItem.NONE) {
    save.bottle_2 = incoming.bottle_2;
  }
  if (incoming.bottle_3 !== InventoryItem.NONE) {
    save.bottle_3 = incoming.bottle_3;
  }
  if (incoming.bottle_4 !== InventoryItem.NONE) {
    save.bottle_4 = incoming.bottle_4;
  }

  //-----------------------------------------------------
  // Upgrades
  //-----------------------------------------------------
  if (save.wallet < incoming.wallet) {
    save.wallet = incoming.wallet;
  }
  if (save.quiver < incoming.quiver) {
    save.quiver = incoming.quiver;
  }
  if (save.bombBag < incoming.bombBag) {
    save.bombBag = incoming.bombBag;
  }
  if (save.dekuNutsCapacity < incoming.dekuNutsCapacity) {
    save.dekuNutsCapacity = incoming.dekuNutsCapacity;
  }
  if (save.dekuSticksCapacity < incoming.dekuSticksCapacity) {
    save.dekuSticksCapacity = incoming.dekuSticksCapacity;
  }
  if (save.swimming < incoming.swimming) {
    save.swimming = incoming.swimming;
  }
  if (save.bulletBag < incoming.bulletBag) {
    save.bulletBag = incoming.bulletBag;
  }
  if (save.strength < incoming.strength) {
    save.strength = incoming.strength;
  }
}

export function createInventoryFromContext(
  save: ISaveContext
): IInventoryFields {
  let data = new InventorySave();
  data.dekuSticks = save.inventory.dekuSticks;
  data.dekuNuts = save.inventory.dekuNuts;
  data.bombs = save.inventory.bombs;
  data.bombchus = save.inventory.bombchus;
  data.magicBeans = save.inventory.magicBeans;
  data.fairySlingshot = save.inventory.fairySlingshot;
  data.fairyBow = save.inventory.fairyBow;
  data.fireArrows = save.inventory.fireArrows;
  data.iceArrows = save.inventory.iceArrows;
  data.lightArrows = save.inventory.lightArrows;
  data.dinsFire = save.inventory.dinsFire;
  data.faroresWind = save.inventory.faroresWind;
  data.nayrusLove = save.inventory.nayrusLove;
  data.ocarina = save.inventory.ocarina;
  data.hookshot = save.inventory.hookshot;
  data.boomerang = save.inventory.boomerang;
  data.lensOfTruth = save.inventory.lensOfTruth;
  data.megatonHammer = save.inventory.megatonHammer;
  data.childTradeItem = save.inventory.childTradeItem;
  data.adultTradeItem = save.inventory.adultTradeItem;
  data.bottle_1 = save.inventory.bottle_1;
  data.bottle_2 = save.inventory.bottle_2;
  data.bottle_3 = save.inventory.bottle_3;
  data.bottle_4 = save.inventory.bottle_4;
  data.wallet = save.inventory.wallet;
  data.quiver = save.inventory.quiver;
  data.bombBag = save.inventory.bombBag;
  data.dekuNutsCapacity = save.inventory.dekuNutsCapacity;
  data.dekuSticksCapacity = save.inventory.dekuSticksCapacity;
  data.swimming = save.inventory.swimming;
  data.bulletBag = save.inventory.bulletBag;
  data.strength = save.inventory.strength;
  return data;
}

export function applyInventoryToContext(
  data: IInventoryFields,
  save: ISaveContext
) {
  save.inventory.dekuSticks = data.dekuSticks;
  save.inventory.dekuNuts = data.dekuNuts;
  save.inventory.bombs = data.bombs;
  if (!save.inventory.bombchus && data.bombchus) {
    save.inventory.bombchuCount =
      UpgradeCountLookup(InventoryItem.BOMBCHU, AmmoUpgrade.BASE) / 4;
  }
  save.inventory.bombchus = data.bombchus;
  save.inventory.magicBeans = data.magicBeans;
  save.inventory.fairySlingshot = data.fairySlingshot;
  save.inventory.fairyBow = data.fairyBow;
  save.inventory.fireArrows = data.fireArrows;
  save.inventory.iceArrows = data.iceArrows;
  save.inventory.lightArrows = data.lightArrows;
  save.inventory.dinsFire = data.dinsFire;
  save.inventory.faroresWind = data.faroresWind;
  save.inventory.nayrusLove = data.nayrusLove;
  save.inventory.ocarina = data.ocarina;
  save.inventory.hookshot = data.hookshot;
  save.inventory.boomerang = data.boomerang;
  save.inventory.lensOfTruth = data.lensOfTruth;
  save.inventory.megatonHammer = data.megatonHammer;
  save.inventory.childTradeItem = data.childTradeItem;
  save.inventory.adultTradeItem = data.adultTradeItem;
  save.inventory.bottle_1 = data.bottle_1;
  save.inventory.bottle_2 = data.bottle_2;
  save.inventory.bottle_3 = data.bottle_3;
  save.inventory.bottle_4 = data.bottle_4;
  save.inventory.wallet = data.wallet;
  if (data.quiver > save.inventory.quiver) {
    save.inventory.arrows = UpgradeCountLookup(
      InventoryItem.FAIRY_BOW,
      data.quiver
    );
  }
  save.inventory.quiver = data.quiver;
  if (data.bombBag > save.inventory.bombBag) {
    save.inventory.bombsCount = UpgradeCountLookup(
      InventoryItem.BOMB,
      data.bombBag
    );
  }
  save.inventory.bombBag = data.bombBag;
  if (data.dekuNutsCapacity > save.inventory.dekuNutsCapacity) {
    if (data.dekuNutsCapacity > 1) {
      save.inventory.dekuNutsCount = UpgradeCountLookup(
        InventoryItem.DEKU_NUT,
        data.dekuNutsCapacity
      );
    } else {
      if (data.dekuNutsCapacity === 1) {
        save.inventory.dekuNutsCount = 5;
      }
    }
  }
  save.inventory.dekuNutsCapacity = data.dekuNutsCapacity;
  if (data.dekuSticksCapacity > save.inventory.dekuSticksCapacity) {
    if (data.dekuSticksCapacity > 1) {
      save.inventory.dekuSticksCount = UpgradeCountLookup(
        InventoryItem.DEKU_STICK,
        data.dekuSticksCapacity
      );
    } else {
      if (data.dekuSticksCapacity === 1) {
        save.inventory.dekuSticksCount = 1;
      }
    }
  }
  save.inventory.dekuSticksCapacity = data.dekuSticksCapacity;
  save.inventory.swimming = data.swimming;
  if (data.bulletBag > save.inventory.bulletBag) {
    save.inventory.dekuSeeds = UpgradeCountLookup(
      InventoryItem.FAIRY_SLINGSHOT,
      data.bulletBag
    );
  }
  save.inventory.bulletBag = data.bulletBag;
  save.inventory.strength = data.strength;
}

export class InventorySave implements IInventoryFields {
  dekuSticks = false;
  dekuNuts = false;
  bombs = false;
  bombchus = false;
  magicBeans = false;
  fairySlingshot = false;
  fairyBow = false;
  fireArrows = false;
  iceArrows = false;
  lightArrows = false;
  dinsFire = false;
  faroresWind = false;
  nayrusLove = false;
  ocarina: Ocarina = Ocarina.NONE;
  hookshot: Hookshot = Hookshot.NONE;
  boomerang = false;
  lensOfTruth = false;
  megatonHammer = false;
  childTradeItem: InventoryItem = InventoryItem.NONE;
  adultTradeItem: InventoryItem = InventoryItem.NONE;
  bottle_1: InventoryItem = InventoryItem.NONE;
  bottle_2: InventoryItem = InventoryItem.NONE;
  bottle_3: InventoryItem = InventoryItem.NONE;
  bottle_4: InventoryItem = InventoryItem.NONE;
  wallet: Wallet = Wallet.CHILD;
  quiver: AmmoUpgrade = AmmoUpgrade.NONE;
  bulletBag: AmmoUpgrade = AmmoUpgrade.NONE;
  strength: Strength = Strength.NONE;
  swimming: ZoraScale = ZoraScale.NONE;
  dekuSticksCapacity: AmmoUpgrade = AmmoUpgrade.NONE;
  dekuNutsCapacity: AmmoUpgrade = AmmoUpgrade.NONE;
  bombBag: AmmoUpgrade = AmmoUpgrade.NONE;
}

//-----------------------------------------------------
// Equipment
//-----------------------------------------------------

export function mergeEquipmentData(
  save: IEquipmentSave,
  incoming: IEquipmentSave
) {
  // Swords
  if (incoming.kokiriSword) {
    save.kokiriSword = true;
  }
  if (incoming.masterSword) {
    save.masterSword = true;
  }
  if (incoming.giantKnife) {
    save.giantKnife = true;
  }
  if (incoming.biggoronSword) {
    save.biggoronSword = true;
  }
  // Shields
  if (incoming.dekuShield) {
    save.dekuShield = true;
  }
  if (incoming.hylianShield) {
    save.hylianShield = true;
  }
  if (incoming.mirrorShield) {
    save.mirrorShield = true;
  }
  // Tunics
  if (incoming.kokiriTunic) {
    save.kokiriTunic = true;
  }
  if (incoming.goronTunic) {
    save.goronTunic = true;
  }
  if (incoming.zoraTunic) {
    save.zoraTunic = true;
  }
  // Boots
  if (incoming.kokiriBoots) {
    save.kokiriBoots = true;
  }
  if (incoming.ironBoots) {
    save.ironBoots = true;
  }
  if (incoming.hoverBoots) {
    save.hoverBoots = true;
  }
}

export function createEquipmentFromContext(save: ISaveContext) {
  let data = new EquipmentSave();
  data.kokiriSword = save.swords.kokiriSword;
  data.masterSword = save.swords.masterSword;
  data.giantKnife = save.swords.giantKnife;
  data.biggoronSword = save.swords.biggoronSword;

  data.dekuShield = save.shields.dekuShield;
  data.hylianShield = save.shields.hylianShield;
  data.mirrorShield = save.shields.mirrorShield;

  data.kokiriTunic = save.tunics.kokiriTunic;
  data.goronTunic = save.tunics.goronTunic;
  data.zoraTunic = save.tunics.zoraTunic;

  data.kokiriBoots = save.boots.kokiriBoots;
  data.ironBoots = save.boots.ironBoots;
  data.hoverBoots = save.boots.hoverBoots;
  return data;
}

export function applyEquipmentToContext(
  data: IEquipmentSave,
  save: ISaveContext
) {
  save.swords.kokiriSword = data.kokiriSword;
  save.swords.masterSword = data.masterSword;
  save.swords.giantKnife = data.giantKnife;
  save.swords.biggoronSword = data.biggoronSword;

  save.shields.dekuShield = data.dekuShield;
  save.shields.hylianShield = data.hylianShield;
  save.shields.mirrorShield = data.mirrorShield;

  save.tunics.kokiriTunic = data.kokiriTunic;
  save.tunics.goronTunic = data.goronTunic;
  save.tunics.zoraTunic = data.zoraTunic;

  save.boots.kokiriBoots = data.kokiriBoots;
  save.boots.ironBoots = data.ironBoots;
  save.boots.hoverBoots = data.hoverBoots;
}

// Combine the four API interfaces into one.
export interface IEquipmentSave extends ISwords, IShields, ITunics, IBoots {}

export class EquipmentSave implements IEquipmentSave {
  kokiriSword = false;
  masterSword = false;
  giantKnife = false;
  biggoronSword = false;
  dekuShield = false;
  hylianShield = false;
  mirrorShield = false;
  kokiriTunic = false;
  goronTunic = false;
  zoraTunic = false;
  kokiriBoots = false;
  ironBoots = false;
  hoverBoots = false;
}

// Add heart containers here, it makes sense to put them with the heart pieces.
export interface IQuestSave extends IQuestStatus {
  heart_containers: number;
  magic_meter_size: Magic;
  double_defense: number;
}

export class QuestSave implements IQuestSave {
  heart_containers = 0;
  kokiriEmerald = false;
  goronRuby = false;
  zoraSapphire = false;
  lightMedallion = false;
  forestMedallion = false;
  fireMedallion = false;
  waterMedallion = false;
  shadowMedallion = false;
  spiritMedallion = false;
  zeldasLullaby = false;
  eponasSong = false;
  sariasSong = false;
  sunsSong = false;
  songOfTime = false;
  songOfStorms = false;
  preludeOfLight = false;
  minuetOfForest = false;
  boleroOfFire = false;
  serenadeOfWater = false;
  nocturneOfShadow = false;
  requiemOfSpirit = false;
  gerudoMembershipCard = false;
  stoneOfAgony = false;
  goldSkulltulas = 0;
  displayGoldSkulltulas = false;
  heartPieces = 0;
  magic_meter_size: Magic = Magic.NONE;
  double_defense = 0;
}

export function createQuestSaveFromContext(save: ISaveContext): IQuestSave {
  let data = new QuestSave();
  data.kokiriEmerald = save.questStatus.kokiriEmerald;
  data.goronRuby = save.questStatus.goronRuby;
  data.zoraSapphire = save.questStatus.zoraSapphire;
  data.lightMedallion = save.questStatus.lightMedallion;
  data.forestMedallion = save.questStatus.forestMedallion;
  data.fireMedallion = save.questStatus.fireMedallion;
  data.waterMedallion = save.questStatus.waterMedallion;
  data.shadowMedallion = save.questStatus.shadowMedallion;
  data.spiritMedallion = save.questStatus.spiritMedallion;
  data.zeldasLullaby = save.questStatus.zeldasLullaby;
  data.eponasSong = save.questStatus.eponasSong;
  data.sariasSong = save.questStatus.sariasSong;
  data.sunsSong = save.questStatus.sunsSong;
  data.songOfTime = save.questStatus.songOfTime;
  data.songOfStorms = save.questStatus.songOfStorms;
  data.preludeOfLight = save.questStatus.preludeOfLight;
  data.minuetOfForest = save.questStatus.minuetOfForest;
  data.boleroOfFire = save.questStatus.boleroOfFire;
  data.serenadeOfWater = save.questStatus.serenadeOfWater;
  data.nocturneOfShadow = save.questStatus.nocturneOfShadow;
  data.requiemOfSpirit = save.questStatus.requiemOfSpirit;
  data.gerudoMembershipCard = save.questStatus.gerudoMembershipCard;
  data.stoneOfAgony = save.questStatus.stoneOfAgony;
  data.goldSkulltulas = save.questStatus.goldSkulltulas;
  data.displayGoldSkulltulas = save.questStatus.displayGoldSkulltulas;
  data.heartPieces = save.questStatus.heartPieces;
  data.heart_containers = save.heart_containers;
  data.magic_meter_size = save.magic_meter_size;
  data.double_defense = save.double_defense;
  return data;
}

export function applyQuestSaveToContext(data: IQuestSave, save: ISaveContext) {
  save.questStatus.kokiriEmerald = data.kokiriEmerald;
  save.questStatus.goronRuby = data.goronRuby;
  save.questStatus.zoraSapphire = data.zoraSapphire;
  save.questStatus.lightMedallion = data.lightMedallion;
  save.questStatus.forestMedallion = data.forestMedallion;
  save.questStatus.fireMedallion = data.fireMedallion;
  save.questStatus.waterMedallion = data.waterMedallion;
  save.questStatus.shadowMedallion = data.shadowMedallion;
  save.questStatus.spiritMedallion = data.spiritMedallion;
  save.questStatus.zeldasLullaby = data.zeldasLullaby;
  save.questStatus.eponasSong = data.eponasSong;
  save.questStatus.sariasSong = data.sariasSong;
  save.questStatus.sunsSong = data.sunsSong;
  save.questStatus.songOfTime = data.songOfTime;
  save.questStatus.songOfStorms = data.songOfStorms;
  save.questStatus.preludeOfLight = data.preludeOfLight;
  save.questStatus.minuetOfForest = data.minuetOfForest;
  save.questStatus.boleroOfFire = data.boleroOfFire;
  save.questStatus.serenadeOfWater = data.serenadeOfWater;
  save.questStatus.nocturneOfShadow = data.nocturneOfShadow;
  save.questStatus.requiemOfSpirit = data.requiemOfSpirit;
  save.questStatus.gerudoMembershipCard = data.gerudoMembershipCard;
  save.questStatus.stoneOfAgony = data.stoneOfAgony;
  save.questStatus.goldSkulltulas = data.goldSkulltulas;
  save.questStatus.displayGoldSkulltulas = data.displayGoldSkulltulas;
  let lastKnownHP: number = save.questStatus.heartPieces;
  save.questStatus.heartPieces = data.heartPieces;
  if (lastKnownHP < data.heartPieces) {
    bus.emit(OotOnlineEvents.GAINED_PIECE_OF_HEART, data.heartPieces);
  }
  let lastKnownHC: number = save.heart_containers;
  save.heart_containers = data.heart_containers;
  if (lastKnownHC < data.heart_containers) {
    bus.emit(OotOnlineEvents.GAINED_HEART_CONTAINER, data.heart_containers);
  }
  let lastKnownMagic: Magic = save.magic_meter_size;
  save.magic_meter_size = data.magic_meter_size;
  if (lastKnownMagic < data.magic_meter_size) {
    bus.emit(OotOnlineEvents.MAGIC_METER_INCREASED, data.magic_meter_size);
  }
  let lastKnownDD: number = save.double_defense;
  save.double_defense = data.double_defense;
  if (lastKnownDD < data.double_defense) {
    bus.emit(OotOnlineEvents.GAINED_HEART_CONTAINER, data.double_defense);
  }
}

export function mergeQuestSaveData(save: IQuestSave, incoming: IQuestSave) {
  if (incoming.kokiriEmerald) {
    save.kokiriEmerald = true;
  }
  if (incoming.goronRuby) {
    save.goronRuby = true;
  }
  if (incoming.zoraSapphire) {
    save.zoraSapphire = true;
  }
  if (incoming.lightMedallion) {
    save.lightMedallion = true;
  }
  if (incoming.forestMedallion) {
    save.forestMedallion = true;
  }
  if (incoming.fireMedallion) {
    save.fireMedallion = true;
  }
  if (incoming.waterMedallion) {
    save.waterMedallion = true;
  }
  if (incoming.shadowMedallion) {
    save.shadowMedallion = true;
  }
  if (incoming.spiritMedallion) {
    save.spiritMedallion = true;
  }
  if (incoming.zeldasLullaby) {
    save.zeldasLullaby = true;
  }
  if (incoming.eponasSong) {
    save.eponasSong = true;
  }
  if (incoming.sariasSong) {
    save.sariasSong = true;
  }
  if (incoming.sunsSong) {
    save.sunsSong = true;
  }
  if (incoming.songOfTime) {
    save.songOfTime = true;
  }
  if (incoming.preludeOfLight) {
    save.preludeOfLight = true;
  }
  if (incoming.minuetOfForest) {
    save.minuetOfForest = true;
  }
  if (incoming.boleroOfFire) {
    save.boleroOfFire = true;
  }
  if (incoming.serenadeOfWater) {
    save.serenadeOfWater = true;
  }
  if (incoming.nocturneOfShadow) {
    save.nocturneOfShadow = true;
  }
  if (incoming.requiemOfSpirit) {
    save.requiemOfSpirit = true;
  }
  if (incoming.gerudoMembershipCard) {
    save.gerudoMembershipCard = true;
  }
  if (incoming.stoneOfAgony) {
    save.stoneOfAgony = true;
  }
  if (incoming.goldSkulltulas > save.goldSkulltulas) {
    save.goldSkulltulas = incoming.goldSkulltulas;
  }
  if (incoming.displayGoldSkulltulas) {
    save.displayGoldSkulltulas = true;
  }
  if (incoming.songOfStorms > save.songOfStorms) {
    save.songOfStorms = true;
  }
  // No idea if this logic is correct. Needs testing.
  if (incoming.heartPieces > save.heartPieces) {
    save.heartPieces = incoming.heartPieces;
  } else if (incoming.heartPieces === 0 && save.heartPieces === 3) {
    save.heartPieces = 0;
  }
  if (incoming.heart_containers > save.heart_containers) {
    save.heart_containers = incoming.heart_containers;
  }
  if (incoming.magic_meter_size > save.magic_meter_size) {
    save.magic_meter_size = incoming.magic_meter_size;
  }
  if (incoming.double_defense > save.double_defense) {
    save.double_defense = incoming.double_defense;
  }
}

export interface IKeySave {
  index: number;
  count: number;
}

export interface IKeySaveContainer {
  FOREST_TEMPLE: IKeySave;
  FIRE_TEMPLE: IKeySave;
  WATER_TEMPLE: IKeySave;
  SPIRIT_TEMPLE: IKeySave;
  SHADOW_TEMPLE: IKeySave;
  BOTTOM_OF_THE_WELL: IKeySave;
  GERUDO_TRAINING_GROUND: IKeySave;
  GERUDO_FORTRESS: IKeySave;
  GANONS_CASTLE: IKeySave;
}

export class KeySave implements IKeySave {
  index: number;
  count: number;

  constructor(index: number, count: number) {
    this.index = index;
    this.count = count;
  }
}

export class KeySaveContainer implements IKeySaveContainer {
  FOREST_TEMPLE: IKeySave = new KeySave(
    VANILLA_KEY_INDEXES.FOREST_TEMPLE,
    0xff
  );
  FIRE_TEMPLE: IKeySave = new KeySave(VANILLA_KEY_INDEXES.FIRE_TEMPLE, 0xff);
  WATER_TEMPLE: IKeySave = new KeySave(VANILLA_KEY_INDEXES.WATER_TEMPLE, 0xff);
  SPIRIT_TEMPLE: IKeySave = new KeySave(
    VANILLA_KEY_INDEXES.SPIRIT_TEMPLE,
    0xff
  );
  SHADOW_TEMPLE: IKeySave = new KeySave(
    VANILLA_KEY_INDEXES.SHADOW_TEMPLE,
    0xff
  );
  BOTTOM_OF_THE_WELL: IKeySave = new KeySave(
    VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL,
    0xff
  );
  GERUDO_TRAINING_GROUND: IKeySave = new KeySave(
    VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND,
    0xff
  );
  GERUDO_FORTRESS: IKeySave = new KeySave(
    VANILLA_KEY_INDEXES.GERUDO_FORTRESS,
    0xff
  );
  GANONS_CASTLE: IKeySave = new KeySave(
    VANILLA_KEY_INDEXES.GANONS_CASTLE,
    0xff
  );
}

export function createSmallKeyDataFromContext(
  context: ISaveContext
): IKeySaveContainer {
  let m: IKeySaveContainer = new KeySaveContainer();
  m.FOREST_TEMPLE = new KeySave(
    VANILLA_KEY_INDEXES.FOREST_TEMPLE,
    context.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.FOREST_TEMPLE)
  );
  m.FIRE_TEMPLE = new KeySave(
    VANILLA_KEY_INDEXES.FIRE_TEMPLE,
    context.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.FIRE_TEMPLE)
  );
  m.WATER_TEMPLE = new KeySave(
    VANILLA_KEY_INDEXES.WATER_TEMPLE,
    context.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.WATER_TEMPLE)
  );
  m.SPIRIT_TEMPLE = new KeySave(
    VANILLA_KEY_INDEXES.SPIRIT_TEMPLE,
    context.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.SPIRIT_TEMPLE)
  );
  m.SHADOW_TEMPLE = new KeySave(
    VANILLA_KEY_INDEXES.SHADOW_TEMPLE,
    context.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.SHADOW_TEMPLE)
  );
  m.BOTTOM_OF_THE_WELL = new KeySave(
    VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL,
    context.keyManager.getKeyCountForIndex(
      VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL
    )
  );
  m.GERUDO_TRAINING_GROUND = new KeySave(
    VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND,
    context.keyManager.getKeyCountForIndex(
      VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND
    )
  );
  m.GERUDO_FORTRESS = new KeySave(
    VANILLA_KEY_INDEXES.GERUDO_FORTRESS,
    context.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.GERUDO_FORTRESS)
  );
  m.GANONS_CASTLE = new KeySave(
    VANILLA_KEY_INDEXES.GANONS_CASTLE,
    context.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.GANONS_CASTLE)
  );
  return m;
}

export function mergeSmallKeyData(
  storage: IKeySaveContainer,
  incoming: IKeySaveContainer
) {
  storage.FOREST_TEMPLE.count = incoming.FOREST_TEMPLE.count;
  storage.FIRE_TEMPLE.count = incoming.FIRE_TEMPLE.count;
  storage.WATER_TEMPLE.count = incoming.WATER_TEMPLE.count;
  storage.SPIRIT_TEMPLE.count = incoming.SPIRIT_TEMPLE.count;
  storage.SHADOW_TEMPLE.count = incoming.SHADOW_TEMPLE.count;
  storage.BOTTOM_OF_THE_WELL.count = incoming.BOTTOM_OF_THE_WELL.count;
  storage.GERUDO_TRAINING_GROUND.count = incoming.GERUDO_TRAINING_GROUND.count;
  storage.GERUDO_FORTRESS.count = incoming.GERUDO_FORTRESS.count;
  storage.GANONS_CASTLE.count = incoming.GANONS_CASTLE.count;
}

export function applySmallKeyDataToContext(
  incoming: IKeySaveContainer,
  save: ISaveContext
) {
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.FOREST_TEMPLE,
    incoming.FOREST_TEMPLE.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.FIRE_TEMPLE,
    incoming.FIRE_TEMPLE.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.WATER_TEMPLE,
    incoming.WATER_TEMPLE.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.SPIRIT_TEMPLE,
    incoming.SPIRIT_TEMPLE.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.SHADOW_TEMPLE,
    incoming.SHADOW_TEMPLE.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL,
    incoming.BOTTOM_OF_THE_WELL.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND,
    incoming.GERUDO_TRAINING_GROUND.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.GERUDO_FORTRESS,
    incoming.GERUDO_FORTRESS.count
  );
  save.keyManager.setKeyCountByIndex(
    VANILLA_KEY_INDEXES.GANONS_CASTLE,
    incoming.GANONS_CASTLE.count
  );
}
