# تثبيت أدوات لعبة ناشا على ويندوز عبر winget (مدمج في ويندوز 10/11)
# الطريقة: افتح PowerShell ثم نفّذ:
#   powershell -ExecutionPolicy Bypass -File .\tools\install_windows.ps1  (من داخل مجلد game)

$ErrorActionPreference = "Stop"

function Install-App($id, $label) {
    Write-Host "`n>>> تثبيت $label ($id)..." -ForegroundColor Cyan
    winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Host "فشل تثبيت $label (رمز الخطأ $LASTEXITCODE)" -ForegroundColor Red
    } else {
        Write-Host "تم تثبيت $label" -ForegroundColor Green
    }
}

# 1) Godot 4 - ضروري
Install-App "GodotEngine.GodotEngine" "Godot Engine 4"

# 2) الأدوات الاختيارية
$optional = @(
    @{ Id = "KDE.Krita";                    Label = "Krita" },
    @{ Id = "Audacity.Audacity";            Label = "Audacity" },
    @{ Id = "Microsoft.VisualStudioCode";   Label = "Visual Studio Code" }
)
foreach ($app in $optional) {
    $answer = Read-Host "هل تريد تثبيت $($app.Label)؟ (y/n)"
    if ($answer -eq "y") { Install-App $app.Id $app.Label }
}

Write-Host "`nانتهى. افتح Godot واضغط Import واختر game\project.godot" -ForegroundColor Green
