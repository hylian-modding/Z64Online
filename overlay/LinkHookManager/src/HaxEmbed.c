#include "HaxEmbed.h"

const HaxEmbed_t embed = {
    .start = 0xDEADBEEF,
    .create = Hax_Inject,
    .destroy = Hax_Destroy,
    .size = sizeof(En_HaxBase),
    .end = 0xBEEFDEAD
};

