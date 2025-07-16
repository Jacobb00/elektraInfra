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
        console.log('🔍 EC2 Route - Raw request body:', req.body);
        
        // Request body'den kullanıcı girişlerini destructure ile al
        const {
            awsRegion,          // AWS region (us-east-1, eu-west-1, etc.)
            instanceType,       // EC2 instance tipi (t2.micro, t2.small, vs.)
            amiType,           // Operating system type (amazon-linux-2023, ubuntu-22-04, etc.)
            keyName,           // SSH key pair adı (optional)
            securityGroup,     // Security group ID (optional)
            subnetId,          // VPC subnet ID (optional)
            rootVolumeSize,    // Root volume size in GB
            tags,              // Resource tags object'i
            userData           // Startup script (optional)
        } = req.body;

        console.log('🔍 EC2 Route - Destructured values:');
        console.log('  - awsRegion:', awsRegion);
        console.log('  - instanceType:', instanceType);
        console.log('  - amiType:', amiType);
        console.log('  - rootVolumeSize:', rootVolumeSize);
        console.log('  - tags:', tags);

        // Template dosyasının tam path'ini oluştur
        const templatePath = path.join(__dirname, '../../../templates/aws/ec2-instance.tf.mustache');
        
        // Template dosyasını asenkron olarak oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Template için veri object'ini hazırla
        const templateData = {
            awsRegion: awsRegion || 'us-east-1',
            instanceType: instanceType || 't2.micro',
            amiType: amiType || 'amazon-linux-2023',
            keyName: keyName || '',
            securityGroup: securityGroup || '',
            subnetId: subnetId || '',
            rootVolumeSize: rootVolumeSize || 8,
            userData: userData || '',
            timestamp: new Date().toISOString(),
            
            // Conditional flags for template
            hasKeyName: keyName && keyName.length > 0,
            hasSecurityGroup: securityGroup && securityGroup.length > 0,
            hasSubnetId: subnetId && subnetId.length > 0,
            hasUserData: userData && userData.length > 0,
            
            // Tags handling
            tags: {
                Name: (tags && tags.Name) ? tags.Name : 'teleform-instance',
                Environment: (tags && tags.Environment) ? tags.Environment : 'development'
            },
            
            // AMI type boolean flags for Mustache conditional logic
            'amazon-linux-2023': (amiType || 'amazon-linux-2023') === 'amazon-linux-2023',
            'amazon-linux-2': (amiType || 'amazon-linux-2023') === 'amazon-linux-2',
            'ubuntu-22-04': (amiType || 'amazon-linux-2023') === 'ubuntu-22-04',
            'ubuntu-20-04': (amiType || 'amazon-linux-2023') === 'ubuntu-20-04',
            'windows-2022': (amiType || 'amazon-linux-2023') === 'windows-2022',
            'windows-2019': (amiType || 'amazon-linux-2023') === 'windows-2019',
            'rhel-9': (amiType || 'amazon-linux-2023') === 'rhel-9',
            'rhel-8': (amiType || 'amazon-linux-2023') === 'rhel-8'
        };

        console.log('🔍 EC2 Route - Template data:');
        console.log('  - awsRegion:', templateData.awsRegion);
        console.log('  - instanceType:', templateData.instanceType);
        console.log('  - amiType:', templateData.amiType);
        console.log('  - rootVolumeSize:', templateData.rootVolumeSize);
        console.log('  - AMI Flags:', {
            'amazon-linux-2023': templateData['amazon-linux-2023'],
            'ubuntu-22-04': templateData['ubuntu-22-04']
        });

        // Mustache engine ile template'i render et
        const terraformCode = Mustache.render(template, templateData, {}, { escape: function(text) { return text; } });

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