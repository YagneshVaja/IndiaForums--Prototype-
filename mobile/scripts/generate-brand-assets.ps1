# Generates mobile/assets/{icon,adaptive-icon,splash-logo,favicon}.png from
# the brand source PNG via pixel-bbox detection. Re-runnable.
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File mobile/scripts/generate-brand-assets.ps1
#
# Defaults assume the source lives in the user's Downloads folder. Override
# with -Source if needed.

param(
    [string]$Source = "$env:USERPROFILE\Downloads\vertical-black.png",
    [string]$OutDir = (Join-Path $PSScriptRoot "..\assets")
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Source)) {
    throw "Source file not found: $Source"
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path
Write-Host "Source: $Source"
Write-Host "Output: $OutDir"

# --- Load source into a Bitmap with raw pixel access ---
$srcImg = [System.Drawing.Image]::FromFile($Source)
$src = New-Object System.Drawing.Bitmap $srcImg
$srcImg.Dispose()

$w = $src.Width
$h = $src.Height
Write-Host "Source dimensions: ${w}x${h}"

$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $src.LockBits(
    $rect,
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$src.UnlockBits($data)

# --- Pixel classification helpers ---
# Pixel format is BGRA in memory. A pixel is "background" if alpha is 0
# OR R+G+B > 740 (near-white on the white-canvas source).
function Get-Pixel {
    param([int]$x, [int]$y)
    $i = ($y * $stride) + ($x * 4)
    return @{ B = $bytes[$i]; G = $bytes[$i + 1]; R = $bytes[$i + 2]; A = $bytes[$i + 3] }
}

function Is-Background {
    param($p)
    if ($p.A -eq 0) { return $true }
    return ($p.R + $p.G + $p.B) -gt 740
}

function Is-Chromatic {
    param($p)
    # The rainbow icon has saturated pixels; the wordmark is near-grayscale.
    $max = [Math]::Max($p.R, [Math]::Max($p.G, $p.B))
    $min = [Math]::Min($p.R, [Math]::Min($p.G, $p.B))
    return ($max - $min) -gt 25
}

# --- Find icon-vs-wordmark split row ---
# Scan top-to-bottom. Track when we leave the icon: the first row, after at
# least one chromatic row, where every non-background pixel is achromatic.
$inIcon = $false
$splitY = $h
for ($y = 0; $y -lt $h; $y++) {
    $hasChromatic = $false
    $hasContent = $false
    for ($x = 0; $x -lt $w; $x++) {
        $p = Get-Pixel $x $y
        if (Is-Background $p) { continue }
        $hasContent = $true
        if (Is-Chromatic $p) { $hasChromatic = $true; break }
    }
    if ($hasChromatic) { $inIcon = $true }
    elseif ($inIcon -and $hasContent -and -not $hasChromatic) {
        $splitY = $y
        break
    }
}
Write-Host "Icon-vs-wordmark split row: $splitY"
if ($splitY -eq $h) {
    Write-Warning "No icon-vs-wordmark split detected — entire image treated as icon. Check the source file."
}

# --- Bounding-box helpers ---
function Get-BBox {
    param([int]$yStart, [int]$yEnd)
    $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
    for ($y = $yStart; $y -lt $yEnd; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $p = Get-Pixel $x $y
            if (Is-Background $p) { continue }
            if ($x -lt $minX) { $minX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
    if ($maxX -lt 0) { throw "Empty bbox between rows $yStart..$yEnd" }
    return @{ X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }
}

$iconBBox = Get-BBox 0 $splitY
$lockupBBox = Get-BBox 0 $h
Write-Host "Icon bbox:   x=$($iconBBox.X) y=$($iconBBox.Y) w=$($iconBBox.W) h=$($iconBBox.H)"
Write-Host "Lockup bbox: x=$($lockupBBox.X) y=$($lockupBBox.Y) w=$($lockupBBox.W) h=$($lockupBBox.H)"

# --- Cropping helper ---
function Crop-Source {
    param($bbox)
    $r = New-Object System.Drawing.Rectangle $bbox.X, $bbox.Y, $bbox.W, $bbox.H
    return $src.Clone($r, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

# --- Save helpers ---
function Save-Centered {
    param(
        [System.Drawing.Bitmap]$content,
        [int]$canvasSize,
        [double]$paddingPct,
        [string]$outPath
    )
    $canvas = New-Object System.Drawing.Bitmap $canvasSize, $canvasSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $available = $canvasSize * (1.0 - 2.0 * $paddingPct)
    $scale = [Math]::Min($available / $content.Width, $available / $content.Height)
    $drawW = [int]($content.Width * $scale)
    $drawH = [int]($content.Height * $scale)
    $offX = [int](($canvasSize - $drawW) / 2)
    $offY = [int](($canvasSize - $drawH) / 2)
    $g.DrawImage($content, $offX, $offY, $drawW, $drawH)
    $g.Dispose()

    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "Wrote: $outPath"
}

function Save-Trimmed {
    param(
        [System.Drawing.Bitmap]$content,
        [int]$targetWidth,
        [string]$outPath
    )
    # Preserve aspect ratio; transparent background; no extra padding.
    $scale = $targetWidth / $content.Width
    $targetHeight = [int]($content.Height * $scale)
    $canvas = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($content, 0, 0, $targetWidth, $targetHeight)
    $g.Dispose()

    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "Wrote: $outPath"
}

# --- Generate outputs ---
$iconCrop = Crop-Source $iconBBox
$lockupCrop = Crop-Source $lockupBBox

Save-Centered -content $iconCrop -canvasSize 1024 -paddingPct 0.10 -outPath (Join-Path $OutDir "icon.png")
Save-Centered -content $iconCrop -canvasSize 1024 -paddingPct 0.33 -outPath (Join-Path $OutDir "adaptive-icon.png")
Save-Centered -content $iconCrop -canvasSize 48   -paddingPct 0.05 -outPath (Join-Path $OutDir "favicon.png")
Save-Trimmed  -content $lockupCrop -targetWidth 800 -outPath (Join-Path $OutDir "splash-logo.png")

$iconCrop.Dispose()
$lockupCrop.Dispose()
$src.Dispose()

Write-Host "`nDone. Generated 4 brand assets in $OutDir."
