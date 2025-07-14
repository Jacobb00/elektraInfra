// =====================================================
// TERRAFORM ROUTE HANDLER - API ENDPOINTLERİ
// =====================================================
// Bu dosya Terraform kodu üretimi için API endpoint'lerini tanımlar
// Template processing, file operations ve response handling yapar

// NPM paket importları
const express = require('express');          // Express router için
const router = express.Router();             // Express router instance - modüler route tanımları için
const path = require('path');                // Dosya yolu işlemleri
const fs = require('fs-extra');              // Async file operations - promises destekler
const Mustache = require('mustache');        // Template engine - logic-less templates

// =====================================================
// EC2 INSTANCE TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /api/generate/ec2 endpoint'i
// Frontend'den gelen form verilerini alır ve EC2 Terraform kodu üretir

router.post('/generate/ec2', async (req, res) => {
    try {
        // Request body'den kullanıcı girişlerini destructure ile al
        // Bu parametreler frontend form'undan geliyor
        const {
            instanceType,    // EC2 instance tipi (t2.micro, t2.small, vs.)
            amiId,          // Amazon Machine Image ID
            keyName,        // SSH key pair adı (optional)
            securityGroup,  // Security group ID (optional)
            subnetId,       // VPC subnet ID (optional)
            tags,           // Resource tags object'i
            userData        // Startup script (optional)
        } = req.body;

        // Template dosyasının tam path'ini oluştur
        // __dirname: mevcut dosyanın bulunduğu klasör
        // ../../templates/aws/: templates klasörüne giden relative path
        const templatePath = path.join(__dirname, '../../templates/aws/ec2-instance.tf.mustache');
        
        // Template dosyasını asenkron olarak oku
        // UTF-8 encoding ile string olarak döner
        const template = await fs.readFile(templatePath, 'utf8');

        // Template için veri object'ini hazırla
        // Mustache template'inde {{variable}} şeklinde kullanılacak
        const templateData = {
            // Default değerlerle birlikte user input'unu al
            instanceType: instanceType || 't2.micro',           // Varsayılan: t2.micro (Free Tier)
            amiId: amiId || 'ami-0c02fb55956c7d316',            // Varsayılan: Amazon Linux 2 (us-east-1)
            keyName: keyName || '',                             // Boş string → template'de optional rendering
            securityGroup: securityGroup || '',                // Boş string → template'de optional rendering
            subnetId: subnetId || '',                           // Boş string → template'de optional rendering
            
            // Tags object'i - kullanıcı verisi yoksa default values
            tags: tags || {
                Name: 'teleform-instance',                      // Instance name tag
                Environment: 'development'                      // Environment tag
            },
            
            // User data script
            userData: userData || '',                           // Bootstrap script (optional)
            
            // Template'de conditional rendering için boolean flag
            // userData varsa ve boş değilse true, template'de {{#hasUserData}} bloku render edilir
            hasUserData: userData && userData.trim() !== ''
        };

        // Mustache engine ile template'i render et
        // template: .mustache dosyasının içeriği
        // templateData: placeholder'ları dolduracak veri
        // Sonuç: Hazır Terraform kodu (string)
        const terraformCode = Mustache.render(template, templateData);

        // Unique dosya adı oluştur
        // ISO string: 2025-01-11T14:13:45.123Z formatında
        // replace(/[:.]/g, '-'): kolon ve nokta karakterlerini tire ile değiştir (file system safe)
        // Sonuç: ec2-instance-2025-01-11T14-13-45-123Z.tf
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `ec2-instance-${timestamp}.tf`;
        
        // Dosyanın kaydedileceği tam path'i oluştur
        const outputPath = path.join(__dirname, '../../generated/output', fileName);

        // Dosyayı disk'e kaydet
        // fs.ensureDir: output klasörü yoksa oluştur (mkdir -p benzeri)
        await fs.ensureDir(path.dirname(outputPath));
        
        // Terraform kodunu dosyaya yaz
        // UTF-8 encoding ile async write operation
        await fs.writeFile(outputPath, terraformCode);

        // Başarılı response döndür
        // Frontend bu response'u kullanarak UI'ı güncelleyecek
        res.json({
            success: true,                                      // Operation başarı durumu
            message: 'EC2 Terraform kodu başarıyla oluşturuldu', // Kullanıcı friendly mesaj
            fileName: fileName,                                 // Oluşturulan dosya adı
            code: terraformCode,                               // Generated Terraform kodu (preview için)
            downloadUrl: `/api/download/${fileName}`           // Dosya indirme URL'i
        });

    } catch (error) {
        // Hata durumunda error handling
        // Console'a detaylı hata bilgisi yazdır (development/debugging için)
        console.error('EC2 kod oluşturma hatası:', error);
        
        // Client'a user-friendly error response döndür
        // HTTP 500 status code (Internal Server Error)
        res.status(500).json({
            success: false,                                    // Operation başarısızlık durumu
            message: 'Kod oluşturulurken hata oluştu',        // Generic error message
            error: error.message                               // Specific error details
        });
    }
});

