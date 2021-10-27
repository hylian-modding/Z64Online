#ifndef __HAX_EMBED_H__
#define __HAX_EMBED_H__

#include <libzelda64.h>
#include "HaxInject.h"

typedef struct{
    uint32_t start;
    uint32_t create;
    uint32_t destroy;
    uint32_t end;
} HaxEmbed_t;

const HaxEmbed_t embed = {
    .start = 0xDEADBEEF,
    .create = doInject,
    .destroy = doDestroy,
    .end = 0xBEEFDEAD
};

#endif /* __HAX_EMBED_H__ */