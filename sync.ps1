# Hentikan semua proses node/ngrok sebelumnya biar bersih
Stop-Process -Name "node", "ngrok" -ErrorAction SilentlyContinue

Write-Host "STARTING SYSTEM..." -ForegroundColor Cyan

# 1. Nyalain Ngrok di Background
Write-Host "------------------------------------"
Write-Host "Menyalakan Ngrok Tunnel..."
Start-Process ngrok -ArgumentList "start --all" -WindowStyle Minimized

# 2. Tunggu Ngrok Connect (5 detik)
Write-Host "Menunggu Ngrok mendapatkan URL..."
Start-Sleep -Seconds 5

# 3. Ambil Data dari API Ngrok Lokal
try {
    $tunnels = (Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels").tunnels
    
    # Cari URL berdasarkan nama tunnel di ngrok.yml
    $blockchainUrl = ($tunnels | Where-Object {$_.name -eq "blockchain"}).public_url
    $ipfsUrl = ($tunnels | Where-Object {$_.name -eq "ipfs"}).public_url
    
    # Kalau tunnel frontend juga mau dicatat (opsional)
    $frontendUrl = ($tunnels | Where-Object {$_.name -eq "frontend"}).public_url

    if (-not $blockchainUrl -or -not $ipfsUrl) {
        Write-Error "Gagal mengambil URL Ngrok. Pastikan Ngrok menyala!"
        exit
    }
}
catch {
    Write-Error "Error menghubungi Ngrok API. Cek apakah ngrok sudah login."
    exit
}

# 4. Tulis ke file .env.local (TIMPA FILE LAMA)
$envPath = "./client/.env.local"
$content = @"
NEXT_PUBLIC_RPC_URL=$blockchainUrl
NEXT_PUBLIC_IPFS_URL=$ipfsUrl
"@

Set-Content -Path $envPath -Value $content

Write-Host "SUKSES! URL Berhasil Disinkronkan." -ForegroundColor Green
Write-Host "File .env.local telah diperbarui:"
Write-Host "   Blockchain : $blockchainUrl"
Write-Host "   IPFS       : $ipfsUrl"
Write-Host "------------------------------------"

# 5. Jalankan Hardhat & Next.js
Write-Host "Menyalakan Hardhat Node..."
Start-Process cmd -ArgumentList "/k cd /d web3 && npx hardhat node"

Write-Host "Menyalakan Next.js Frontend..."
# Kita pakai Start-Process biar dia jalan di jendela baru yang terpisah
Start-Process cmd -ArgumentList "/k cd /d client && npm run dev"

Write-Host "SEMUA SISTEM AKTIF! Silakan buka HP Anda." -ForegroundColor Yellow