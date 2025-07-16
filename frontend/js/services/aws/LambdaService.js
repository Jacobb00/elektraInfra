// =====================================================
// AWS LAMBDA SERVICE - LAMBDA FUNCTION FORM VE LOGİK
// =====================================================

class LambdaService extends BaseService {
    constructor(apiService) {
        super('lambda', 'aws', apiService);
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        this.showLoading(true);
        
        try {
            const formData = this.collectFormData();
            
            if (!this.validateForm(formData)) {
                this.showLoading(false);
                return;
            }

            const result = await this.apiService.generateTerraform('aws', 'lambda', formData);

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('Lambda Function Terraform kodu başarıyla oluşturuldu!', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            this.showNotification(`Hata: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handlePreview() {
        try {
            const formData = this.collectFormData();
            
            if (!this.validateForm(formData)) {
                return;
            }

            this.showLoading(true);
            
            const result = await this.apiService.generateTerraform('aws', 'lambda', {
                ...formData,
                preview: true
            });

            if (result.success) {
                this.showResult(result, true);
                this.showNotification('Lambda önizleme oluşturuldu', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('Lambda preview error:', error);
            this.showNotification(`Önizleme hatası: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        // Basic configuration
        const awsRegion = document.getElementById('lambdaRegion').value;
        const functionName = document.getElementById('functionName').value;
        const functionDescription = document.getElementById('functionDescription').value;
        const runtime = document.getElementById('runtime').value;
        const handler = document.getElementById('handler').value;
        const memorySize = parseInt(document.getElementById('memorySize').value);
        const timeout = parseInt(document.getElementById('timeout').value);
        const architecture = document.getElementById('architecture').value;
        const functionCode = document.getElementById('functionCode').value;
        
        // Environment variables
        const environmentVariables = {};
        document.querySelectorAll('#envVarsContainer .env-var-input').forEach(envInput => {
            const keyInput = envInput.querySelector('input[name="envKey"]');
            const valueInput = envInput.querySelector('input[name="envValue"]');
            if (keyInput.value && valueInput.value) {
                environmentVariables[keyInput.value] = valueInput.value;
            }
        });

        // Features
        const enableApiGateway = document.getElementById('enableApiGateway').checked;
        const apiGatewayStage = document.getElementById('apiGatewayStage').value;
        const enableEventBridge = document.getElementById('enableEventBridge').checked;
        const scheduleExpression = document.getElementById('scheduleExpression').value;
        const enableDynamoDB = document.getElementById('enableDynamoDB').checked;
        const enableS3 = document.getElementById('enableS3').checked;
        const enableCloudWatchLogs = document.getElementById('enableCloudWatchLogs').checked;
        const logRetentionDays = parseInt(document.getElementById('logRetentionDays').value);
        const enableDeadLetterQueue = document.getElementById('enableDeadLetterQueue').checked;
        const enableTracing = document.getElementById('enableTracing').checked;

        // Tags
        const tags = {};
        document.querySelectorAll('#lambdaTagsContainer .tag-input').forEach(tagInput => {
            const keyInput = tagInput.querySelector('input[name="tagKey"]');
            const valueInput = tagInput.querySelector('input[name="tagValue"]');
            if (keyInput.value && valueInput.value) {
                tags[keyInput.value] = valueInput.value;
            }
        });

        return {
            awsRegion,
            functionName,
            functionDescription,
            runtime,
            handler,
            memorySize,
            timeout,
            architecture,
            functionCode: functionCode || this.getDefaultCode(runtime),
            environmentVariables: Object.keys(environmentVariables).length > 0 ? environmentVariables : undefined,
            enableApiGateway,
            apiGatewayStage: enableApiGateway ? apiGatewayStage : undefined,
            enableEventBridge,
            scheduleExpression: enableEventBridge ? scheduleExpression : undefined,
            enableDynamoDB,
            enableS3,
            enableCloudWatchLogs,
            logRetentionDays: enableCloudWatchLogs ? logRetentionDays : undefined,
            enableDeadLetterQueue,
            enableTracing,
            tags
        };
    }

    validateForm(data) {
        if (!data.functionName) {
            this.showNotification('Function Name gereklidir', 'error');
            return false;
        }

        if (data.memorySize < 128 || data.memorySize > 10240) {
            this.showNotification('Memory Size 128MB ile 10240MB arasında olmalıdır', 'error');
            return false;
        }

        if (data.timeout < 1 || data.timeout > 900) {
            this.showNotification('Timeout 1 ile 900 saniye arasında olmalıdır', 'error');
            return false;
        }

        return true;
    }

    showResult(result, isPreview = false) {
        const outputSection = document.getElementById('outputSection');
        const outputCode = document.getElementById('outputCode');
        const downloadBtn = document.getElementById('downloadBtn');
        const copyBtn = document.getElementById('copyBtn');

        if (outputSection && outputCode) {
            outputCode.textContent = result.code;
            outputSection.style.display = 'block';

            if (downloadBtn && !isPreview) {
                downloadBtn.onclick = () => window.open(result.downloadUrl, '_blank');
            }

            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(result.code).then(() => {
                        this.showNotification('Kod kopyalandı!', 'success');
                    });
                };
            }

            outputSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setup() {
        super.setup();
        this.setupConditionalSections();
        this.setupRuntimeHandlers();
        this.bindLambdaTagEvents();
    }

    setupConditionalSections() {
        // API Gateway conditional section
        const apiGatewayCheckbox = document.getElementById('enableApiGateway');
        const apiGatewayOptions = document.getElementById('apiGatewayOptions');
        
        if (apiGatewayCheckbox && apiGatewayOptions) {
            apiGatewayCheckbox.addEventListener('change', (e) => {
                apiGatewayOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // EventBridge conditional section
        const eventBridgeCheckbox = document.getElementById('enableEventBridge');
        const eventBridgeOptions = document.getElementById('eventBridgeOptions');
        
        if (eventBridgeCheckbox && eventBridgeOptions) {
            eventBridgeCheckbox.addEventListener('change', (e) => {
                eventBridgeOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // CloudWatch Logs conditional section
        const logsCheckbox = document.getElementById('enableCloudWatchLogs');
        const logsOptions = document.getElementById('cloudWatchLogsOptions');
        
        if (logsCheckbox && logsOptions) {
            logsCheckbox.addEventListener('change', (e) => {
                logsOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    setupRuntimeHandlers() {
        const runtimeSelect = document.getElementById('runtime');
        const handlerInput = document.getElementById('handler');
        const codeTextarea = document.getElementById('functionCode');
        
        if (runtimeSelect && handlerInput && codeTextarea) {
            runtimeSelect.addEventListener('change', (e) => {
                const runtime = e.target.value;
                handlerInput.value = this.getDefaultHandler(runtime);
                codeTextarea.value = this.getDefaultCode(runtime);
            });
        }
    }

    getDefaultHandler(runtime) {
        const handlers = {
            'python3.9': 'index.handler',
            'python3.8': 'index.handler',
            'nodejs18.x': 'index.handler',
            'nodejs16.x': 'index.handler',
            'java11': 'example.Handler::handleRequest',
            'java8': 'example.Handler::handleRequest'
        };
        return handlers[runtime] || 'index.handler';
    }

    getDefaultCode(runtime) {
        const codes = {
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
};`
        };
        return codes[runtime] || codes['python3.9'];
    }

    bindLambdaTagEvents() {
        const addTagBtn = document.getElementById('addLambdaTag');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.addLambdaTag());
        }

        const addEnvVarBtn = document.getElementById('addEnvVar');
        if (addEnvVarBtn) {
            addEnvVarBtn.addEventListener('click', () => this.addEnvVar());
        }

        this.bindLambdaTagRemoveEvents();
    }

    addLambdaTag() {
        const container = document.getElementById('lambdaTagsContainer');
        if (!container) return;

        const tagDiv = document.createElement('div');
        tagDiv.className = 'tag-input';
        tagDiv.innerHTML = `
            <input type="text" placeholder="Key" name="tagKey">
            <input type="text" placeholder="Value" name="tagValue">
            <button type="button" class="btn-remove-tag">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(tagDiv);
        this.bindLambdaTagRemoveEvents();
    }

    addEnvVar() {
        const container = document.getElementById('envVarsContainer');
        if (!container) return;

        const envDiv = document.createElement('div');
        envDiv.className = 'env-var-input';
        envDiv.innerHTML = `
            <input type="text" placeholder="Key" name="envKey">
            <input type="text" placeholder="Value" name="envValue">
            <button type="button" class="btn-remove-env">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(envDiv);
        this.bindEnvVarRemoveEvents();
    }

    bindLambdaTagRemoveEvents() {
        document.querySelectorAll('#lambdaTagsContainer .btn-remove-tag').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#lambdaTagsContainer .btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tagInput = btn.closest('.tag-input');
                if (tagInput && document.querySelectorAll('#lambdaTagsContainer .tag-input').length > 1) {
                    tagInput.remove();
                }
            });
        });
    }

    bindEnvVarRemoveEvents() {
        document.querySelectorAll('#envVarsContainer .btn-remove-env').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#envVarsContainer .btn-remove-env').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const envInput = btn.closest('.env-var-input');
                if (envInput && document.querySelectorAll('#envVarsContainer .env-var-input').length > 1) {
                    envInput.remove();
                }
            });
        });
    }
}

window.LambdaService = LambdaService; 