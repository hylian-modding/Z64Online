import { EponaHax_oot, EponaHax_mm } from "@Z64Online/overlay/EponaHax";
import { Z64LibSupportedGames } from "Z64Lib/API/Utilities/Z64LibSupportedGames";

export default class EponaHax{

    static getHax(game: Z64LibSupportedGames){
        switch(game){
            case Z64LibSupportedGames.OCARINA_OF_TIME:
                return EponaHax_oot;
            case Z64LibSupportedGames.MAJORAS_MASK:
                return EponaHax_mm;
        }
    }

}