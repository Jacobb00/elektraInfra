// =====================================================
// AWS LAMBDA ROUTES - LAMBDA FUNCTION TERRAFORM GENERATION
// =====================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

// =====================================================
// LAMBDA TERRAFORM KODU ÜRETİMİ
// =====================================================
// POST /lambda endpoint'i

router.post('/', async (req, res) => {
    try {
        // Request body'den kullanıcı girişlerini al
        const {
            awsRegion,
            functionName,
            functionDescription,
            runtime,
            handler,
            memorySize,
            timeout,
            architecture,
            functionCode,
            sourceFile,
            environmentVariables,
            enableVpcConfig,
            vpcId,
            subnetIds,
            securityGroupIds,
            enableApiGateway,
            apiGatewayStage,
            enableEventBridge,
            scheduleExpression,
            enableDynamoDB,
            enableS3,
            enableCloudWatchLogs,
            logRetentionDays,
            enableDeadLetterQueue,
            enableTracing,
            tags
        } = req.body;

        // Template dosyasının path'ini oluştur
        const templatePath = path.join(__dirname, '../../../templates/aws/lambda.tf.mustache');
        
        // Template dosyasını oku
        const template = await fs.readFile(templatePath, 'utf8');

        // Environment variables formatting
        const envVars = [];
        if (environmentVariables && typeof environmentVariables === 'object') {
            Object.entries(environmentVariables).forEach(([key, value]) => {
                envVars.push({ key, value });
            });
        }

        // Template için veri hazırla
        const templateData = {
            awsRegion: awsRegion || 'us-east-1',
            functionName: functionName || 'teleform-lambda',
            functionDescription: functionDescription || 'Lambda function created by Teleform',
            runtime: runtime || 'python3.9',
            handler: handler || 'index.handler',
            memorySize: memorySize || 128,
            timeout: timeout || 3,
            architecture: architecture || 'x86_64',
            
            // Function code
            functionCode: functionCode || getDefaultFunctionCode(runtime || 'python3.9'),
            sourceFile: sourceFile || getDefaultSourceFile(runtime || 'python3.9'),
            
            // Environment variables
            environmentVariables: envVars.length > 0,
            envVars: envVars,
            
            // VPC configuration
            enableVpcConfig: enableVpcConfig || false,
            subnetIds: subnetIds && subnetIds.length > 0 ? 
                subnetIds.map(id => `"${id}"`).join(', ') : '',
            securityGroupIds: securityGroupIds && securityGroupIds.length > 0 ? 
                securityGroupIds.map(id => `"${id}"`).join(', ') : '',
            
            // API Gateway
            enableApiGateway: enableApiGateway || false,
            apiGatewayStage: apiGatewayStage || 'prod',
            
            // EventBridge
            enableEventBridge: enableEventBridge || false,
            scheduleExpression: scheduleExpression || 'rate(1 hour)',
            
            // Permissions
            enableDynamoDB: enableDynamoDB || false,
            enableS3: enableS3 || false,
            
            // CloudWatch Logs
            enableCloudWatchLogs: enableCloudWatchLogs !== false,
            logRetentionDays: logRetentionDays || 7,
            
            // Additional features
            enableDeadLetterQueue: enableDeadLetterQueue || false,
            enableTracing: enableTracing || false,
            
            // Tags
            tags: Object.entries(tags || {
                Name: functionName || 'teleform-lambda',
                Environment: 'development'
            }).map(([key, value]) => ({ key, value })),
            
            // Timestamp
            timestamp: new Date().toISOString()
        };

        // Template'i render et
        const terraformCode = Mustache.render(template, templateData, {}, { escape: function(text) { return text; } });

        // Dosya adı oluştur
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `lambda-${timestamp}.tf`;
        
        // Dosyayı kaydet
        const outputPath = path.join(__dirname, '../../../generated/output', fileName);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, terraformCode);

        // Response döndür
        res.json({
            success: true,
            message: 'Lambda Terraform kodu başarıyla oluşturuldu',
            fileName: fileName,
            code: terraformCode,
            downloadUrl: `/api/download/${fileName}`
        });

    } catch (error) {
        console.error('Lambda kod oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Lambda kodu oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

// Default function code helper
function getDefaultFunctionCode(runtime) {
    const runtimeCodes = {
        'python3.9': `def handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }`,
        'nodejs18.x': `exports.handler = async (event) => {
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
};`,
        'java11': `package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class Handler implements RequestHandler<Object, String> {
    @Override
    public String handleRequest(Object event, Context context) {
        return "Hello from Lambda!";
    }
}`
    };
    
    return runtimeCodes[runtime] || runtimeCodes['python3.9'];
}

// Default source file name helper
function getDefaultSourceFile(runtime) {
    const sourceFiles = {
        'python3.9': 'index.py',
        'python3.8': 'index.py',
        'nodejs18.x': 'index.js',
        'nodejs16.x': 'index.js',
        'java11': 'Handler.java',
        'java8': 'Handler.java'
    };
    
    return sourceFiles[runtime] || 'index.py';
}

module.exports = router; 