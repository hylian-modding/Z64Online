:: Get to repo root
cd ..\..\

:: Clone plugin to ModLoader64
robocopy src ModLoader64\build\mods /s /e

:: Get to ModLoader64 Scripts Directory
cd .\ModLoader64\Scripts\Windows\

:: Run official script
call start_p2.bat