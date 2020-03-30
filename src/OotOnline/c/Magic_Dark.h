uint32_t* timg_80B880E0 = (uint32_t*) 0x80837800 + 0x2D000;
uint32_t* v_80B888E0 = (uint32_t*) 0x80837800 + 0x2D800;

Gfx dl_80B88A20[] = {
  gsDPPipeSync(),
  gsDPSetTextureLUT(G_TT_NONE),
  gsSPTexture(qu016(0.999985), qu016(0.999985), 0, G_TX_RENDERTILE, G_ON),
  gsDPLoadTextureBlock(0x04032490, G_IM_FMT_I, G_IM_SIZ_8b, 32, 32, 0, G_TX_NOMIRROR | G_TX_WRAP, G_TX_NOMIRROR | G_TX_WRAP, 5, 5, G_TX_NOLOD, 1),
  gsDPLoadMultiBlock(*timg_80B880E0, 0x0100, 1, G_IM_FMT_I, G_IM_SIZ_8b, 32, 64, 0, G_TX_NOMIRROR | G_TX_WRAP, G_TX_MIRROR | G_TX_WRAP, 5, 6, 13, 13),
  gsDPSetCombineLERP(TEXEL1, PRIMITIVE, ENV_ALPHA, TEXEL0, TEXEL1, TEXEL0, ENVIRONMENT, TEXEL0, PRIMITIVE, ENVIRONMENT, COMBINED, ENVIRONMENT, COMBINED, 0, PRIMITIVE, 0),
  gsDPSetRenderMode(AA_EN | Z_CMP | IM_RD | CLR_ON_CVG | CVG_DST_WRAP | ZMODE_XLU | FORCE_BL | GBL_c1(G_BL_CLR_IN, G_BL_0, G_BL_CLR_IN, G_BL_1), G_RM_AA_ZB_XLU_SURF2),
  gsSPClearGeometryMode(G_FOG | G_TEXTURE_GEN | G_TEXTURE_GEN_LINEAR),
  gsSPSetGeometryMode(G_CULL_BACK | G_LIGHTING),
  gsSPEndDisplayList()
};

Gfx dl_808BBAD0[] = {
  gsSPVertex(*v_80B888E0, 0x14, 0),
  gsSP2Triangles(0, 1, 2, 0, 1, 3, 4, 0),
  gsSP2Triangles(3, 5, 6, 0, 5, 7, 8, 0),
  gsSP2Triangles(7, 9, 10, 0, 11, 0, 12, 0),
  gsSP2Triangles(13, 0, 11, 0, 14, 7, 5, 0),
  gsSP2Triangles(15, 5, 3, 0, 16, 3, 1, 0),
  gsSP2Triangles(17, 1, 0, 0, 16, 18, 19, 0),
  gsSPEndDisplayList()
};