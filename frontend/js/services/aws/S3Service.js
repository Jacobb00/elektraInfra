// =====================================================
// AWS S3 SERVICE - S3 BUCKET FORM VE LOGİK
// =====================================================

class S3Service extends BaseService {
    constructor(apiService) {
        super('s3', 'aws', apiService);
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

            const result = await this.apiService.generateLegacy('s3', formData);

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('S3 Bucket Terraform kodu başarıyla oluşturuldu!', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
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
            
            // API'ye preview request gönder
            const result = await this.apiService.generateLegacy('s3', {
                ...formData,
                preview: true
            });

            if (result.success) {
                this.showResult(result, true);
                this.showNotification('S3 önizleme oluşturuldu', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('S3 preview error:', error);
            this.showNotification(`Önizleme hatası: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        // S3 form data collection logic
        const bucketName = document.getElementById('bucketName').value;
        const bucketEnvironment = document.getElementById('bucketEnvironment').value;
        const enableVersioning = document.getElementById('enableVersioning').checked;
        const enableEncryption = document.getElementById('enableEncryption').checked;
        const blockPublicAccess = document.getElementById('blockPublicAccess').checked;
        const enableWebsiteHosting = document.getElementById('enableWebsiteHosting').checked;
        const indexDocument = document.getElementById('indexDocument').value;
        const errorDocument = document.getElementById('errorDocument').value;
        const enableCORS = document.getElementById('enableCORS').checked;
        const enableLifecycle = document.getElementById('enableLifecycle').checked;
        const lifecycleDays = parseInt(document.getElementById('lifecycleDays').value);
        const noncurrentVersionDays = parseInt(document.getElementById('noncurrentVersionDays').value);

        // CORS Origins
        const corsOrigins = [];
        if (enableCORS) {
            document.querySelectorAll('#corsOriginsContainer input[name="corsOrigin"]').forEach(input => {
                if (input.value && input.value.trim()) {
                    corsOrigins.push(input.value.trim());
                }
            });
        }
        // If no origins specified, default to *
        if (enableCORS && corsOrigins.length === 0) {
            corsOrigins.push('*');
        }

        // Tags
        const tags = {};
        document.querySelectorAll('#s3TagsContainer .tag-input').forEach(tagInput => {
            const keyInput = tagInput.querySelector('input[name="tagKey"]');
            const valueInput = tagInput.querySelector('input[name="tagValue"]');
            if (keyInput.value && valueInput.value) {
                tags[keyInput.value] = valueInput.value;
            }
        });

        return {
            bucketName,
            bucketEnvironment,
            enableVersioning,
            enableEncryption,
            blockPublicAccess,
            enableWebsiteHosting,
            indexDocument,
            errorDocument,
            enableCORS,
            corsOrigins,
            enableLifecycle,
            lifecycleDays,
            noncurrentVersionDays,
            tags
        };
    }

    validateForm(data) {
        if (!data.bucketName) {
            this.showNotification('Bucket Name gereklidir', 'error');
            return false;
        }

        // S3 bucket naming rules
        const bucketNameRegex = /^[a-z0-9.-]{3,63}$/;
        if (!bucketNameRegex.test(data.bucketName)) {
            this.showNotification('Bucket name sadece küçük harf, rakam, tire ve nokta içerebilir (3-63 karakter)', 'error');
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
        this.bindS3TagEvents();
    }

    setupConditionalSections() {
        // Website hosting conditional sections
        const websiteHostingCheckbox = document.getElementById('enableWebsiteHosting');
        const websiteOptions = document.getElementById('websiteOptions');
        
        if (websiteHostingCheckbox && websiteOptions) {
            websiteHostingCheckbox.addEventListener('change', (e) => {
                websiteOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // CORS conditional sections
        const corsCheckbox = document.getElementById('enableCORS');
        const corsOptions = document.getElementById('corsOptions');
        
        if (corsCheckbox && corsOptions) {
            corsCheckbox.addEventListener('change', (e) => {
                corsOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Lifecycle conditional sections
        const lifecycleCheckbox = document.getElementById('enableLifecycle');
        const lifecycleOptions = document.getElementById('lifecycleOptions');
        
        if (lifecycleCheckbox && lifecycleOptions) {
            lifecycleCheckbox.addEventListener('change', (e) => {
                lifecycleOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    bindS3TagEvents() {
        const addTagBtn = document.getElementById('addS3Tag');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.addS3Tag());
        }

        const addCorsOriginBtn = document.getElementById('addCorsOrigin');
        if (addCorsOriginBtn) {
            addCorsOriginBtn.addEventListener('click', () => this.addCorsOrigin());
        }

        this.bindS3TagRemoveEvents();
    }

    addS3Tag() {
        const container = document.getElementById('s3TagsContainer');
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
        this.bindS3TagRemoveEvents();
    }

    addCorsOrigin() {
        const container = document.getElementById('corsOriginsContainer');
        if (!container) return;

        const originDiv = document.createElement('div');
        originDiv.className = 'cors-origin-input';
        originDiv.innerHTML = `
            <input type="text" placeholder="https://example.com" name="corsOrigin">
            <button type="button" class="btn-remove-origin">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(originDiv);
        this.bindCorsOriginRemoveEvents();
    }

    bindS3TagRemoveEvents() {
        document.querySelectorAll('#s3TagsContainer .btn-remove-tag').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#s3TagsContainer .btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tagInput = btn.closest('.tag-input');
                if (tagInput && document.querySelectorAll('#s3TagsContainer .tag-input').length > 1) {
                    tagInput.remove();
                }
            });
        });
    }

    bindCorsOriginRemoveEvents() {
        document.querySelectorAll('#corsOriginsContainer .btn-remove-origin').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#corsOriginsContainer .btn-remove-origin').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const originInput = btn.closest('.cors-origin-input');
                if (originInput && document.querySelectorAll('#corsOriginsContainer .cors-origin-input').length > 1) {
                    originInput.remove();
                }
            });
        });
    }
}

window.S3Service = S3Service; 