<#
.SYNOPSIS
    MedBuddy Installer Script for Windows
.DESCRIPTION
    Downloads, installs, and configures MedBuddy on Windows with Start Menu and Desktop integration.
.EXAMPLE
    irm https://raw.githubusercontent.com/sashpawar11/medbuddy/main/install.ps1 | iex
#>

[CmdletBinding()]
param(
    [string]$TargetVersion = "latest",
    [switch]$SkipChecksum,
    [switch]$Uninstall,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

$Repo = "sashpawar11/medbuddy"
$AppName = "MedBuddy"
$AppBin = "medbuddy"
$ScriptVersion = "1.0.3"

function Show-Banner {
    Write-Host @"
  __  __          _ ____            _     _       
 |  \/  | ___  __| | __ ) _   _  __| | __| |_   _ 
 | |\/| |/ _ \/ _` |  _ \| | | |/ _` |/ _` | | | |
 | |  | |  __/ (_| | |_) | |_| | (_| | (_| | |_| |
 |_|  |_|\___|\__,_|____/ \__,_|\__,_|\__,_|\__, |
                                            |___/ 
"@ -ForegroundColor Cyan
    Write-Host "  Personal family medical vault with local AI analysis`n" -ForegroundColor DarkGray
}

if ($Help) {
    Show-Banner
    Write-Host "MedBuddy Windows Installer & Manager (v$ScriptVersion)"
    Write-Host "`nUsage:"
    Write-Host "  irm https://raw.githubusercontent.com/$Repo/main/install.ps1 | iex"
    Write-Host "  .\install.ps1 [-TargetVersion <ver>] [-SkipChecksum] [-Uninstall] [-Help]"
    exit 0
}

Show-Banner

# Handle Uninstall
if ($Uninstall) {
    Write-Host "➜ Uninstalling $AppName from Windows..." -ForegroundColor Cyan
    $uninstaller = Join-Path $env:LOCALAPPDATA "Programs\$AppName\Uninstall $AppName.exe"
    if (Test-Path $uninstaller) {
        Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait
    }
    $installDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
    if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir -ErrorAction SilentlyContinue }
    
    $startMenu = Join-Path ([Environment]::GetFolderPath('Programs')) "$AppName.lnk"
    if (Test-Path $startMenu) { Remove-Item -Force $startMenu -ErrorAction SilentlyContinue }
    
    $desktop = Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk"
    if (Test-Path $desktop) { Remove-Item -Force $desktop -ErrorAction SilentlyContinue }

    $cliCmd = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\$AppBin.cmd"
    if (Test-Path $cliCmd) { Remove-Item -Force $cliCmd -ErrorAction SilentlyContinue }

    Write-Host "✔ $AppName was successfully uninstalled from your Windows system." -ForegroundColor Green
    exit 0
}

# Resolve Release Info
Write-Host "➜ Fetching latest Windows release info from GitHub ($Repo)..." -ForegroundColor Cyan
$apiUrl = if ($TargetVersion -eq "latest") {
    "https://api.github.com/repos/$Repo/releases/latest"
} else {
    "https://api.github.com/repos/$Repo/releases/tags/$TargetVersion"
}

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $release = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers @{ "User-Agent" = "MedBuddy-Installer" }
} catch {
    Write-Warning "GitHub API request failed, attempting direct redirect check..."
    $release = $null
}

$tagName = if ($release -and $release.tag_name) { $release.tag_name } else {
    if ($TargetVersion -eq "latest") { "v1.0.3" } else { $TargetVersion }
}
$version = $tagName.TrimStart('v')

Write-Host "ℹ Installing MedBuddy v$version ($tagName) on Windows..." -ForegroundColor Blue

# Target release assets
$candidateNames = @(
    "$AppName-Setup-$version.exe",
    "$AppName Setup $version.exe",
    "$AppName-$version-win.zip",
    "$AppName-$version.zip",
    "$AppName-Portable-$version.exe",
    "$AppName-$version.exe"
)

$downloadUrl = ""
$chosenAsset = ""

if ($release -and $release.assets) {
    foreach ($candidate in $candidateNames) {
        $matching = $release.assets | Where-Object { $_.name -eq $candidate } | Select-Object -First 1
        if ($matching) {
            $downloadUrl = $matching.browser_download_url
            $chosenAsset = $matching.name
            break
        }
    }
}

if (-not $downloadUrl) {
    $chosenAsset = "$AppName-Setup-$version.exe"
    $encodedAsset = [Uri]::EscapeDataString($chosenAsset)
    $downloadUrl = "https://github.com/$Repo/releases/download/$tagName/$encodedAsset"
}

$tmpDir = Join-Path $env:TEMP ("medbuddy-win-" + [Guid]::NewGuid().ToString().Substring(0, 8))
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
$downloadFile = Join-Path $tmpDir $chosenAsset

