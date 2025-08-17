@echo off
echo Starting WIRTHFORGE directory reorganization...

REM Create archive directory and move GPT_5_DOCUMENTS
if not exist "archive" mkdir "archive"
move "GPT_5_DOCUMENTS" "archive\"

REM Move TECH directories to technical
move "TECH-001" "technical\"
move "TECH-002" "technical\"
move "WF-TECH-002-LOCAL-INTEGRATION.md" "technical\TECH-002\"

REM Create asset subdirectories
if not exist "assets\diagrams" mkdir "assets\diagrams"
if not exist "assets\visuals" mkdir "assets\visuals"
if not exist "assets\schemas" mkdir "assets\schemas"
if not exist "assets\templates" mkdir "assets\templates"

REM Create deliverable subdirectories
if not exist "deliverables\code" mkdir "deliverables\code"
if not exist "deliverables\configs" mkdir "deliverables\configs"
if not exist "deliverables\tests" mkdir "deliverables\tests"
if not exist "deliverables\docs" mkdir "deliverables\docs"

REM Copy meta documents from archive
copy "archive\GPT_5_DOCUMENTS\WF-META-*.md" "meta\"

REM Copy assets from archive
copy "archive\GPT_5_DOCUMENTS\assets\diagrams\*.mmd" "assets\diagrams\"
copy "archive\GPT_5_DOCUMENTS\assets\visual\*.svg" "assets\visuals\"
copy "archive\GPT_5_DOCUMENTS\data\*.json" "assets\schemas\"

echo Reorganization complete!
pause
