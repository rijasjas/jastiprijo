@echo off
echo ========================================
echo    DEPLOYING FIXES TO NETLIFY
echo ========================================
echo.

echo [1/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/5] Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo [3/5] Checking if Netlify CLI is installed...
call netlify --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Netlify CLI...
    call npm install -g netlify-cli
)

echo.
echo [4/5] Deploying to Netlify...
call netlify deploy --prod --dir=dist
if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    pause
    exit /b 1
)

echo.
echo [5/5] ✅ Deployment completed successfully!
echo.
echo 🎉 Your app is now live at: https://jastiprijo.netlify.app
echo.
echo 📋 Fixes deployed:
echo    ✅ Payment screen back button and WhatsApp contact
echo    ✅ Improved image upload performance and error handling
echo    ✅ Fixed image display issues in product cards and admin panel
echo    ✅ Enhanced image validation and fallback logic
echo.
pause


