#!/bin/bash

# OnlySpecs 自动化部署脚本
# 用于将项目部署到阿里云服务器

set -e

echo "🚀 OnlySpecs 部署脚本"
echo "===================="
echo ""

# 配置变量
SERVER_USER="root"
SERVER_IP=""
DEPLOY_PATH="/opt/onlyspecs"

# 检查是否提供了服务器IP
if [ -z "$SERVER_IP" ]; then
    read -p "请输入服务器IP地址: " SERVER_IP
fi

echo "📦 步骤 1/5: 打包项目..."
tar -czf onlyspecs-deploy.tar.gz \
    src/ \
    api-integration/ \
    package.json \
    tsconfig.json \
    --exclude=node_modules \
    --exclude=*.log \
    --exclude=.git

echo "✅ 打包完成: onlyspecs-deploy.tar.gz"
echo ""

echo "📤 步骤 2/5: 上传到服务器..."
scp onlyspecs-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

echo "✅ 上传完成"
echo ""

echo "🔧 步骤 3/5: 在服务器上安装依赖..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
set -e

# 创建部署目录
sudo mkdir -p /opt/onlyspecs
cd /opt/onlyspecs

# 解压项目
sudo tar -xzf /tmp/onlyspecs-deploy.tar.gz -C /opt/onlyspecs
sudo rm /tmp/onlyspecs-deploy.tar.gz

# 检查并安装Node.js
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 检查并安装Python
if ! command -v python3 &> /dev/null; then
    echo "安装 Python..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

# 检查并安装Docker
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
fi

echo "✅ 依赖安装完成"
ENDSSH

echo ""
echo "📦 步骤 4/5: 安装项目依赖..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/onlyspecs

# 安装Node依赖
npm install

# 安装Python依赖
cd api-integration
pip3 install -r requirements.txt
cd ..

# 拉取Docker镜像
docker pull cdrx/pyinstaller-windows

echo "✅ 项目依赖安装完成"
ENDSSH

echo ""
echo "🚀 步骤 5/5: 启动服务..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/onlyspecs

# 停止旧服务
pkill -f "tsx src/api-server" || true
pkill -f "python.*app.py" || true

# 启动API服务器
nohup npm run api > /var/log/onlyspecs-api.log 2>&1 &

# 启动前端服务器
cd api-integration
nohup python3 app.py > /var/log/onlyspecs-frontend.log 2>&1 &

echo "✅ 服务启动完成"
echo ""
echo "📊 服务状态:"
sleep 2
ps aux | grep -E "tsx|app.py" | grep -v grep
ENDSSH

echo ""
echo "🎉 部署完成！"
echo ""
echo "访问地址: http://${SERVER_IP}:9000"
echo ""
echo "日志位置:"
echo "  - API服务器: /var/log/onlyspecs-api.log"
echo "  - 前端服务器: /var/log/onlyspecs-frontend.log"
echo ""
echo "⚠️  重要提示:"
echo "1. 请在服务器上配置 ANTHROPIC_API_KEY 环境变量"
echo "2. 配置防火墙开放 3580 和 9000 端口"
echo "3. 建议使用 systemd 或 PM2 管理服务进程"
