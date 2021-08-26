import { Scene } from '@Z64Online/common/types/Types';


export interface IModelManagerShim {
    onRomPatched(evt: any): void;
    onSceneChange(scene: Scene): void;
    findLink(): number;
    setupLinkModels(): void;
    safetyCheck(): boolean;
}
