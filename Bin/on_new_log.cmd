setlocal

rem !!!! START OF TUNABLE PARAMETERS SECTION

set retention_period=30

rem !!! END OF TUNABLE PARAMETERS SECTION



set event_log_host=%1
set event_log_dir=%2
set database_name=%~3
set database_dir=%~f4
set logopt_stop=%5
set mode=%6
set archive_dir=%database_dir%\archive


if "%mode%"=="" ( 
	(cmd /c "%0 %1 %2 %3 %4 %5 redirected" > "%~4\%~3.on_new_log.log" 2>&1 && exit /b 0) || exit /b 1
)


rem optimize log
logopt -make %event_log_host% %event_log_dir% "%database_name%" "%database_dir%" %logopt_stop% || set error_source=Failed to optimize log

rem clean temporary files possibly left by previous run
logopt -clean "%database_name%" "%database_dir%"
logopt -clean "%database_name%" "%archive_dir%"

rem find out latest optimized log and corresponding log file
(for /f "useback tokens=1,2 delims=:" %%s in (`logopt -query "%database_name%" "%database_dir%"`) do (
	if "%%s"=="latest optimized log" (
		set latest_optimized_log=%%t )
	if "%%s"=="continue with log" (
		set continue_with_log=%%t )
)) || set error_source=Failed to find out latest optimized log


echo %latest_optimized_log%
echo %continue_with_log%

rem remove unnecessary optimized log files in the database folder
for %%f in ("%database_dir%\%database_name%.????????????.optlog") do (
	if "%%~nxf" LSS "%latest_optimized_log%" (
		del %%f
		rem del command doesn't set errorlevel so check if file actually has been removed
		if exist %%f set error_source=Failed to remove %%~nxf from database folder
	)
)

rem move unnecessary log files to archive folder
mkdir "%archive_dir%"
for %%f in ("%database_dir%\%database_name%.????????????.log") do (
	if "%%~nxf" LSS "%continue_with_log%" (
		move %%f "%archive_dir%\" || set error_source=Failed to move %%~nxf to archive folder
		compact /c "%archive_dir%\%%~nxf"
	)
)

rem create logopt file based on outdated log files to ensure safe removal of log files
for /f "usebackq delims=" %%f in (`forfiles /D -%retention_period% /P "%archive_dir%" /M "%database_name%.????????????.log" ^| sort /R`) do (
	rem make sure we have optimized this file

	logopt -make-advanced %event_log_host% %event_log_dir% "%database_name%" "%database_dir%" "%archive_dir%" %%f || set error_source=Failed to optimize log
)


rem find out latest optimized log and corresponding log file
set latest_optimized_log=
set continue_with_log=
(for /f "useback tokens=1,2 delims=:" %%s in (`logopt -query "%database_name%" "%database_dir%" "%archive_dir%"`) do (
	if "%%s"=="latest optimized log" (
		set latest_optimized_log=%%t )
	if "%%s"=="continue with log" (
		set continue_with_log=%%t )
)) || set error_source=Failed to find out latest optimized log


echo %latest_optimized_log%
echo %continue_with_log%

rem remove unnecessary optimized log files from archive folder
for %%f in ("%archive_dir%\%database_name%.????????????.optlog") do (
	if "%%~nxf" LSS "%latest_optimized_log%" (
		del %%f
		rem del command doesn't set errorlevel so check if file actually has been removed
		if exist %%f set error_source=Failed to remove %%~nxf from archive folder

	)
)

rem remove unnecessary log files from archive folder
for %%f in ("%archive_dir%\%database_name%.????????????.log") do (
	if "%%~nxf" LSS "%continue_with_log%" (
		del %%f
		rem del command doesn't set errorlevel so check if file actually has been removed
		if exist %%f set error_source=Failed to remove %%~nxf from archive folder
	)
)



if not "%error_source%"=="" (
  sccorelogcmd.exe %event_log_host% %event_log_dir% WARNING LogRetention 0 "%error_source%. Please inspect %~3.on_new_log.log for more details."
)
