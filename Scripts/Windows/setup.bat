:: Get to Modloader64 scripts directory
cd ..\..\ModLoader64\Scripts\Windows\

:: Invoke ModLoader64 build script
call setup.bat

:: Get to repo root
cd ..\..\

:: Clone API folder to repo root
rmdir /s /q .\API
robocopy ModLoader64\API API /s /e

:: Install the repo
dry install

:: Keep console open when script finishes
pause