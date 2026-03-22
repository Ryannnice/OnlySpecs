# OnlySpecs 部署指南

## 快速部署

### 1. 使用自动化脚本部署

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本会提示输入服务器IP地址，然后自动完成所有部署步骤。

### 2. 配置API密钥

登录服务器后，配置环境变量：

```bash
# 编辑服务配置
sudo nano /etc/systemd/system/onlyspecs-api.service

# 修改这一行，填入你的API密钥
Environment="ANTHROPIC_API_KEY=sk-ant-xxxxx"

# 重新加载配置
sudo systemctl daemon-reload
sudo systemctl restart onlyspecs-api
```

### 3. 使用systemd管理服务

```bash
# 复制服务文件
sudo cp systemd/*.service /etc/systemd/system/

# 启用并启动服务
sudo systemctl enable onlyspecs-api
sudo systemctl enable onlyspecs-frontend
sudo systemctl start onlyspecs-api
sudo systemctl start onlyspecs-frontend

# 查看状态
sudo systemctl status onlyspecs-api
sudo systemctl status onlyspecs-frontend

# 查看日志
sudo journalctl -u onlyspecs-api -f
sudo journalctl -u onlyspecs-frontend -f
```

### 4. 配置防火墙

```bash
# 阿里云安全组规则
# 在阿里云控制台添加入站规则：
# - 端口 3580 (API服务器)
# - 端口 9000 (前端服务器)

# 服务器防火墙
sudo ufw allow 3580
sudo ufw allow 9000
sudo ufw enable
```

### 5. 配置Nginx反向代理（可选）

```bash
sudo apt-get install nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/onlyspecs
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3580/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/onlyspecs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 访问应用

- 直接访问: `http://your-server-ip:9000`
- 通过Nginx: `http://your-domain.com`

## 常用命令

```bash
# 重启服务
sudo systemctl restart onlyspecs-api
sudo systemctl restart onlyspecs-frontend

# 停止服务
sudo systemctl stop onlyspecs-api
sudo systemctl stop onlyspecs-frontend

# 查看日志
sudo journalctl -u onlyspecs-api --since today
sudo journalctl -u onlyspecs-frontend --since today

# 更新代码
cd /opt/onlyspecs
git pull
npm install
cd api-integration && pip3 install -r requirements.txt
sudo systemctl restart onlyspecs-api onlyspecs-frontend
```

## 故障排查

### 服务无法启动

```bash
# 查看详细错误
sudo journalctl -u onlyspecs-api -n 50
sudo journalctl -u onlyspecs-frontend -n 50

# 检查端口占用
sudo netstat -tlnp | grep 3580
sudo netstat -tlnp | grep 9000
```

### Docker权限问题

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### API密钥未配置

确保在 `/etc/systemd/system/onlyspecs-api.service` 中正确配置了 `ANTHROPIC_API_KEY`。

## 安全建议

1. 使用HTTPS（配置SSL证书）
2. 限制API访问（配置防火墙规则）
3. 定期更新依赖包
4. 配置日志轮转
5. 设置备份策略
