// =====================================================
// AWS S3 ROUTES - S3 BUCKET TERRAFORM GENERATION
// =====================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

// =====================================================
// S3 BUCKET TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /s3 endpoint'i
// Frontend'den gelen form verilerini alır ve S3 Bucket Terraform kodu üretir

router.post('/', async (req, res) => {
    try {
        // Request body'den kullanıcı girişlerini destructure ile al
        const {
            bucketName,          // S3 bucket name (unique olmalı)
            bucketEnvironment,   // Environment tag (optional)
            enableVersioning,    // Bucket versioning enable/disable
            enableEncryption,    // Server-side encryption enable/disable
            blockPublicAccess,   // Public access block settings
            enableWebsiteHosting,// Static website hosting
            indexDocument,       // Index document for website (default: index.html)
            errorDocument,       // Error document for website (optional)
            enableCORS,          // CORS configuration
            corsOrigins,         // CORS allowed origins array
            enableLifecycle,     // Lifecycle rules
            lifecycleDays,       // Days to expire objects
            noncurrentVersionDays, // Days to expire non-current versions
            tags                 // Resource tags object
        } = req.body;

        // Template dosyasının tam path'ini oluştur
        const templatePath = path.join(__dirname, '../../../templates/aws/s3-bucket.tf.mustache');
        
        // Template dosyasını asenkron olarak oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Template için veri object'ini hazırla
        const templateData = {
            // Bucket temel konfigürasyonu
            bucketName: bucketName || `teleform-bucket-${Date.now()}`,
            bucketEnvironment: bucketEnvironment || '',
            
            // Security ve access settings
            enableVersioning: enableVersioning || false,
            enableEncryption: enableEncryption || false,
            blockPublicAccess: blockPublicAccess !== false,
            
            // Static website hosting
            enableWebsiteHosting: enableWebsiteHosting || false,
            indexDocument: indexDocument || 'index.html',
            errorDocument: errorDocument || '',
            
            // CORS configuration
            enableCORS: enableCORS || false,
            corsOrigins: corsOrigins && corsOrigins.length > 0 ? corsOrigins : ['*'],
            corsOriginsFormatted: (corsOrigins && corsOrigins.length > 0 ? corsOrigins : ['*']).map(origin => `"${origin}"`).join(', '),
            
            // Lifecycle management
            enableLifecycle: enableLifecycle || false,
            lifecycleDays: lifecycleDays || 30,
            noncurrentVersionDays: noncurrentVersionDays || 30,
            
            // Tags - Convert to array format for Mustache template
            tags: Object.entries(tags || {
                Name: bucketName || 'teleform-bucket',
                Environment: bucketEnvironment || 'development'
            }).map(([key, value]) => ({ key, value })),
            
            // Timestamp for template comment
            timestamp: new Date().toISOString()
        };

        // Mustache engine ile template'i render et
        const terraformCode = Mustache.render(template, templateData, {}, { escape: function(text) { return text; } });

        // Unique dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `s3-bucket-${timestamp}.tf`;
        
        // Dosyanın kaydedileceği tam path'i oluştur
        const outputPath = path.join(__dirname, '../../../generated/output', fileName);

        // Dosyayı disk'e kaydet
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, terraformCode);

        // Başarılı response döndür
        res.json({
            success: true,
            message: 'S3 Bucket Terraform kodu başarıyla oluşturuldu',
            fileName: fileName,
            code: terraformCode,
            downloadUrl: `/api/download/${fileName}`
        });

    } catch (error) {
        // Hata durumunda error handling
        console.error('S3 kod oluşturma hatası:', error);
        
        // Client'a user-friendly error response döndür
        res.status(500).json({
            success: false,
            message: 'S3 Bucket kodu oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 