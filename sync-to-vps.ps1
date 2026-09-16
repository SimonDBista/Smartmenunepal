param (
    [string]$VpsHost = "169.58.213.137",
    [string]$VpsUser = "root",
    [string]$RemotePath = "/var/www/digitalize-nepal"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Syncing Food Image Fix & VPS Updates to Server " -ForegroundColor Cyan
Write-Host " Target: ${VpsUser}@${VpsHost}:${RemotePath}    " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$filesToSync = @(
    "src/app/uploads",
    "public/uploads",
    "server.js",
    "prisma/schema.prisma",
    "prisma/schema.postgresql.prisma",
    "src/app/menu/[slug]/page.tsx",
    "src/app/dashboard/qr/page.tsx",
    "src/app/dashboard/chat/page.tsx",
    "src/app/dashboard/reports/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/components/ReceiptModal.tsx",
    "src/components/OrderNotificationToast.tsx",
    "src/lib/audio.ts",
    "src/lib/types.ts",
    "src/app/dashboard/layout.tsx",
    "src/app/dashboard/menu/page.tsx",
    "src/app/api/hotel/menu",
    "src/app/api/hotel/orders",
    "src/app/api/hotel/tables",
    "src/app/api/hotel/chat",
    "src/app/api/hotel/reports",
    "src/app/api/hotel/expenses",
    "src/app/api/hotel/register",
    "src/app/api/public/chat",
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
