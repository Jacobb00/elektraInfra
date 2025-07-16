// =====================================================
// AWS RDS ROUTES - RDS DATABASE TERRAFORM GENERATION
// =====================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

// =====================================================
// RDS DATABASE TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /rds endpoint'i
// Frontend'den gelen form verilerini alır ve RDS Database Terraform kodu üretir

router.post('/', async (req, res) => {
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
        const templatePath = path.join(__dirname, '../../../templates/aws/rds-database.tf.mustache');
        
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
            backup_window: backupWindow || null,
            maintenance_window: maintenanceWindow || null,
            
            // Monitoring
            performance_insights_enabled: performanceInsightsEnabled || false,
            monitoring_interval: monitoringInterval || 0,
            deletion_protection: deletionProtection || false,
            
            // Network configuration
            create_vpc: createVPC || true,
            vpc_id: vpcId || null,
            subnet_ids: subnetIds || [],
            subnet_ids_formatted: subnetIds && subnetIds.length > 0 ? subnetIds.map(id => `"${id}"`).join(', ') : null,
            
            // Security group rules
            security_group_rules: (securityGroupRules || [{
                port: getDefaultPort(engine || 'mysql'),
                cidr_blocks: ['10.0.0.0/16']
            }]).map(rule => ({
                ...rule,
                cidr_blocks_formatted: rule.cidr_blocks ? rule.cidr_blocks.map(cidr => `"${cidr}"`).join(', ') : '"10.0.0.0/16"'
            })),
            
            // Parameter group
            create_parameter_group: createParameterGroup || false,
            parameter_group_family: parameterGroupFamily || null,
            parameters: parameters || [],
            
            // Option group
            create_option_group: createOptionGroup || false,
            major_engine_version: majorEngineVersion || null,
            options: options || [],
            
            // Tags - Convert to array format for Mustache template
            tags: Object.entries(tags || {
                Name: dbIdentifier || 'teleform-db',
                Environment: 'development'
            }).map(([key, value]) => ({ key, value })),
            
            // Timestamp for template comment
            timestamp: new Date().toISOString()
        };

        // Mustache engine ile template'i render et (HTML escaping kapalı)
        const terraformCode = Mustache.render(template, templateData, {}, { escape: function(text) { return text; } });

        // Unique dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `rds-database-${timestamp}.tf`;
        
        // Dosyanın kaydedileceği tam path'i oluştur
        const outputPath = path.join(__dirname, '../../../generated/output', fileName);

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

module.exports = router; 