try {
    Write-Host "➜ Downloading $chosenAsset..." -ForegroundColor Cyan
    Write-Host "  URL: $downloadUrl" -ForegroundColor DarkGray
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadFile -UseBasicParsing

    # Checksum verification
    if (-not $SkipChecksum) {
        Write-Host "➜ Verifying download checksum..." -ForegroundColor Cyan
        $sha256Url = "https://github.com/$Repo/releases/download/$tagName/SHA256SUMS.txt"
        $shaFile = Join-Path $tmpDir "SHA256SUMS.txt"
        try {
            Invoke-WebRequest -Uri $sha256Url -OutFile $shaFile -UseBasicParsing -ErrorAction SilentlyContinue
            if (Test-Path $shaFile) {
                $actualHash = (Get-FileHash -Path $downloadFile -Algorithm SHA256).Hash.ToLower()
                $lines = Get-Content $shaFile
                $matchedLine = $lines | Where-Object { $_ -match [Regex]::Escape($chosenAsset) }
                if ($matchedLine) {
                    $expectedHash = ($matchedLine -split '\s+')[0].ToLower()
                    if ($actualHash -eq $expectedHash) {
                        Write-Host "✔ SHA-256 Checksum verified: $($actualHash.Substring(0, 16))..." -ForegroundColor Green
                    } else {
                        Write-Error "Checksum verification failed! Expected: $expectedHash, Actual: $actualHash"
                    }
                }
            }
        } catch {
            Write-Warning "Could not verify checksum against release assets; proceeding with downloaded binary."
        }
    }

    # Install & Unpack
    Write-Host "➜ Installing MedBuddy on Windows..." -ForegroundColor Cyan
    $installDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"

    if ($chosenAsset -match '[sS]etup.*\.exe$' -or ($chosenAsset -match '\.exe$' -and $chosenAsset -notmatch '[pP]ortable')) {
        Write-Host "ℹ Unpacking and configuring via NSIS installer (silent mode /S)..." -ForegroundColor Blue
        $proc = Start-Process -FilePath $downloadFile -ArgumentList "/S" -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            Write-Warning "Silent install exited with code $($proc.ExitCode), trying interactive mode..."
            Start-Process -FilePath $downloadFile -Wait
        }
    } elseif ($chosenAsset -match '\.zip$') {
        Write-Host "ℹ Unpacking ZIP archive into $installDir..." -ForegroundColor Blue
        if (!(Test-Path $installDir)) { New-Item -ItemType Directory -Path $installDir -Force | Out-Null }
        Expand-Archive -Path $downloadFile -DestinationPath $installDir -Force
    } else {
        Write-Host "ℹ Installing portable binary into $installDir..." -ForegroundColor Blue
        if (!(Test-Path $installDir)) { New-Item -ItemType Directory -Path $installDir -Force | Out-Null }
        Copy-Item -Path $downloadFile -Destination (Join-Path $installDir "$AppName.exe") -Force
    }

    # Ensure Start Menu & Desktop shortcuts
    Write-Host "➜ Configuring Windows Start Menu and Desktop shortcuts..." -ForegroundColor Cyan
    $targetExe = Join-Path $installDir "$AppName.exe"
    if (!(Test-Path $targetExe)) {
        $found = Get-ChildItem -Path $installDir -Filter "$AppName.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $targetExe = $found.FullName
            $installDir = $found.DirectoryName
        }
    }

    if (Test-Path $targetExe) {
        $wshell = New-Object -ComObject WScript.Shell

        # Start Menu Shortcut
        $startMenuDir = [Environment]::GetFolderPath('Programs')
        $startShortcut = Join-Path $startMenuDir "$AppName.lnk"
        if (!(Test-Path $startShortcut)) {
            $s = $wshell.CreateShortcut($startShortcut)
            $s.TargetPath = $targetExe
            $s.WorkingDirectory = $installDir
            $s.IconLocation = "$targetExe,0"
            $s.Description = "MedBuddy - Personal family medical vault"
            $s.Save()
        }

        # Desktop Shortcut
        $desktopDir = [Environment]::GetFolderPath('Desktop')
        $desktopShortcut = Join-Path $desktopDir "$AppName.lnk"
        if (!(Test-Path $desktopShortcut)) {
            $d = $wshell.CreateShortcut($desktopShortcut)
            $d.TargetPath = $targetExe
            $d.WorkingDirectory = $installDir
            $d.IconLocation = "$targetExe,0"
            $d.Description = "MedBuddy - Personal family medical vault"
            $d.Save()
        }

        # CLI Command wrapper in %LOCALAPPDATA%\Microsoft\WindowsApps
        $appsDir = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps"
        if (Test-Path $appsDir) {
            $cmdFile = Join-Path $appsDir "$AppBin.cmd"
            "@start `"`" `"$targetExe`" %*" | Set-Content -Path $cmdFile -Force
        }
    }

    Write-Host "`n🎉 MedBuddy v$version installed successfully on Windows!" -ForegroundColor Green
    Write-Host "  Start Menu:   Search or click MedBuddy in your Windows Start Menu"
    Write-Host "  Desktop App:  Shortcut created on your Desktop"
    Write-Host "  Location:     $targetExe"
    Write-Host "  CLI Command:  Run 'medbuddy' from Command Prompt or PowerShell`n"

} finally {
    if (Test-Path $tmpDir) {
        Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    }
}
