Add-Type -AssemblyName System.Drawing
$inputPath = "C:\Users\jenpr\.gemini\antigravity\brain\5fb60726-3703-482b-ad49-f2c884520ac0\media__1780242271729.png"
$outputPath = "C:\Users\jenpr\.gemini\antigravity\scratch\rspg-botanical-garden\public\rspg-logo.png"

if (Test-Path $inputPath) {
    Write-Host "Loading image from $inputPath"
    $img = New-Object System.Drawing.Bitmap($inputPath)
    $newImg = New-Object System.Drawing.Bitmap($img.Width, $img.Height)

    Write-Host "Processing pixels ($($img.Width)x$($img.Height))..."
    for ($x = 0; $x -lt $img.Width; $x++) {
        for ($y = 0; $y -lt $img.Height; $y++) {
            $color = $img.GetPixel($x, $y)
            # If the pixel is close to white (RGB > 240), set it to transparent
            if ($color.R -gt 240 -and $color.G -gt 240 -and $color.B -gt 240) {
                $newImg.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
            } else {
                $newImg.SetPixel($x, $y, $color)
            }
        }
    }

    Write-Host "Saving transparent image to $outputPath"
    $newImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    $newImg.Dispose()
    Write-Host "Completed successfully!"
} else {
    Write-Error "Input image not found at $inputPath"
}
