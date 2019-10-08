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
} from 'modloader64_api/OOT/OOTAPI';
import { bus } from 'modloader64_api/EventHandler';
import { OotOnlineEvents } from '../api/OotoAPI';

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
    save.childTradeItem === InventoryItem.POCKET_EGG
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
  if (save.bulletBag < incoming.bulletBag){
    save.bulletBag = incoming.bulletBag;
  }
  if (save.strength < incoming.strength){
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
  if (!save.inventory.bombchus && data.bombchus){
    save.inventory.bombchuCount = UpgradeCountLookup(InventoryItem.BOMBCHU, AmmoUpgrade.NONE) / 4;
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
  if (data.quiver > save.inventory.quiver){
    save.inventory.arrows = UpgradeCountLookup(InventoryItem.FAIRY_BOW, data.quiver);
  }
  save.inventory.quiver = data.quiver;
  if (data.bombBag > save.inventory.bombBag){
    save.inventory.arrows = UpgradeCountLookup(InventoryItem.BOMB, data.bombBag);
  }
  save.inventory.bombBag = data.bombBag;
  if (data.dekuNutsCapacity > save.inventory.dekuNutsCapacity){
    if (data.dekuNutsCapacity > 1){
      save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, data.dekuNutsCapacity);
    }else{
      if (data.dekuNutsCapacity === 1){
        save.inventory.dekuNutsCount = 5;
      }
    }
  }
  save.inventory.dekuNutsCapacity = data.dekuNutsCapacity;
  if (data.dekuSticksCapacity > save.inventory.dekuSticksCapacity){
    if (data.dekuSticksCapacity > 1){
      save.inventory.dekuSticksCount = UpgradeCountLookup(InventoryItem.DEKU_STICK, data.dekuSticksCapacity);
    }else{
      if (data.dekuSticksCapacity === 1){
        save.inventory.dekuSticksCount = 1;
      }
    }
  }
  save.inventory.dekuSticksCapacity = data.dekuSticksCapacity;
  save.inventory.swimming = data.swimming;
  if (data.bulletBag > save.inventory.bulletBag){
    save.inventory.dekuSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, data.bulletBag);
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
  if (lastKnownHP < data.heartPieces){
    bus.emit(OotOnlineEvents.GAINED_PIECE_OF_HEART, data.heartPieces);
  }
  let lastKnownHC: number = save.heart_containers;
  save.heart_containers = data.heart_containers;
  if (lastKnownHC < data.heart_containers){
    bus.emit(OotOnlineEvents.GAINED_HEART_CONTAINER, data.heart_containers);
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
  // No idea if this logic is correct. Needs testing.
  if (incoming.heartPieces > save.heartPieces) {
    save.heartPieces = incoming.heartPieces;
  } else if (
    incoming.heartPieces === 0 &&
    save.heartPieces === 3
  ) {
    save.heartPieces = 0;
  }
  if (incoming.heart_containers > save.heart_containers) {
    save.heart_containers = incoming.heart_containers;
  }
}
