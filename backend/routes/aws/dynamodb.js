// =====================================================
// AWS DYNAMODB ROUTES - DYNAMODB TABLE TERRAFORM GENERATION
// =====================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

// =====================================================
// DYNAMODB TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /dynamodb endpoint'i

router.post('/', async (req, res) => {
    try {
        // Request body'den kullanıcı girişlerini al
        const {
            awsRegion,
            tableName,
            billingMode,
            readCapacity,
            writeCapacity,
            hashKey,
            hashKeyType,
            rangeKey,
            rangeKeyType,
            enableEncryption,
            enablePointInTimeRecovery,
            enableTtl,
            ttlAttributeName,
            enableStreams,
            streamViewType,
            globalSecondaryIndexes,
            localSecondaryIndexes,
            enableAutoScaling,
            autoScalingMinReadCapacity,
            autoScalingMaxReadCapacity,
            autoScalingMinWriteCapacity,
            autoScalingMaxWriteCapacity,
            autoScalingTargetValue,
            enableBackup,
            backupRetentionDays,
            tags
        } = req.body;

        // Template dosyasının path'ini oluştur
        const templatePath = path.join(__dirname, '../../../templates/aws/dynamodb.tf.mustache');
        
        // Template dosyasını oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Provisioned mode check
        const isProvisionedMode = billingMode === 'PROVISIONED';

        // Additional attributes for indexes
        const additionalAttributes = [];
        const attributeSet = new Set();
        
        // Add hash and range keys to set
        attributeSet.add(hashKey);
        if (rangeKey) attributeSet.add(rangeKey);
        
        // Collect attributes from GSIs
        if (globalSecondaryIndexes && globalSecondaryIndexes.length > 0) {
            globalSecondaryIndexes.forEach(gsi => {
                if (gsi.hashKey && !attributeSet.has(gsi.hashKey)) {
                    additionalAttributes.push({ name: gsi.hashKey, type: gsi.hashKeyType || 'S' });
                    attributeSet.add(gsi.hashKey);
                }
                if (gsi.rangeKey && !attributeSet.has(gsi.rangeKey)) {
                    additionalAttributes.push({ name: gsi.rangeKey, type: gsi.rangeKeyType || 'S' });
                    attributeSet.add(gsi.rangeKey);
                }
            });
        }
        
        // Collect attributes from LSIs
        if (localSecondaryIndexes && localSecondaryIndexes.length > 0) {
            localSecondaryIndexes.forEach(lsi => {
                if (lsi.rangeKey && !attributeSet.has(lsi.rangeKey)) {
                    additionalAttributes.push({ name: lsi.rangeKey, type: lsi.rangeKeyType || 'S' });
                    attributeSet.add(lsi.rangeKey);
                }
            });
        }

        // Format GSIs
        const gsiList = (globalSecondaryIndexes || []).map(gsi => ({
            ...gsi,
            provisionedMode: isProvisionedMode,
            readCapacity: gsi.readCapacity || readCapacity || 5,
            writeCapacity: gsi.writeCapacity || writeCapacity || 5,
            nonKeyAttributesFormatted: (gsi.nonKeyAttributes || []).map(attr => `"${attr}"`).join(', ')
        }));

        // Format LSIs
        const lsiList = (localSecondaryIndexes || []).map(lsi => ({
            ...lsi,
            nonKeyAttributesFormatted: (lsi.nonKeyAttributes || []).map(attr => `"${attr}"`).join(', ')
        }));

        // Template için veri hazırla
        const templateData = {
            awsRegion: awsRegion || 'us-east-1',
            tableName: tableName || 'teleform-table',
            billingMode: billingMode || 'PAY_PER_REQUEST',
            provisionedMode: isProvisionedMode,
            readCapacity: readCapacity || 5,
            writeCapacity: writeCapacity || 5,
            hashKey: hashKey || 'id',
            hashKeyType: hashKeyType || 'S',
            rangeKey: rangeKey || '',
            rangeKeyType: rangeKeyType || 'S',
            
            // Additional attributes
            additionalAttributes: additionalAttributes.length > 0,
            attributes: additionalAttributes,
            
            // Features
            enableEncryption: enableEncryption !== false,
            enablePointInTimeRecovery: enablePointInTimeRecovery || false,
            enableTtl: enableTtl || false,
            ttlAttributeName: ttlAttributeName || 'ttl',
            enableStreams: enableStreams || false,
            streamViewType: streamViewType || 'NEW_AND_OLD_IMAGES',
            
            // Indexes
            globalSecondaryIndexes: gsiList.length > 0,
            gsiList: gsiList,
            localSecondaryIndexes: lsiList.length > 0,
            lsiList: lsiList,
            
            // Auto Scaling
            enableAutoScaling: isProvisionedMode && (enableAutoScaling || false),
            autoScalingMinReadCapacity: autoScalingMinReadCapacity || 1,
            autoScalingMaxReadCapacity: autoScalingMaxReadCapacity || 10,
            autoScalingMinWriteCapacity: autoScalingMinWriteCapacity || 1,
            autoScalingMaxWriteCapacity: autoScalingMaxWriteCapacity || 10,
            autoScalingTargetValue: autoScalingTargetValue || 70,
            
            // Backup
            enableBackup: enableBackup || false,
            backupRetentionDays: backupRetentionDays || 7,
            
            // Tags
            tags: Object.entries(tags || {
                Name: tableName || 'teleform-table',
                Environment: 'development'
            }).map(([key, value]) => ({ key, value })),
            
            // Timestamp
            timestamp: new Date().toISOString()
        };

        // Template'i render et
        const terraformCode = Mustache.render(template, templateData);

        // Dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `dynamodb-${timestamp}.tf`;
        
        // Dosyayı kaydet
        const outputPath = path.join(__dirname, '../../../generated/output', fileName);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, terraformCode);

        // Response döndür
        res.json({
            success: true,
            message: 'DynamoDB Terraform kodu başarıyla oluşturuldu',
            fileName: fileName,
            code: terraformCode,
            downloadUrl: `/api/download/${fileName}`
        });

    } catch (error) {
        console.error('DynamoDB kod oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'DynamoDB kodu oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 