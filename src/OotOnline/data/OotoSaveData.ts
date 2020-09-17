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
} from 'modloader64_api/OOT/OOTAPI';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents } from '../OotoAPI/OotoAPI';
import { IDungeonItemContainer } from 'modloader64_api/OOT/IDungeonItemContainer';
import { IDungeonItemManager } from 'modloader64_api/OOT/IDungeonItemManager';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ProxySide } from 'modloader64_api/SidedProxy/SidedProxy';
import { OotO_ItemGetMessagePacket } from './OotOPackets';

export function isAdultTradeItem(item: InventoryItem) {
  return (
    item === InventoryItem.POCKET_EGG ||
    item === InventoryItem.COJIRO ||
    item === InventoryItem.ODD_MUSHROOM ||
    item === InventoryItem.ODD_POTION ||
    item === InventoryItem.POACHERS_SAW ||
    item === InventoryItem.BROKEN_GORON_SWORD ||
    item === InventoryItem.PRESCRIPTION ||
    item === InventoryItem.EYEBALL_FROG ||
    item === InventoryItem.EYE_DROPS ||
    item === InventoryItem.CLAIM_CHECK
  );
}

export interface IDungeonItemSave extends IDungeonItemManager { }

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
  ModLoader: IModLoaderAPI,
  storage: IDungeonItemManager,
  incoming: IDungeonItemSave,
  side: ProxySide,
  lobby: string
) {
  if (incoming.DEKU_TREE.bossKey && !storage.DEKU_TREE.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Deku Tree)", lobby, "tile283.png"));
    }
    storage.DEKU_TREE.bossKey = incoming.DEKU_TREE.bossKey;
  }
  if (incoming.DEKU_TREE.compass && !storage.DEKU_TREE.compass) {
    storage.DEKU_TREE.compass = incoming.DEKU_TREE.compass;
  }
  if (incoming.DEKU_TREE.map && !storage.DEKU_TREE.map) {
    storage.DEKU_TREE.map = incoming.DEKU_TREE.map;
  }

  if (incoming.DODONGOS_CAVERN.bossKey && !storage.DODONGOS_CAVERN.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Dodongo's Cavern)", lobby, "tile283.png"));
    }
    storage.DODONGOS_CAVERN.bossKey = incoming.DODONGOS_CAVERN.bossKey;
  }
  if (incoming.DODONGOS_CAVERN.compass && !storage.DODONGOS_CAVERN.compass) {
    storage.DODONGOS_CAVERN.compass = incoming.DODONGOS_CAVERN.compass;
  }
  if (incoming.DODONGOS_CAVERN.map && !storage.DODONGOS_CAVERN.map) {
    storage.DODONGOS_CAVERN.map = incoming.DODONGOS_CAVERN.map;
  }

  if (incoming.JABJ_JABUS_BELLY.bossKey && !storage.JABJ_JABUS_BELLY.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Jabu Jabu's Belly)", lobby, "tile283.png"));
    }
    storage.JABJ_JABUS_BELLY.bossKey = incoming.JABJ_JABUS_BELLY.bossKey;
  }
  if (incoming.JABJ_JABUS_BELLY.compass && !storage.JABJ_JABUS_BELLY.compass) {
    storage.JABJ_JABUS_BELLY.compass = incoming.JABJ_JABUS_BELLY.compass;
  }
  if (incoming.JABJ_JABUS_BELLY.map && !storage.JABJ_JABUS_BELLY.map) {
    storage.JABJ_JABUS_BELLY.map = incoming.JABJ_JABUS_BELLY.map;
  }

  if (incoming.FOREST_TEMPLE.bossKey && !storage.FOREST_TEMPLE.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Forest Temple)", lobby, "tile283.png"));
    }
    storage.FOREST_TEMPLE.bossKey = incoming.FOREST_TEMPLE.bossKey;
  }
  if (incoming.FOREST_TEMPLE.compass && !storage.FOREST_TEMPLE.compass) {
    storage.FOREST_TEMPLE.compass = incoming.FOREST_TEMPLE.compass;
  }
  if (incoming.FOREST_TEMPLE.map && !storage.FOREST_TEMPLE.map) {
    storage.FOREST_TEMPLE.map = incoming.FOREST_TEMPLE.map;
  }

  if (incoming.FIRE_TEMPLE.bossKey && !storage.FIRE_TEMPLE.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Fire Temple)", lobby, "tile283.png"));
    }
    storage.FIRE_TEMPLE.bossKey = incoming.FIRE_TEMPLE.bossKey;
  }
  if (incoming.FIRE_TEMPLE.compass && !storage.FIRE_TEMPLE.compass) {
    storage.FIRE_TEMPLE.compass = incoming.FIRE_TEMPLE.compass;
  }
  if (incoming.FIRE_TEMPLE.map && !storage.FIRE_TEMPLE.map) {
    storage.FIRE_TEMPLE.map = incoming.FIRE_TEMPLE.map;
  }

  if (incoming.WATER_TEMPLE.bossKey && !storage.WATER_TEMPLE.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Water Temple)", lobby, "tile283.png"));
    }
    storage.WATER_TEMPLE.bossKey = incoming.WATER_TEMPLE.bossKey;
  }
  if (incoming.WATER_TEMPLE.compass && !storage.WATER_TEMPLE.compass) {
    storage.WATER_TEMPLE.compass = incoming.WATER_TEMPLE.compass;
  }
  if (incoming.WATER_TEMPLE.map && !storage.WATER_TEMPLE.map) {
    storage.WATER_TEMPLE.map = incoming.WATER_TEMPLE.map;
  }

  if (incoming.SPIRIT_TEMPLE.bossKey && !storage.SPIRIT_TEMPLE.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Spirit Temple)", lobby, "tile283.png"));
    }
    storage.SPIRIT_TEMPLE.bossKey = incoming.SPIRIT_TEMPLE.bossKey;
  }
  if (incoming.SPIRIT_TEMPLE.compass && !storage.SPIRIT_TEMPLE.compass) {
    storage.SPIRIT_TEMPLE.compass = incoming.SPIRIT_TEMPLE.compass;
  }
  if (incoming.SPIRIT_TEMPLE.map && !storage.SPIRIT_TEMPLE.map) {
    storage.SPIRIT_TEMPLE.map = incoming.SPIRIT_TEMPLE.map;
  }

  if (incoming.SHADOW_TEMPLE.bossKey && !storage.SHADOW_TEMPLE.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Shadow Temple)", lobby, "tile283.png"));
    }
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
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Bottom of the Well)", lobby, "tile283.png"));
    }
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
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Ice Cavern)", lobby, "tile283.png"));
    }
    storage.ICE_CAVERN.bossKey = incoming.ICE_CAVERN.bossKey;
  }
  if (incoming.ICE_CAVERN.compass && !storage.ICE_CAVERN.compass) {
    storage.ICE_CAVERN.compass = incoming.ICE_CAVERN.compass;
  }
  if (incoming.ICE_CAVERN.map && !storage.ICE_CAVERN.map) {
    storage.ICE_CAVERN.map = incoming.ICE_CAVERN.map;
  }

  if (incoming.GANONS_CASTLE.bossKey && !storage.GANONS_CASTLE.bossKey) {
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boss Key (Ganon's Castle)", lobby, "tile283.png"));
    }
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

export let SEEN_MASK_OF_TRUTH: boolean = false;
export let FIRST_HEART_CONTAINER_SET: boolean = false;

// As much as I want to pull some Object.keys bullshit here to make writing this less verbose, I don't want any sneaky bugs.
// So, we write it all verbose as hell.
export function mergeInventoryData(
  ModLoader: IModLoaderAPI,
  save: InventorySave,
  incoming: InventorySave,
  side: ProxySide,
  lobby: string
) {
  if (incoming.dekuSticks) {
    if (save.dekuSticks !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Deku Sticks", lobby, "tile081.png"));
    }
    save.dekuSticks = true;
  }
  if (incoming.dekuNuts) {
    if (save.dekuNuts !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Deku Nuts", lobby, "tile080.png"));
    }
    save.dekuNuts = true;
  }
  if (incoming.bombs) {
    if (save.bombs !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Bombs", lobby, "tile085.png"));
    }
    save.bombs = true;
  }
  if (incoming.bombchus) {
    if (save.bombchus !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Bombchus", lobby, "tile086.png"));
    }
    save.bombchus = true;
  }
  if (incoming.magicBeans) {
    if (save.magicBeans !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Magic Beans", lobby, "tile089.png"));
    }
    save.magicBeans = true;
    save.magicBeansCount = incoming.magicBeansCount;
  }
  if (incoming.fairySlingshot) {
    if (save.fairySlingshot !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Fairy Slingshot", lobby, "tile083.png"));
    }
    save.fairySlingshot = true;
  }
  if (incoming.fairyBow) {
    if (save.fairyBow !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Fairy Bow", lobby, "tile120.png"));
    }
    save.fairyBow = true;
  }
  if (incoming.fireArrows) {
    if (save.fireArrows !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Fire Arrows", lobby, "tile122.png"));
    }
    save.fireArrows = true;
  }
  if (incoming.iceArrows) {
    if (save.iceArrows !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Fire Arrows", lobby, "tile123.png"));
    }
    save.iceArrows = true;
  }
  if (incoming.lightArrows) {
    if (save.lightArrows !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Light Arrows", lobby, "tile124.png"));
    }
    save.lightArrows = true;
  }
  if (incoming.dinsFire) {
    if (save.dinsFire !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Din's Fire", lobby, "tile260.png"));
    }
    save.dinsFire = true;
  }
  if (incoming.faroresWind) {
    if (save.faroresWind !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Farore's Wind", lobby, "tile261.png"));
    }
    save.faroresWind = true;
  }
  if (incoming.nayrusLove) {
    if (save.nayrusLove !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Nayru's Love", lobby, "tile262.png"));
    }
    save.nayrusLove = true;
  }
  if (incoming.ocarina > save.ocarina) {
    save.ocarina = incoming.ocarina;
    if (true && side === ProxySide.SERVER) {
      let icon: string = "tile100.png";
      switch (save.ocarina) {
        case Ocarina.FAIRY_OCARINA:
          icon = "tile100.png";
          break;
        case Ocarina.OCARINA_OF_TIME:
          icon = "tile101.png";
          break;
      }
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained an Ocarina", lobby, icon));
    }
  }
  if (incoming.hookshot > save.hookshot) {
    save.hookshot = incoming.hookshot;
    if (true && side === ProxySide.SERVER) {
      let icon: string = "tile090.png";
      let text: string = "Hookshot";
      switch (save.hookshot) {
        case Hookshot.HOOKSHOT:
          icon = "tile090.png";
          text = "Hookshot";
          break;
        case Hookshot.LONGSHOT:
          icon = "tile091.png";
          text = "Longshot"
          break;
      }
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the " + text, lobby, icon));
    }
  }
  if (incoming.boomerang) {
    if (save.boomerang !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Boomerang", lobby, "tile087.png"));
    }
    save.boomerang = true;
  }
  if (incoming.lensOfTruth) {
    if (save.lensOfTruth !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Lens of Truth", lobby, "tile088.png"));
    }
    save.lensOfTruth = true;
  }
  if (incoming.megatonHammer) {
    if (save.megatonHammer !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Megaton Hammer", lobby, "tile092.png"));
    }
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

  if (save.childTradeItem === InventoryItem.DEKU_STICK) {
    // I don't understand why this is necessary, but Deku Sticks will not stop getting into this slot for some reason.
    save.childTradeItem = InventoryItem.NONE;
  }

  // Desync the mask slot if we finished the quest.
  if (incoming.childTradeItem !== InventoryItem.SOLD_OUT && !SEEN_MASK_OF_TRUTH) {
    if (
      incoming.childTradeItem > save.childTradeItem &&
      save.childTradeItem <= InventoryItem.MASK_OF_TRUTH
    ) {
      // TODO: notifications
      save.childTradeItem = incoming.childTradeItem;
      if (save.childTradeItem === InventoryItem.MASK_OF_TRUTH) {
        SEEN_MASK_OF_TRUTH = true;
      }
    }
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

  if (save.adultTradeItem === InventoryItem.DEKU_STICK) {
    // I don't understand why this is necessary, but Deku Sticks will not stop getting into this slot for some reason.
    save.adultTradeItem = InventoryItem.NONE;
  }

  if (incoming.adultTradeItem > save.adultTradeItem) {
    if (isAdultTradeItem(incoming.adultTradeItem)) {
      // TODO: notifications
      save.adultTradeItem = incoming.adultTradeItem;
    }
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
  // TODO: Bottle notifs
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
    if (true && side === ProxySide.SERVER) {
      let icon: string = "tile300.png";
      switch (save.swimming) {
        case ZoraScale.SILVER:
          icon = "tile300.png";
          break;
        case ZoraScale.GOLDEN:
          icon = "tile301.png";
          break;
      }
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained a Swimming Upgrade", lobby, icon));
    }
  }
  if (save.bulletBag < incoming.bulletBag) {
    save.bulletBag = incoming.bulletBag;
  }
  if (save.strength < incoming.strength) {
    save.strength = incoming.strength;
    if (true && side === ProxySide.SERVER) {
      let icon: string = "tile302.png";
      switch (save.strength) {
        case Strength.GORON_BRACELET:
          icon = "tile302.png";
          break;
        case Strength.SILVER_GAUNTLETS:
          icon = "tile303.png";
          break;
        case Strength.GOLDEN_GAUNTLETS:
          icon = "tile304.png";
          break;
      }
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained a Strength Upgrade", lobby, icon));
    }
  }
}

export function createInventoryFromContext(save: ISaveContext): InventorySave {
  let data = new InventorySave();
  data.dekuSticks = save.inventory.dekuSticks;
  data.dekuNuts = save.inventory.dekuNuts;
  data.bombs = save.inventory.bombs;
  data.bombchus = save.inventory.bombchus;
  data.magicBeans = save.inventory.magicBeans;
  data.magicBeansCount = save.inventory.magicBeansCount;
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
  data: InventorySave,
  save: ISaveContext,
  overrideBottles = false
) {
  save.inventory.dekuSticks = data.dekuSticks;
  save.inventory.dekuNuts = data.dekuNuts;
  save.inventory.bombs = data.bombs;
  if (!save.inventory.bombchus && data.bombchus) {
    global.ModLoader['fuckyouBombchu'] = setInterval(() => {
      if (save.inventory.bombchuCount > 0) {
        clearInterval(global.ModLoader['fuckyouBombchu']);
      }
      save.inventory.bombchuCount = UpgradeCountLookup(
        InventoryItem.BOMBCHU,
        AmmoUpgrade.BASE
      );
    }, 1);
  }
  save.inventory.bombchus = data.bombchus;
  save.inventory.magicBeans = data.magicBeans;
  save.inventory.magicBeansCount = data.magicBeansCount;
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
  if (overrideBottles) {
    save.inventory.bottle_1 = data.bottle_1;
    save.inventory.bottle_2 = data.bottle_2;
    save.inventory.bottle_3 = data.bottle_3;
    save.inventory.bottle_4 = data.bottle_4;
  }
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
  magicBeansCount = 0;
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
  ModLoader: IModLoaderAPI,
  save: IEquipmentSave,
  incoming: IEquipmentSave,
  side: ProxySide,
  lobby: string
) {
  // Swords
  if (incoming.kokiriSword) {
    if (save.kokiriSword !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Kokiri Sword.", lobby, "tile060.png"));
    }
    save.kokiriSword = true;
  }
  if (incoming.masterSword) {
    if (save.masterSword !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Master Sword.", lobby, "tile061.png"));
    }
    save.masterSword = true;
  }
  if (incoming.giantKnife) {
    if (save.giantKnife !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Giant's Knife", lobby, "tile062.png"));
    }
    save.giantKnife = true;
  }
  if (incoming.biggoronSword) {
    if (save.biggoronSword !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Biggoron's Sword", lobby, "tile062.png"));
    }
    save.biggoronSword = true;
  }
  // Shields
  if (incoming.dekuShield) {
    if (save.dekuShield !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Deku Shield", lobby, "tile020.png"));
    }
    save.dekuShield = true;
  }
  if (incoming.hylianShield) {
    if (save.hylianShield !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Hylian Shield", lobby, "tile021.png"));
    }
    save.hylianShield = true;
  }
  if (incoming.mirrorShield) {
    if (save.mirrorShield !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Mirror Shield", lobby, "tile022.png"));
    }
    save.mirrorShield = true;
  }
  // Tunics
  if (incoming.kokiriTunic) {
    /*     if (save.kokiriTunic !== true && side === ProxySide.SERVER){
          ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Kokiri Tunic", lobby));
        } */
    save.kokiriTunic = true;
  }
  if (incoming.goronTunic) {
    if (save.goronTunic !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Goron Tunic", lobby, "tile001.png"));
    }
    save.goronTunic = true;
  }
  if (incoming.zoraTunic) {
    if (save.zoraTunic !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Zora Tunic", lobby, "tile002.png"));
    }
    save.zoraTunic = true;
  }
  // Boots
  if (incoming.kokiriBoots) {
    /*     if (save.kokiriBoots !== true && side === ProxySide.SERVER){
          ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Kokiri Boots", lobby));
        } */
    save.kokiriBoots = true;
  }
  if (incoming.ironBoots) {
    if (save.ironBoots !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Iron Boots", lobby, "tile041.png"));
    }
    save.ironBoots = true;
  }
  if (incoming.hoverBoots) {
    if (save.hoverBoots !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Hover Boots", lobby, "tile042.png"));
    }
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
export interface IEquipmentSave extends ISwords, IShields, ITunics, IBoots { }

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

export function mergeQuestSaveData(ModLoader: IModLoaderAPI, save: IQuestSave, incoming: IQuestSave, side: ProxySide, lobby: string) {
  if (incoming.kokiriEmerald) {
    if (save.kokiriEmerald !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Kokiri Emerald", lobby, "tile160.png"));
    }
    save.kokiriEmerald = true;
  }
  if (incoming.goronRuby) {
    if (save.goronRuby !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Goron Ruby", lobby, "tile161.png"));
    }
    save.goronRuby = true;
  }
  if (incoming.zoraSapphire) {
    if (save.zoraSapphire !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Zora's Sapphire", lobby, "tile162.png"));
    }
    save.zoraSapphire = true;
  }
  if (incoming.lightMedallion) {
    if (save.lightMedallion !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Light Medallion", lobby, "tile163.png"));
    }
    save.lightMedallion = true;
  }
  if (incoming.forestMedallion) {
    if (save.forestMedallion !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Forest Medallion", lobby, "tile164.png"));
    }
    save.forestMedallion = true;
  }
  if (incoming.fireMedallion) {
    if (save.fireMedallion !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Fire Medallion", lobby, "tile165.png"));
    }
    save.fireMedallion = true;
  }
  if (incoming.waterMedallion) {
    if (save.waterMedallion !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Water Medallion", lobby, "tile166.png"));
    }
    save.waterMedallion = true;
  }
  if (incoming.shadowMedallion) {
    if (save.shadowMedallion !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Shadow Medallion", lobby, "tile167.png"));
    }
    save.shadowMedallion = true;
  }
  if (incoming.spiritMedallion) {
    if (save.spiritMedallion !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Spirit Medallion", lobby, "tile168.png"));
    }
    save.spiritMedallion = true;
  }
  if (incoming.zeldasLullaby) {
    if (save.zeldasLullaby !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Zelda's Lullaby", lobby, "tile146.png"));
    }
    save.zeldasLullaby = true;
  }
  if (incoming.eponasSong) {
    if (save.eponasSong !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Epona's Song", lobby, "tile146.png"));
    }
    save.eponasSong = true;
  }
  if (incoming.sariasSong) {
    if (save.sariasSong !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Saria's Song", lobby, "tile146.png"));
    }
    save.sariasSong = true;
  }
  if (incoming.sunsSong) {
    if (save.sariasSong !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Sun's Song", lobby, "tile146.png"));
    }
    save.sunsSong = true;
  }
  if (incoming.songOfTime) {
    if (save.sariasSong !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Song of Time", lobby, "tile146.png"));
    }
    save.songOfTime = true;
  }
  if (incoming.preludeOfLight) {
    if (save.sariasSong !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Plelude of Light", lobby, "tile140.png"));
    }
    save.preludeOfLight = true;
  }
  if (incoming.minuetOfForest) {
    if (save.minuetOfForest !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Minuet of Forest", lobby, "tile141.png"));
    }
    save.minuetOfForest = true;
  }
  if (incoming.boleroOfFire) {
    if (save.boleroOfFire !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Bolero of Fire", lobby, "tile142.png"));
    }
    save.boleroOfFire = true;
  }
  if (incoming.serenadeOfWater) {
    if (save.serenadeOfWater !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Serenade of Water", lobby, "tile143.png"));
    }
    save.serenadeOfWater = true;
  }
  if (incoming.nocturneOfShadow) {
    if (save.nocturneOfShadow !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Nocturne of Shadow", lobby, "tile145.png"));
    }
    save.nocturneOfShadow = true;
  }
  if (incoming.requiemOfSpirit) {
    if (save.requiemOfSpirit !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Requiem of Spirit", lobby, "tile144.png"));
    }
    save.requiemOfSpirit = true;
  }
  if (incoming.gerudoMembershipCard) {
    if (save.gerudoMembershipCard !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Gerudo Card", lobby, "tile104.png"));
    }
    save.gerudoMembershipCard = true;
  }
  if (incoming.stoneOfAgony) {
    if (save.gerudoMembershipCard !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Stone of Agony", lobby, "tile268.png"));
    }
    save.stoneOfAgony = true;
  }
  if (incoming.goldSkulltulas > save.goldSkulltulas) {
    save.goldSkulltulas = incoming.goldSkulltulas;
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained a Golden Skulltula Token (" + save.goldSkulltulas + ")", lobby, "tile420.png"));
    }
  }
  if (incoming.displayGoldSkulltulas) {
    save.displayGoldSkulltulas = true;
  }
  if (incoming.songOfStorms > save.songOfStorms) {
    if (save.songOfStorms !== true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained song Song of Storms", lobby, "tile146.png"));
    }
    save.songOfStorms = true;
  }
  if (incoming.heartPieces > save.heartPieces) {
    save.heartPieces = incoming.heartPieces;
    if (true && side === ProxySide.SERVER) {
      let icon: string = "tile265_1.png";
      switch (save.heartPieces) {
        case 0:
          icon = "tile265_0.png";
          break;
        case 1:
          icon = "tile265_1.png";
          break;
        case 2:
          icon = "tile265_2.png";
          break;
        case 3:
          icon = "tile265_3.png";
          break;
      }
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained a Piece of Heart (" + save.heartPieces + ")", lobby, icon));
    }
  } else if (incoming.heartPieces === 0 && save.heartPieces >= 3) {
    save.heartPieces = 0;
  }
  if (incoming.heart_containers > save.heart_containers) {
    save.heart_containers = incoming.heart_containers;
    if (FIRST_HEART_CONTAINER_SET && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained a Heart Container (" + save.heart_containers + ")", lobby, "tile266.png"));
    }
    FIRST_HEART_CONTAINER_SET = true;
  }
  if (incoming.magic_meter_size > save.magic_meter_size) {
    save.magic_meter_size = incoming.magic_meter_size;
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained the Magic Meter (" + save.magic_meter_size + ")", lobby, "tile263.png"));
    }
  }
  if (incoming.double_defense > save.double_defense) {
    save.double_defense = incoming.double_defense;
    if (true && side === ProxySide.SERVER) {
      ModLoader.serverSide.sendPacket(new OotO_ItemGetMessagePacket("You obtained Double Defense", lobby, "tile265_0.png"));
    }
  }
}

export class OotO_SceneStruct {
  buf: Buffer;

  constructor(buf: Buffer) {
    this.buf = buf;
  }

  get chests(): Buffer {
    return this.buf.slice(0x0, 0x4);
  }

  get switches(): Buffer {
    return this.buf.slice(0x4, 0x8);
  }

  get room_clear(): Buffer {
    return this.buf.slice(0x8, 0xC);
  }

  get collectible(): Buffer {
    return this.buf.slice(0xC, 0x10);
  }

  get unused(): Buffer {
    return this.buf.slice(0x10, 0x14);
  }

  get visited_rooms(): Buffer {
    return this.buf.slice(0x14, 0x18);
  }

  get visited_floors(): Buffer {
    return this.buf.slice(0x18, 0x1C);
  }
}

export function generateSaveChecksum(ModLoader: IModLoaderAPI): string {
  let context: Buffer = ModLoader.emulator.rdramReadBuffer(0x8011A5D0, 0x1352);
  // We need to ignore certain fields.
  // Entrance Index
  context.writeUInt32BE(0x0, 0x0000);
  // Age Modifier
  context.writeUInt32BE(0x0, 0x0004);
  // Cutscene Number
  context.writeUInt16BE(0x0, 0x000A);
  // World Time
  context.writeUInt16BE(0x0, 0x000C);
  // Night Flag
  context.writeUInt32BE(0x0, 0x00010);
  // Death Counter
  context.writeUInt16BE(0x0, 0x0022);
  // Player Name
  Buffer.alloc(0x8).copy(context, 0x0024);
  // Health
  context.writeUInt16BE(context.readUInt16BE(0x002E), 0x00030);
  // Current magic amount
  context.writeUInt8(context.readUInt8(0x0032), 0x0033);
  // Rupees
  context.writeUInt16BE(0x0, 0x0034);
  // Navi Timer
  context.writeUInt16BE(0x0, 0x0038);
  // Saved Scene Index
  context.writeUInt16BE(0x0, 0x0066);
  // Current button equips
  Buffer.alloc(0x7).copy(context, 0x0068);
  // Item amounts
  Buffer.alloc(0xF).copy(context, 0x008C);
  // FW
  Buffer.alloc(0x70).copy(context, 0x0E64);
  context.writeUInt16BE(0x0, 0x1352);
  let hash: string = ModLoader.utils.hashBuffer(context);
  return hash;
}