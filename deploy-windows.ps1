# Digital Ocean Deployment Script for TeranGO Web App (PowerShell)
# Run this on your Digital Ocean Droplet

Write-Host "🌊 Digital Ocean Deployment for TeranGO" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check if running on Ubuntu/Digital Ocean
if (!(Get-Command apt -ErrorAction SilentlyContinue)) {
    Write-Host "❌ This script is for Ubuntu/Digital Ocean droplets" -ForegroundColor Red
    Write-Host "💡 For Windows deployment, use App Platform or Spaces" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Quick Deployment Commands:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Upload your build files:" -ForegroundColor Yellow
Write-Host "   scp -r dist/* root@YOUR_DROPLET_IP:/var/www/terango/" -ForegroundColor White
Write-Host ""
Write-Host "2. Set up server (run on droplet):" -ForegroundColor Yellow
Write-Host "   chmod +x deploy-digital-ocean.sh" -ForegroundColor White
Write-Host "   ./deploy-digital-ocean.sh" -ForegroundColor White
Write-Host ""
Write-Host "3. Upload files from Windows:" -ForegroundColor Yellow
Write-Host "   # Using WinSCP or command line:" -ForegroundColor Gray
Write-Host "   pscp -r dist/* root@YOUR_IP:/var/www/terango/" -ForegroundColor White
Write-Host ""
Write-Host "4. Enable SSL:" -ForegroundColor Yellow
Write-Host "   sudo certbot --nginx" -ForegroundColor White

# Function to upload files (if SCP is available)
function Upload-ToDroplet {
    param(
        [string]$DropletIP,
        [string]$LocalPath = "dist/*",
        [string]$RemotePath = "/var/www/terango/"
    )
    
    if (Get-Command scp -ErrorAction SilentlyContinue) {
        Write-Host "📤 Uploading files to droplet..." -ForegroundColor Green
        scp -r $LocalPath "root@${DropletIP}:$RemotePath"
        Write-Host "✅ Upload complete!" -ForegroundColor Green
    } else {
        Write-Host "💡 Install OpenSSH or use WinSCP to upload files" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 Digital Ocean Deployment Options:" -ForegroundColor Magenta
Write-Host ""
Write-Host "Option 1 - App Platform (Easiest):" -ForegroundColor Green
Write-Host "• Go to cloud.digitalocean.com/apps" -ForegroundColor White
Write-Host "• Connect GitHub or upload build" -ForegroundColor White
Write-Host "• Build Command: npm run build:web" -ForegroundColor White
Write-Host "• Output Directory: dist" -ForegroundColor White
Write-Host "• Cost: ~$5/month" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2 - Spaces (CDN):" -ForegroundColor Green  
Write-Host "• Create Space with CDN at cloud.digitalocean.com/spaces" -ForegroundColor White
Write-Host "• Upload dist/ folder contents" -ForegroundColor White
Write-Host "• Set index.html as default document" -ForegroundColor White
Write-Host "• Cost: ~$5/month + bandwidth" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 3 - Droplet (Full Control):" -ForegroundColor Green
Write-Host "• Create Ubuntu 22.04 droplet (Basic - $6/month)" -ForegroundColor White
Write-Host "• Run deploy-digital-ocean.sh script" -ForegroundColor White
Write-Host "• Upload dist/ files via SCP/SFTP" -ForegroundColor White
Write-Host "• Cost: $6/month" -ForegroundColor Gray