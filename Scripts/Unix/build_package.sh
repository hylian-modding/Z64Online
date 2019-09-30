# Get to repo root
cd ../../

# Clone plugin to ModLoader64
rm -r ./ModLoader64/mods/
rm -r ./ModLoader64/build/mods/
cp -r ./src/ ./ModLoader64/mods/

# Get to ModLoader64 Scripts Directory
cd ./ModLoader64/Scripts/Unix/

# Run official script
sh build_no_run.sh

# Get to repo root
cd ../../../

# Run packager
rm -r ./dist/
mkdir ./dist/
cp -r ./ModLoader64/build/mods/* ./dist/
cd ./dist/

# Detect and pack any/all plugins
for i in $(ls -d */)
do
    node ../ModLoader64/PayloadConverter/build/paker.js --dir=./$(echo $i | tr -d '/')
done

# Keep console open when script finishes
echo "Press any key to continue"
read 1
