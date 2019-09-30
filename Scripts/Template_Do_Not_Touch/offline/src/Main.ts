import { EventsClient, EventHandler } from 'modloader64_api/EventHandler';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';

export class _name_ implements IPlugin {
  ModLoader = {} as IModLoaderAPI;
  name = '_name_';

  @InjectCore() core!: _core_;

  constructor() {}

  preinit(): void {}

  init(): void {}

  postinit(): void {}

  onTick(): void {}

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onClient_InjectFinished(evt: any) {}
}
