// =====================================================
// AWS VPC ROUTES - VPC TERRAFORM GENERATION
// =====================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

// =====================================================
// VPC TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /vpc endpoint'i

router.post('/', async (req, res) => {
    try {
        // Request body'den kullanıcı girişlerini al
        const {
            awsRegion,          // AWS region
            vpcName,            // VPC name
            vpcCidr,            // VPC CIDR block
            availabilityZones,  // Number of AZs to use
            enableNatGateway,   // Enable NAT Gateway
            singleNatGateway,   // Single NAT Gateway for cost optimization
            enableDnsHostnames, // Enable DNS hostnames
            enableDnsSupport,   // Enable DNS support
            enableDatabaseSubnets, // Create database subnets
            enableVpnGateway,   // Enable VPN Gateway
            enableFlowLogs,     // Enable VPC Flow Logs
            flowLogsRetention,  // Flow logs retention days
            tags               // Resource tags
        } = req.body;

        // Template dosyasının path'ini oluştur
        const templatePath = path.join(__dirname, '../../../templates/aws/vpc.tf.mustache');
        
        // Template dosyasını oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Template için veri hazırla
        const templateData = {
            awsRegion: awsRegion || 'us-east-1',
            vpcName: vpcName || 'teleform-vpc',
            vpcCidr: vpcCidr || '10.0.0.0/16',
            availabilityZones: availabilityZones || 2,
            enableNatGateway: enableNatGateway !== false,
            singleNatGateway: singleNatGateway || false,
            enableDnsHostnames: enableDnsHostnames !== false,
            enableDnsSupport: enableDnsSupport !== false,
            enableDatabaseSubnets: enableDatabaseSubnets || false,
            enableVpnGateway: enableVpnGateway || false,
            enableFlowLogs: enableFlowLogs || false,
            flowLogsRetention: flowLogsRetention || 7,
            
            // Tags
            tags: Object.entries(tags || {
                Name: vpcName || 'teleform-vpc',
                Environment: 'development'
            }).map(([key, value]) => ({ key, value })),
            
            // Timestamp
            timestamp: new Date().toISOString()
        };

        // Template'i render et
        const terraformCode = Mustache.render(template, templateData);

        // Dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `vpc-${timestamp}.tf`;
        
        // Dosyayı kaydet
        const outputPath = path.join(__dirname, '../../../generated/output', fileName);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, terraformCode);

        // Response döndür
        res.json({
            success: true,
            message: 'VPC Terraform kodu başarıyla oluşturuldu',
            fileName: fileName,
            code: terraformCode,
            downloadUrl: `/api/download/${fileName}`
        });

    } catch (error) {
        console.error('VPC kod oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'VPC kodu oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 