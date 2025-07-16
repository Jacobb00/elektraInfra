// =====================================================
// AWS IAM ROUTES - IAM ROLE TERRAFORM GENERATION
// =====================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

// =====================================================
// IAM ROLE TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /iam endpoint'i
// Frontend'den gelen form verilerini alır ve IAM Role Terraform kodu üretir

router.post('/', async (req, res) => {
    try {
        console.log('🔍 IAM Route - Raw request body:', req.body);
        
        // Request body'den kullanıcı girişlerini destructure ile al
        const {
            awsRegion,
            roleName,
            roleDescription,
            servicePrincipal,
            managedPolicyArns,
            createInstanceProfile,
            tags
        } = req.body;

        // =====================================================
        // VERİ VALİDASYONU VE TRANSFORMASYONLARİ
        // =====================================================
        
        // Role name zorunlu
        if (!roleName) {
            return res.status(400).json({
                success: false,
                error: 'Role name is required',
                message: 'IAM Role adı boş olamaz'
            });
        }

        // Template data preparation
        const templateData = {
            awsRegion: awsRegion || 'us-east-1',
            roleName: roleName || 'elektra-role',
            roleDescription: roleDescription || 'IAM role created by Elektra Infrastructure Generator',
            
            // Assume role policies
            assumeRolePolicies: [{
                servicePrincipal: servicePrincipal || 'ec2.amazonaws.com',
                notLast: false
            }],
            
            // Managed policies
            managedPolicies: managedPolicyArns && managedPolicyArns.length > 0,
            policies: (managedPolicyArns || []).map(arn => ({ arn })),
            
            // Instance profile
            createInstanceProfile: createInstanceProfile || false,
            
            // Tags
            tags: Object.entries(tags || {
                Name: roleName || 'elektra-role',
                Environment: 'development'
            }).map(([key, value]) => ({ key, value })),
            
            timestamp: new Date().toISOString()
        };

        console.log('📝 IAM Template data:', JSON.stringify(templateData, null, 2));

        // =====================================================
        // MUSTACHE TEMPLATE İŞLEME
        // =====================================================
        
        // Template dosyasının yolunu belirle
        const templatePath = path.join(__dirname, '../../../templates/aws/iam.tf.mustache');
        
        // Template dosyasını oku
        const templateContent = await fs.readFile(templatePath, 'utf8');
        
        // Mustache ile render et
        const terraformCode = Mustache.render(templateContent, templateData);
        
        console.log('✅ IAM Terraform code generated successfully');

        // =====================================================
        // RESPONSE GÖNDERİMİ
        // =====================================================
        
        res.json({
            success: true,
            message: 'IAM Role Terraform kodu başarıyla oluşturuldu',
            service: 'iam',
            resourceType: 'aws_iam_role',
            config: {
                roleName: templateData.roleName,
                servicePrincipal: templateData.assumeRolePolicies[0].servicePrincipal,
                managedPoliciesCount: templateData.policies ? templateData.policies.length : 0,
                hasInstanceProfile: templateData.createInstanceProfile
            },
            code: terraformCode,
            terraformCode: terraformCode,
            timestamp: templateData.timestamp
        });

    } catch (error) {
        console.error('❌ IAM Route Error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'IAM Role Terraform kodu oluşturulurken hata oluştu: ' + error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// =====================================================
// IAM SERVICE STATUS CHECK
// =====================================================
// GET /iam/status endpoint'i

router.get('/status', (req, res) => {
    res.json({
        success: true,
        service: 'iam',
        message: 'IAM Role Generator hazır',
        features: [
            'IAM Role Creation',
            'Service Principal Configuration', 
            'Managed Policy Attachment',
            'Instance Profile Support',
            'Custom Tags'
        ],
        version: '1.0.0'
    });
});

module.exports = router; 