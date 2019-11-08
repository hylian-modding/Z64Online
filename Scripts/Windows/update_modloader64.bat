:: Get to repo root
cd ..\..\

:: Update the ModLoader64 SubModule
git submodule add https://github.com/hylian-modding/ModLoader64 ModLoader64
git submodule update --init --recursive
git submodule foreach --recursive git fetch
git submodule foreach git merge origin/Stable

:: Keep console open when script finishes
pause