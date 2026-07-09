@echo off
cd /d "%~dp0"

echo [1/3] 安装后端依赖...
cd server
call npm install
cd ..

echo [2/3] 构建前端...
call npm run build

echo [3/3] 正在启动服务...
start "Git Report" cmd /c "npm start"
echo 正在打开浏览器...
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo 服务已启动，如未自动打开浏览器请手动访问 http://localhost:3000
echo 关闭此窗口不会影响服务运行，关闭服务请在终端按 Ctrl+C
