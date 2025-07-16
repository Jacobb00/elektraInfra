// =====================================================
// BASE SERVICE CLASS - TÜM SERVİSLER İÇİN ANA SINIF
// =====================================================
// Bu class tüm AWS servislerinin ortak functionality'sini içerir
// Inheritance pattern ile code reusability sağlar

class BaseService {
    /**
     * Base Service Constructor
     * @param {string} serviceName - Service adı (ec2, s3, rds)
     * @param {string} provider - Cloud provider (aws, azure, gcp)
     * @param {Object} apiService - API service instance
     */
    constructor(serviceName, provider = 'aws', apiService) {
        this.serviceName = serviceName;
        this.provider = provider;
        this.apiService = apiService;
        this.formSelector = `#${serviceName}TerraformForm`;
        this.formSectionSelector = `#${serviceName}Form`;
    }

    /**
     * Form'u göster/gizle
     * @param {boolean} show - Gösterilsin mi?
     */
    toggleForm(show = true) {
        const formSection = document.querySelector(this.formSectionSelector);
        if (formSection) {
            formSection.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Form event listener'larını bağla
     * Her service kendi özel event'lerini override edebilir
     */
    bindEvents() {
        const form = document.querySelector(this.formSelector);
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Preview button - Her service için farklı ID'ler
        let previewBtnId;
        let generateBtnId;
        
        if (this.serviceName === 'ec2') {
            previewBtnId = 'previewBtn';
            generateBtnId = 'generateBtn';
        } else if (this.serviceName === 's3') {
            previewBtnId = 's3PreviewBtn';
            generateBtnId = 's3GenerateBtn';
        } else if (this.serviceName === 'vpc') {
            previewBtnId = 'vpcPreviewBtn';
            generateBtnId = 'vpcGenerateBtn';
        } else if (this.serviceName === 'lambda') {
            previewBtnId = 'lambdaPreviewBtn';
            generateBtnId = 'lambdaGenerateBtn';
        } else if (this.serviceName === 'dynamodb') {
            previewBtnId = 'dynamodbPreviewBtn';
            generateBtnId = 'dynamodbGenerateBtn';
        } else if (this.serviceName === 'iam') {
            previewBtnId = 'iamPreviewBtn';
            generateBtnId = 'iamGenerateBtn';
        } else if (this.serviceName === 'rds') {
            // RDS için sadece form submit var
            return;
        }

        // Preview button event
        const previewBtn = document.getElementById(previewBtnId);
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.handlePreview());
        }

        // Generate button event
        const generateBtn = document.getElementById(generateBtnId);
        if (generateBtn) {
            generateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e);
            });
        }
    }

    /**
     * Form submit işlemi - Her service override etmeli
     * @param {Event} e - Submit event
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        throw new Error(`handleFormSubmit() method must be implemented by ${this.serviceName} service`);
    }

    /**
     * Preview işlemi - Optional
     */
    async handlePreview() {
        console.log(`Preview not implemented for ${this.serviceName}`);
    }

    /**
     * Form verilerini topla - Her service override etmeli
     * @returns {Object} Form data
     */
    collectFormData() {
        throw new Error(`collectFormData() method must be implemented by ${this.serviceName} service`);
    }

    /**
     * Form validation - Her service override etmeli
     * @param {Object} data - Validate edilecek data
     * @returns {boolean} Validation result
     */
    validateForm(data) {
        throw new Error(`validateForm() method must be implemented by ${this.serviceName} service`);
    }

    /**
     * Loading state'i göster/gizle
     * @param {boolean} show - Loading gösterilsin mi?
     */
    showLoading(show) {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Notification göster
     * @param {string} message - Mesaj
     * @param {string} type - Notification tipi (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Notification container oluştur (eğer yoksa)
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }

        // Notification element oluştur
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Container'a ekle
        notificationContainer.appendChild(notification);

        // Close button event
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Service setup - Form gösterildiğinde çağrılır
     * Her service kendi setup'ını override edebilir
     */
    setup() {
        this.bindEvents();
        console.log(`${this.serviceName} service setup completed`);
    }

    /**
     * API endpoint URL'ini oluştur
     * @returns {string} API endpoint URL
     */
    getApiEndpoint() {
        return `/api/${this.provider}/${this.serviceName}`;
    }

    /**
     * Legacy API endpoint URL'ini oluştur (backward compatibility)
     * @returns {string} Legacy API endpoint URL
     */
    getLegacyApiEndpoint() {
        return `/api/generate/${this.serviceName}`;
    }
}

// Export et
window.BaseService = BaseService; 