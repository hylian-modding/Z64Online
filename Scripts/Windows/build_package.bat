:: Get to repo root
cd ..\..\

:: Clone plugin to ModLoader64
rmdir /s /q .\ModLoader64\mods
rmdir /s /q .\ModLoader64\build\mods
robocopy src ModLoader64\mods /s /e

:: Get to ModLoader64 Scripts Directory
cd .\ModLoader64\Scripts\Windows\

:: Run official script
call build_no_run.bat

:: Get to repo root
cd ..\

:: Run packager
rmdir /s /q .\dist
mkdir .\dist
robocopy ModLoader64\build\mods dist /s /e
cd .\dist\

:: Detect and pack any/all plugins
for /d %%i IN (*.*) do (
    node ..\ModLoader64\PayloadConverter\build\paker.js --dir=./%%i
)

:: Keep console open when script finishes
pause