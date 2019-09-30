##################
# Get to repo root
##################

cd ../../

################################
# Create source folder for later
################################

mkdir ./src

########################################
# Get some information about the project
########################################

#Predefine vars
TEMPLATE=""
NAME="MyPlugin"
VERSION="1.0.0"

while [ "$TEMPLATE" != "y" ] && [ "$TEMPLATE" != "n" ]
do
read -r -p "Do you want to make a networked plugin? [y/n]" TEMPLATE
done

read -r -p "What is the name of the plugin - without spaces? (MyPlugin)" c
c=$(echo $c | tr -d ' ')
if [ "$c" != "" ]
then
    NAME="$c"
fi

read -r -p "What is the version of the plugin? (1.0.0)" c
c=$(echo $c | tr -d ' ')
if [ "$c" != "" ]
then
    VERSION="$c"
fi

read -r -p "What is the description of the plugin?" DESCRIPTION
read -r -p "Who is the author of the plugin?" AUTHOR
read -r -p "Who else should have credits?" CREDITS
read -r -p "What license should this plugin be under?" LICENSE

read -r -p "What game core does this plugin target? (optional?)" c
CORE=$(echo $c | tr -d ' ')

##########################
# Make directory variables
##########################

FD=./Scripts/Template_Do_Not_Touch
CF=$FD/package.json

############################################
# Copy the template type to source directory
############################################

if [ "$TEMPLATE" = "y" ] 
then
    cp -r $FD/online/ ./src/$NAME
else
    cp -r $FD/offline/ ./src/$NAME
fi

#####################
# Create package file
#####################

echo '{
  "name": "'$NAME'",
  "version": "'$VERSION'",
  "description": "'$DESCRIPTION'",
  "main": "'$NAME'.js",
  "author": "'$AUTHOR'",
  "credits": "'$CREDITS'",
  "license": "'$LICENSE'",
  "core": "'$CORE'",
  "dry": {
    "extends": "./ModLoader64/package-dry.json"
  }
}' >> $CF

#############################################
# Transport package info to appropraite place
#############################################

cp $CF ./
cp $CF ./src/$NAME/
mv ./package.json ./package-dry.json

###########################
# Cleanup unnecessary files
###########################

rm -r $FD
rm ./Scripts/Windows/initialize_new_project.bat
rm ./Scripts/Unix/initialize_new_project.sh

######################
# Fix name in template
######################

# Project File
cd ./src/$NAME/
CF=$NAME.ts
echo "import * as Main from './src/Main';" > $CF
echo "module.exports = Main.$NAME;" >> $CF

# Main File
cd ./src/
CF=Main.ts
sed -i "s/_name_/${NAME}/g" ./$CF
sed -i "s/_core_/${CORE}/g" ./$CF

########################################
# Keep console open when script finishes
########################################

echo "Press any key to continue"
read 1
