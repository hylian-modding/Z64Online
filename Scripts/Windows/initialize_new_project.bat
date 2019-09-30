@echo off 

:: #############
:: Get to repo root
:: #############

CD ..\..\

:: ########################
:: Create source folder for later
:: ########################

MKDIR .\src

:: ################################
:: Get some information about the project
:: ################################

:is_online_prompt
SET /P N=Do you want to make a networked plugin? [y/n]
IF /I "%N%" EQU "y" GOTO :is_online_end
IF /I "%N%" EQU "n" GOTO :is_online_end
ECHO Invalid response
GOTO :is_online_prompt
:is_online_end

SET /P c=What is the name of the plugin - without spaces? (MyPlugin)
SET "c=%c: =%"
IF /I "%c%" EQU "" (
    SET NAME=MyPlugin
) ELSE (
    SET NAME=%c%
)

SET v=1.0.0
SET /P v=What is the version of the plugin? (1.0.0)
SET "v=%v: =%"
IF /I "%v%" EQU "" (
    SET VERSION=1.0.0
) ELSE (
    SET VERSION=%v%
)

SET /P DESCRIPTION=What is the description of the plugin?
SET /P AUTHOR=Who is the author of the plugin?
SET /P CREDITS=Who else should have credits?
SET /P LICENSE=What license should this plugin be under?

SET /P c=What game core does this plugin target? (optional?)
SET "CORE=%c: =%"

:: #####################
:: Make directory variables
:: #####################

SET FD=.\Scripts\Template_Do_Not_Touch
SET CF=%FD%\package.json

:: ###################################
:: Copy the template type to source directory
:: ###################################

IF /I "%N%" EQU "y" ROBOCOPY %FD%\online\  .\src\%NAME% /s /e
IF /I "%N%" EQU "n" ROBOCOPY %FD%\offline\  .\src\%NAME% /s /e

:: ################
:: Create package file
:: ################

ECHO { > %CF%
ECHO   "name": "%NAME%", >> %CF%
ECHO   "version": "%VERSION%", >> %CF%
ECHO   "description": "%DESCRIPTION%", >> %CF%
ECHO   "main": "%NAME%.js", >> %CF%
ECHO   "author": "%AUTHOR%", >> %CF%
ECHO   "credits": "%CREDITS%", >> %CF%
ECHO   "license": "%LICENSE%", >> %CF%
ECHO   "core": "%CORE%", >> %CF%
ECHO   "dry": { >> %CF%
ECHO     "extends": "./ModLoader64/package-dry.json" >> %CF%
ECHO   } >> %CF%
ECHO } >> %CF%

:: ####################################
:: Transport package info to appropraite place
:: ####################################

COPY %CF% .\
COPY %CF% .\src\%NAME%\
COPY %FD%\fart.exe .\src\%NAME%\src\
RENAME package.json package-dry.json

:: ######################
:: Cleanup unnecessary files
:: ######################

RMDIR /s /q %FD%
DEL .\Scripts\Unix\initialize_new_project.sh

:: #################
:: Fix name in template
:: #################

:: Project File
CD .\src\%NAME%\
SET CF=%NAME%.ts
ECHO import * as Main from './src/Main'; > %CF%
ECHO module.exports = Main.%NAME%; >> %CF%

:: Main File
CD .\src\
SET CF=Main.ts
CALL fart.exe -r %CF% _name_ %NAME%
CALL fart.exe -r %CF% _core_ %CORE%
DEL .\fart.exe

:: ###############
:: Delete this script
:: ###############
CD ..\..\..\
DEL .\Scripts\Windows\initialize_new_project.bat

:: #################################
:: Keep console open when script finishes
:: #################################

PAUSE