# Get to Modloader64 scripts directory
cd ../../ModLoader64/Scripts/Unix/

# Invoke ModLoader64 build script
sh setup_mac.sh

# Get to repo root
cd ../../../

# Clone API folder to repo root
rm -r ./API/
cp -r ./ModLoader64/API/ ./API/

# Install the repo
dry install

# Keep console open when script finishes
echo "Press any key to continue"
read 1
