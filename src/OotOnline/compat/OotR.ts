import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { zeldaString } from 'modloader64_api/OOT/ZeldaString';
import { AmmoUpgrade, Hookshot, InventoryItem, IOOTCore, Magic, MagicQuantities, Ocarina, Strength, UpgradeCountLookup, VANILLA_DUNGEON_ITEM_INDEXES, VANILLA_KEY_INDEXES, Wallet, ZoraScale } from "modloader64_api/OOT/OOTAPI";
import { IOOTSaveContext } from "@OotOnline/common/types/OotAliases";
import { Z64OnlineEvents, Z64_PlayerScene } from "@OotOnline/Z64API/OotoAPI";
import { bus, EventHandler } from "modloader64_api/EventHandler";
import { Packet } from "modloader64_api/ModLoaderDefaultImpls";
import { ModLoaderAPIInject } from "modloader64_api/ModLoaderAPIInjector";
import { NetworkHandler } from "modloader64_api/NetworkHandler";
import { IZ64OnlineHelpers } from "@OotOnline/data/InternalAPI";
import { ParentReference } from "modloader64_api/SidedProxy/SidedProxy";
import { InjectCore } from "modloader64_api/CoreInjection";

export class MultiWorld_ItemPacket extends Packet {

    item: MultiworldItem;

    constructor(lobby: string, item: MultiworldItem) {
        super('MultiWorld_ItemPacket', 'Multiworld', lobby, true);
        this.item = item;
    }
}

export class Multiworld {
    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI
    @ParentReference()
    parent!: IZ64OnlineHelpers;
    @InjectCore()
    core!: IOOTCore;
    contextPointer: number = 0x801C8464;

    @NetworkHandler('MultiWorld_ItemPacket')
    onIncomingItem(packet: MultiWorld_ItemPacket) {
        if (this.parent.getClientStorage()!.world === packet.item.dest) {
            this.setPlayerName(packet.player.nickname, packet.player.data.world);
            this.processIncomingItem(packet.item, this.core.save);
        }
    }

    @EventHandler(Z64OnlineEvents.CLIENT_REMOTE_PLAYER_CHANGED_SCENES)
    onPlayerChangedScenes(change: Z64_PlayerScene) {
        if (!TriforceHuntHelper.isRandomizer) return;
        this.setPlayerName(change.player.nickname, change.player.data.world);
    }

    isRomMultiworld() {
        return this.ModLoader.emulator.rdramRead32(this.contextPointer) > 0;
    }

    setPlayerName(playerName: string, playerNumber: number) {
        let player_names_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 20;
        playerName = playerName.substr(0, 8).padEnd(8, " ");
        var offset = player_names_addr + (8 * playerNumber);
        this.ModLoader.emulator.rdramWriteBuffer(offset, zeldaString.encode(playerName));
    }

    doesPlayerNameExist(playerNumber: number) {
        let player_names_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 20;
        var offset = player_names_addr + (8 * playerNumber);
        return this.ModLoader.emulator.rdramRead8(offset) !== 0xDF;
    }

    getOutgoingItem(): MultiworldItem | undefined {
        let outgoing_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 16;
        let outgoing_player_addr = this.ModLoader.emulator.rdramReadPtr32(this.contextPointer, 0) + 18;
        let id = this.ModLoader.emulator.rdramRead16(outgoing_addr);
        if (id > 0) {
            let player = this.ModLoader.emulator.rdramRead16(outgoing_player_addr);
            this.ModLoader.emulator.rdramWrite16(outgoing_addr, 0);
            this.ModLoader.emulator.rdramWrite16(outgoing_player_addr, 0);
            return new MultiworldItem(id, player);
        }
        return undefined;
    }

    addAmmo(current: number, toAdd: number, max: number) {
        if (current + toAdd <= max) {
            current += toAdd;
        } else {
            current = max;
        }
        return current;
    }

    progressiveUpgrade(has: boolean, current: AmmoUpgrade) {
        if (!has) return current;
        if (current < AmmoUpgrade.MAX) {
            current++;
        }
        return current;
    }

    progressiveUpgrade2(field: number, incr: number, max: number) {
        if (field + incr > max) {
            this.giveRupees(5);
        } else {
            field += incr;
        }
        return field;
    }

    giveRupees(amt: number) {
        this.ModLoader.emulator.rdramWrite16(0x8011B99C, amt);
    }

    giveBottle(save: IOOTSaveContext, item: InventoryItem) {
        if (save.inventory.bottle_1 === InventoryItem.NONE) {
            save.inventory.bottle_1 = item;
        } else if (save.inventory.bottle_2 === InventoryItem.NONE) {
            save.inventory.bottle_2 = item;
        } else if (save.inventory.bottle_3 === InventoryItem.NONE) {
            save.inventory.bottle_3 = item;
        } else if (save.inventory.bottle_4 === InventoryItem.NONE) {
            save.inventory.bottle_4 = item;
        }
    }

