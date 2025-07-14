// =====================================================
// AWS EC2 ROUTES - EC2 INSTANCE TERRAFORM GENERATION
// =====================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

// =====================================================
// EC2 INSTANCE TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /ec2 endpoint'i
// Frontend'den gelen form verilerini alır ve EC2 Terraform kodu üretir

router.post('/', async (req, res) => {
    try {
        // Request body'den kullanıcı girişlerini destructure ile al
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
        const templatePath = path.join(__dirname, '../../../templates/aws/ec2-instance.tf.mustache');
        
        // Template dosyasını asenkron olarak oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Template için veri object'ini hazırla
        const templateData = {
            instanceType: instanceType || 't2.micro',
            amiId: amiId || 'ami-0c02fb55956c7d316',
            keyName: keyName || '',
            securityGroup: securityGroup || '',
            subnetId: subnetId || '',
            userData: userData || '',
            tags: tags || {
                Name: 'teleform-ec2-instance',
                Environment: 'development'
            },
            timestamp: new Date().toISOString()
        };

        // Mustache engine ile template'i render et
        const terraformCode = Mustache.render(template, templateData);

        // Unique dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `ec2-instance-${timestamp}.tf`;
        
        // Dosyanın kaydedileceği tam path'i oluştur
        const outputPath = path.join(__dirname, '../../../generated/output', fileName);

        // Dosyayı disk'e kaydet
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, terraformCode);

        // Başarılı response döndür
        res.json({
            success: true,
            message: 'EC2 Instance Terraform kodu başarıyla oluşturuldu',
            fileName: fileName,
            code: terraformCode,
            downloadUrl: `/api/download/${fileName}`
        });

    } catch (error) {
        console.error('EC2 kod oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kod oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 