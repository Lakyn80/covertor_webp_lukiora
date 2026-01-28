$TAG = (Get-Date -Format "yyyyMMdd-HHmm")
Write-Host "Deploy TAG: $TAG"

# BACKEND
docker build -f ./backend/Dockerfile -t "lakyn80/imgwebp-backend:$TAG" ./backend
docker push "lakyn80/imgwebp-backend:$TAG"

# FRONTEND (Next.js)
docker build -f ./frontend-next/Dockerfile -t "lakyn80/imgwebp-frontend:$TAG" ./frontend-next
docker push "lakyn80/imgwebp-frontend:$TAG"

# .env pro server (vezmi komplet lokalni .env a jen prepis tagy)
$envPath = ".\.env"
if (-not (Test-Path $envPath)) {
  throw "Missing .env at $envPath"
}

$existing = Get-Content -Path $envPath -Raw
$lines = $existing -split "`r?`n"
$filtered = $lines | Where-Object { $_ -notmatch '^\s*(FRONTEND_TAG|BACKEND_TAG)=' }

$envContent = @()
$envContent += "FRONTEND_TAG=$TAG"
$envContent += "BACKEND_TAG=$TAG"
$envContent += $filtered

Set-Content -Path .\.env.new -Value ($envContent -join "`n") -Encoding UTF8

scp .\.env.new lucky@89.221.214.140:/var/www/img-webp/.env
Remove-Item .\.env.new -Force

ssh lucky@89.221.214.140 `
"cd /var/www/img-webp && docker compose pull && docker compose up -d --force-recreate"
