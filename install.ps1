<#
  install.ps1 - installs everything Claude Code needs to make videos with the skills in this repo.
  Windows 10/11, PowerShell 5.1+. Safe to re-run: it only installs what is missing. Asks nothing.

  One line (normal PowerShell window):
      irm https://raw.githubusercontent.com/Peam67/claude-code-video-kit/main/install.ps1 | iex

  Installs: Node.js, Python 3, FFmpeg (winget) - Python packages (numpy, soundfile, pythainlp, yt-dlp) -
  HyperFrames CLI + its Claude Code skills - whisper.cpp (speech to text) - Thai fonts -
  the skills lowpoly-3d, documentary-clip, talking-head-cut into %USERPROFILE%\.claude\skills (the lowpoly kit with its npm packages).
  No API keys are asked for, read or stored.
#>
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Repo = 'Peam67/claude-code-video-kit'
$HyperframesVersion = '0.8.186'
$ToolsDir = if ($env:VIDEO_KIT_TOOLS) { $env:VIDEO_KIT_TOOLS } else { "$env:USERPROFILE\tools" }
$SkillsDir = "$env:USERPROFILE\.claude\skills"
$results = [ordered]@{}

function Say($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
function Works($exe, $arg = '--version') { try { $o = & $exe $arg 2>&1; return ($LASTEXITCODE -eq 0 -and $o) } catch { return $false } }
function Step($label, [scriptblock]$body) {
    Say $label
    try { & $body; if (-not $results.Contains($label)) { $results[$label] = 'ok' } }
    catch { $results[$label] = 'FAILED: ' + $_.Exception.Message; Write-Host ('    ' + $results[$label]) -ForegroundColor Red }
}
function WingetInstall($id) {
    winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) { throw "winget failed for $id (exit $LASTEXITCODE)" }
    Refresh-Path
}
function Download($url, $dest) {
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -UserAgent 'Mozilla/5.0 video-kit-setup'
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host 'winget not found. Install "App Installer" from the Microsoft Store, then run this again.' -ForegroundColor Red
    return
}
New-Item -ItemType Directory -Force -Path $ToolsDir, $SkillsDir | Out-Null

# ---------------------------------------------------------------- base tools
Step 'Node.js (20+)' {
    $major = 0; try { $major = [int]((node --version) -replace '^v(\d+).*', '$1') } catch {}
    if ($major -lt 20) { WingetInstall 'OpenJS.NodeJS.LTS' } else { $results['Node.js (20+)'] = "already installed (v$major)" }
}
Step 'Python 3' { if (-not (Works python)) { WingetInstall 'Python.Python.3.13' } else { $results['Python 3'] = 'already installed' } }
Step 'FFmpeg' { if (-not (Works ffmpeg '-version')) { WingetInstall 'Gyan.FFmpeg' } else { $results['FFmpeg'] = 'already installed' } }
Refresh-Path
Step 'Python packages' {
    python -m pip install --upgrade --quiet numpy soundfile pythainlp yt-dlp
    if ($LASTEXITCODE -ne 0) { throw 'pip failed' }
}

# ---------------------------------------------------------------- HyperFrames (HTML -> video) + its skills
Step "HyperFrames CLI $HyperframesVersion" {
    $have = ''; try { $have = (hyperframes --version 2>$null | Select-Object -Last 1).Trim() } catch {}
    if ($have -ne $HyperframesVersion) {
        npm install -g "hyperframes@$HyperframesVersion"
        if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
        Refresh-Path
    } else { $results["HyperFrames CLI $HyperframesVersion"] = 'already installed' }
}
Step 'HyperFrames skills' { hyperframes skills update; if ($LASTEXITCODE -ne 0) { throw 'skills update failed' } }

# ---------------------------------------------------------------- speech to text (captions, timing, voice checks)
Step 'whisper.cpp' {
    $exe = Join-Path $ToolsDir 'whisper-cpp\Release\whisper-cli.exe'
    if (-not (Test-Path $exe)) {
        $zip = Join-Path $env:TEMP 'whisper-bin-x64.zip'
        Download 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip' $zip
        Expand-Archive -Force -Path $zip -DestinationPath (Join-Path $ToolsDir 'whisper-cpp')
        Remove-Item $zip -Force
    } else { $results['whisper.cpp'] = 'already installed' }
    if (-not (Test-Path $exe)) { throw "whisper-cli.exe not found at $exe" }
    [Environment]::SetEnvironmentVariable('HYPERFRAMES_WHISPER_PATH', $exe, 'User'); $env:HYPERFRAMES_WHISPER_PATH = $exe
}

# ---------------------------------------------------------------- Thai fonts (SIL OFL)
Step 'Thai fonts (Trirong, Kanit)' {
    $dir = Join-Path $ToolsDir 'fonts'
    foreach ($f in 'trirong/Trirong-Regular', 'trirong/Trirong-SemiBold', 'trirong/Trirong-Bold', 'kanit/Kanit-Bold') {
        $dest = Join-Path $dir ((Split-Path $f -Leaf) + '.ttf')
        if (-not (Test-Path $dest)) { Download "https://github.com/google/fonts/raw/main/ofl/$f.ttf" $dest }
    }
}

# ---------------------------------------------------------------- the skills of this repo
Step 'skills: lowpoly-3d, documentary-clip, talking-head-cut' {
    $tmp = Join-Path $env:TEMP ('video-kit-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    Download "https://codeload.github.com/$Repo/zip/refs/heads/main" "$tmp\repo.zip"
    Expand-Archive -Force -Path "$tmp\repo.zip" -DestinationPath $tmp
    $src = Get-ChildItem $tmp -Directory | Select-Object -First 1
    foreach ($s in Get-ChildItem (Join-Path $src.FullName 'skills') -Directory) {
        $dst = Join-Path $SkillsDir $s.Name
        if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
        Copy-Item -Recurse -Force $s.FullName $dst
    }
    Remove-Item -Recurse -Force $tmp
    Push-Location (Join-Path $SkillsDir 'lowpoly-3d\kit')
    npm install --no-audit --no-fund --loglevel=error
    $ok = $LASTEXITCODE -eq 0; Pop-Location
    if (-not $ok) { throw 'npm install for the lowpoly kit failed' }
}

Write-Host ''
Write-Host '================ SUMMARY ================' -ForegroundColor Cyan
foreach ($k in $results.Keys) {
    $c = if ($results[$k] -like 'FAILED*') { 'Red' } else { 'Green' }
    Write-Host ('{0,-55} {1}' -f $k, $results[$k]) -ForegroundColor $c
}
Write-Host ''
Write-Host 'Done. Restart Claude Code so it loads the new skills, then paste the start message from the README.' -ForegroundColor Green
