@echo off
echo ========================================
echo WIRTHFORGE REPOSITORY ASSET REORGANIZATION
echo ========================================
echo.
echo This script will:
echo 1. Remove duplicate assets from archive/GPT_5_DOCUMENTS/
echo 2. Consolidate all assets into proper structure
echo 3. Create master asset inventory
echo.
pause

REM Create backup timestamp
set timestamp=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%

echo Creating backup of current structure...
mkdir "backup_%timestamp%" 2>nul
xcopy "archive" "backup_%timestamp%\archive\" /E /I /Q
xcopy "assets" "backup_%timestamp%\assets\" /E /I /Q
xcopy "deliverables" "backup_%timestamp%\deliverables\" /E /I /Q

echo.
echo Phase 1: Removing duplicate diagrams from archive...
REM Remove duplicate .mmd files that exist in main assets/diagrams/
for %%f in (assets\diagrams\*.mmd) do (
    if exist "archive\GPT_5_DOCUMENTS\assets\diagrams\%%~nxf" (
        echo Removing duplicate: archive\GPT_5_DOCUMENTS\assets\diagrams\%%~nxf
        del "archive\GPT_5_DOCUMENTS\assets\diagrams\%%~nxf"
    )
)

echo.
echo Phase 2: Removing duplicate schemas from archive...
REM Remove duplicate .json files that exist in main assets/schemas/
for %%f in (assets\schemas\*.json) do (
    if exist "archive\GPT_5_DOCUMENTS\data\%%~nxf" (
        echo Removing duplicate: archive\GPT_5_DOCUMENTS\data\%%~nxf
        del "archive\GPT_5_DOCUMENTS\data\%%~nxf"
    )
)

echo.
echo Phase 3: Removing duplicate visual assets from archive...
REM Remove duplicate .svg files that exist in main assets/visuals/
for %%f in (assets\visuals\*.svg) do (
    if exist "archive\GPT_5_DOCUMENTS\assets\visual\%%~nxf" (
        echo Removing duplicate: archive\GPT_5_DOCUMENTS\assets\visual\%%~nxf
        del "archive\GPT_5_DOCUMENTS\assets\visual\%%~nxf"
    )
)

echo.
echo Phase 4: Moving unique archive assets to main structure...
REM Move any remaining unique assets from archive to main structure
if exist "archive\GPT_5_DOCUMENTS\assets\diagrams\*.mmd" (
    echo Moving unique diagrams from archive...
    move "archive\GPT_5_DOCUMENTS\assets\diagrams\*.mmd" "assets\diagrams\" 2>nul
)

if exist "archive\GPT_5_DOCUMENTS\data\*.json" (
    echo Moving unique schemas from archive...
    move "archive\GPT_5_DOCUMENTS\data\*.json" "assets\schemas\" 2>nul
)

if exist "archive\GPT_5_DOCUMENTS\assets\visual\*.svg" (
    echo Moving unique visuals from archive...
    move "archive\GPT_5_DOCUMENTS\assets\visual\*.svg" "assets\visuals\" 2>nul
)

echo.
echo Phase 5: Creating asset manifests directory...
mkdir "assets\manifests" 2>nul

echo.
echo Phase 6: Cleaning up empty archive directories...
rmdir "archive\GPT_5_DOCUMENTS\assets\diagrams" 2>nul
rmdir "archive\GPT_5_DOCUMENTS\assets\visual" 2>nul
rmdir "archive\GPT_5_DOCUMENTS\assets" 2>nul
rmdir "archive\GPT_5_DOCUMENTS\data" 2>nul

echo.
echo ========================================
echo REORGANIZATION COMPLETE
echo ========================================
echo.
echo Backup created in: backup_%timestamp%
echo.
echo Next steps:
echo 1. Run GENERATE_ASSET_INVENTORY.bat to create master inventory
echo 2. Validate all document links still work
echo 3. Update README.md if needed
echo.
pause