    processIncomingItem(item: MultiworldItem, save: IOOTSaveContext) {
        let maxBombs = UpgradeCountLookup(InventoryItem.BOMB, save.inventory.bombBag);
        let maxNuts = UpgradeCountLookup(InventoryItem.DEKU_NUT, save.inventory.dekuNutsCapacity);
        let maxChus = UpgradeCountLookup(InventoryItem.BOMBCHU, AmmoUpgrade.BASE);
        let maxSticks = UpgradeCountLookup(InventoryItem.DEKU_STICK, save.inventory.dekuSticksCapacity);
        let maxSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, save.inventory.bulletBag);
        let maxArrows = UpgradeCountLookup(InventoryItem.FAIRY_BOW, save.inventory.quiver);
        switch (item.item) {
            case GetItemIDs.GI_NONE:
                break;
            case GetItemIDs.GI_BOMBS_5:
                save.inventory.bombsCount = this.addAmmo(save.inventory.bombsCount, 5, maxBombs);
                break;
            case GetItemIDs.GI_NUTS_5:
                save.inventory.dekuNutsCount = this.addAmmo(save.inventory.dekuNutsCount, 5, maxNuts);
                break;
            case GetItemIDs.GI_BOMBCHUS_10:
                save.inventory.bombchuCount = this.addAmmo(save.inventory.bombchuCount, 10, maxChus);
                break;
            case GetItemIDs.GI_BOW:
                save.inventory.fairyBow = true;
                save.inventory.quiver = this.progressiveUpgrade(save.inventory.fairyBow, save.inventory.quiver);
                break;
            case GetItemIDs.GI_SLINGSHOT:
                save.inventory.fairySlingshot = true;
                save.inventory.bulletBag = this.progressiveUpgrade(save.inventory.fairySlingshot, save.inventory.bulletBag);
                break;
            case GetItemIDs.GI_BOOMERANG:
                save.inventory.boomerang = true;
                break;
            case GetItemIDs.GI_STICKS_1:
                if (save.inventory.dekuSticksCapacity === AmmoUpgrade.NONE) {
                    save.inventory.dekuSticksCapacity = AmmoUpgrade.BASE;
                    maxSticks = UpgradeCountLookup(InventoryItem.DEKU_STICK, save.inventory.dekuSticksCapacity);
                }
                save.inventory.dekuSticksCount = this.addAmmo(save.inventory.dekuSticksCount, 1, maxSticks);
                break;
            case GetItemIDs.GI_HOOKSHOT:
                save.inventory.hookshot = Hookshot.HOOKSHOT;
                break;
            case GetItemIDs.GI_LONGSHOT:
                save.inventory.hookshot = Hookshot.LONGSHOT;
                break;
            case GetItemIDs.GI_LENS:
                save.inventory.lensOfTruth = true;
                break;
            case GetItemIDs.GI_LETTER_ZELDA:
                save.inventory.childTradeItem = InventoryItem.ZELDAS_LETTER;
                break;
            case GetItemIDs.GI_OCARINA_OOT:
                save.inventory.ocarina = Ocarina.OCARINA_OF_TIME;
                break;
            case GetItemIDs.GI_HAMMER:
                save.inventory.megatonHammer = true;
                break;
            case GetItemIDs.GI_COJIRO:
                save.inventory.adultTradeItem = InventoryItem.COJIRO;
                break;
            case GetItemIDs.GI_BOTTLE:
                this.giveBottle(save, InventoryItem.EMPTY_BOTTLE);
                break;
            // All the bottles have duplicates like this. What is the purpose?
            case GetItemIDs.GI_POTION_RED:
            case GetItemIDs.GI_BOTTLE_WITH_RED_POTION:
            case GetItemIDs.GI_POTION_RED:
                this.giveBottle(save, InventoryItem.RED_POTION);
                break;
            case GetItemIDs.GI_POTION_GREEN:
            case GetItemIDs.GI_BOTTLE_WITH_GREEN_POTION:
            case GetItemIDs.GI_POTION_GREEN:
                this.giveBottle(save, InventoryItem.GREEN_POTION);
                break;
            case GetItemIDs.GI_POTION_BLUE:
            case GetItemIDs.GI_BOTTLE_WITH_BLUE_POTION:
            case GetItemIDs.GI_POTION_BLUE:
                this.giveBottle(save, InventoryItem.BLUE_POTION);
                break;
            case GetItemIDs.GI_FAIRY:
            case GetItemIDs.GI_BOTTLE_WITH_FAIRY:
            case GetItemIDs.GI_FAIRY:
                this.giveBottle(save, InventoryItem.BOTTLED_FAIRY);
                break;
            case GetItemIDs.GI_MILK_BOTTLE:
            case GetItemIDs.GI_MILK:
                this.giveBottle(save, InventoryItem.LON_LON_MILK);
                break;
            case GetItemIDs.GI_LETTER_RUTO:
            case GetItemIDs.GI_REDUNDANT_LETTER_BOTTLE:
                this.giveBottle(save, InventoryItem.RUTOS_LETTER);
                break;
            case GetItemIDs.GI_BEAN:
                save.inventory.magicBeans = true;
                save.inventory.magicBeansCount++;
                break;
            case GetItemIDs.GI_MASK_SKULL:
                save.inventory.childTradeItem = InventoryItem.SKULL_MASK;
                break;
            case GetItemIDs.GI_MASK_SPOOKY:
                save.inventory.childTradeItem = InventoryItem.SPOOKY_MASK;
                break;
            case GetItemIDs.GI_CHICKEN:
                save.inventory.childTradeItem = InventoryItem.CHILD_CUCCO;
                break;
            case GetItemIDs.GI_MASK_KEATON:
                save.inventory.childTradeItem = InventoryItem.KEATON_MASK;
                break;
            case GetItemIDs.GI_MASK_BUNNY:
                save.inventory.childTradeItem = InventoryItem.BUNNY_HOOD;
                break;
            case GetItemIDs.GI_MASK_TRUTH:
                save.inventory.childTradeItem = InventoryItem.MASK_OF_TRUTH;
                break;
            case GetItemIDs.GI_POCKET_EGG:
                save.inventory.adultTradeItem = InventoryItem.POCKET_EGG;
                break;
            case GetItemIDs.GI_POCKET_CUCCO:
                save.inventory.adultTradeItem = InventoryItem.POCKET_CUCCO;
                break;
            case GetItemIDs.GI_ODD_MUSHROOM:
                save.inventory.adultTradeItem = InventoryItem.ODD_MUSHROOM;
                break;
            case GetItemIDs.GI_ODD_POTION:
                save.inventory.adultTradeItem = InventoryItem.ODD_POTION;
                break;
            case GetItemIDs.GI_SAW:
                save.inventory.adultTradeItem = InventoryItem.POACHERS_SAW;
                break;
            case GetItemIDs.GI_SWORD_BROKEN:
                save.inventory.adultTradeItem = InventoryItem.BROKEN_GORON_SWORD;
                break;
            case GetItemIDs.GI_PRESCRIPTION:
                save.inventory.adultTradeItem = InventoryItem.PRESCRIPTION;
                break;
            case GetItemIDs.GI_FROG:
                save.inventory.adultTradeItem = InventoryItem.EYEBALL_FROG;
                break;
            case GetItemIDs.GI_EYEDROPS:
                save.inventory.adultTradeItem = InventoryItem.EYE_DROPS;
                break;
            case GetItemIDs.GI_CLAIM_CHECK:
                save.inventory.adultTradeItem = InventoryItem.CLAIM_CHECK;
                break;
            case GetItemIDs.GI_SWORD_KOKIRI:
                save.swords.kokiriSword = true;
                break;
            case GetItemIDs.GI_SWORD_KNIFE:
                save.swords.giantKnife = true;
                break;
            case GetItemIDs.GI_SHIELD_DEKU:
                if (save.shields.dekuShield) {
                    this.giveRupees(5);
                } else {
                    save.shields.dekuShield = true;
                }
                break;
            case GetItemIDs.GI_SHIELD_HYLIAN:
                if (save.shields.hylianShield) {
                    this.giveRupees(5);
                } else {
                    save.shields.hylianShield = true;
                }
                break;
            case GetItemIDs.GI_SHIELD_MIRROR:
                save.shields.mirrorShield = true;
                break;
            case GetItemIDs.GI_TUNIC_GORON:
                if (save.tunics.goronTunic) {
                    this.giveRupees(5);
                } else {
                    save.tunics.goronTunic = true;
                }
                break;
            case GetItemIDs.GI_TUNIC_ZORA:
                if (save.tunics.zoraTunic) {
                    this.giveRupees(5);
                } else {
                    save.tunics.zoraTunic = true;
                }
                break;
            case GetItemIDs.GI_BOOTS_IRON:
                save.boots.ironBoots = true;
                break;
            case GetItemIDs.GI_BOOTS_HOVER:
                save.boots.hoverBoots = true;
                break;
            case GetItemIDs.GI_QUIVER_40:
                save.inventory.quiver = AmmoUpgrade.UPGRADED;
                save.inventory.arrows = UpgradeCountLookup(InventoryItem.FAIRY_BOW, save.inventory.quiver);
                break;
            case GetItemIDs.GI_QUIVER_50:
                save.inventory.quiver = AmmoUpgrade.MAX;
                save.inventory.arrows = UpgradeCountLookup(InventoryItem.FAIRY_BOW, save.inventory.quiver);
                break;
            case GetItemIDs.GI_BOMB_BAG_20:
                save.inventory.bombBag = AmmoUpgrade.BASE;
                save.inventory.bombsCount = UpgradeCountLookup(InventoryItem.BOMB, save.inventory.bombBag);
                break;
            case GetItemIDs.GI_BOMB_BAG_30:
                save.inventory.bombBag = AmmoUpgrade.UPGRADED;
                save.inventory.bombsCount = UpgradeCountLookup(InventoryItem.BOMB, save.inventory.bombBag);
                break;
            case GetItemIDs.GI_BOMB_BAG_40:
                save.inventory.bombBag = AmmoUpgrade.MAX;
                save.inventory.bombsCount = UpgradeCountLookup(InventoryItem.BOMB, save.inventory.bombBag);
                break;
            case GetItemIDs.GI_GAUNTLETS_SILVER:
                save.inventory.strength = Strength.SILVER_GAUNTLETS;
                break;
            case GetItemIDs.GI_GAUNTLETS_GOLD:
                save.inventory.strength = Strength.GOLDEN_GAUNTLETS;
                break;
            case GetItemIDs.GI_SCALE_SILVER:
                save.inventory.swimming = ZoraScale.SILVER;
                break;
            case GetItemIDs.GI_SCALE_GOLD:
                save.inventory.swimming = ZoraScale.GOLDEN;
                break;
            case GetItemIDs.GI_STONE_OF_AGONY:
                save.questStatus.stoneOfAgony = true;
                break;
            case GetItemIDs.GI_GERUDO_CARD:
                save.questStatus.gerudoMembershipCard = true;
                break;
            case GetItemIDs.GI_OCARINA_FAIRY:
                save.inventory.ocarina = Ocarina.FAIRY_OCARINA;
                break;
            case GetItemIDs.GI_SEEDS_5:
                if (save.inventory.dekuSeeds + 5 < maxSeeds) {
                    save.inventory.dekuSeeds += 5;
                } else {
                    save.inventory.dekuSeeds = maxSeeds;
                }
                break;
            // Heart container 2??
            case GetItemIDs.GI_HEART_CONTAINER:
            case GetItemIDs.GI_HEART_CONTAINER_2:
                save.heart_containers++;
                bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
                break;
            case GetItemIDs.GI_HEART_PIECE:
            case GetItemIDs.GI_HEART_PIECE_WIN:
                if (save.questStatus.heartPieces + 1 === 4) {
                    save.heart_containers++;
                    bus.emit(Z64OnlineEvents.GAINED_PIECE_OF_HEART, {});
                    save.questStatus.heartPieces = 0;
                } else {
                    save.questStatus.heartPieces++;
                }
                break;
            // I don't think MW uses these.
            case GetItemIDs.GI_KEY_BOSS:
            case GetItemIDs.GI_COMPASS:
            case GetItemIDs.GI_MAP:
            case GetItemIDs.GI_KEY_SMALL:
            case GetItemIDs.GI_DOOR_KEY:
                break;
            case GetItemIDs.GI_MAGIC_SMALL:
                if (save.magic_current + MagicQuantities.NORMAL > MagicQuantities.NORMAL) {
                    save.magic_current += MagicQuantities.NORMAL;
                } else {
                    save.magic_current = MagicQuantities.NORMAL;
                }
                break;
            case GetItemIDs.GI_MAGIC_LARGE:
                if (save.magic_current + MagicQuantities.EXTENDED > MagicQuantities.EXTENDED) {
                    save.magic_current += MagicQuantities.EXTENDED;
                } else {
                    save.magic_current = MagicQuantities.EXTENDED;
                }
                break;
            case GetItemIDs.GI_WALLET_ADULT:
                save.inventory.wallet = Wallet.ADULT;
                break;
            case GetItemIDs.GI_WALLET_GIANT:
                save.inventory.wallet = Wallet.GIANT;
                break;
            case GetItemIDs.GI_WEIRD_EGG:
                save.inventory.childTradeItem = InventoryItem.WEIRD_EGG;
                break;
            case GetItemIDs.GI_HEART:
                if (save.health + 0x10 < (save.heart_containers * 0x10)) {
                    save.health += 0x10;
                } else {
                    save.health = (save.heart_containers * 0x10);
                }
                break;
            // Pulling numbers out of my ass for these.
            case GetItemIDs.GI_ARROWS_SMALL:
                save.inventory.arrows = this.addAmmo(save.inventory.arrows, 5, maxArrows);
                break;
            case GetItemIDs.GI_ARROWS_MEDIUM:
                save.inventory.arrows = this.addAmmo(save.inventory.arrows, 10, maxArrows);
                break;
            case GetItemIDs.GI_ARROWS_LARGE:
                save.inventory.arrows = this.addAmmo(save.inventory.arrows, 20, maxArrows);
                break;
            // Seed validated.
            case GetItemIDs.GI_RUPEE_GREEN:
            case GetItemIDs.GI_RUPEE_GREEN_LOSE:
                this.giveRupees(1);
                break;
            case GetItemIDs.GI_RUPEE_BLUE_LOSE:
            case GetItemIDs.GI_RUPEE_BLUE:
                this.giveRupees(5);
                break;
            case GetItemIDs.GI_RUPEE_RED:
            case GetItemIDs.GI_RUPEE_RED_LOSE:
                this.giveRupees(20);
                break;
            case GetItemIDs.GI_MASK_GORON:
                save.inventory.childTradeItem = InventoryItem.GORON_MASK;
                break;
            case GetItemIDs.GI_MASK_ZORA:
                save.inventory.childTradeItem = InventoryItem.ZORA_MASK;
                break;
            case GetItemIDs.GI_MASK_GERUDO:
                save.inventory.childTradeItem = InventoryItem.GERUDO_MASK;
                break;
            case GetItemIDs.GI_BRACELET:
                save.inventory.strength = Strength.GORON_BRACELET;
                break;
            case GetItemIDs.GI_RUPEE_PURPLE:
            case GetItemIDs.GI_RUPEE_PURPLE_LOSE:
                this.giveRupees(50);
                break;
            case GetItemIDs.GI_RUPEE_GOLD:
                this.giveRupees(200);
                break;
            case GetItemIDs.GI_SWORD_BGS:
                save.swords.biggoronSword = true;
                break;
            case GetItemIDs.GI_ARROW_FIRE:
                save.inventory.fireArrows = true;
                break;
            case GetItemIDs.GI_ARROW_ICE:
                save.inventory.iceArrows = true;
                break;
            case GetItemIDs.GI_ARROW_LIGHT:
                save.inventory.lightArrows = true;
                break;
            case GetItemIDs.GI_SKULL_TOKEN:
                save.questStatus.goldSkulltulas++;
                save.questStatus.displayGoldSkulltulas = true;
                break;
            case GetItemIDs.GI_DINS_FIRE:
                save.inventory.dinsFire = true;
                break;
            case GetItemIDs.GI_FARORES_WIND:
                save.inventory.faroresWind = true;
                break;
            case GetItemIDs.GI_NAYRUS_LOVE:
                save.inventory.nayrusLove = true;
                break;
            case GetItemIDs.GI_BULLET_BAG_30:
                save.inventory.bulletBag = AmmoUpgrade.BASE;
                save.inventory.dekuSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, save.inventory.bulletBag);
                break;
            case GetItemIDs.GI_BULLET_BAG_40:
                save.inventory.bulletBag = AmmoUpgrade.UPGRADED;
                save.inventory.dekuSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, save.inventory.bulletBag);
                break;
            case GetItemIDs.GI_STICKS_5:
                save.inventory.dekuSticksCount = this.addAmmo(save.inventory.dekuSticksCount, 5, maxSticks);
                break;
            case GetItemIDs.GI_STICKS_10:
                save.inventory.dekuSticksCount = this.addAmmo(save.inventory.dekuSticksCount, 10, maxSticks);
                break;
            case GetItemIDs.GI_NUTS_5_2:
                save.inventory.dekuNutsCount = this.addAmmo(save.inventory.dekuNutsCount, 5, maxNuts);
                break;
            case GetItemIDs.GI_NUTS_10:
                save.inventory.dekuNutsCount = this.addAmmo(save.inventory.dekuNutsCount, 10, maxNuts);
                break;
            case GetItemIDs.GI_BOMBS_1:
                save.inventory.bombsCount = this.addAmmo(save.inventory.bombsCount, 1, maxBombs);
                break;
            case GetItemIDs.GI_BOMBS_10:
                save.inventory.bombsCount = this.addAmmo(save.inventory.bombsCount, 10, maxBombs);
                break;
            case GetItemIDs.GI_BOMBS_20:
                save.inventory.bombsCount = this.addAmmo(save.inventory.bombsCount, 20, maxBombs);
                break;
            case GetItemIDs.GI_BOMBS_30:
                save.inventory.bombsCount = this.addAmmo(save.inventory.bombsCount, 30, maxBombs);
                break;
            case GetItemIDs.GI_SEEDS_30:
                save.inventory.dekuSeeds = this.addAmmo(save.inventory.dekuSeeds, 30, maxSeeds);
                break;
            case GetItemIDs.GI_BOMBCHUS_5:
                save.inventory.bombchuCount = this.addAmmo(save.inventory.bombchuCount, 5, maxChus);
                break;
            case GetItemIDs.GI_BOMBCHUS_20:
                save.inventory.bombchuCount = this.addAmmo(save.inventory.bombchuCount, 20, maxChus);
                break;
            case GetItemIDs.GI_FISH:
            case GetItemIDs.GI_BOTTLE_WITH_FISH:
                this.giveBottle(save, InventoryItem.BOTTLED_FISH);
                break;
            case GetItemIDs.GI_BUGS:
            case GetItemIDs.GI_BOTTLE_WITH_BUGS:
                this.giveBottle(save, InventoryItem.BOTTLED_BUGS);
                break;
            case GetItemIDs.GI_BLUE_FIRE:
            case GetItemIDs.GI_BOTTLE_WITH_BLUE_FIRE:
                this.giveBottle(save, InventoryItem.BLUE_FIRE);
                break;
            case GetItemIDs.GI_POE:
            case GetItemIDs.GI_BOTTLE_WITH_POE:
                this.giveBottle(save, InventoryItem.BOTTLED_POE);
                break;
            case GetItemIDs.GI_BIG_POE:
            case GetItemIDs.GI_BOTTLE_WITH_BIG_POE:
                this.giveBottle(save, InventoryItem.BOTTLED_BIG_POE);
                break;
            case GetItemIDs.GI_STICK_UPGRADE_20:
                save.inventory.dekuSticksCapacity = AmmoUpgrade.UPGRADED;
                save.inventory.dekuSticksCount = UpgradeCountLookup(InventoryItem.DEKU_STICK, save.inventory.dekuSticksCapacity);
                break;
            case GetItemIDs.GI_STICK_UPGRADE_30:
                save.inventory.dekuSticksCapacity = AmmoUpgrade.MAX;
                save.inventory.dekuSticksCount = UpgradeCountLookup(InventoryItem.DEKU_STICK, save.inventory.dekuSticksCapacity);
                break;
            case GetItemIDs.GI_NUT_UPGRADE_30:
                save.inventory.dekuNutsCapacity = AmmoUpgrade.UPGRADED;
                save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, save.inventory.dekuNutsCapacity);
                break;
            case GetItemIDs.GI_NUT_UPGRADE_40:
                save.inventory.dekuNutsCapacity = AmmoUpgrade.MAX;
                save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, save.inventory.dekuNutsCapacity);
                break;
            case GetItemIDs.GI_BULLET_BAG_50:
                save.inventory.bulletBag = AmmoUpgrade.MAX;
                save.inventory.dekuSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, save.inventory.bulletBag);
                break;
            case GetItemIDs.GI_ICE_TRAP:
                // Can't mimic this yet.
                break;
            case GetItemIDs.GI_TEXT_0:
            // End of vanilla list.
            case GetItemIDs.GI_MAX:
            case GetItemIDs.GI_NOTHING_1:
                break;
            case GetItemIDs.GI_PROGRESSIVE_HOOKSHOT:
                save.inventory.hookshot = this.progressiveUpgrade2(save.inventory.hookshot, 1, Hookshot.LONGSHOT);
                break;
            case GetItemIDs.GI_PROGRESSIVE_STENGTH:
                save.inventory.strength = this.progressiveUpgrade2(save.inventory.strength, 1, Strength.GOLDEN_GAUNTLETS);
                break;
            case GetItemIDs.GI_PROGRESSIVE_BOMB_BAG:
                save.inventory.bombs = true;
                save.inventory.bombBag = this.progressiveUpgrade(save.inventory.bombs, save.inventory.bombBag);
                break;
            case GetItemIDs.GI_PROGRESSIVE_BOW:
                save.inventory.fairyBow = true;
                save.inventory.quiver = this.progressiveUpgrade(save.inventory.fairyBow, save.inventory.quiver);
                save.inventory.arrows = UpgradeCountLookup(InventoryItem.FAIRY_BOW, save.inventory.quiver);
                break;
            case GetItemIDs.GI_PROGRESSIVE_SLINGSHOT:
                save.inventory.fairySlingshot = true;
                save.inventory.bulletBag = this.progressiveUpgrade(save.inventory.fairySlingshot, save.inventory.bulletBag);
                save.inventory.dekuSeeds = UpgradeCountLookup(InventoryItem.FAIRY_SLINGSHOT, save.inventory.bulletBag);
                break;
            case GetItemIDs.GI_PROGRESSIVE_WALLET:
                save.inventory.wallet = this.progressiveUpgrade2(save.inventory.wallet, 1, Wallet.TYCOON);
                break;
            case GetItemIDs.GI_PROGRESSIVE_SCALE:
                save.inventory.swimming = this.progressiveUpgrade2(save.inventory.swimming, 1, ZoraScale.GOLDEN);
                break;
            case GetItemIDs.GI_PROGRESSIVE_NUTS:
                save.inventory.dekuNutsCapacity = this.progressiveUpgrade(save.inventory.dekuNuts, save.inventory.dekuNutsCapacity);
                save.inventory.dekuNutsCount = UpgradeCountLookup(InventoryItem.DEKU_NUT, save.inventory.dekuNutsCapacity);
                break;
            case GetItemIDs.GI_PROGRESSIVE_STICKS:
                save.inventory.dekuSticksCapacity = this.progressiveUpgrade(save.inventory.dekuSticks, save.inventory.dekuSticksCapacity);
                save.inventory.dekuSticksCount = UpgradeCountLookup(InventoryItem.DEKU_STICK, save.inventory.dekuSticksCapacity);
                break;
            case GetItemIDs.GI_PROGRESSIVE_BOMBCHUS:
                // ??? progressive bombchus?
                save.inventory.bombchus = true;
                save.inventory.bombchuCount = this.addAmmo(save.inventory.bombchuCount, 20, maxChus);
                break;
            case GetItemIDs.GI_PROGRESSIVE_MAGIC:
            case GetItemIDs.GI_MAGIC_METER:
            case GetItemIDs.GI_DOUBLE_MAGIC:
                save.magic_meter_size = this.progressiveUpgrade2(save.magic_meter_size, 1, Magic.EXTENDED);
                break;
            case GetItemIDs.GI_PROGRESSIVE_OCARINA:
                save.inventory.ocarina = this.progressiveUpgrade2(save.inventory.ocarina, 1, Ocarina.OCARINA_OF_TIME);
                break;
            case GetItemIDs.GI_BOSSKEY_FOREST:
                save.dungeonItemManager.FOREST_TEMPLE.bossKey = true;
                break;
            case GetItemIDs.GI_BOSSKEY_FIRE:
                save.dungeonItemManager.FIRE_TEMPLE.bossKey = true;
                break;
            case GetItemIDs.GI_BOSSKEY_WATER:
                save.dungeonItemManager.WATER_TEMPLE.bossKey = true;
                break;
            case GetItemIDs.GI_BOSSKEY_SPIRIT:
                save.dungeonItemManager.SPIRIT_TEMPLE.bossKey = true;
                break;
            case GetItemIDs.GI_BOSSKEY_SHADOW:
                save.dungeonItemManager.SHADOW_TEMPLE.bossKey = true;
                break;
            case GetItemIDs.GI_BOSSKEY_GANON:
                save.dungeonItemManager.GANONS_CASTLE.bossKey = true;
                break;
            case GetItemIDs.GI_COMPASS_DEKU:
                save.dungeonItemManager.DEKU_TREE.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_DODONGO:
                save.dungeonItemManager.DODONGOS_CAVERN.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_JABU:
                save.dungeonItemManager.JABJ_JABUS_BELLY.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_FOREST:
                save.dungeonItemManager.FOREST_TEMPLE.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_FIRE:
                save.dungeonItemManager.FIRE_TEMPLE.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_WATER:
                save.dungeonItemManager.WATER_TEMPLE.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_SPIRIT:
                save.dungeonItemManager.SPIRIT_TEMPLE.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_SHADOW:
                save.dungeonItemManager.SHADOW_TEMPLE.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_WELL:
                save.dungeonItemManager.BOTTOM_OF_THE_WELL.compass = true;
                break;
            case GetItemIDs.GI_COMPASS_ICE_CAVERN:
                save.dungeonItemManager.ICE_CAVERN.compass = true;
                break;
            case GetItemIDs.GI_MAP_DEKU:
                save.dungeonItemManager.DEKU_TREE.map = true;
                break;
            case GetItemIDs.GI_MAP_DODONGO:
                save.dungeonItemManager.DODONGOS_CAVERN.map = true;
                break;
            case GetItemIDs.GI_MAP_JABU:
                save.dungeonItemManager.JABJ_JABUS_BELLY.map = true;
                break;
            case GetItemIDs.GI_MAP_FOREST:
                save.dungeonItemManager.FOREST_TEMPLE.map = true;
                break;
            case GetItemIDs.GI_MAP_FIRE:
                save.dungeonItemManager.FIRE_TEMPLE.map = true;
                break;
            case GetItemIDs.GI_MAP_WATER:
                save.dungeonItemManager.WATER_TEMPLE.map = true;
                break;
            case GetItemIDs.GI_MAP_SPIRIT:
                save.dungeonItemManager.SPIRIT_TEMPLE.map = true;
                break;
            case GetItemIDs.GI_MAP_SHADOW:
                save.dungeonItemManager.SHADOW_TEMPLE.map = true;
                break;
            case GetItemIDs.GI_MAP_WELL:
                save.dungeonItemManager.BOTTOM_OF_THE_WELL.map = true;
                break;
            case GetItemIDs.GI_MAP_ICE_CAVERN:
                save.dungeonItemManager.ICE_CAVERN.map = true;
                break;
            case GetItemIDs.GI_SMALLKEY_FOREST:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.FOREST_TEMPLE, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.FOREST_TEMPLE) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_FIRE:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.FIRE_TEMPLE, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.FIRE_TEMPLE) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_WATER:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.WATER_TEMPLE, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.WATER_TEMPLE) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_SPIRIT:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.SPIRIT_TEMPLE, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.SPIRIT_TEMPLE) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_SHADOW:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.SHADOW_TEMPLE, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.SHADOW_TEMPLE) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_WELL:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.BOTTOM_OF_THE_WELL) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_GTG:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.GERUDO_TRAINING_GROUND) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_FORTRESS:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.GERUDO_FORTRESS, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.GERUDO_FORTRESS) + 1);
                break;
            case GetItemIDs.GI_SMALLKEY_GANON:
                save.keyManager.setKeyCountByIndex(VANILLA_KEY_INDEXES.GANONS_CASTLE, save.keyManager.getKeyCountForIndex(VANILLA_KEY_INDEXES.GANONS_CASTLE) + 1);
                break;
            case GetItemIDs.GI_DOUBLE_DEFENSE:
                save.double_defense = 0x140;
                break;
            case GetItemIDs.GI_SONG_MINUET:
                save.questStatus.minuetOfForest = true;
                break;
            case GetItemIDs.GI_SONG_BOLERO:
                save.questStatus.boleroOfFire = true;
                break;
            case GetItemIDs.GI_SONG_SERENADE:
                save.questStatus.serenadeOfWater = true;
                break;
            case GetItemIDs.GI_SONG_REQUIEM:
                save.questStatus.requiemOfSpirit = true;
                break;
            case GetItemIDs.GI_SONG_NOCTURN:
                save.questStatus.nocturneOfShadow = true;
                break;
            case GetItemIDs.GI_SONG_PRELUDE:
                save.questStatus.preludeOfLight = true;
                break;
            case GetItemIDs.GI_SONG_ZELDA:
                save.questStatus.zeldasLullaby = true;
                break;
            case GetItemIDs.GI_SONG_EPONA:
                save.questStatus.eponasSong = true;
                break;
            case GetItemIDs.GI_SONG_SARIA:
                save.questStatus.sariasSong = true;
                break;
            case GetItemIDs.GI_SONG_SUN:
                save.questStatus.sunsSong = true;
                break;
            case GetItemIDs.GI_SONG_TIME:
                save.questStatus.songOfTime = true;
                break;
            case GetItemIDs.GI_SONG_STORM:
                save.questStatus.songOfStorms = true;
                break;
            case GetItemIDs.GI_WALLET_TYCOON:
                save.inventory.wallet = Wallet.TYCOON;
                break;
            case GetItemIDs.GI_MAGIC_BEAN_PACK:
                save.inventory.magicBeans = true;
                save.inventory.magicBeansCount = 10;
                break;
            case GetItemIDs.GI_TRIFORCE_PIECE:
                TriforceHuntHelper.incrementTriforcePieces(this.ModLoader);
                break;
        }
    }
}

