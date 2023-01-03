#ifndef PUPPET_OPTS_H
#define PUPPET_OPTS_H

#if TARGET_GAME == Z64GAME_OOT

/* System options */
// This option requires an ASM hook into SkelAnime_InitLink!
//#define RECONSTRUCT_PUPPETS_ON_LINK_INIT
// This option is only for testing. Generates an actor to act as a proxy for each Puppet.
//#define USE_REAL_ACTORS

/* Puppet options */
// If Link is constructed and drawn.
#define HAS_LINK
// If ENV color is set during puppet draw phase. Oot only.
#define HAS_TUNIC_COLOR

// If Navi/Tatl is constructed and drawn.
//#define HAS_FAIRY

// If Epona is constructed and drawn.
//#define HAS_HORSE

#endif // TARGET_GAME == Z64GAME_OOT

// Deal with mutually exclusive options.
#ifdef USE_REAL_ACTORS
#ifdef RECONSTRUCT_PUPPETS_ON_LINK_INIT
#undef RECONSTRUCT_PUPPETS_ON_LINK_INIT // This would crash the game.
#endif
#endif

#ifndef HAS_LINK
#ifdef HAS_TUNIC_COLOR
#undef HAS_TUNIC_COLOR // No Link, no tunic.
#endif
#endif
#endif