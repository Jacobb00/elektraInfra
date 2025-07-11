// =====================================================
// TELEFORM IaC GENERATOR - ANA SERVER DOSYASI
// =====================================================
// Bu dosya Express.js web server'ını başlatır ve yapılandırır
// Frontend static dosyalarını serve eder ve API route'larını yönetir

// NPM paket importları
const express = require('express');          // Web framework - HTTP server ve routing
const cors = require('cors');                // Cross-Origin Resource Sharing - CORS header'ları yönetir
const bodyParser = require('body-parser');   // HTTP request body'lerini parse eder (JSON, URL-encoded)
const path = require('path');                // Dosya yolu işlemleri için Node.js core modülü
const fs = require('fs-extra');              // Gelişmiş dosya sistemi işlemleri (fs'in geliştirilmiş versiyonu)

// Express uygulaması instance'ı oluştur
// Bu instance tüm HTTP isteklerini handle edecek ana uygulama object'i
const app = express();

// Port yapılandırması - Environment variable'dan al, yoksa 3000 kullan
// Production'da genellikle hosting provider port'u environment variable ile verir
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE KONFIGÜRASYONU
// =====================================================
// Middleware'ler her HTTP request'te sırayla çalışır
// Request → Middleware 1 → Middleware 2 → ... → Route Handler → Response

// CORS (Cross-Origin Resource Sharing) middleware
// Frontend ile backend farklı port'larda çalışabilsin diye
// Browser'ın Same-Origin Policy'sini bypass eder
app.use(cors());

// JSON body parser middleware
// POST/PUT request'lerde gelen JSON data'yı req.body'ye parse eder
// Content-Type: application/json header'ı olan request'ler için
app.use(bodyParser.json());

// URL-encoded body parser middleware  
// HTML form'lardan gelen data'yı parse eder
// Content-Type: application/x-www-form-urlencoded header'ı olan request'ler için
// extended: true → qs library kullanır (nested objects destekler)
app.use(bodyParser.urlencoded({ extended: true }));

// Static files middleware
// Frontend dosyalarını (HTML, CSS, JS, images) serve eder
// URL: http://localhost:3000/css/style.css → ../frontend/css/style.css dosyasını döndürür
app.use(express.static(path.join(__dirname, '../frontend')));

// =====================================================
// ROUTE KONFIGÜRASYONU
// =====================================================

// API routes - Terraform kod üretimi endpoint'leri
// /api prefix'i ile başlayan tüm istekleri terraform.js route handler'ına yönlendir
// Örnek: POST /api/generate/ec2 → routes/terraform.js'deki ilgili handler'a gider
app.use('/api', require('./routes/terraform'));

// Ana sayfa route'u
// Root URL'e (/) gelen GET isteklerinde index.html dosyasını döndür
// SPA (Single Page Application) yapısı için tüm route'lar index.html'e yönlendirilir
app.get('/', (req, res) => {
    // Frontend klasöründeki index.html dosyasının tam path'ini oluştur ve gönder
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// =====================================================
// SERVER BAŞLATMA
// =====================================================
// HTTP server'ını başlat ve belirtilen port'ta dinlemeye başla
app.listen(PORT, () => {
    // Server başarıyla başladığında console'a bilgi mesajları yazdır
    console.log(`🚀 Teleform Server çalışıyor: http://localhost:${PORT}`);
    console.log(`📁 Frontend: ${path.join(__dirname, '../frontend')}`);
    console.log(`🔧 API Endpoint: http://localhost:${PORT}/api`);
});

// Express app instance'ını export et
// Test'lerde veya diğer modüllerde kullanılabilmesi için
module.exports = app; 