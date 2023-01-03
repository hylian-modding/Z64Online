#include "HaxBase.h"

const HaxEmbed_t embed = {
    .start = 0xDEADBEEF,
    .create = doInject,
    .destroy = doDestroy,
    .size = sizeof(En_HaxBase),
    .end = 0xBEEFDEAD
};