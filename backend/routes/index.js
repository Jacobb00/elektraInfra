// =====================================================
// MAIN API ROUTER - ALL PROVIDERS AGGREGATION
// =====================================================
// Bu dosya tüm cloud provider'larını tek router altında toplar
// Scalable architecture için ana routing hub'ı

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

// Cloud Provider Routers
const awsRoutes = require('./aws');

// Future provider imports
// const azureRoutes = require('./azure');
// const gcpRoutes = require('./gcp');

// =====================================================
// PROVIDER ROUTE MOUNTING
// =====================================================
// Her cloud provider'ını kendi route'una mount et
// Prefix pattern: /api/{provider-name}

// AWS Cloud Provider
// GET|POST /api/aws/*
router.use('/aws', awsRoutes);

// Azure Cloud Provider (Future)
// GET|POST /api/azure/*
// router.use('/azure', azureRoutes);

// Google Cloud Provider (Future)
// GET|POST /api/gcp/*
// router.use('/gcp', gcpRoutes);

// =====================================================
// LEGACY ROUTES SUPPORT (BACKWARD COMPATIBILITY)
// =====================================================
// Eski route'lar için backward compatibility
// Yeni client'lar /api/aws/* kullanmalı, eskiler /api/generate/* kullanmaya devam edebilir

// Legacy routes - Backward compatibility için eski endpoint'leri forward et
const legacyRoutes = require('./legacy');
router.use('/generate', legacyRoutes);

// =====================================================
// GLOBAL API STATUS ENDPOINT
// =====================================================
// GET /api/status - Tüm provider'ların genel durumunu döndürür

router.get('/status', async (req, res) => {
    try {
        // Available providers check
        const providers = {
            aws: {
                status: 'active',
                services: 3, // EC2, S3, RDS
                version: '1.0.0'
            },
            azure: {
                status: 'planned',
                services: 0,
                version: 'N/A'
            },
            gcp: {
                status: 'planned',
                services: 0,
                version: 'N/A'
            }
        };

        res.json({
            success: true,
            message: 'Teleform API çalışıyor',
            version: '1.0.0',
            providers: providers,
            totalProviders: Object.keys(providers).length,
            activeProviders: Object.values(providers).filter(p => p.status === 'active').length,
            totalServices: Object.values(providers).reduce((sum, p) => sum + p.services, 0),
            availableEndpoints: [
                'GET /api/status - API genel durumu',
                'GET /api/aws/status - AWS servisleri durumu',
                'POST /api/aws/ec2 - EC2 Instance generation',
                'POST /api/aws/s3 - S3 Bucket generation',
                'POST /api/aws/rds - RDS Database generation',
                'GET /api/download/:fileName - Dosya indirme'
            ],
            legacySupport: {
                'POST /api/generate/ec2': 'Use POST /api/aws/ec2 instead',
                'POST /api/generate/s3': 'Use POST /api/aws/s3 instead', 
                'POST /api/generate/rds': 'Use POST /api/aws/rds instead'
            }
        });
    } catch (error) {
        console.error('Status endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Status kontrolü başarısız',
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
        const fileName = req.params.fileName;
        const filePath = path.join(__dirname, '../../generated/output', fileName);

        if (await fs.pathExists(filePath)) {
            res.download(filePath, fileName);
        } else {
            res.status(404).json({
                success: false,
                message: 'Dosya bulunamadı'
            });
        }
    } catch (error) {
        console.error('Dosya indirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Dosya indirilemedi',
            error: error.message
        });
    }
});

// =====================================================
// HEALTH CHECK ENDPOINT
// =====================================================
// GET /api/health - Basit health check endpoint

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

module.exports = router; 