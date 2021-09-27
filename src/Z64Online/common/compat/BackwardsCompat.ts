import { bus } from 'modloader64_api/EventHandler';

export class OotO300BackwardsCompat {

    inject() {
        bus.on('PLUGIN_CONSIDERATION', (meta: any) => {
            console.log(meta);
            if (Array.isArray(meta.core)) {
                for (let i = 0; i < meta.core.length; i++) {
                    if (meta.core[i] === "OcarinaofTime" || meta.core[i] === "MajorasMask") {
                        console.log(`[Z64O Backwards Compat]: Transforming core requirement for plugin ${meta.name}. ${meta.core[i]} -> Z64Lib`);
                        meta.core[i] = "Z64Lib";
                    }
                }
            } else {
                if (meta.core === "OcarinaofTime") meta.core = "Z64Lib";
                if (meta.core === "MajorasMask") meta.core = "Z64Lib";
            }
        });
    }

}