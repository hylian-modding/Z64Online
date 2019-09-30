# Get to repo root
cd ../../

# Clone plugin to ModLoader64
cp -r ./src/* ./ModLoader64/mods/

# Get to ModLoader64 Scripts Directory
cd ./ModLoader64/Scripts/Unix/

# Run official script
sh build_and_run.sh
