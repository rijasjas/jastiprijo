Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    DEPLOYING FIXES TO NETLIFY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host ""
Write-Host "[2/5] Building the application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host ""
Write-Host "[3/5] Checking if Netlify CLI is installed..." -ForegroundColor Yellow
try {
    netlify --version | Out-Null
} catch {
    Write-Host "Installing Netlify CLI..." -ForegroundColor Yellow
    npm install -g netlify-cli
}

Write-Host ""
Write-Host "[4/5] Deploying to Netlify..." -ForegroundColor Yellow
netlify deploy --prod --dir=dist
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host ""
Write-Host "[5/5] ✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Your app is now live at: https://jastiprijo.netlify.app" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Fixes deployed:" -ForegroundColor Cyan
Write-Host "   ✅ Payment screen back button and WhatsApp contact" -ForegroundColor Green
Write-Host "   ✅ Improved image upload performance and error handling" -ForegroundColor Green
Write-Host "   ✅ Fixed image display issues in product cards and admin panel" -ForegroundColor Green
Write-Host "   ✅ Enhanced image validation and fallback logic" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"


