param (
    [string]$VpsHost = "169.58.213.137",
    [string]$VpsUser = "root",
    [string]$RemotePath = "/var/www/advanced-restro"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Syncing Food Image Fix & VPS Updates to Server " -ForegroundColor Cyan
Write-Host " Target: ${VpsUser}@${VpsHost}:${RemotePath}    " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$filesToSync = @(
    "src/app/uploads",
    "server.js",
    "src/app/menu/[slug]/page.tsx",
    "src/app/admin/login/page.tsx",
    "src/app/dashboard/login/page.tsx",
    "docker-compose.yml",
    "Dockerfile",
    ".gitignore",
    "deploy-vps.sh"
)

foreach ($file in $filesToSync) {
    if (Test-Path $file) {
        Write-Host ">> Transferring $file..." -ForegroundColor Yellow
        scp -r $file "${VpsUser}@${VpsHost}:${RemotePath}/$file"
    }
}

Write-Host "`n>> Running remote deployment script..." -ForegroundColor Green
ssh "${VpsUser}@${VpsHost}" "cd $RemotePath && chmod +x deploy-vps.sh && ./deploy-vps.sh"

Write-Host "`nAll updates deployed to VPS successfully!" -ForegroundColor Green
