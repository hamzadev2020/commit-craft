
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host "`n=== CommitCraft Setup ===" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js install karo: https://nodejs.org/"
}

$nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]").Trim())

if ($nodeMajor -lt 18) {
    throw "CommitCraft ke liye Node.js 18 ya newer version chahiye."
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm nahi mila. Node.js installation check karo."
}

# Make sure index.js loads its local .env file
$indexPath = Join-Path $PSScriptRoot "index.js"
$indexText = Get-Content -LiteralPath $indexPath -Raw

if ($indexText -notmatch 'dotenv\.config\s*\(') {
    throw "index.js mein dotenv.config setup missing hai. README ke instructions follow karo."
}

# Protect secrets and dependencies
$ignorePath = Join-Path $PSScriptRoot ".gitignore"
$ignoreLines = @()

if (Test-Path -LiteralPath $ignorePath) {
    $ignoreLines = @(Get-Content -LiteralPath $ignorePath)
}

foreach ($line in @(".env", "node_modules/")) {
    if ($ignoreLines -notcontains $line) {
        Add-Content -LiteralPath $ignorePath -Value $line
        $ignoreLines += $line
    }
}

# Create a safe template if missing
$examplePath = Join-Path $PSScriptRoot ".env.example"

if (-not (Test-Path -LiteralPath $examplePath)) {
    [System.IO.File]::WriteAllText(
        $examplePath,
        "GEMINI_API_KEY=`r`n",
        [System.Text.UTF8Encoding]::new($false)
    )
}

# Read an existing local key without displaying it
$envPath = Join-Path $PSScriptRoot ".env"
$hasKey = $false

if (Test-Path -LiteralPath $envPath) {
    $existingText = Get-Content -LiteralPath $envPath -Raw
    $match = [regex]::Match(
        $existingText,
        '(?m)^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$'
    )

    if ($match.Success) {
        $existingKey = $match.Groups[1].Value.Trim()

        if (
            $existingKey -and
            $existingKey -notmatch 'YOUR_|PLACEHOLDER|your_gemini_api_key_here'
        ) {
            $hasKey = $true
        }
    }
}

if (-not $hasKey) {
    Write-Host "`nGemini API key required (input will be hidden)." -ForegroundColor Yellow

    $secureKey = Read-Host "Enter your Gemini API key" -AsSecureString

    if ($secureKey.Length -eq 0) {
        throw "API key empty hai. Setup dobara run karke key enter karo."
    }

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

    try {
        $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

        if ($plainKey -match '[\r\n]') {
            throw "API key invalid format mein enter hui."
        }

        $otherLines = @()

        if (Test-Path -LiteralPath $envPath) {
            $otherLines = @(
                Get-Content -LiteralPath $envPath |
                    Where-Object { $_ -notmatch '^\s*GEMINI_API_KEY\s*=' }
            )
        }

        $allLines = @($otherLines) + "GEMINI_API_KEY=$plainKey"
        $envText = ($allLines -join "`r`n") + "`r`n"

        [System.IO.File]::WriteAllText(
            $envPath,
            $envText,
            [System.Text.UTF8Encoding]::new($false)
        )

        Write-Host "Gemini API key saved locally." -ForegroundColor Green
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        $plainKey = $null
    }
}
else {
    Write-Host "Existing Gemini API key found; keeping it." -ForegroundColor Green
}

# Install project dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
& npm.cmd install

if ($LASTEXITCODE -ne 0) {
    throw "npm install failed."
}

# Register the package globally
Write-Host "`nRegistering global command..." -ForegroundColor Cyan
& npm.cmd link

if ($LASTEXITCODE -ne 0) {
    throw "npm link failed."
}

# Repair Windows launchers so index.js always runs through Node
$npmPrefix = [string]((& npm.cmd config get prefix) | Select-Object -Last 1)
$npmPrefix = $npmPrefix.Trim()

$entryPath = Join-Path $npmPrefix "node_modules\commit-craft\index.js"

if (-not (Test-Path -LiteralPath $entryPath)) {
    throw "Global package entry point nahi mila: $entryPath"
}

$psLauncher = @'
$entry = Join-Path $PSScriptRoot "node_modules\commit-craft\index.js"
& node $entry @args
exit $LASTEXITCODE
'@

$cmdLauncher = @'
@echo off
setlocal
node "%~dp0node_modules\commit-craft\index.js" %*
exit /b %ERRORLEVEL%
'@

foreach ($name in @("commitcraft", "commit-craft")) {
    Set-Content -LiteralPath (Join-Path $npmPrefix "$name.ps1") -Value $psLauncher -Encoding ascii
    Set-Content -LiteralPath (Join-Path $npmPrefix "$name.cmd") -Value $cmdLauncher -Encoding ascii
}

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "Run 'commitcraft' from any Git project folder." -ForegroundColor Cyan
Write-Host "Keep your .env file private; never upload it to GitHub."
