// =====================================================
// AWS RDS SERVICE - RDS DATABASE FORM VE LOGİK
// =====================================================

class RDSService extends BaseService {
    constructor(apiService) {
        super('rds', 'aws', apiService);
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

            const result = await this.apiService.generateLegacy('rds', formData);

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('RDS Database Terraform kodu başarıyla oluşturuldu!', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            this.showNotification(`Hata: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        // Basic configuration
        const dbIdentifier = document.getElementById('dbIdentifier').value;
        const engine = document.getElementById('engine').value;
        const engineVersion = document.getElementById('engineVersion').value;
        const instanceClass = document.getElementById('instanceClass').value;
        const allocatedStorage = parseInt(document.getElementById('allocatedStorage').value);
        const maxAllocatedStorage = parseInt(document.getElementById('maxAllocatedStorage').value);
        const storageType = document.getElementById('storageType').value;
        const dbName = document.getElementById('dbName').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Checkboxes
        const multiAZ = document.getElementById('multiAZ').checked;
        const storageEncrypted = document.getElementById('storageEncrypted').checked;
        const publiclyAccessible = document.getElementById('publiclyAccessible').checked;
        const deletionProtection = document.getElementById('deletionProtection').checked;
        const performanceInsightsEnabled = document.getElementById('performanceInsightsEnabled').checked;

        // Backup & Maintenance
        const backupRetentionPeriod = parseInt(document.getElementById('backupRetentionPeriod').value);
        const backupWindow = document.getElementById('backupWindow').value;
        const maintenanceWindow = document.getElementById('maintenanceWindow').value;
        const monitoringInterval = parseInt(document.getElementById('monitoringInterval').value);

        // Network
        const createVPC = document.getElementById('createVPC').checked;
        const vpcId = document.getElementById('vpcId').value;
        const subnetIds = document.getElementById('subnetIds').value
            ? document.getElementById('subnetIds').value.split(',').map(id => id.trim())
            : [];

        // Tags
        const tags = {};
        document.querySelectorAll('#rdsTagsContainer .tag-input').forEach(tagInput => {
            const keyInput = tagInput.querySelector('input[name="tagKey"]');
            const valueInput = tagInput.querySelector('input[name="tagValue"]');
            if (keyInput.value && valueInput.value) {
                tags[keyInput.value] = valueInput.value;
            }
        });

        return {
            dbIdentifier,
            engine,
            engineVersion,
            instanceClass,
            allocatedStorage,
            maxAllocatedStorage,
            storageType,
            storageEncrypted,
            dbName,
            username,
            password,
            multiAZ,
            publiclyAccessible,
            backupRetentionPeriod,
            backupWindow: backupWindow || undefined,
            maintenanceWindow: maintenanceWindow || undefined,
            performanceInsightsEnabled,
            monitoringInterval,
            deletionProtection,
            createVPC,
            vpcId: createVPC ? undefined : vpcId,
            subnetIds: createVPC ? undefined : subnetIds,
            tags
        };
    }

    validateForm(data) {
        if (!data.dbIdentifier) {
            this.showNotification('DB Instance Identifier gereklidir', 'error');
            return false;
        }

        if (!data.dbName) {
            this.showNotification('Database Name gereklidir', 'error');
            return false;
        }

        if (!data.username) {
            this.showNotification('Master Username gereklidir', 'error');
            return false;
        }

        if (!data.password || data.password.length < 8) {
            this.showNotification('Password en az 8 karakter olmalıdır', 'error');
            return false;
        }

        if (data.allocatedStorage < 20) {
            this.showNotification('Allocated Storage en az 20 GB olmalıdır', 'error');
            return false;
        }

        if (!data.createVPC && (!data.vpcId || !data.subnetIds.length)) {
            this.showNotification('Mevcut VPC kullanırken VPC ID ve Subnet ID gereklidir', 'error');
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
        this.setupEngineVersions();
        this.setupVPCToggle();
        this.bindRdsTagEvents();
    }

    setupEngineVersions() {
        const engineSelect = document.getElementById('engine');
        if (engineSelect) {
            engineSelect.addEventListener('change', (e) => this.updateEngineVersions(e.target.value));
            this.updateEngineVersions(engineSelect.value);
        }
    }

    updateEngineVersions(engine) {
        const versionSelect = document.getElementById('engineVersion');
        if (!versionSelect) return;

        const engineVersions = {
            'mysql': [
                { value: '8.0', text: '8.0 (Latest)' },
                { value: '5.7', text: '5.7' }
            ],
            'postgres': [
                { value: '15.2', text: '15.2 (Latest)' },
                { value: '14.6', text: '14.6' },
                { value: '13.7', text: '13.7' }
            ]
        };

        versionSelect.innerHTML = '';
        const versions = engineVersions[engine] || engineVersions['mysql'];
        versions.forEach((version, index) => {
            const option = document.createElement('option');
            option.value = version.value;
            option.textContent = version.text;
            if (index === 0) option.selected = true;
            versionSelect.appendChild(option);
        });
    }

    setupVPCToggle() {
        const createVpcCheckbox = document.getElementById('createVPC');
        const existingVpcSection = document.getElementById('existingVpcSection');
        
        if (createVpcCheckbox && existingVpcSection) {
            createVpcCheckbox.addEventListener('change', (e) => {
                existingVpcSection.style.display = e.target.checked ? 'none' : 'block';
            });
        }
    }

    bindRdsTagEvents() {
        const addTagBtn = document.getElementById('addRdsTag');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.addRdsTag());
        }

        this.bindRdsTagRemoveEvents();
    }

    addRdsTag() {
        const container = document.getElementById('rdsTagsContainer');
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
        this.bindRdsTagRemoveEvents();
    }

    bindRdsTagRemoveEvents() {
        document.querySelectorAll('#rdsTagsContainer .btn-remove-tag').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#rdsTagsContainer .btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tagInput = btn.closest('.tag-input');
                if (tagInput && document.querySelectorAll('#rdsTagsContainer .tag-input').length > 1) {
                    tagInput.remove();
                }
            });
        });
    }
}

window.RDSService = RDSService; 