// =====================================================
// S3 BUCKET TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /api/generate/s3 endpoint'i
// Frontend'den gelen form verilerini alır ve S3 Bucket Terraform kodu üretir

router.post('/generate/s3', async (req, res) => {
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
        const templatePath = path.join(__dirname, '../../templates/aws/s3-bucket.tf.mustache');
        
        // Template dosyasını asenkron olarak oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Template için veri object'ini hazırla
        const templateData = {
            // Bucket temel konfigürasyonu
            bucketName: bucketName || `teleform-bucket-${Date.now()}`,  // Unique bucket name
            bucketEnvironment: bucketEnvironment || '',
            
            // Security ve access settings
            enableVersioning: enableVersioning || false,                 // Versioning default false
            enableEncryption: enableEncryption || false,                 // Encryption default false
            blockPublicAccess: blockPublicAccess !== false,              // Default true (güvenlik için)
            
            // Static website hosting
            enableWebsiteHosting: enableWebsiteHosting || false,
            indexDocument: indexDocument || 'index.html',
            errorDocument: errorDocument || '',
            
            // CORS configuration
            enableCORS: enableCORS || false,
            corsOrigins: corsOrigins || ['*'],                           // Default allow all
            corsOriginsFormatted: (corsOrigins || ['*']).map(origin => `"${origin}"`).join(', '),
            
            // Lifecycle management
            enableLifecycle: enableLifecycle || false,
            lifecycleDays: lifecycleDays || 30,                          // Default 30 days
            noncurrentVersionDays: noncurrentVersionDays || 30,
            
            // Tags object - kullanıcı verisi yoksa default values
            tags: tags || {
                Name: bucketName || 'teleform-bucket',
                Environment: bucketEnvironment || 'development'
            },
            
            // Timestamp for template comment
            timestamp: new Date().toISOString()
        };

        // Mustache engine ile template'i render et
        const terraformCode = Mustache.render(template, templateData);

        // Unique dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `s3-bucket-${timestamp}.tf`;
        
        // Dosyanın kaydedileceği tam path'i oluştur
        const outputPath = path.join(__dirname, '../../generated/output', fileName);

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

// =====================================================
// RDS DATABASE TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /api/generate/rds endpoint'i
// Frontend'den gelen form verilerini alır ve RDS Database Terraform kodu üretir

router.post('/generate/rds', async (req, res) => {
    try {
        // Request body'den kullanıcı girişlerini destructure ile al
        const {
            dbIdentifier,          // RDS instance identifier (unique)
            engine,               // Database engine (mysql, postgres, etc.)
            engineVersion,        // Engine version (5.7, 8.0, 13.7, etc.)
            instanceClass,        // DB instance class (db.t3.micro, db.t3.small, etc.)
            allocatedStorage,     // Storage size in GB
            maxAllocatedStorage,  // Max storage for autoscaling
            storageType,          // Storage type (gp2, gp3, io1, io2)
            storageEncrypted,     // Enable storage encryption
            dbName,              // Database name to create
            username,            // Master username
            password,            // Master password
            multiAZ,             // Multi-AZ deployment
            publiclyAccessible,  // Public access
            backupRetentionPeriod, // Backup retention days
            backupWindow,        // Backup window
            maintenanceWindow,   // Maintenance window
            performanceInsightsEnabled, // Performance Insights
            monitoringInterval,  // Enhanced monitoring interval
            deletionProtection,  // Deletion protection
            createVPC,           // Create new VPC or use existing
            vpcId,              // Existing VPC ID (if not creating new)
            subnetIds,          // Existing subnet IDs (if not creating new)
            securityGroupRules, // Security group ingress rules
            createParameterGroup, // Create custom parameter group
            parameterGroupFamily, // Parameter group family
            parameters,         // DB parameters
            createOptionGroup,  // Create custom option group
            majorEngineVersion, // Major engine version for option group
            options,           // DB options
            tags               // Resource tags
        } = req.body;

        // Template dosyasının tam path'ini oluştur
        const templatePath = path.join(__dirname, '../../templates/aws/rds-database.tf.mustache');
        
        // Template dosyasını asenkron olarak oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Engine'e göre default port'ları belirle
        const getDefaultPort = (engine) => {
            const defaultPorts = {
                'mysql': 3306,
                'postgres': 5432,
                'mariadb': 3306,
                'oracle-ee': 1521,
                'oracle-se2': 1521,
                'sqlserver-ee': 1433,
                'sqlserver-se': 1433,
                'sqlserver-ex': 1433,
                'sqlserver-web': 1433
            };
            return defaultPorts[engine] || 3306;
        };

        // Template için veri object'ini hazırla
        const templateData = {
            // Database temel konfigürasyonu
            db_identifier: dbIdentifier || `teleform-db-${Date.now()}`,
            engine: engine || 'mysql',
            engine_version: engineVersion || '8.0',
            instance_class: instanceClass || 'db.t3.micro',
            allocated_storage: allocatedStorage || 20,
            max_allocated_storage: maxAllocatedStorage || 100,
            storage_type: storageType || 'gp2',
            
            // Security settings
            storage_encrypted: storageEncrypted || false,
            db_name: dbName || 'teleformdb',
            username: username || 'admin',
            password: password || 'changeme123!',
            
            // Availability ve access
            multi_az: multiAZ || false,
            publicly_accessible: publiclyAccessible || false,
            
            // Backup ve maintenance
            backup_retention_period: backupRetentionPeriod || 7,
            backup_window: backupWindow || '',
            maintenance_window: maintenanceWindow || '',
            
            // Monitoring
            performance_insights_enabled: performanceInsightsEnabled || false,
            monitoring_interval: monitoringInterval || 0,
            deletion_protection: deletionProtection || false,
            
            // Network configuration
            create_vpc: createVPC || true,
            vpc_id: vpcId || '',
            subnet_ids: subnetIds || [],
            subnet_ids_formatted: subnetIds && subnetIds.length > 0 ? subnetIds.map(id => `"${id}"`).join(', ') : '',
            
            // Security group rules - default olarak sadece seçilen engine port'una izin ver
            security_group_rules: (securityGroupRules || [{
                port: getDefaultPort(engine || 'mysql'),
                cidr_blocks: ['10.0.0.0/16']
            }]).map(rule => ({
                ...rule,
                cidr_blocks_formatted: rule.cidr_blocks ? rule.cidr_blocks.map(cidr => `"${cidr}"`).join(', ') : '"10.0.0.0/16"'
            })),
            
            // Parameter group
            create_parameter_group: createParameterGroup || false,
            parameter_group_family: parameterGroupFamily || '',
            parameters: parameters || [],
            
            // Option group
            create_option_group: createOptionGroup || false,
            major_engine_version: majorEngineVersion || '',
            options: options || [],
            
            // Tags
            tags: tags || {
                Name: dbIdentifier || 'teleform-db',
                Environment: 'development'
            },
            
            // Timestamp for template comment
            timestamp: new Date().toISOString()
        };

        // Mustache engine ile template'i render et
        const terraformCode = Mustache.render(template, templateData);

        // Unique dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `rds-database-${timestamp}.tf`;
        
        // Dosyanın kaydedileceği tam path'i oluştur
        const outputPath = path.join(__dirname, '../../generated/output', fileName);

        // Dosyayı disk'e kaydet
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, terraformCode);

        // Başarılı response döndür
        res.json({
            success: true,
            message: 'RDS Database Terraform kodu başarıyla oluşturuldu',
            fileName: fileName,
            code: terraformCode,
            downloadUrl: `/api/download/${fileName}`
        });

    } catch (error) {
        // Hata durumunda error handling
        console.error('RDS kod oluşturma hatası:', error);
        
        // Client'a user-friendly error response döndür
        res.status(500).json({
            success: false,
            message: 'RDS Database kodu oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

// =====================================================
// DOSYA İNDİRME ENDPOINTİ
// =====================================================
// GET /api/download/:fileName endpoint'i
// Oluşturulan Terraform dosyalarını client'a indirir

router.get('/download/:fileName', async (req, res) => {
    try {
        // URL parameter'ından dosya adını al
        // Örnek: /api/download/ec2-instance-2025-01-11.tf → fileName = "ec2-instance-2025-01-11.tf"
        const fileName = req.params.fileName;
        
        // Güvenlik için dosya adını validate et
        // path.join + path.dirname kullanarak path traversal attack'ları önle
        // Örnek: "../../../etc/passwd" gibi tehlikeli path'leri engelle
        const filePath = path.join(__dirname, '../../generated/output', fileName);

        // Dosyanın varlığını kontrol et
        // fs.pathExists: async olarak dosya/klasör varlığını kontrol eder
        if (await fs.pathExists(filePath)) {
            // Dosya varsa Express'in built-in download fonksiyonunu kullan
            // res.download: dosyayı Content-Disposition: attachment header'ı ile gönderir
            // Browser otomatik olarak "Save As" dialog'u açar
            res.download(filePath, fileName);
        } else {
            // Dosya bulunamazsa 404 Not Found döndür
            res.status(404).json({
                success: false,
                message: 'Dosya bulunamadı'
            });
        }
    } catch (error) {
        // Dosya sistemi hataları için error handling
        console.error('Dosya indirme hatası:', error);
        
        // HTTP 500 Internal Server Error döndür
        res.status(500).json({
            success: false,
            message: 'Dosya indirilemedi',
            error: error.message
        });
    }
});

// =====================================================
// SİSTEM DURUMU ENDPOINTİ
// =====================================================
// GET /api/status endpoint'i
// Server'ın çalışır durumda olduğunu ve hangi servislerin aktif olduğunu döndürür
// Frontend bu endpoint'i server bağlantısını kontrol etmek için kullanır

router.get('/status', (req, res) => {
    // Sistem durumu bilgilerini JSON olarak döndür
    // Bu endpoint hem health check hem de API discovery için kullanılır
    res.json({
        success: true,                           // API çalışır durumda
        message: 'Teleform API çalışıyor',      // Status mesajı
        version: '1.0.0',                       // API versiyonu (semantic versioning)
        services: ['EC2 Instance Generator', 'S3 Bucket Generator', 'RDS Database Generator']    // Aktif servisler listesi
    });
});

// =====================================================
// ROUTER EXPORT
// =====================================================
// Express router instance'ını export et
// server.js'de app.use('/api', router) şeklinde kullanılacak
module.exports = router; 