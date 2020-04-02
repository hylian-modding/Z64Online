#include <z64ovl/oot/u10.h>
#include <z64ovl/oot/helpers.h>

typedef struct
{
	z64_actor_t actor;
	uint8_t opacity;
	float radius;
} entity_t;

static void init(entity_t *en, z64_global_t *gl)
{
	en->opacity = 255;
	z_actor_set_scale(&en->actor, 1.0f);
	if (zh_link_is_adult())
	{
		en->radius = 0.6f;
	}
	else
	{
		en->radius = 0.4f;
	}
	(en->actor).scale.x = en->radius * 1.6f;
	(en->actor).scale.y = en->radius * 0.8f;
	(en->actor).scale.z = en->radius * 1.6f;
}

static void dest(entity_t *en, z64_global_t *gl)
{
}

static void play_spawn(entity_t *en, z64_global_t *gl)
{
}

static void play_diamond(entity_t *en, z64_global_t *gl)
{
}

static void draw_spawn(entity_t *en, z64_global_t *gl)
{
}

static void draw_diamond(entity_t *en, z64_global_t *gl)
{
	z64_gfx_t *gfx_ctxt = (gl->common).gfx_ctxt;
	uint32_t gp_frames = gl->gameplay_frames;
	z64_disp_buf_t *xlu = &ZQDL(gl, poly_xlu);
	external_func_80093D84(gfx_ctxt);
	uint8_t alpha = (uint8_t)((float)en->opacity * 0.6f) & 0xFF;
	z_matrix_scale_3f((en->actor).scale.x, (en->actor).scale.y, (en->actor).scale.z, 1);
	z_matrix_yaw((en->actor).rot_2.y * 0.0001f, 1);
	gSPMatrix(xlu->p++, z_matrix_alloc(gfx_ctxt, "z_puppet_dark.c"), G_MTX_NOPUSH | G_MTX_LOAD | G_MTX_MODELVIEW);
	gDPSetPrimColor(xlu->p++, 0, 0, 170, 255, 255, alpha);
	gDPSetEnvColor(xlu->p++, 0, 100, 255, 128);
	gSPDisplayList(xlu->p++, AADDR(0x8060D760, 0));
	gSPDisplayList(xlu->p++, z_rcp_gen_2_settilesize(gfx_ctxt, 0, gp_frames << 1, -(gp_frames * 4), 0x20, 0x20, 1, 0, -(gp_frames * 16), 0x40, 0x20));
	gSPDisplayList(xlu->p++, AADDR(0x8060D7A8, 0));
}

const z64_actor_init_t init_vars = {
	.number = 0x5,
	.type = OVLTYPE_PROP,
	.room = 0xFF,
	.flags = 0x02000010,
	.object = 0x0001,
	.padding = 0x00,
	.instance_size = sizeof(entity_t),
	.init = init,
	.dest = dest,
	.main = play_diamond,
	.draw = draw_diamond};
