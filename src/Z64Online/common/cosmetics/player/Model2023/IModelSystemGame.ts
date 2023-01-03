import { IModelReference } from '@Z64Online/common/api/Z64API';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ModelAllocationManager } from '../../utils/ModelAllocationManager';
import { ModelManagerClient } from '../ModelManager';

export default interface IModelSystemGame{

    doGameInjects(ModLoader: IModLoaderAPI, rom: Buffer | string): void;

    doHandlerInjection(ModLoader: IModLoaderAPI, core: any, manager: ModelManagerClient): void;

    triggerHandler(ModLoader: IModLoaderAPI, core: any, manager: ModelManagerClient): void;

}