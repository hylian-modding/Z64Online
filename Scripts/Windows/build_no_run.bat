:: Get to repo root
cd ..\..\

:: Clone plugin to ModLoader64
robocopy src ModLoader64\mods /s /e

:: Get to ModLoader64 Scripts Directory
cd .\ModLoader64\Scripts\Windows\

:: Run official script
call build_no_run.bat