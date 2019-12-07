set back=%cd%
cd Z64\CustomActorToolkit
call assemble.bat
cd %back%
copy Z64\link_pvp.ovl src\OotOnline\payloads\E0\link_puppet.ovl
pause