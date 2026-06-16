# Deploy to Tencent Cloud CVM

PhotoScan Lab 是纯前端静态站点，推荐在腾讯云 CVM 上用 Nginx 托管 `dist/` 目录。

## 1. 腾讯云控制台准备

在 CVM 安全组中放行：

- `22`：SSH 登录
- `80`：HTTP 访问
- `443`：HTTPS 访问，可稍后配置证书时再放行

## 2. 服务器安装 Nginx

Ubuntu / Debian:

```bash
sudo apt update
sudo apt install -y nginx rsync
```

CentOS / TencentOS:

```bash
sudo yum install -y nginx rsync
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 3. 创建站点目录

```bash
sudo mkdir -p /var/www/photoscan-lab
sudo chown -R "$USER":"$USER" /var/www/photoscan-lab
```

## 4. 本地构建并上传

在本地项目目录执行：

```bash
npm install
npm run build
```

直接用 `rsync` 上传：

```bash
rsync -az --delete dist/ root@YOUR_SERVER_IP:/var/www/photoscan-lab/
```

也可以使用项目里的脚本：

```bash
SSH_USER=root \
SSH_HOST=YOUR_SERVER_IP \
DEPLOY_PATH=/var/www/photoscan-lab \
./scripts/deploy-static.sh
```

如果你使用 SSH key：

```bash
SSH_USER=root \
SSH_HOST=YOUR_SERVER_IP \
SSH_KEY=~/.ssh/tencent-cloud.pem \
DEPLOY_PATH=/var/www/photoscan-lab \
./scripts/deploy-static.sh
```

## 5. 配置 Nginx

创建配置文件：

```bash
sudo nano /etc/nginx/conf.d/photoscan-lab.conf
```

写入：

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_SERVER_IP;

    root /var/www/photoscan-lab;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|svg|png|jpg|jpeg|webp|ico)$ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

然后访问：

```text
http://YOUR_DOMAIN_OR_SERVER_IP
```

## 6. 配置 HTTPS

如果你已经有域名并解析到了这台 CVM，可以用 Certbot 配置免费证书。

Ubuntu / Debian:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

CentOS / TencentOS:

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## 7. 后续更新

每次更新代码后，本地执行：

```bash
git pull
npm install
SSH_USER=root SSH_HOST=YOUR_SERVER_IP DEPLOY_PATH=/var/www/photoscan-lab ./scripts/deploy-static.sh
```

脚本会重新构建并覆盖服务器上的旧 `dist/` 文件。

## Existing Caddy / Docker Setup

如果服务器上已经有 Caddy 容器占用了 `80` 和 `443`，不要再启动系统 Nginx。可以继续复用 Caddy：

1. 把构建产物上传到服务器目录：

```bash
SSH_USER=ubuntu \
SSH_HOST=YOUR_SERVER_IP \
DEPLOY_PATH=/var/www/photoscan-lab \
./scripts/deploy-static.sh
```

2. 给 Caddy 容器增加只读挂载：

```yaml
volumes:
  - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
  - /var/www/photoscan-lab:/srv/photoscan-lab:ro
  - caddy_data:/data
  - caddy_config:/config
```

3. 在 `Caddyfile` 里增加静态站点：

```caddyfile
http://YOUR_SERVER_IP {
  encode zstd gzip
  root * /srv/photoscan-lab
  try_files {path} /index.html
  file_server
}
```

4. 重建 Caddy 容器：

```bash
docker compose up -d caddy
```
