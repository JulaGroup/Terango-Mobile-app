#!/bin/bash
# Digital Ocean Droplet Deployment Script for TeranGO Web App

echo "🌊 Digital Ocean Deployment Setup for TeranGO"
echo "=============================================="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Node.js (for future builds)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Create directory for web app
sudo mkdir -p /var/www/terango

# Remove default nginx config
sudo rm /etc/nginx/sites-enabled/default

# Create nginx config for TeranGO
sudo tee /etc/nginx/sites-available/terango << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/terango;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Handle React Router / Expo Router routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/terango /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create upload script
sudo tee /var/www/upload-build.sh << 'EOF'
#!/bin/bash
echo "Upload your dist/ folder contents to /var/www/terango/"
echo "You can use SCP or SFTP:"
echo "scp -r dist/* root@your-server-ip:/var/www/terango/"
EOF

sudo chmod +x /var/www/upload-build.sh

# Install SSL with Certbot (Let's Encrypt)
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your build files: scp -r dist/* root@YOUR_SERVER_IP:/var/www/terango/"
echo "2. Setup SSL: sudo certbot --nginx"
echo "3. Point your domain to this server"
echo ""
echo "Your TeranGO web app will be available at: http://your-domain.com"