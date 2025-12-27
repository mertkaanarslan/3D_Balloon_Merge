#!/bin/bash

# Balloon Emerge Oyununu Başlat
cd "$(dirname "$0")"

echo "🎈 Balloon Emerge oyunu başlatılıyor..."
echo "📱 Tarayıcınızda şu adresi açın: http://localhost:8000"
echo ""
echo "Durdurmak için Ctrl+C tuşlarına basın"
echo ""

# Python HTTP sunucusunu başlat
python3 -m http.server 8000



