import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";
import { NaviHax } from "./NaviHax";

export default class FairyHax {

    static getFairyHax(game: Z64LibSupportedGames) {
        switch (game) {
            case Z64LibSupportedGames.OCARINA_OF_TIME:
                return NaviHax;
        }
    }

}