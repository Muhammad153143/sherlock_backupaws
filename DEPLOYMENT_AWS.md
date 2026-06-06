# AWS Deployment Guide for SherLock

## Prerequisites
- AWS Account
- EC2 Instance (Ubuntu 22.04 or 24.04 recommended)
- MongoDB Atlas Account
- Domain Name (optional, for HTTPS)

## EC2 Security Group Setup
Allow inbound traffic:
- SSH (Port 22) - Your IP only
- HTTP (Port 80) - 0.0.0.0/0
- HTTPS (Port 443) - 0.0.0.0/0

## Step 1: Connect to EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 2: Update System Packages
```bash
sudo apt update
sudo apt upgrade -y
```

## Step 3: Install Dependencies
```bash
sudo apt install -y git nginx python3 python3-pip python3-venv build-essential tesseract-ocr
```

## Step 4: Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Step 5: Install PM2
```bash
sudo npm install -g pm2
```

## Step 6: Clone the Project
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

## Step 7: Backend Setup
```bash
cd backend
npm install
npm install axios form-data
```

Create backend `.env` file:
```bash
nano .env
```

Add the following:
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/sherlock
JWT_SECRET=your-strong-jwt-secret
AI_SERVICE_URL=http://localhost:10000
FRONTEND_URL=http://your-ec2-public-ip
```

## Step 8: AI Service Setup
```bash
cd ../ai_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Step 9: Start Services with PM2

### Backend
```bash
cd ../backend
pm2 start server.js --name sherlock-backend
```

### AI Service
```bash
cd ../ai_service
pm2 start "venv/bin/gunicorn -w 1 -b 0.0.0.0:10000 app:app" --name sherlock-ai
```

### Save PM2 Configuration
```bash
pm2 save
pm2 startup
```
Follow the instructions from `pm2 startup` to make PM2 run on system boot.

## Step 10: Configure Nginx

Create Nginx config file:
```bash
sudo nano /etc/nginx/sites-available/sherlock
```

Add the following (replace `your-ec2-public-ip`):
```nginx
server {
    listen 80;
    server_name your-ec2-public-ip;

    root /var/www/sherlock;
    index index.html;

    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ai/ {
        proxy_pass http://localhost:10000/;
        proxy_set_header Host $host;
    }

    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
    }
}
```

Enable the config:
```bash
sudo ln -s /etc/nginx/sites-available/sherlock /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 11: Deploy Frontend
```bash
sudo mkdir -p /var/www/sherlock
sudo cp -r ../frontend/* /var/www/sherlock/
sudo systemctl restart nginx
```

## Step 12: Verify Deployment
Check the following URLs:
- Frontend: `http://your-ec2-public-ip`
- Backend Health: `http://your-ec2-public-ip/api/health`
- AI Service Health: `http://your-ec2-public-ip/ai/health`

## Optional: HTTPS with Certbot
If you have a domain name:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Update URLs in frontend config to use HTTPS.
