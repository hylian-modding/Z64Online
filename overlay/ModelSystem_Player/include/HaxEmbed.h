#ifndef __HAX_EMBED_H__
#define __HAX_EMBED_H__

#include <libzelda64.h>

typedef struct{
    u32 start;
    u32 create;
    u32 destroy;
    u32 size;
    u32 end;
} HaxEmbed_t;

extern void doInject(void* thisx, PlayState* play, u32 pointer);
extern void doDestroy(void* thisx, PlayState* play, u32 pointer);

#endif /* __HAX_EMBED_H__ */