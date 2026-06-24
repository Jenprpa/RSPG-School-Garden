$logFile = "C:\Users\jenpr\.gemini\antigravity\scratch\rspg-botanical-garden\powershell_output.txt"
"Starting script..." | Out-File -FilePath $logFile

try {
    Add-Type -AssemblyName System.Drawing
    "Loaded System.Drawing" | Out-File -FilePath $logFile -Append

    $inputPath = "C:\Users\jenpr\.gemini\antigravity\brain\5fb60726-3703-482b-ad49-f2c884520ac0\media__1780245727877.jpg"
    $outputPath = "C:\Users\jenpr\.gemini\antigravity\scratch\rspg-botanical-garden\public\school-logo.png"

    if (Test-Path $inputPath) {
        "Found input image at $inputPath" | Out-File -FilePath $logFile -Append
        $img = New-Object System.Drawing.Bitmap($inputPath)
        $w = $img.Width
        $h = $img.Height
        "Image dimensions: $w x $h" | Out-File -FilePath $logFile -Append
        
        $newImg = New-Object System.Drawing.Bitmap($w, $h)

        $cx = $w / 2
        $cy = $h / 2
        $r = [Math]::Min($w, $h) / 2 - 2

        for ($x = 0; $x -lt $w; $x++) {
            for ($y = 0; $y -lt $h; $y++) {
                $color = $img.GetPixel($x, $y)
                
                # Calculate distance from center
                $dx = $x - $cx
                $dy = $y - $cy
                $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)

                if ($dist -gt $r) {
                    # Outside circular emblem: make fully transparent
                    $newImg.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                } else {
                    # Inside circular emblem: keep original color
                    # If it's close to the edge and white-ish, make it transparent
                    if ($dist -gt ($r - 5) -and $color.R -gt 220 -and $color.G -gt 220 -and $color.B -gt 220) {
                        $newImg.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                    } else {
                        $newImg.SetPixel($x, $y, $color)
                    }
                }
            }
        }

        "Processed pixels, saving to $outputPath" | Out-File -FilePath $logFile -Append
        $newImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        $newImg.Dispose()
        "Saved successfully!" | Out-File -FilePath $logFile -Append
    } else {
        "Input image NOT found at $inputPath" | Out-File -FilePath $logFile -Append
    }
} catch {
    "Error occurred: $_" | Out-File -FilePath $logFile -Append
    "Stack Trace: $($_.ScriptStackTrace)" | Out-File -FilePath $logFile -Append
}
