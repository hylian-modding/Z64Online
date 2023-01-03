#ifndef EPONA_BANK_HEADER_H
#define EPONA_BANK_HEADER_H

#include <libzelda64.h>

extern AnimationHeader* sEponaAnimHeaders[];

typedef struct{
    AnimationHeader* sEponaAnimHeaders;
    u8 pad[0xC];
} EponaBankHeader;

#endif