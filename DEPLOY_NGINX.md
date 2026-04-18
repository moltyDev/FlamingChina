# Nginx Deployment (Ubuntu)

This app runs as a Node.js process (`next start`) behind Nginx reverse proxy.

## 1) Server prerequisites

```bash
sudo apt update
sudo apt install -y nginx curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2) Pull project

```bash
sudo mkdir -p /var/www/flamingchina
sudo chown -R $USER:$USER /var/www/flamingchina
cd /var/www/flamingchina

git clone https://github.com/moltyDev/FlamingChina.git .
```

## 3) Production env

Create `/var/www/flamingchina/.env.production` (do not commit this file):

```env
FC_JWT_SECRET=replace-with-a-long-random-secret
FC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
FC_SOLANA_MINT_ADDRESS=Bw4BayYqXifqyEBPPwAboRSrfd6w3iGuMoKtZmscpump

NEXT_PUBLIC_FC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_FC_SOLANA_MINT_ADDRESS=Bw4BayYqXifqyEBPPwAboRSrfd6w3iGuMoKtZmscpump
NEXT_PUBLIC_FC_TOKEN_THRESHOLD=1000
```

## 4) Install and build

```bash
cd /var/www/flamingchina
npm ci
npm run build
```

## 5) Systemd service

```bash
sudo cp deploy/systemd/flamingchina.service /etc/systemd/system/flamingchina.service
sudo systemctl daemon-reload
sudo systemctl enable flamingchina
sudo systemctl restart flamingchina
sudo systemctl status flamingchina --no-pager
```

## 6) Nginx site

```bash
sudo cp deploy/nginx/flamingchina.conf /etc/nginx/sites-available/flamingchina
sudo ln -sf /etc/nginx/sites-available/flamingchina /etc/nginx/sites-enabled/flamingchina
sudo nginx -t
sudo systemctl reload nginx
```

Set your domain in `/etc/nginx/sites-available/flamingchina` (`server_name`).

## 7) TLS (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d flamingchina.yourdomain.com
```

## 8) Update workflow

```bash
cd /var/www/flamingchina
git pull origin main
npm ci
npm run build
sudo systemctl restart flamingchina
```

## Useful checks

```bash
curl -I http://127.0.0.1:3000
curl -I http://your-domain
sudo journalctl -u flamingchina -n 200 --no-pager
```