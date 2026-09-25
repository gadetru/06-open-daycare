$ErrorActionPreference = 'Stop'

$projectPath = 'D:\Users\Gabriel\Desktop\curso_IA_OpenCode\OpenCode\06-open-daycare'
$opencodeExe = 'D:\Users\Gabriel\AppData\Roaming\npm\opencode.cmd'
$reportDir   = Join-Path $projectPath 'reports\db-audit'

New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
Set-Location $projectPath

$stamp      = Get-Date -Format 'yyyy-MM-dd-HHmm'
$reportFile = Join-Path $reportDir "db-audit-$stamp.md"
$errorFile  = Join-Path $reportDir "db-audit-$stamp.err.log"

$arguments = @(
    'run',
    '--command', 'db-audit',
    '--model', 'opencode/big-pickle'
)

$process = Start-Process -FilePath $opencodeExe -ArgumentList $arguments `
    -WorkingDirectory $projectPath -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $reportFile -RedirectStandardError $errorFile

if ($process.ExitCode -ne 0) {
    Write-Output "db-audit fallo con codigo $($process.ExitCode). Ver $errorFile"
    exit $process.ExitCode
}

# Conserva solo los 10 reportes mas recientes
Get-ChildItem -Path $reportDir -Filter 'db-audit-*.md' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 10 |
    Remove-Item -Force

Write-Output "db-audit terminado. Reporte: $reportFile"
