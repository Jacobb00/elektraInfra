// =====================================================
// TELEFORM FRONTEND APPLICATION - MAIN CONTROLLER
// =====================================================
// Bu dosya frontend'in ana logic'ini içerir
// API komunikasyonu, UI state management ve user interaction handling yapar

// ES6 Class ile Single Page Application (SPA) controller
class TeleformApp {
    /**
     * TeleformApp Constructor
     * Class instance oluşturulduğunda çalışır
     * Temel konfigürasyonları yapar ve uygulamayı başlatır
     */
    constructor() {
        // API base URL - backend endpoint'lerinin ortak prefix'i
        // Tüm API çağrıları bu base URL + specific endpoint şeklinde olacak
        this.apiBase = '/api';
        
        // Download URL cache - en son oluşturulan dosyanın indirme linki
        // null = henüz dosya oluşturulmamış
        this.currentDownloadUrl = null;
        
        // Uygulamayı başlat
        this.init();
    }

    /**
     * Uygulama Başlatma Metodu
     * Constructor'dan çağrılır ve temel setup işlemlerini yapar
     */
    init() {
        // Server bağlantısını kontrol et ve status indicator'ı güncelle
        this.checkServerStatus();
        
        // DOM event listener'larını bağla (click, submit, vs.)
        this.bindEvents();
        
        // Console'a başlatma mesajı yazdır (debugging için)
        console.log('🚀 Teleform App başlatıldı');
    }

    /**
     * Server Durumu Kontrol Metodu
     * Backend'in çalışır durumda olup olmadığını kontrol eder
     * Header'daki status indicator'ı günceller
     */
    async checkServerStatus() {
        try {
            // Backend'e GET /api/status isteği gönder
            // fetch API: modern browser'larda XMLHttpRequest'in yerini alan async HTTP client
            const response = await fetch(`${this.apiBase}/status`);
            
            // Response JSON'ını parse et
            // await: Promise resolve olmasını bekle (async operation)
            const data = await response.json();
            
            // Backend'den gelen response'u kontrol et
            if (data.success) {
                // Server çalışıyor - UI'ı "online" durumuna getir
                this.updateStatus('online', 'Bağlı');
                console.log('✅ Server bağlantısı başarılı');
            } else {
                // Server response verdi ama success: false - logic error
                this.updateStatus('offline', 'Bağlantı hatası');
            }
        } catch (error) {
            // Network error, server down, CORS issue, vs.
            // Herhangi bir network/server hatası durumunda offline göster
            this.updateStatus('offline', 'Server offline');
            console.error('❌ Server bağlantı hatası:', error);
        }
    }

    /**
     * Status Indicator Güncelleme Metodu
     * Header'daki server durumu indicator'ını günceller
     * @param {string} status - 'online' veya 'offline'
     * @param {string} text - Kullanıcıya gösterilecek status text'i
     */
    updateStatus(status, text) {
        // DOM elementlerini seç
        const statusDot = document.getElementById('serverStatus');    // Renkli nokta indicator
        const statusText = document.getElementById('statusText');     // Status text'i
        
        // CSS class'ını güncelle (renk değişimi için)
        // 'status-dot online' → yeşil nokta
        // 'status-dot offline' → kırmızı nokta
        statusDot.className = `status-dot ${status}`;
        
        // Status text'ini güncelle
        statusText.textContent = text;
    }

    // Event listeners
    bindEvents() {
        // Form submit
        const form = document.getElementById('terraformForm');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Preview button
        const previewBtn = document.getElementById('previewBtn');
        previewBtn.addEventListener('click', () => this.handlePreview());

        // Copy button
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.addEventListener('click', () => this.handleCopy());

        // Download button
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.addEventListener('click', () => this.handleDownload());

        // Service card selection
        const serviceCards = document.querySelectorAll('.service-card:not(.disabled)');
        serviceCards.forEach(card => {
            card.addEventListener('click', () => this.selectService(card));
        });

        // S3 form specific event listeners
        this.bindS3Events();
        
        // RDS form specific event listeners
        this.bindRdsEvents();
    }

