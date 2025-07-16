// =====================================================
// AWS IAM SERVICE - IAM ROLE FORM VE LOGİK
// =====================================================

class IAMService extends BaseService {
    constructor(apiService) {
        super('iam', 'aws', apiService);
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

            const result = await this.apiService.generateTerraform('aws', 'iam', formData);

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('IAM Role Terraform kodu başarıyla oluşturuldu!', 'success');
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
            
            const result = await this.apiService.generateTerraform('aws', 'iam', {
                ...formData,
                preview: true
            });

            if (result.success) {
                this.showResult(result, true);
                this.showNotification('IAM önizleme oluşturuldu', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('IAM preview error:', error);
            this.showNotification(`Önizleme hatası: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        // Basic configuration
        const awsRegion = document.getElementById('iamRegion').value;
        const roleName = document.getElementById('roleName').value;
        const roleDescription = document.getElementById('roleDescription').value;
        const servicePrincipal = document.getElementById('servicePrincipal').value;
        const createInstanceProfile = document.getElementById('createInstanceProfile').checked;

        // Managed policy ARNs
        const managedPolicyArns = [];
        document.querySelectorAll('#managedPoliciesContainer .policy-input').forEach(policyInput => {
            const arnInput = policyInput.querySelector('input[name="policyArn"]');
            if (arnInput.value && arnInput.value.trim()) {
                managedPolicyArns.push(arnInput.value.trim());
            }
        });

        // Tags
        const tags = {};
        document.querySelectorAll('#iamTagsContainer .tag-input').forEach(tagInput => {
            const keyInput = tagInput.querySelector('input[name="tagKey"]');
            const valueInput = tagInput.querySelector('input[name="tagValue"]');
            if (keyInput.value && valueInput.value) {
                tags[keyInput.value] = valueInput.value;
            }
        });

        return {
            awsRegion,
            roleName,
            roleDescription,
            servicePrincipal,
            managedPolicyArns: managedPolicyArns.length > 0 ? managedPolicyArns : undefined,
            createInstanceProfile,
            tags
        };
    }

    validateForm(data) {
        if (!data.roleName) {
            this.showNotification('Role Name gereklidir', 'error');
            return false;
        }

        if (!data.servicePrincipal) {
            this.showNotification('Service Principal gereklidir', 'error');
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
        this.bindIAMTagEvents();
        this.setupServicePrincipalHelpers();
    }

    setupServicePrincipalHelpers() {
        const servicePrincipalSelect = document.getElementById('servicePrincipal');
        if (servicePrincipalSelect) {
            servicePrincipalSelect.addEventListener('change', (e) => {
                const instanceProfileCheckbox = document.getElementById('createInstanceProfile');
                if (instanceProfileCheckbox) {
                    // Auto-check instance profile for EC2
                    instanceProfileCheckbox.checked = e.target.value === 'ec2.amazonaws.com';
                }
            });
        }
    }

    bindIAMTagEvents() {
        const addTagBtn = document.getElementById('addIAMTag');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.addIAMTag());
        }

        const addPolicyBtn = document.getElementById('addManagedPolicy');
        if (addPolicyBtn) {
            addPolicyBtn.addEventListener('click', () => this.addManagedPolicy());
        }

        this.bindIAMTagRemoveEvents();
    }

    addIAMTag() {
        const container = document.getElementById('iamTagsContainer');
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
        this.bindIAMTagRemoveEvents();
    }

    addManagedPolicy() {
        const container = document.getElementById('managedPoliciesContainer');
        if (!container) return;

        const policyDiv = document.createElement('div');
        policyDiv.className = 'policy-input';
        policyDiv.innerHTML = `
            <input type="text" placeholder="arn:aws:iam::aws:policy/PolicyName" name="policyArn">
            <button type="button" class="btn-remove-policy">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(policyDiv);
        this.bindPolicyRemoveEvents();
    }

    bindIAMTagRemoveEvents() {
        document.querySelectorAll('#iamTagsContainer .btn-remove-tag').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#iamTagsContainer .btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tagInput = btn.closest('.tag-input');
                if (tagInput && document.querySelectorAll('#iamTagsContainer .tag-input').length > 1) {
                    tagInput.remove();
                }
            });
        });
    }

    bindPolicyRemoveEvents() {
        document.querySelectorAll('#managedPoliciesContainer .btn-remove-policy').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#managedPoliciesContainer .btn-remove-policy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const policyInput = btn.closest('.policy-input');
                if (policyInput) {
                    policyInput.remove();
                }
            });
        });
    }
}

window.IAMService = IAMService; 