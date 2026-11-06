# KineticScan 360 - Zero-Dependency Local Web Server
# Uses Windows .NET HttpListener with dual binding and request logging

param (
    [int]$Port = 8080
)

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$listener = New-Object System.Net.HttpListener

# Register both localhost and 127.0.0.1 to avoid browser DNS / IPv6 mismatch
try {
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Start()
} catch {
    Write-Host "Port $Port busy, trying 8181..." -ForegroundColor Yellow
    $Port = 8181
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Start()
}

$url = "http://localhost:$Port/"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   KINETICSCAN 360 - ATHLETIC POSTURE SCANNER WEB APP" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Server running at: $url" -ForegroundColor Yellow
Write-Host "Alternate IP:      http://127.0.0.1:$Port/" -ForegroundColor Yellow
Write-Host "Web Root:          $root" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Server listening on http://localhost:$Port/ and http://127.0.0.1:$Port/" -ForegroundColor Green
Write-Host "Ready to accept browser connections..." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".wasm" = "application/wasm"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $rawPath = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "scan" -or $rawPath -eq "results") {
                $rawPath = "index.html"
            }

            $filePath = Join-Path $root ($rawPath -replace '/', '\')

            # Handle favicon cleanly
            if ($rawPath -eq "favicon.ico" -and -not (Test-Path $filePath)) {
                $response.StatusCode = 204
                $response.OutputStream.Close()
                $response.Close()
                continue
            }

            # If file doesn't exist, fallback to index.html (SPA routing support)
            if (-not (Test-Path $filePath -PathType Leaf)) {
                $filePath = Join-Path $root "index.html"
            }

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = "application/octet-stream"
                if ($mimeTypes.ContainsKey($ext)) {
                    $contentType = $mimeTypes[$ext]
                }

                $response.ContentType = $contentType
                $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
                $response.AddHeader("Access-Control-Allow-Origin", "*")

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length

                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }

                Write-Host "[$($request.HttpMethod)] $($request.Url.LocalPath) -> 200 OK ($($bytes.Length) bytes)" -ForegroundColor Green
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $errBytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                Write-Host "[$($request.HttpMethod)] $($request.Url.LocalPath) -> 404 Not Found" -ForegroundColor Red
            }
        } catch {
            Write-Host "Request error: $_" -ForegroundColor Red
        } finally {
            try { $response.OutputStream.Close() } catch {}
            try { $response.Close() } catch {}
        }
    }
} finally {
    try { $listener.Stop() } catch {}
    try { $listener.Close() } catch {}
}