    /**
     * S3 Form Event Listeners
     * S3 formundaki özel event'leri handle eder (conditional sections, vs.)
     */
    bindS3Events() {
        // S3 form submit
        const s3Form = document.getElementById('s3TerraformForm');
        if (s3Form) {
            s3Form.addEventListener('submit', (e) => this.handleS3FormSubmit(e));
        }

        // S3 preview button
        const s3PreviewBtn = document.getElementById('s3PreviewBtn');
        if (s3PreviewBtn) {
            s3PreviewBtn.addEventListener('click', () => this.handleS3Preview());
        }
    }

    /**
     * RDS Form Event Listeners
     * RDS formundaki özel event'leri handle eder (engine version update, vs.)
     */
    bindRdsEvents() {
        // RDS form submit
        const rdsForm = document.getElementById('rdsTerraformForm');
        if (rdsForm) {
            rdsForm.addEventListener('submit', (e) => this.handleRdsFormSubmit(e));
        }

        // RDS preview button (optional, if added later)
        // const rdsPreviewBtn = document.getElementById('rdsPreviewBtn');
        // if (rdsPreviewBtn) {
        //     rdsPreviewBtn.addEventListener('click', () => this.handleRdsPreview());
        // }

        // Engine change handler - update available versions
        const engineSelect = document.getElementById('engine');
        if (engineSelect) {
            engineSelect.addEventListener('change', (e) => this.updateEngineVersions(e.target.value));
        }

        // Create VPC checkbox handler
        const createVpcCheckbox = document.getElementById('createVPC');
        const existingVpcSection = document.getElementById('existingVpcSection');
        if (createVpcCheckbox && existingVpcSection) {
            createVpcCheckbox.addEventListener('change', (e) => {
                existingVpcSection.style.display = e.target.checked ? 'none' : 'block';
            });
        }

        // Add tag functionality for RDS
        const addRdsTagBtn = document.getElementById('addRdsTag');
        if (addRdsTagBtn) {
            addRdsTagBtn.addEventListener('click', () => this.addRdsTag());
        }

        // Remove tag functionality
        this.bindRdsTagRemoveEvents();
    }

    /**
     * Update Engine Versions based on selected engine
     * @param {string} engine - Selected database engine
     */
    updateEngineVersions(engine) {
        const versionSelect = document.getElementById('engineVersion');
        if (!versionSelect) return;

        // Clear existing options
        versionSelect.innerHTML = '';

        // Engine version mappings
        const engineVersions = {
            'mysql': [
                { value: '8.0', text: '8.0 (Latest)' },
                { value: '5.7', text: '5.7' }
            ],
            'postgres': [
                { value: '15.2', text: '15.2 (Latest)' },
                { value: '14.6', text: '14.6' },
                { value: '13.7', text: '13.7' },
                { value: '12.11', text: '12.11' }
            ],
            'mariadb': [
                { value: '10.6', text: '10.6 (Latest)' },
                { value: '10.5', text: '10.5' },
                { value: '10.4', text: '10.4' }
            ],
            'oracle-ee': [
                { value: '19.0.0.0.ru-2022-10.rur-2022-10.r1', text: '19c (Latest)' },
                { value: '12.2.0.1.ru-2022-10.rur-2022-10.r1', text: '12c R2' }
            ],
            'oracle-se2': [
                { value: '19.0.0.0.ru-2022-10.rur-2022-10.r1', text: '19c (Latest)' },
                { value: '12.2.0.1.ru-2022-10.rur-2022-10.r1', text: '12c R2' }
            ],
            'sqlserver-ee': [
                { value: '15.00.4153.1.v1', text: '2019 (Latest)' },
                { value: '14.00.3401.7.v1', text: '2017' }
            ],
            'sqlserver-se': [
                { value: '15.00.4153.1.v1', text: '2019 (Latest)' },
                { value: '14.00.3401.7.v1', text: '2017' }
            ],
            'sqlserver-ex': [
                { value: '15.00.4153.1.v1', text: '2019 (Latest)' },
                { value: '14.00.3401.7.v1', text: '2017' }
            ],
            'sqlserver-web': [
                { value: '15.00.4153.1.v1', text: '2019 (Latest)' },
                { value: '14.00.3401.7.v1', text: '2017' }
            ]
        };

        // Add options for selected engine
        const versions = engineVersions[engine] || engineVersions['mysql'];
        versions.forEach((version, index) => {
            const option = document.createElement('option');
            option.value = version.value;
            option.textContent = version.text;
            if (index === 0) option.selected = true; // Select first (latest) version
            versionSelect.appendChild(option);
        });
    }

