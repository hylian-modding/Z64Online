import { IOOTCore } from 'modloader64_api/OOT/OOTAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { IPlugin, IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';

class GimmeBeans implements IPlugin {
  pluginName?: string | undefined;
  ModLoader!: IModLoaderAPI;
  @InjectCore()
  core!: IOOTCore;

  preinit(): void {}
  init(): void {}
  postinit(): void {}
  onTick(): void {
    this.core.save.inventory.magicBeansCount = 10;
  }
}

module.exports = GimmeBeans;
