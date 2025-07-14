// =====================================================
// AWS EC2 SERVICE - EC2 INSTANCE FORM VE LOGİK
// =====================================================
// Bu class EC2 Instance form'unu ve related logic'i handle eder
// BaseService'den inherit eder

class EC2Service extends BaseService {
    /**
     * EC2 Service Constructor
     * @param {ApiService} apiService - API service instance
     */
    constructor(apiService) {
        super('ec2', 'aws', apiService);
    }

    /**
     * Form submit işlemi
     * @param {Event} e - Submit event
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        this.showLoading(true);
        
        try {
            const formData = this.collectFormData();
            
            if (!this.validateForm(formData)) {
                this.showLoading(false);
                return;
            }

            console.log('EC2 Form Data:', formData);
            
            // API'ye request gönder
            const result = await this.apiService.generateLegacy('ec2', formData);

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('EC2 Instance Terraform kodu başarıyla oluşturuldu!', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('EC2 form submit error:', error);
            this.showNotification(`Hata: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Preview işlemi
     */
    async handlePreview() {
        try {
            const formData = this.collectFormData();
            
            if (!this.validateForm(formData)) {
                return;
            }

            this.showLoading(true);
            
            // API'ye preview request gönder (aynı endpoint, farklı parametre ile)
            const result = await this.apiService.generateLegacy('ec2', {
                ...formData,
                preview: true
            });

            if (result.success) {
                this.showResult(result, true);
                this.showNotification('EC2 önizleme oluşturuldu', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('EC2 preview error:', error);
            this.showNotification(`Önizleme hatası: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Form verilerini topla
     * @returns {Object} Form data
     */
    collectFormData() {
        // Form element'lerini al
        const awsRegion = document.getElementById('awsRegion').value;
        const instanceType = document.getElementById('instanceType').value;
        const amiType = document.getElementById('amiType').value;
        const keyName = document.getElementById('keyName').value;
        const securityGroup = document.getElementById('securityGroup').value;
        const subnetId = document.getElementById('subnetId').value;
        const rootVolumeSize = parseInt(document.getElementById('rootVolumeSize').value);
        const userData = document.getElementById('userData').value;

        // Tags topla
        const tags = {};
        const tagInputs = document.querySelectorAll('#tagsContainer .tag-input');
        tagInputs.forEach(tagInput => {
            const keyInput = tagInput.querySelector('input[name="tagKey"]');
            const valueInput = tagInput.querySelector('input[name="tagValue"]');
            if (keyInput.value && valueInput.value) {
                tags[keyInput.value] = valueInput.value;
            }
        });

        // Default tags from form inputs
        const tagName = document.getElementById('tagName').value;
        const tagEnvironment = document.getElementById('tagEnvironment').value;
        
        if (tagName) tags['Name'] = tagName;
        if (tagEnvironment) tags['Environment'] = tagEnvironment;

        return {
            awsRegion,
            instanceType,
            amiType,
            keyName,
            securityGroup,
            subnetId,
            rootVolumeSize,
            userData,
            tags
        };
    }

    /**
     * Form validation
     * @param {Object} data - Validate edilecek data
     * @returns {boolean} Validation result
     */
    validateForm(data) {
        // AWS Region validation
        if (!data.awsRegion) {
            this.showNotification('AWS Region seçilmelidir', 'error');
            return false;
        }

        // Instance Type validation
        if (!data.instanceType) {
            this.showNotification('Instance Type seçilmelidir', 'error');
            return false;
        }

        // AMI Type validation
        if (!data.amiType) {
            this.showNotification('Operating System seçilmelidir', 'error');
            return false;
        }

        // Root Volume Size validation
        if (!data.rootVolumeSize || data.rootVolumeSize < 8 || data.rootVolumeSize > 30) {
            this.showNotification('Root Volume Size 8-30 GB arasında olmalıdır', 'error');
            return false;
        }

        // Security Group ID validation (eğer girilmişse)
        if (data.securityGroup) {
            const sgRegex = /^sg-[a-z0-9]{8,17}$/;
            if (!sgRegex.test(data.securityGroup)) {
                this.showNotification('Security Group ID formatı geçersiz (örn: sg-12345678)', 'error');
                return false;
            }
        }

        // Subnet ID validation (eğer girilmişse)
        if (data.subnetId) {
            const subnetRegex = /^subnet-[a-z0-9]{8,17}$/;
            if (!subnetRegex.test(data.subnetId)) {
                this.showNotification('Subnet ID formatı geçersiz (örn: subnet-12345678)', 'error');
                return false;
            }
        }

        return true;
    }

    /**
     * Result'ı göster (code output)
     * @param {Object} result - API response
     * @param {boolean} isPreview - Preview mi yoksa final result mi?
     */
    showResult(result, isPreview = false) {
        const outputSection = document.getElementById('outputSection');
        const outputCode = document.getElementById('outputCode');
        const downloadBtn = document.getElementById('downloadBtn');
        const copyBtn = document.getElementById('copyBtn');

        if (outputSection && outputCode) {
            // Code'u göster
            outputCode.textContent = result.code;
            outputSection.style.display = 'block';

            // Download button'u configure et
            if (downloadBtn && !isPreview) {
                downloadBtn.onclick = () => {
                    window.open(result.downloadUrl, '_blank');
                };
            }

            // Copy button'u configure et
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(result.code).then(() => {
                        this.showNotification('Kod kopyalandı!', 'success');
                    }).catch(() => {
                        this.showNotification('Kopyalama başarısız', 'error');
                    });
                };
            }

            // Scroll to result
            outputSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Service setup - EC2 özel setup'ları
     */
    setup() {
        super.setup();
        
        // Additional EC2 specific setup
        this.bindTagEvents();
        
        console.log('EC2Service setup completed');
    }

    /**
     * Tag management event'lerini bağla
     */
    bindTagEvents() {
        // Add tag button
        const addTagBtn = document.getElementById('addTag');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.addTag());
        }

        // Remove tag buttons (initial)
        this.bindTagRemoveEvents();
    }

    /**
     * Yeni tag input ekle
     */
    addTag() {
        const container = document.getElementById('tagsContainer');
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
        this.bindTagRemoveEvents();
    }

    /**
     * Tag remove event'lerini bağla
     */
    bindTagRemoveEvents() {
        const removeButtons = document.querySelectorAll('#tagsContainer .btn-remove-tag');
        removeButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true)); // Remove existing listeners
        });
        
        document.querySelectorAll('#tagsContainer .btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tagInput = btn.closest('.tag-input');
                if (tagInput && document.querySelectorAll('#tagsContainer .tag-input').length > 1) {
                    tagInput.remove();
                }
            });
        });
    }
}

// Export et
window.EC2Service = EC2Service; 