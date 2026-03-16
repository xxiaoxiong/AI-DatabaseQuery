@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title AI-DatabaseQuery 部署工具

:menu
cls
echo.
echo ============================================================
echo   AI-DatabaseQuery 部署工具
echo ============================================================
echo.
echo 1. 部署应用（生成 release 文件夹）
echo 2. 启动应用
echo 3. 退出
echo.

set /p choice="请选择 (1-3): "

if "%choice%"=="1" goto deploy_app
if "%choice%"=="2" goto start_app
if "%choice%"=="3" exit /b 0
goto menu

REM ============================================================
REM 部署应用
REM ============================================================
:deploy_app
cls
echo.
echo 正在部署应用...
echo.

REM 检查文件
if not exist "backend\app\main.py" (
    echo ✗ 未找到后端文件
    pause
    goto menu
)

if not exist "frontend\dist\index.html" (
    echo [INFO] 前端未构建，正在构建...
    cd frontend
    if not exist node_modules (
        echo 安装前端依赖...
        call npm install >nul 2>&1
    )
    call npm run build >nul 2>&1
    cd ..
)

REM 创建 release 目录
if exist release rmdir /s /q release >nul 2>&1
mkdir release

REM 复制后端文件
xcopy backend release\backend /E /I /Y >nul
xcopy frontend\dist release\web /E /I /Y >nul
copy config.template release\.env >nul

REM 创建启动脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo title AI-DatabaseQuery Backend
echo cd /d "%%~dp0"
echo echo.
echo echo ============================================================
echo echo   AI-DatabaseQuery 后端服务
echo echo ============================================================
echo echo.
echo echo 启动后端服务...
echo echo.
echo cd backend
echo .\venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
echo pause
) > release\启动后端.bat

(
echo @echo off
echo chcp 65001 ^>nul
echo title AI-DatabaseQuery Frontend
echo cd /d "%%~dp0"
echo echo.
echo echo ============================================================
echo echo   AI-DatabaseQuery 前端服务
echo echo ============================================================
echo echo.
echo echo 启动前端服务...
echo echo.
echo python -m http.server 5173 --directory web
echo pause
) > release\启动前端.bat

(
echo @echo off
echo chcp 65001 ^>nul
echo setlocal enabledelayedexpansion
echo title AI-DatabaseQuery
echo cd /d "%%~dp0"
echo.
echo echo ============================================================
echo echo   AI-DatabaseQuery 一键启动
echo echo ============================================================
echo echo.
echo echo 正在启动服务...
echo echo.
echo.
echo start "AI-DatabaseQuery Backend" cmd /k "cd backend ^&^& .\venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo timeout /t 3 /nobreak ^>nul
echo.
echo start "AI-DatabaseQuery Frontend" cmd /k python -m http.server 5173 --directory web
echo timeout /t 2 /nobreak ^>nul
echo.
echo echo ============================================================
echo echo   ✓ 服务已启动
echo echo ============================================================
echo echo.
echo echo 后端地址: http://localhost:8000
echo echo 前端地址: http://localhost:5173
echo echo API 文档: http://localhost:8000/docs
echo echo.
echo echo 按任意键关闭此窗口...
echo pause ^>nul
) > release\启动所有.bat

echo ✓ 部署完成！
echo.
echo 文件位置: release\
echo.
echo 下一步:
echo   1. 编辑 release\.env 配置数据库和模型地址
echo   2. 双击 release\启动所有.bat 启动应用
echo.
pause
goto menu

REM ============================================================
REM 启动应用
REM ============================================================
:start_app
cls
echo.
echo 正在启动应用...
echo.

if not exist "release\启动所有.bat" (
    echo ✗ 未找到启动脚本，请先执行"部署应用"
    pause
    goto menu
)

call release\启动所有.bat
goto menu
