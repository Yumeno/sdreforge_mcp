# PowerShell script to fix preset files
$presetsPath = ".\presets"

Get-ChildItem -Path $presetsPath -Filter "*.yaml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Fix typo and remove problematic characters
    $content = $content -replace 'sdnimagineXL40_v4Opt\.safetensors \[6327eca98b\]', 'sd_animagineXL40_v4Opt'
    $content = $content -replace 'sdnimagineXL40_v4Opt', 'sd_animagineXL40_v4Opt'

    # Save the file
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "Fixed: $($_.Name)"
}

Write-Host "All preset files have been fixed!"