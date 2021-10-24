import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { FairyHax_mm } from "./FairyHax_mm";
import { FairyHax_oot } from "./FairyHax_oot";

export default class FairyHax {

    static getFairyHax(game: Z64LibSupportedGames) {
        switch (game) {
            case Z64LibSupportedGames.OCARINA_OF_TIME:
                return FairyHax_oot;
            case Z64LibSupportedGames.MAJORAS_MASK:
                return FairyHax_mm;
        }
    }

}