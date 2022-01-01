#include "HaxBase.h"

// Hide this shit in its own file because its always highlighted as an error.
const HaxEmbed_t embed = {
    .start = 0xDEADBEEF,
    .create = doInject,
    .destroy = doDestroy,
    .size = sizeof(En_HaxBase),
    .end = 0xBEEFDEAD
};