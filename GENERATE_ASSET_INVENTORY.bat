@echo off
echo ========================================
echo WIRTHFORGE ASSET INVENTORY GENERATOR
echo ========================================
echo.

REM Create timestamp for inventory
set timestamp=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set timestamp=%timestamp: =0%

echo Generating comprehensive asset inventory...
echo Timestamp: %timestamp%
echo.

REM Create inventory file
set inventory_file=ASSET_INVENTORY_%timestamp%.md
echo # WIRTHFORGE Asset Inventory > %inventory_file%
echo Generated: %timestamp% >> %inventory_file%
echo. >> %inventory_file%

echo ## Summary Statistics >> %inventory_file%
echo. >> %inventory_file%

REM Count files by type
echo ### File Counts by Type >> %inventory_file%
for /f %%i in ('dir /s /b *.mmd ^| find /c /v ""') do echo - Mermaid Diagrams: %%i >> %inventory_file%
for /f %%i in ('dir /s /b *.svg ^| find /c /v ""') do echo - SVG Visuals: %%i >> %inventory_file%
for /f %%i in ('dir /s /b *.json ^| find /c /v ""') do echo - JSON Schemas: %%i >> %inventory_file%
for /f %%i in ('dir /s /b *.yaml ^| find /c /v ""') do echo - YAML Files: %%i >> %inventory_file%
for /f %%i in ('dir /s /b *.py ^| find /c /v ""') do echo - Python Files: %%i >> %inventory_file%
for /f %%i in ('dir /s /b *.md ^| find /c /v ""') do echo - Markdown Files: %%i >> %inventory_file%
echo. >> %inventory_file%

echo ## Detailed Asset Inventory >> %inventory_file%
echo. >> %inventory_file%

echo ### Foundation Documents >> %inventory_file%
dir foundation\*.md /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Technical Documents >> %inventory_file%
dir technical\*.md /b >> %inventory_file% 2>nul
dir technical\TECH-001\*.* /b >> %inventory_file% 2>nul
dir technical\TECH-002\*.* /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Meta Documents >> %inventory_file%
dir meta\*.md /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Assets - Diagrams >> %inventory_file%
dir assets\diagrams\*.mmd /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Assets - Visuals >> %inventory_file%
dir assets\visuals\*.svg /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Assets - Schemas >> %inventory_file%
dir assets\schemas\*.json /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Assets - Templates >> %inventory_file%
dir assets\templates\*.* /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Deliverables - Code >> %inventory_file%
dir deliverables\code\*.* /b >> %inventory_file% 2>nul
dir deliverables\code\WF-TECH-001\*.* /b >> %inventory_file% 2>nul
dir deliverables\code\WF-TECH-002\*.* /b >> %inventory_file% 2>nul
dir deliverables\code\WF-TECH-003\*.* /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ### Archive Content >> %inventory_file%
echo #### Remaining Archive Documents >> %inventory_file%
dir archive\GPT_5_DOCUMENTS\*.md /b >> %inventory_file% 2>nul
echo. >> %inventory_file%
echo #### Remaining Archive Assets >> %inventory_file%
dir archive\GPT_5_DOCUMENTS\assets\diagrams\*.* /b >> %inventory_file% 2>nul
dir archive\GPT_5_DOCUMENTS\data\*.* /b >> %inventory_file% 2>nul
dir archive\GPT_5_DOCUMENTS\assets\visual\*.* /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ## Asset Cross-Reference Analysis >> %inventory_file%
echo. >> %inventory_file%
echo ### Missing Referenced Directories >> %inventory_file%
if not exist "ux\" echo - ux/ directory missing (referenced in README) >> %inventory_file%
if not exist "ops\" echo - ops/ directory missing (referenced in README) >> %inventory_file%
if not exist "business\" echo - business/ directory missing (referenced in README) >> %inventory_file%
if not exist "research\" echo - research/ directory missing (referenced in README) >> %inventory_file%
echo. >> %inventory_file%

echo ### Asset Manifest Files >> %inventory_file%
dir assets\*manifest*.* /b >> %inventory_file% 2>nul
echo. >> %inventory_file%

echo ## Recommendations >> %inventory_file%
echo. >> %inventory_file%
echo 1. Create missing directory structure for ux/, ops/, business/, research/ >> %inventory_file%
echo 2. Consolidate technical assets from technical/TECH-*/ into deliverables/ >> %inventory_file%
echo 3. Create master asset manifest linking all components >> %inventory_file%
echo 4. Validate all README links point to existing files >> %inventory_file%
echo 5. Archive historical documents properly >> %inventory_file%
echo. >> %inventory_file%

echo ========================================
echo INVENTORY COMPLETE
echo ========================================
echo.
echo Inventory saved to: %inventory_file%
echo.
echo Review the inventory to identify:
echo - Missing files referenced in documentation
echo - Orphaned assets not referenced anywhere
echo - Duplicate or conflicting assets
echo.
pause
