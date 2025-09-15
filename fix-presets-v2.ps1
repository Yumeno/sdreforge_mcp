# PowerShell script to fix preset files - Version 2
$presetsPath = ".\presets"

Get-ChildItem -Path $presetsPath -Filter "*.yaml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Fix all variations of the model name
    # Remove the hash and extension, fix typo
    $content = $content -replace 'sdnimagineXL40_v4Opt\.safetensors \[6327eca98b\]', 'sd_animagineXL40_v4Opt'
    $content = $content -replace 'sd\\animagineXL40_v4Opt\.safetensors \[6327eca98b\]', 'sd_animagineXL40_v4Opt'
    $content = $content -replace 'animagineXL40_v4Opt\.safetensors \[6327eca98b\]', 'sd_animagineXL40_v4Opt'

    # Also fix any remaining typos without the extension
    $content = $content -replace 'sdnimagineXL40_v4Opt', 'sd_animagineXL40_v4Opt'

    # Save the file
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "Fixed: $($_.Name)"
}

Write-Host "`nAll preset files have been fixed!"