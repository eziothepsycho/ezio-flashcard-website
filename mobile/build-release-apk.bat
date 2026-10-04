@echo off
rem Builds the installable release APK for the phone (see mobile/README.md).
rem
rem JDK 21, not Android Studio's bundled JBR (25): AGP's Prefab step rejects the
rem "A restricted method in java.lang.System has been called" warning that JDK 24+
rem prints on stderr, so Gradle has to run on a JDK that does not print it.
set "JAVA_HOME=C:\Users\daryl\jdk21\jdk-21.0.12.1+1"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "JDK_JAVA_OPTIONS="
cd /d "%~dp0android"
echo Building app-release.apk ... (output is also written to build-release.log)
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\gradlew.bat' assembleRelease 2>&1 | Tee-Object -FilePath 'build-release.log'; exit $LASTEXITCODE"
echo.
echo EXIT:%ERRORLEVEL%
if exist "app\build\outputs\apk\release\app-release.apk" (echo APK: %CD%\app\build\outputs\apk\release\app-release.apk) else (echo APK NOT FOUND - see build-release.log)

