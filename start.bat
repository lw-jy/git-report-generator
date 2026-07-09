@echo off
cd /d "%~dp0"

echo [1/3] 安装后端依赖...
cd server
call npm install
cd ..

echo [2/3] 构建前端...
call npm run build

echo [3/3] 启动服务...
npm start
