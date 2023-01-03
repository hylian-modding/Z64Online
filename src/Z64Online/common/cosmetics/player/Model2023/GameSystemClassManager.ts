import { ModelSystemSupportedGames } from "./ModelSystemSupportedGames";
import OotGame from './mupen/oot/OotGame';
import IModelSystemGame from './IModelSystemGame';

export default class GameSystemClassManager {

    /**
     * Resolve a game class from a game enum entry.
     * @param game 
     * @returns
     */
    static resolveClass(game: ModelSystemSupportedGames): IModelSystemGame | undefined {
        switch (game) {
            case ModelSystemSupportedGames.OCARINA_OF_TIME:
                return new OotGame();
        }
    }

}