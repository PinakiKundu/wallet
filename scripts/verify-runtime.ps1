param(
  [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

if (-not (Test-Path ".docker")) {
  New-Item -ItemType Directory -Force ".docker" | Out-Null
}

docker --config .docker compose -f infra/docker-compose.yml up -d postgres redis

Set-Location "$ProjectRoot\backend"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}

npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run test:e2e
npm run build
npm run lint
npm test
npm run prisma:validate

Write-Host "Runtime verification completed successfully."
