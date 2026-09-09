@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Quarto Editor Enhancements 0.4.0 - build

echo ============================================================
echo Quarto Editor Enhancements 0.4.0 - build
echo ============================================================
echo.

set "GRADLE_VERSION=9.1.0"
set "ROOT=%~dp0"
set "TOOLS=%ROOT%.tools"
set "GRADLE_HOME=%TOOLS%\gradle-%GRADLE_VERSION%"
set "JAVA_HOME_FOUND="

rem Ignore a broken global JAVA_HOME instead of inheriting it.
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JAVA_HOME_FOUND=%JAVA_HOME%"

rem Prefer the runtime bundled with the requested PyCharm installation.
if not defined JAVA_HOME_FOUND if exist "C:\Program Files\JetBrains\PyCharm 2025.1.2\jbr\bin\java.exe" (
  set "JAVA_HOME_FOUND=C:\Program Files\JetBrains\PyCharm 2025.1.2\jbr"
)

rem Standard JetBrains installations.
if not defined JAVA_HOME_FOUND (
  for /d %%D in ("%ProgramFiles%\JetBrains\PyCharm*\jbr") do if exist "%%~fD\bin\java.exe" set "JAVA_HOME_FOUND=%%~fD"
)
if not defined JAVA_HOME_FOUND (
  for /d %%D in ("%LOCALAPPDATA%\Programs\PyCharm*\jbr") do if exist "%%~fD\bin\java.exe" set "JAVA_HOME_FOUND=%%~fD"
)

rem JetBrains Toolbox. Any bundled JBR is sufficient for this build.
if not defined JAVA_HOME_FOUND if exist "%LOCALAPPDATA%\JetBrains\Toolbox\apps" (
  for /r "%LOCALAPPDATA%\JetBrains\Toolbox\apps" %%J in (java.exe) do (
    if not defined JAVA_HOME_FOUND if /i "%%~nxJ"=="java.exe" if exist "%%~fJ" (
      for %%B in ("%%~dpJ..") do set "JAVA_HOME_FOUND=%%~fB"
    )
  )
)

rem Fall back to Java on PATH.
if not defined JAVA_HOME_FOUND (
  for /f "delims=" %%J in ('where java.exe 2^>nul') do if not defined JAVA_HOME_FOUND (
    for %%B in ("%%~dpJ..") do set "JAVA_HOME_FOUND=%%~fB"
  )
)

if not defined JAVA_HOME_FOUND goto :java_fail
if not exist "%JAVA_HOME_FOUND%\bin\java.exe" goto :java_fail

set "JAVA_HOME=%JAVA_HOME_FOUND%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Using JAVA_HOME:
echo   %JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version
if errorlevel 1 goto :fail
echo.

if not exist "%GRADLE_HOME%\bin\gradle.bat" (
  echo Downloading Gradle %GRADLE_VERSION%...
  if not exist "%TOOLS%" mkdir "%TOOLS%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip' -OutFile '%TOOLS%\gradle.zip'"
  if errorlevel 1 goto :gradle_download_fail
  echo Extracting Gradle...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%TOOLS%\gradle.zip' -DestinationPath '%TOOLS%' -Force"
  if errorlevel 1 goto :fail
)

echo Building plugin...
echo The first build can take several minutes because Gradle downloads the PyCharm 2025.1.2 SDK.
echo.
call "%GRADLE_HOME%\bin\gradle.bat" --console=plain buildPlugin
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo BUILD SUCCESSFUL
echo ============================================================
echo.
echo Install this file in PyCharm:
echo   %ROOT%build\distributions\quarto-editor-enhancements-0.4.0.zip
echo.
pause
exit /b 0

:java_fail
echo ERROR: Could not find a valid Java runtime.
echo.
echo Your current JAVA_HOME may be invalid. This script ignores invalid JAVA_HOME values,
echo but it also needs to locate a Java runtime supported by Gradle.
echo.
echo In PyCharm open Help ^> About and copy the Runtime path ending in \jbr.
echo Then open Command Prompt in this folder and run, for example:
echo   set "JAVA_HOME=C:\Program Files\JetBrains\PyCharm 2025.1.2\jbr"
echo   build-plugin.bat
goto :fail

:gradle_download_fail
echo ERROR: Could not download Gradle. Check internet/proxy settings.
goto :fail

:fail
echo.
echo ============================================================
echo BUILD DID NOT COMPLETE
echo ============================================================
echo.
pause
exit /b 1
