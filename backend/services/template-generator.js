// =====================================================
// TEMPLATE GENERATOR SERVICE
// =====================================================
// Bu service Terraform template generation işlemlerini handle eder
// Mustache rendering, path handling ve common operations

const path = require('path');
const fs = require('fs-extra');
const Mustache = require('mustache');

class TemplateGenerator {
    /**
     * Template Generator Constructor
     * @param {string} provider - Cloud provider (aws, azure, gcp)
     */
    constructor(provider = 'aws') {
        this.provider = provider;
        this.templatesBasePath = path.join(__dirname, '../../templates');
        this.outputBasePath = path.join(__dirname, '../../generated/output');
    }

    /**
     * Generate Terraform code from template
     * @param {string} serviceName - Service name (ec2, s3, rds, etc.)
     * @param {Object} templateData - Data for template rendering
     * @param {string} fileName - Output file name (optional)
     * @returns {Promise<Object>} Generated code result
     */
    async generateFromTemplate(serviceName, templateData, fileName = null) {
        try {
            // Template path'ini oluştur
            const templatePath = this.getTemplatePath(serviceName);
            
            // Template dosyasını oku
            const template = await fs.readFile(templatePath, 'utf8');
            
            // Template'i render et
            const renderedCode = Mustache.render(template, {
                ...templateData,
                timestamp: new Date().toISOString(),
                provider: this.provider
            });
            
            // Dosya adını oluştur
            const outputFileName = fileName || this.generateFileName(serviceName);
            
            // Dosyayı kaydet
            const filePath = await this.saveToFile(outputFileName, renderedCode);
            
            return {
                success: true,
                fileName: outputFileName,
                filePath: filePath,
                code: renderedCode,
                downloadUrl: `/api/download/${outputFileName}`
            };
            
        } catch (error) {
            console.error(`Template generation error for ${serviceName}:`, error);
            throw new Error(`Template generation failed: ${error.message}`);
        }
    }

    /**
     * Get template file path
     * @param {string} serviceName - Service name
     * @returns {string} Template file path
     */
    getTemplatePath(serviceName) {
        const templateFileName = `${serviceName}.tf.mustache`;
        return path.join(this.templatesBasePath, this.provider, templateFileName);
    }

    /**
     * Generate unique file name
     * @param {string} serviceName - Service name
     * @returns {string} Unique file name
     */
    generateFileName(serviceName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${this.provider}-${serviceName}-${timestamp}.tf`;
    }

    /**
     * Save rendered code to file
     * @param {string} fileName - File name
     * @param {string} content - File content
     * @returns {Promise<string>} File path
     */
    async saveToFile(fileName, content) {
        const filePath = path.join(this.outputBasePath, fileName);
        
        // Output directory'yi oluştur
        await fs.ensureDir(path.dirname(filePath));
        
        // Dosyayı kaydet
        await fs.writeFile(filePath, content);
        
        return filePath;
    }

    /**
     * Validate template data
     * @param {Object} data - Template data
     * @param {Array} requiredFields - Required field names
     * @returns {Object} Validation result
     */
    validateTemplateData(data, requiredFields = []) {
        const errors = [];
        
        for (const field of requiredFields) {
            if (!data[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get available templates for provider
     * @returns {Promise<Array>} Available template names
     */
    async getAvailableTemplates() {
        try {
            const providerPath = path.join(this.templatesBasePath, this.provider);
            const files = await fs.readdir(providerPath);
            
            return files
                .filter(file => file.endsWith('.tf.mustache'))
                .map(file => file.replace('.tf.mustache', ''));
                
        } catch (error) {
            console.error('Error reading templates:', error);
            return [];
        }
    }
}

module.exports = TemplateGenerator; 