#include "ModuleEmbed.h"

const ModuleEmbed embed = (ModuleEmbed){
    /* start    */ 0xDEADBEEF,
    /* create   */ (u32)ModuleInject_Inject,
    /* destroy  */ (u32)ModuleInject_Destroy,
    /* size     */ sizeof(ModuleInject),
    /* end      */ 0xBEEFDEAD
};