    /**
     * Add new tag input row for RDS
     */
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

    /**
     * Bind remove tag events for RDS tags
     */
    bindRdsTagRemoveEvents() {
        const removeButtons = document.querySelectorAll('#rdsTagsContainer .btn-remove-tag');
        removeButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true)); // Remove existing listeners
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

    /**
     * S3 Conditional Sections Setup
     * Checkbox'lara göre conditional section'ları göster/gizle
     */
    setupS3ConditionalSections() {
        // Website hosting checkbox handler
        const websiteHostingCheckbox = document.getElementById('enableWebsiteHosting');
        const websiteOptions = document.getElementById('websiteOptions');
        
        if (websiteHostingCheckbox && websiteOptions) {
            websiteHostingCheckbox.addEventListener('change', (e) => {
                websiteOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // CORS checkbox handler
        const corsCheckbox = document.getElementById('enableCORS');
        const corsOptions = document.getElementById('corsOptions');
        
        if (corsCheckbox && corsOptions) {
            corsCheckbox.addEventListener('change', (e) => {
                corsOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Lifecycle checkbox handler
        const lifecycleCheckbox = document.getElementById('enableLifecycle');
        const lifecycleOptions = document.getElementById('lifecycleOptions');
        
        if (lifecycleCheckbox && lifecycleOptions) {
            lifecycleCheckbox.addEventListener('change', (e) => {
                lifecycleOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    // Service seçimi
    selectService(selectedCard) {
        // Mevcut aktif kartı kaldır
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('active');
        });

        // Yeni kartı aktif yap
        selectedCard.classList.add('active');

        // İlgili formu göster
        const service = selectedCard.dataset.service;
        this.showServiceForm(service);
    }

    /**
     * Service Form Gösterme Metodu
     * Seçilen service'e göre ilgili formu gösterir, diğerlerini gizler
     * @param {string} service - Gösterilecek service ID'si ('ec2', 's3', etc.)
     */
    showServiceForm(service) {
        // Tüm form section'larını gizle
        const ec2Form = document.getElementById('ec2Form');
        const s3Form = document.getElementById('s3Form');
        const rdsForm = document.getElementById('rdsForm');
        
        // Tüm formları gizle
        ec2Form.style.display = 'none';
        s3Form.style.display = 'none';
        rdsForm.style.display = 'none';
        
        // Seçilen service'in formunu göster
        if (service === 'ec2') {
            ec2Form.style.display = 'block';
        } else if (service === 's3') {
            s3Form.style.display = 'block';
            // S3 formu için conditional section'ları handle et
            this.setupS3ConditionalSections();
        } else if (service === 'rds') {
            rdsForm.style.display = 'block';
            // RDS formu için initial setup
            this.setupRdsForm();
        }
    }

    // Form submit işlemi
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = this.collectFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBase}/generate/ec2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result);
                this.showNotification('✅ Terraform kodu başarıyla oluşturuldu!', 'success');
            } else {
                this.showNotification(`❌ Hata: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Form submit hatası:', error);
            this.showNotification('❌ Beklenmeyen bir hata oluştu', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Form verilerini topla
    collectFormData() {
        const form = document.getElementById('terraformForm');
        const formData = new FormData(form);
        
        return {
            instanceType: formData.get('instanceType'),
            amiId: formData.get('amiId'),
            keyName: formData.get('keyName'),
            securityGroup: formData.get('securityGroup'),
            subnetId: formData.get('subnetId'),
            userData: formData.get('userData'),
            tags: {
                Name: formData.get('tagName') || 'teleform-instance',
                Environment: formData.get('tagEnvironment') || 'development'
            }
        };
    }

    // Form validasyonu
    validateForm(data) {
        if (!data.instanceType) {
            this.showNotification('❌ Instance type seçiniz', 'error');
            return false;
        }

        if (!data.amiId) {
            this.showNotification('❌ AMI ID giriniz', 'error');
            return false;
        }

        return true;
    }

    // Preview işlemi
    async handlePreview() {
        const formData = this.collectFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBase}/generate/ec2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result, true); // Preview mode
                this.showNotification('👁️ Önizleme hazırlandı', 'info');
            } else {
                this.showNotification(`❌ Hata: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Preview hatası:', error);
            this.showNotification('❌ Önizleme oluşturulamadı', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Sonuçları göster
    showResult(result, isPreview = false) {
        const outputSection = document.getElementById('outputSection');
        const outputCode = document.getElementById('outputCode');
        const downloadBtn = document.getElementById('downloadBtn');
        
        // Kodu göster
        outputCode.textContent = result.code;
        outputSection.style.display = 'block';
        
        // Download URL'ini kaydet
        if (!isPreview) {
            this.currentDownloadUrl = result.downloadUrl;
            downloadBtn.style.display = 'inline-flex';
        } else {
            downloadBtn.style.display = 'none';
        }
        
        // Smooth scroll
        outputSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Kopyalama işlemi
    handleCopy() {
        const outputCode = document.getElementById('outputCode');
        const text = outputCode.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('📋 Kod panoya kopyalandı!', 'success');
        }).catch(err => {
            console.error('Kopyalama hatası:', err);
            this.showNotification('❌ Kopyalama başarısız', 'error');
        });
    }

    // İndirme işlemi
    handleDownload() {
        if (this.currentDownloadUrl) {
            window.open(this.currentDownloadUrl, '_blank');
            this.showNotification('📥 Dosya indirme başlatıldı!', 'success');
        } else {
            this.showNotification('❌ İndirilecek dosya bulunamadı', 'error');
        }
    }

    // Loading modal göster/gizle
    showLoading(show) {
        const modal = document.getElementById('loadingModal');
        
        if (show) {
            modal.classList.add('show');
        } else {
            modal.classList.remove('show');
        }
    }

    // Notification göster
    showNotification(message, type = 'info') {
        // Basit notification sistemi
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Stiller
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '500',
            zIndex: '2000',
            minWidth: '300px',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // Type'a göre renk
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        // Ekle ve animasyon
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 5 saniye sonra kaldır
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }

    /**
     * S3 Form Submit Handler
     * S3 Bucket Terraform kodu üretimi için form submit işlemi
     * @param {Event} e - Form submit event'i
     */
    async handleS3FormSubmit(e) {
        e.preventDefault();
        
        const formData = this.collectS3FormData();
        
        if (!this.validateS3Form(formData)) {
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBase}/generate/s3`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result);
                this.showNotification('✅ S3 Bucket Terraform kodu başarıyla oluşturuldu!', 'success');
            } else {
                this.showNotification(`❌ Hata: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('S3 form submit hatası:', error);
            this.showNotification('❌ Beklenmeyen bir hata oluştu', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * S3 Preview Handler
     * S3 Bucket kodu önizlemesi
     */
    async handleS3Preview() {
        const formData = this.collectS3FormData();
        
        if (!this.validateS3Form(formData)) {
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBase}/generate/s3`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result, true); // Preview mode
                this.showNotification('👁️ S3 Bucket önizlemesi hazırlandı', 'info');
            } else {
                this.showNotification(`❌ Hata: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('S3 preview hatası:', error);
            this.showNotification('❌ Önizleme oluşturulamadı', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * S3 Form Data Collection
     * S3 formundaki tüm verileri toplar ve API format'ına çevirir
     * @returns {Object} S3 configuration object
     */
    collectS3FormData() {
        // Basic form data
        const bucketName = document.getElementById('bucketName').value.trim();
        const bucketEnvironment = document.getElementById('bucketEnvironment').value;
        
        // Security settings checkboxes
        const enableVersioning = document.getElementById('enableVersioning').checked;
        const enableEncryption = document.getElementById('enableEncryption').checked;
        const blockPublicAccess = document.getElementById('blockPublicAccess').checked;
        
        // Website hosting
        const enableWebsiteHosting = document.getElementById('enableWebsiteHosting').checked;
        const indexDocument = document.getElementById('indexDocument').value.trim();
        const errorDocument = document.getElementById('errorDocument').value.trim();
        
        // CORS
        const enableCORS = document.getElementById('enableCORS').checked;
        const corsOriginsStr = document.getElementById('corsOrigins').value.trim();
        const corsOrigins = corsOriginsStr ? corsOriginsStr.split(',').map(origin => origin.trim()) : ['*'];
        
        // Lifecycle
        const enableLifecycle = document.getElementById('enableLifecycle').checked;
        const lifecycleDays = parseInt(document.getElementById('lifecycleDays').value) || 30;
        const noncurrentVersionDays = parseInt(document.getElementById('noncurrentVersionDays').value) || 30;
        
        return {
            bucketName,
            bucketEnvironment,
            enableVersioning,
            enableEncryption,
            blockPublicAccess,
            enableWebsiteHosting,
            indexDocument: enableWebsiteHosting ? indexDocument : '',
            errorDocument: enableWebsiteHosting ? errorDocument : '',
            enableCORS,
            corsOrigins: enableCORS ? corsOrigins : [],
            enableLifecycle,
            lifecycleDays: enableLifecycle ? lifecycleDays : 30,
            noncurrentVersionDays: enableLifecycle ? noncurrentVersionDays : 30,
            tags: {
                Name: bucketName || 'teleform-bucket',
                Environment: bucketEnvironment || 'development'
            }
        };
    }

    /**
     * S3 Form Validation
     * S3 form verilerini validate eder
     * @param {Object} data - S3 form data object
     * @returns {boolean} Validation success
     */
    validateS3Form(data) {
        // Bucket name validation
        if (!data.bucketName) {
            this.showNotification('❌ Bucket name gerekli', 'error');
            return false;
        }

        // AWS S3 bucket naming rules validation
        const bucketNamePattern = /^[a-z0-9.-]{3,63}$/;
        if (!bucketNamePattern.test(data.bucketName)) {
            this.showNotification('❌ Bucket name: 3-63 karakter, lowercase, rakam, . ve - kullanabilirsiniz', 'error');
            return false;
        }

        // Bucket name cannot start or end with hyphen or period
        if (data.bucketName.startsWith('-') || data.bucketName.endsWith('-') || 
            data.bucketName.startsWith('.') || data.bucketName.endsWith('.')) {
            this.showNotification('❌ Bucket name tire veya nokta ile başlayamaz/bitemez', 'error');
            return false;
        }

        // Website hosting validation
        if (data.enableWebsiteHosting && !data.indexDocument) {
            this.showNotification('❌ Website hosting için index document gerekli', 'error');
            return false;
        }

        return true;
    }

    /**
     * RDS Form Initial Setup
     * RDS formu gösterildiğinde initial setup yapar
     */
    setupRdsForm() {
        // Initialize engine versions for currently selected engine
        const engineSelect = document.getElementById('engine');
        if (engineSelect) {
            this.updateEngineVersions(engineSelect.value);
        }
    }

    /**
     * RDS Form Submit Handler
     * RDS formunu submit etme işlemini handle eder
     * @param {Event} e - Form submit event
     */
    async handleRdsFormSubmit(e) {
        e.preventDefault();
        
        this.showLoading(true);
        
        try {
            const formData = this.collectRdsFormData();
            
            if (!this.validateRdsForm(formData)) {
                this.showLoading(false);
                return;
            }

            console.log('RDS Form Data:', formData);
            
            const response = await fetch(`${this.apiBase}/generate/rds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('RDS Database Terraform kodu başarıyla oluşturuldu!', 'success');
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('RDS form submit error:', error);
            this.showNotification(`Hata: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * RDS Form Data Collection
     * RDS formundaki tüm verileri toplar ve return eder
     * @returns {Object} Form verileri object'i
     */
    collectRdsFormData() {
        // Basic configuration
        const dbIdentifier = document.getElementById('dbIdentifier').value;
        const engine = document.getElementById('engine').value;
        const engineVersion = document.getElementById('engineVersion').value;
        const instanceClass = document.getElementById('instanceClass').value;

        // Storage configuration
        const allocatedStorage = parseInt(document.getElementById('allocatedStorage').value);
        const maxAllocatedStorage = parseInt(document.getElementById('maxAllocatedStorage').value);
        const storageType = document.getElementById('storageType').value;

        // Database settings
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

        // Monitoring
        const monitoringInterval = parseInt(document.getElementById('monitoringInterval').value);

        // Network
        const createVPC = document.getElementById('createVPC').checked;
        const vpcId = document.getElementById('vpcId').value;
        const subnetIds = document.getElementById('subnetIds').value
            ? document.getElementById('subnetIds').value.split(',').map(id => id.trim())
            : [];

        // Tags
        const tags = {};
        const tagInputs = document.querySelectorAll('#rdsTagsContainer .tag-input');
        tagInputs.forEach(tagInput => {
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

    /**
     * RDS Form Validation
     * RDS form verilerini validate eder
     * @param {Object} data - Validate edilecek form verileri
     * @returns {boolean} Validation başarılı mı?
     */
    validateRdsForm(data) {
        // Required fields validation
        if (!data.dbIdentifier) {
            this.showNotification('DB Instance Identifier gereklidir', 'error');
            return false;
        }

        if (!data.engine) {
            this.showNotification('Database Engine seçilmelidir', 'error');
            return false;
        }

        if (!data.engineVersion) {
            this.showNotification('Engine Version seçilmelidir', 'error');
            return false;
        }

        if (!data.instanceClass) {
            this.showNotification('Instance Class seçilmelidir', 'error');
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

        if (!data.password) {
            this.showNotification('Master Password gereklidir', 'error');
            return false;
        }

        // Password strength validation
        if (data.password.length < 8) {
            this.showNotification('Password en az 8 karakter olmalıdır', 'error');
            return false;
        }

        // Storage validation
        if (data.allocatedStorage < 20) {
            this.showNotification('Allocated Storage en az 20 GB olmalıdır', 'error');
            return false;
        }

        if (data.maxAllocatedStorage < data.allocatedStorage) {
            this.showNotification('Max Storage, Allocated Storage\'dan büyük olmalıdır', 'error');
            return false;
        }

        // Backup retention validation
        if (data.backupRetentionPeriod < 0 || data.backupRetentionPeriod > 35) {
            this.showNotification('Backup Retention Period 0-35 gün arasında olmalıdır', 'error');
            return false;
        }

        // If not creating VPC, existing VPC info is required
        if (!data.createVPC) {
            if (!data.vpcId) {
                this.showNotification('Mevcut VPC kullanırken VPC ID gereklidir', 'error');
                return false;
            }
            if (!data.subnetIds || data.subnetIds.length === 0) {
                this.showNotification('Mevcut VPC kullanırken en az bir Subnet ID gereklidir', 'error');
                return false;
            }
        }

        // DB identifier format validation (AWS requirements)
        const dbIdentifierRegex = /^[a-zA-Z][a-zA-Z0-9-]*$/;
        if (!dbIdentifierRegex.test(data.dbIdentifier)) {
            this.showNotification('DB Identifier harf ile başlamalı ve sadece harf, rakam, tire içerebilir', 'error');
            return false;
        }

        return true;
    }
}

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.teleformApp = new TeleformApp();
}); 