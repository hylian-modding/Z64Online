# ModLoader64 Plugin Base
Template base for making [ModLoader64](https://github.com/hylian-modding/ModLoader64) Plugins.

## Starting a new project
After forking this repository for your own project, you will have access to a template folder
and scripts that are 1 time use only for the purpose of establishing your plugin.

To unpack the template navigate to Scripts/Windows or on any other OS navigate to Scripts/Unix
then run the script called initialize_new_project.

After entering data for the following prompts:
- Do you want to make a networked plugin? [y/n]
- What is the name of the plugin - without spaces? (Plugin_Name_Here)
- What is the version of the plugin? (1.0.0)
- What is the description of the plugin?
- Who is the author of the plugin?
- Who else should have credits?
- What license should this plugin be under?
- What game core does this plugin target? (optional?)

Your project is finally unpacked. If you are intending on working with anyone else or letting
the public have access to your plugin source it is not recommended to delete the scripts folder
for the OS base you do not use.

For the above plugin settings, Invalid characters are not prevented from being entered so
make sure to type the settings in carefully, it is not very convenient to go fix it manually.

The Plugin Name is used for the actual code your plugin is named after which is why spaces are
not allowed as well the core is case sensitive. If you should mess up the core information it
is simple enough to modify the package-dry.json in the root directory, and the package.json
in your source/Plugin directory.

Final Note: In your newly generated plugin, you will have 1 error immediately that needs fixed.
In the src/plugin/src/main.ts file @inject_core will error because your core name will DEFINITELY
not match an actual game core. You need to investigate the API cores to determine the name of the
game core interface to fill in to properly access the games core and begin your plugin.

## Updating ModLoader64
Should you need to update ModLoader64 all you need to do is run Scripts/OS/update_modloader64.

## From a Fresh Pull
Should you have just pulled this from github using a git client you must start by running the 
Update script listed in step above in order to pull the dependancy repository [ModLoader64](https://github.com/hylian-modding/ModLoader64).

Pulling the repository manually as a zip file requires downloading the ModLoader64 manually
and placing its contents into the ModLoader64 folder located in the root of this repository.

## Running

Requirement - NodeJS:

* (WINDOWS) [Nodejs 10.X or 12.X (Requires 32-bit)](https://nodejs.org/en/)
* (LINUX) Install latest from Package Manager

In the case of your first time running since doing a pull of your repo, as well in the case
of having just ran a ModLoader64 Update, you need to run Scripts/OS/setup (in the case of
the UNIX repo the setup_ file that postfixes your specific distrobution).

After this step is achieved, it is only further necessary to run the scripts labeled
build_and_run or build_no_run.

If you wish to simply test run the app since having made a build already and just need
to quickly get clients open to test with, use the start_1 and start_2 scripts.

## Distributing
Once your plugin is stable and ready to pass out to your friends, you only need to run the
build_package script and send the .pak file located in root/dist folder. The resulting .pak
file should be placed on the user side into the Modloaders/mods folder (the version that is
for playing not development).
