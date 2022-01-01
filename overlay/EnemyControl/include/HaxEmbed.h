#ifndef __HAX_EMBED_H__
#define __HAX_EMBED_H__

#include <libzelda64.h>

typedef struct{
    uint32_t start;
    uint32_t create;
    uint32_t destroy;
    uint32_t size;
    uint32_t end;
} HaxEmbed_t;

extern void doInject(void* thisx, GlobalContext* globalCtx, uint32_t pointer);
extern void doDestroy(void* thisx, GlobalContext* globalCtx, uint32_t pointer);

#endif /* __HAX_EMBED_H__ */