#ifndef __NAVI_HAX_H__
#define __NAVI_HAX_H__

#include <libzelda64.h>
#include "GetLink.h"

enum NAVIHAX_STATUS{
    UNINITIALIZED,
    OK,
    ERRORED,
    DEAD
};

typedef struct{
    uint8_t stuff_I_dont_care_about_right_now[0x1C];
    uint32_t pointer;
    uint32_t de;
    uint32_t model;
} En_Header;

#endif /* __NAVI_HAX_H__ */