// =====================================================
// AWS DYNAMODB SERVICE - DYNAMODB TABLE FORM VE LOGİK
// =====================================================

class DynamoDBService extends BaseService {
    constructor(apiService) {
        super('dynamodb', 'aws', apiService);
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

            const result = await this.apiService.generateTerraform('aws', 'dynamodb', formData);

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('DynamoDB Table Terraform kodu başarıyla oluşturuldu!', 'success');
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
            
            const result = await this.apiService.generateTerraform('aws', 'dynamodb', {
                ...formData,
                preview: true
            });

            if (result.success) {
                this.showResult(result, true);
                this.showNotification('DynamoDB önizleme oluşturuldu', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('DynamoDB preview error:', error);
            this.showNotification(`Önizleme hatası: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        // Basic configuration
        const awsRegion = document.getElementById('dynamodbRegion').value;
        const tableName = document.getElementById('tableName').value;
        const billingMode = document.getElementById('billingMode').value;
        const readCapacity = parseInt(document.getElementById('readCapacity').value);
        const writeCapacity = parseInt(document.getElementById('writeCapacity').value);
        const hashKey = document.getElementById('hashKey').value;
        const hashKeyType = document.getElementById('hashKeyType').value;
        const rangeKey = document.getElementById('rangeKey').value;
        const rangeKeyType = document.getElementById('rangeKeyType').value;
        
        // Features
        const enableEncryption = document.getElementById('enableEncryption').checked;
        const enablePointInTimeRecovery = document.getElementById('enablePointInTimeRecovery').checked;
        const enableTtl = document.getElementById('enableTtl').checked;
        const ttlAttributeName = document.getElementById('ttlAttributeName').value;
        const enableStreams = document.getElementById('enableStreams').checked;
        const streamViewType = document.getElementById('streamViewType').value;
        const enableAutoScaling = document.getElementById('enableAutoScaling').checked;
        const enableBackup = document.getElementById('enableBackup').checked;
        const backupRetentionDays = parseInt(document.getElementById('backupRetentionDays').value);

        // Auto scaling settings
        const autoScalingMinReadCapacity = parseInt(document.getElementById('autoScalingMinReadCapacity').value);
        const autoScalingMaxReadCapacity = parseInt(document.getElementById('autoScalingMaxReadCapacity').value);
        const autoScalingMinWriteCapacity = parseInt(document.getElementById('autoScalingMinWriteCapacity').value);
        const autoScalingMaxWriteCapacity = parseInt(document.getElementById('autoScalingMaxWriteCapacity').value);
        const autoScalingTargetValue = parseInt(document.getElementById('autoScalingTargetValue').value);

        // Global Secondary Indexes
        const globalSecondaryIndexes = [];
        document.querySelectorAll('#gsiContainer .gsi-input').forEach(gsiInput => {
            const name = gsiInput.querySelector('input[name="gsiName"]').value;
            const hashKey = gsiInput.querySelector('input[name="gsiHashKey"]').value;
            const hashKeyType = gsiInput.querySelector('select[name="gsiHashKeyType"]').value;
            const rangeKey = gsiInput.querySelector('input[name="gsiRangeKey"]').value;
            const rangeKeyType = gsiInput.querySelector('select[name="gsiRangeKeyType"]').value;
            const projectionType = gsiInput.querySelector('select[name="gsiProjectionType"]').value;
            
            if (name && hashKey) {
                globalSecondaryIndexes.push({
                    name,
                    hashKey,
                    hashKeyType,
                    rangeKey: rangeKey || undefined,
                    rangeKeyType: rangeKey ? rangeKeyType : undefined,
                    projectionType
                });
            }
        });

        // Tags
        const tags = {};
        document.querySelectorAll('#dynamodbTagsContainer .tag-input').forEach(tagInput => {
            const keyInput = tagInput.querySelector('input[name="tagKey"]');
            const valueInput = tagInput.querySelector('input[name="tagValue"]');
            if (keyInput.value && valueInput.value) {
                tags[keyInput.value] = valueInput.value;
            }
        });

        return {
            awsRegion,
            tableName,
            billingMode,
            readCapacity: billingMode === 'PROVISIONED' ? readCapacity : undefined,
            writeCapacity: billingMode === 'PROVISIONED' ? writeCapacity : undefined,
            hashKey,
            hashKeyType,
            rangeKey: rangeKey || undefined,
            rangeKeyType: rangeKey ? rangeKeyType : undefined,
            enableEncryption,
            enablePointInTimeRecovery,
            enableTtl,
            ttlAttributeName: enableTtl ? ttlAttributeName : undefined,
            enableStreams,
            streamViewType: enableStreams ? streamViewType : undefined,
            globalSecondaryIndexes: globalSecondaryIndexes.length > 0 ? globalSecondaryIndexes : undefined,
            enableAutoScaling: billingMode === 'PROVISIONED' ? enableAutoScaling : false,
            autoScalingMinReadCapacity: enableAutoScaling ? autoScalingMinReadCapacity : undefined,
            autoScalingMaxReadCapacity: enableAutoScaling ? autoScalingMaxReadCapacity : undefined,
            autoScalingMinWriteCapacity: enableAutoScaling ? autoScalingMinWriteCapacity : undefined,
            autoScalingMaxWriteCapacity: enableAutoScaling ? autoScalingMaxWriteCapacity : undefined,
            autoScalingTargetValue: enableAutoScaling ? autoScalingTargetValue : undefined,
            enableBackup,
            backupRetentionDays: enableBackup ? backupRetentionDays : undefined,
            tags
        };
    }

    validateForm(data) {
        if (!data.tableName) {
            this.showNotification('Table Name gereklidir', 'error');
            return false;
        }

        if (!data.hashKey) {
            this.showNotification('Hash Key gereklidir', 'error');
            return false;
        }

        if (data.billingMode === 'PROVISIONED') {
            if (!data.readCapacity || data.readCapacity < 1) {
                this.showNotification('Read Capacity en az 1 olmalıdır', 'error');
                return false;
            }
            if (!data.writeCapacity || data.writeCapacity < 1) {
                this.showNotification('Write Capacity en az 1 olmalıdır', 'error');
                return false;
            }
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
        this.bindDynamoDBTagEvents();
    }

    setupConditionalSections() {
        // Billing mode conditional sections
        const billingModeSelect = document.getElementById('billingMode');
        const provisionedOptions = document.getElementById('provisionedOptions');
        
        if (billingModeSelect && provisionedOptions) {
            billingModeSelect.addEventListener('change', (e) => {
                provisionedOptions.style.display = e.target.value === 'PROVISIONED' ? 'block' : 'none';
            });
            // Initial state
            provisionedOptions.style.display = billingModeSelect.value === 'PROVISIONED' ? 'block' : 'none';
        }

        // TTL conditional section
        const ttlCheckbox = document.getElementById('enableTtl');
        const ttlOptions = document.getElementById('ttlOptions');
        
        if (ttlCheckbox && ttlOptions) {
            ttlCheckbox.addEventListener('change', (e) => {
                ttlOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Streams conditional section
        const streamsCheckbox = document.getElementById('enableStreams');
        const streamsOptions = document.getElementById('streamsOptions');
        
        if (streamsCheckbox && streamsOptions) {
            streamsCheckbox.addEventListener('change', (e) => {
                streamsOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Auto scaling conditional section
        const autoScalingCheckbox = document.getElementById('enableAutoScaling');
        const autoScalingOptions = document.getElementById('autoScalingOptions');
        
        if (autoScalingCheckbox && autoScalingOptions) {
            autoScalingCheckbox.addEventListener('change', (e) => {
                autoScalingOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Backup conditional section
        const backupCheckbox = document.getElementById('enableBackup');
        const backupOptions = document.getElementById('backupOptions');
        
        if (backupCheckbox && backupOptions) {
            backupCheckbox.addEventListener('change', (e) => {
                backupOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    bindDynamoDBTagEvents() {
        const addTagBtn = document.getElementById('addDynamoDBTag');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.addDynamoDBTag());
        }

        const addGsiBtn = document.getElementById('addGSI');
        if (addGsiBtn) {
            addGsiBtn.addEventListener('click', () => this.addGSI());
        }

        this.bindDynamoDBTagRemoveEvents();
    }

    addDynamoDBTag() {
        const container = document.getElementById('dynamodbTagsContainer');
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
        this.bindDynamoDBTagRemoveEvents();
    }

    addGSI() {
        const container = document.getElementById('gsiContainer');
        if (!container) return;

        const gsiDiv = document.createElement('div');
        gsiDiv.className = 'gsi-input';
        gsiDiv.innerHTML = `
            <div class="form-row">
                <input type="text" placeholder="GSI Name" name="gsiName">
                <input type="text" placeholder="Hash Key" name="gsiHashKey">
                <select name="gsiHashKeyType">
                    <option value="S">String</option>
                    <option value="N">Number</option>
                    <option value="B">Binary</option>
                </select>
            </div>
            <div class="form-row">
                <input type="text" placeholder="Range Key (Optional)" name="gsiRangeKey">
                <select name="gsiRangeKeyType">
                    <option value="S">String</option>
                    <option value="N">Number</option>
                    <option value="B">Binary</option>
                </select>
                <select name="gsiProjectionType">
                    <option value="ALL">All Attributes</option>
                    <option value="KEYS_ONLY">Keys Only</option>
                    <option value="INCLUDE">Include Specific</option>
                </select>
                <button type="button" class="btn-remove-gsi">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(gsiDiv);
        this.bindGSIRemoveEvents();
    }

    bindDynamoDBTagRemoveEvents() {
        document.querySelectorAll('#dynamodbTagsContainer .btn-remove-tag').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#dynamodbTagsContainer .btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tagInput = btn.closest('.tag-input');
                if (tagInput && document.querySelectorAll('#dynamodbTagsContainer .tag-input').length > 1) {
                    tagInput.remove();
                }
            });
        });
    }

    bindGSIRemoveEvents() {
        document.querySelectorAll('#gsiContainer .btn-remove-gsi').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#gsiContainer .btn-remove-gsi').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const gsiInput = btn.closest('.gsi-input');
                if (gsiInput) {
                    gsiInput.remove();
                }
            });
        });
    }
}

window.DynamoDBService = DynamoDBService; 