export class MultiworldItem {
    item: GetItemIDs;
    dest: number;

    constructor(item: GetItemIDs, dest: number) {
        this.item = item;
        this.dest = dest;
    }
}

export class TriforceHuntHelper {

    static isRandomizer: boolean = false;

    static getTriforcePieces(ModLoader: IModLoaderAPI) {
        if (this.isRandomizer) {
            return ModLoader.emulator.rdramRead16(0x8011AE96);
        } else {
            return 0;
        }
    }

    static setTriforcePieces(ModLoader: IModLoaderAPI, pieces: number) {
        if (this.isRandomizer) {
            ModLoader.emulator.rdramWrite16(0x8011AE96, pieces);
        }
    }

    static incrementTriforcePieces(ModLoader: IModLoaderAPI) {
        if (this.isRandomizer) {
            ModLoader.emulator.rdramWrite16(0x8011AE96, ModLoader.emulator.rdramRead16(0x8011AE96) + 1);
        }
    }

}

export const enum GetItemIDs {
    // Vanilla GI straight from decomp.
    GI_NONE,
    GI_BOMBS_5,
    GI_NUTS_5,
    GI_BOMBCHUS_10,
    GI_BOW,
    GI_SLINGSHOT,
    GI_BOOMERANG,
    GI_STICKS_1,
    GI_HOOKSHOT,
    GI_LONGSHOT,
    GI_LENS,
    GI_LETTER_ZELDA,
    GI_OCARINA_OOT,
    GI_HAMMER,
    GI_COJIRO,
    GI_BOTTLE,
    GI_POTION_RED,
    GI_POTION_GREEN,
    GI_POTION_BLUE,
    GI_FAIRY,
    GI_MILK_BOTTLE,
    GI_LETTER_RUTO,
    GI_BEAN,
    GI_MASK_SKULL,
    GI_MASK_SPOOKY,
    GI_CHICKEN, // uses bean message ID
    GI_MASK_KEATON,
    GI_MASK_BUNNY,
    GI_MASK_TRUTH,
    GI_POCKET_EGG,
    GI_POCKET_CUCCO, // uses bean message ID
    GI_ODD_MUSHROOM,
    GI_ODD_POTION,
    GI_SAW,
    GI_SWORD_BROKEN,
    GI_PRESCRIPTION,
    GI_FROG,
    GI_EYEDROPS,
    GI_CLAIM_CHECK,
    GI_SWORD_KOKIRI,
    GI_SWORD_KNIFE,
    GI_SHIELD_DEKU,   // or blue rupee if you have the shield
    GI_SHIELD_HYLIAN, // or blue rupee if you have the shield
    GI_SHIELD_MIRROR,
    GI_TUNIC_GORON, // or blue rupee if you have the tunic
    GI_TUNIC_ZORA,  // or blue rupee if you have the tunic
    GI_BOOTS_IRON,
    GI_BOOTS_HOVER,
    GI_QUIVER_40,
    GI_QUIVER_50,
    GI_BOMB_BAG_20,
    GI_BOMB_BAG_30,
    GI_BOMB_BAG_40,
    GI_GAUNTLETS_SILVER,
    GI_GAUNTLETS_GOLD,
    GI_SCALE_SILVER,
    GI_SCALE_GOLD,
    GI_STONE_OF_AGONY,
    GI_GERUDO_CARD,
    GI_OCARINA_FAIRY, // uses Ocarina of Time message ID
    GI_SEEDS_5,
    GI_HEART_CONTAINER,
    GI_HEART_PIECE,
    GI_KEY_BOSS,
    GI_COMPASS,
    GI_MAP,
    GI_KEY_SMALL,
    GI_MAGIC_SMALL, // or blue rupee if not from a drop
    GI_MAGIC_LARGE, // or blue rupee if not from a drop
    GI_WALLET_ADULT,
    GI_WALLET_GIANT,
    GI_WEIRD_EGG,
    GI_HEART,
    GI_ARROWS_SMALL,  // amount changes depending on context
    GI_ARROWS_MEDIUM, // amount changes depending on context
    GI_ARROWS_LARGE,  // amount changes depending on context
    GI_RUPEE_GREEN,
    GI_RUPEE_BLUE,
    GI_RUPEE_RED,
    GI_HEART_CONTAINER_2,
    GI_MILK,
    GI_MASK_GORON,
    GI_MASK_ZORA,
    GI_MASK_GERUDO,
    GI_BRACELET,
    GI_RUPEE_PURPLE,
    GI_RUPEE_GOLD,
    GI_SWORD_BGS,
    GI_ARROW_FIRE,
    GI_ARROW_ICE,
    GI_ARROW_LIGHT,
    GI_SKULL_TOKEN,
    GI_DINS_FIRE,
    GI_FARORES_WIND,
    GI_NAYRUS_LOVE,
    GI_BULLET_BAG_30,
    GI_BULLET_BAG_40,
    GI_STICKS_5,
    GI_STICKS_10,
    GI_NUTS_5_2,
    GI_NUTS_10,
    GI_BOMBS_1,
    GI_BOMBS_10,
    GI_BOMBS_20,
    GI_BOMBS_30,
    GI_SEEDS_30,
    GI_BOMBCHUS_5,
    GI_BOMBCHUS_20,
    GI_FISH,
    GI_BUGS,
    GI_BLUE_FIRE,
    GI_POE,
    GI_BIG_POE,
    GI_DOOR_KEY,          // specific to chest minigame
    GI_RUPEE_GREEN_LOSE,  // specific to chest minigame
    GI_RUPEE_BLUE_LOSE,   // specific to chest minigame
    GI_RUPEE_RED_LOSE,    // specific to chest minigame
    GI_RUPEE_PURPLE_LOSE, // specific to chest minigame
    GI_HEART_PIECE_WIN,   // specific to chest minigame
    GI_STICK_UPGRADE_20,
    GI_STICK_UPGRADE_30,
    GI_NUT_UPGRADE_30,
    GI_NUT_UPGRADE_40,
    GI_BULLET_BAG_50,
    GI_ICE_TRAP, // freezes link when opened from a chest
    GI_TEXT_0, // no model appears over Link, shows text id 0 (pocket egg)
    GI_MAX,
    // Rando's extension of the table starts here.
    GI_NOTHING_1, // padding?
    GI_PROGRESSIVE_HOOKSHOT,
    GI_PROGRESSIVE_STENGTH,
    GI_PROGRESSIVE_BOMB_BAG,
    GI_PROGRESSIVE_BOW,
    GI_PROGRESSIVE_SLINGSHOT,
    GI_PROGRESSIVE_WALLET,
    GI_PROGRESSIVE_SCALE,
    GI_PROGRESSIVE_NUTS,
    GI_PROGRESSIVE_STICKS,
    GI_PROGRESSIVE_BOMBCHUS,
    GI_PROGRESSIVE_MAGIC,
    GI_PROGRESSIVE_OCARINA,

    GI_BOTTLE_WITH_RED_POTION,
    GI_BOTTLE_WITH_GREEN_POTION,
    GI_BOTTLE_WITH_BLUE_POTION,
    GI_BOTTLE_WITH_FAIRY,
    GI_BOTTLE_WITH_FISH,
    GI_BOTTLE_WITH_BLUE_FIRE,
    GI_BOTTLE_WITH_BUGS,
    GI_BOTTLE_WITH_BIG_POE,
    GI_BOTTLE_WITH_POE,

    GI_BOSSKEY_FOREST,
    GI_BOSSKEY_FIRE,
    GI_BOSSKEY_WATER,
    GI_BOSSKEY_SPIRIT,
    GI_BOSSKEY_SHADOW,
    GI_BOSSKEY_GANON,

    GI_COMPASS_DEKU,
    GI_COMPASS_DODONGO,
    GI_COMPASS_JABU,
    GI_COMPASS_FOREST,
    GI_COMPASS_FIRE,
    GI_COMPASS_WATER,
    GI_COMPASS_SPIRIT,
    GI_COMPASS_SHADOW,
    GI_COMPASS_WELL,
    GI_COMPASS_ICE_CAVERN,

    GI_MAP_DEKU,
    GI_MAP_DODONGO,
    GI_MAP_JABU,
    GI_MAP_FOREST,
    GI_MAP_FIRE,
    GI_MAP_WATER,
    GI_MAP_SPIRIT,
    GI_MAP_SHADOW,
    GI_MAP_WELL,
    GI_MAP_ICE_CAVERN,

    GI_SMALLKEY_FOREST,
    GI_SMALLKEY_FIRE,
    GI_SMALLKEY_WATER,
    GI_SMALLKEY_SPIRIT,
    GI_SMALLKEY_SHADOW,
    GI_SMALLKEY_WELL,
    GI_SMALLKEY_GTG,
    GI_SMALLKEY_FORTRESS,
    GI_SMALLKEY_GANON,

    GI_DOUBLE_DEFENSE,
    GI_MAGIC_METER,
    GI_DOUBLE_MAGIC,

    GI_SONG_MINUET,
    GI_SONG_BOLERO,
    GI_SONG_SERENADE,
    GI_SONG_REQUIEM,
    GI_SONG_NOCTURN,
    GI_SONG_PRELUDE,

    GI_SONG_ZELDA,
    GI_SONG_EPONA,
    GI_SONG_SARIA,
    GI_SONG_SUN,
    GI_SONG_TIME,
    GI_SONG_STORM,

    GI_WALLET_TYCOON,
    GI_REDUNDANT_LETTER_BOTTLE,
    GI_MAGIC_BEAN_PACK,
    GI_TRIFORCE_PIECE
};