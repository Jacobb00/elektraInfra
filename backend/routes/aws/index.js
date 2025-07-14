// =====================================================
// AWS MAIN ROUTER - ALL AWS SERVICES AGGREGATION
// =====================================================
// Bu dosya tüm AWS servislerini tek router altında toplar
// Route modularization ve clean architecture için ana hub

const express = require('express');
const router = express.Router();

// AWS Service Routers
const ec2Routes = require('./ec2');
const s3Routes = require('./s3');
const rdsRoutes = require('./rds');

// =====================================================
// SERVICE ROUTE MOUNTING
// =====================================================
// Her AWS servisini kendi route'una mount et
// Prefix pattern: /api/aws/{service-name}

// EC2 Instance Generator
// GET|POST /api/aws/ec2/*
router.use('/ec2', ec2Routes);

// S3 Bucket Generator
// GET|POST /api/aws/s3/*
router.use('/s3', s3Routes);

// RDS Database Generator
// GET|POST /api/aws/rds/*
router.use('/rds', rdsRoutes);

// =====================================================
// AWS SERVICES STATUS ENDPOINT
// =====================================================
// GET /api/aws/status - AWS provider'ın tüm servislerinin durumunu döndürür

router.get('/status', (req, res) => {
    res.json({
        success: true,
        provider: 'AWS',
        message: 'AWS Terraform Generator servisleri çalışıyor',
        version: '1.0.0',
        services: {
            compute: ['EC2 Instance Generator'],
            storage: ['S3 Bucket Generator'],
            database: ['RDS Database Generator'],
            network: [], // Future: VPC, Security Groups, Load Balancer
            identity: [], // Future: IAM Roles, Policies
            monitoring: [] // Future: CloudWatch
        },
        totalServices: 3,
        availableEndpoints: [
            'POST /api/aws/ec2 - EC2 Instance generation',
            'POST /api/aws/s3 - S3 Bucket generation',
            'POST /api/aws/rds - RDS Database generation'
        ]
    });
});

// =====================================================
// FUTURE SERVICES PLACEHOLDER
// =====================================================
// Bu section'da gelecekte eklenecek servislerin placeholder'ları var

// VPC Network (Future)
// router.use('/vpc', require('./vpc'));

// Security Groups (Future)
// router.use('/security-groups', require('./security-groups'));

// Application Load Balancer (Future)
// router.use('/alb', require('./alb'));

// IAM Roles & Policies (Future)
// router.use('/iam', require('./iam'));

// CloudWatch Monitoring (Future)
// router.use('/cloudwatch', require('./cloudwatch'));

module.exports = router; 