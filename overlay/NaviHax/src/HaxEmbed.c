#include "BaseHax.h"

const HaxEmbed_t embed = {
    .start = 0xDEADBEEF,
    .create = doInject,
    .destroy = doDestroy,
    .size = sizeof(En_BaseHax),
    .end = 0xBEEFDEAD
};