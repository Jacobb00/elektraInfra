// =====================================================
// TELEFORM MODULAR APP - MAIN CONTROLLER
// =====================================================
// Bu dosya modular yapıdaki ana controller
// Service-based architecture ile clean code

class TeleformApp {
    /**
     * TeleformApp Constructor
     */
    constructor() {
        // API Service instance
        this.apiService = new ApiService('/api');
        
        // AWS Service instances
        this.services = {
            ec2: new EC2Service(this.apiService),
            s3: new S3Service(this.apiService),
            rds: new RDSService(this.apiService)
        };
        
        // Current active service
        this.currentService = 'ec2';
        
        // Initialize app
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log('🚀 Teleform Modular App başlatıldı');
            
            // Check server status
            await this.checkServerStatus();
            
            // Bind global events
            this.bindEvents();
            
            // Setup initial service (EC2 by default)
            this.selectService('ec2');
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.updateStatus('offline', 'Başlatma hatası');
        }
    }

    /**
     * Check server status
     */
    async checkServerStatus() {
        try {
            console.log('🔍 Server durumu kontrol ediliyor...');
            
            const status = await this.apiService.checkServerStatus();
            
            if (status.success) {
                this.updateStatus('online', 'Bağlı');
                console.log('✅ Server bağlantısı başarılı');
            } else {
                throw new Error('Server response invalid');
            }
            
        } catch (error) {
            console.error('❌ Server bağlantı hatası:', error);
            this.updateStatus('offline', 'Bağlantı hatası');
        }
    }

    /**
     * Update status indicator
     * @param {string} status - Status (online, offline)
     * @param {string} text - Status text
     */
    updateStatus(status, text) {
        const statusDot = document.getElementById('serverStatus');
        const statusText = document.getElementById('statusText');
        
        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = text;
        }
    }

    /**
     * Bind global events
     */
    bindEvents() {
        // Service card selection
        const serviceCards = document.querySelectorAll('.service-card:not(.disabled)');
        serviceCards.forEach(card => {
            card.addEventListener('click', () => {
                const service = card.dataset.service;
                this.selectService(service);
            });
        });

        console.log('🔗 Global event listeners bağlandı');
    }

    /**
     * Select and activate service
     * @param {string} serviceName - Service name (ec2, s3, rds)
     */
    selectService(serviceName) {
        console.log(`🎯 Service seçildi: ${serviceName}`);
        
        // Validate service
        if (!this.services[serviceName]) {
            console.error(`❌ Geçersiz service: ${serviceName}`);
            return;
        }

        try {
            // Update active service card
            this.updateActiveServiceCard(serviceName);
            
            // Hide all forms
            this.hideAllForms();
            
            // Show selected service form
            const service = this.services[serviceName];
            service.toggleForm(true);
            
            // Setup service
            service.setup();
            
            // Update current service
            this.currentService = serviceName;
            
            console.log(`✅ ${serviceName} service aktif edildi`);
            
        } catch (error) {
            console.error(`❌ Service selection error for ${serviceName}:`, error);
        }
    }

    /**
     * Update active service card
     * @param {string} serviceName - Service name
     */
    updateActiveServiceCard(serviceName) {
        // Remove active from all cards
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('active');
        });

        // Add active to selected card
        const selectedCard = document.querySelector(`[data-service="${serviceName}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
    }

    /**
     * Hide all service forms
     */
    hideAllForms() {
        Object.values(this.services).forEach(service => {
            service.toggleForm(false);
        });
    }

    /**
     * Get current active service
     * @returns {BaseService} Current service instance
     */
    getCurrentService() {
        return this.services[this.currentService];
    }

    /**
     * Add new service (for future extensions)
     * @param {string} name - Service name
     * @param {BaseService} serviceInstance - Service instance
     */
    addService(name, serviceInstance) {
        this.services[name] = serviceInstance;
        console.log(`➕ New service added: ${name}`);
    }

    /**
     * Get service by name
     * @param {string} name - Service name
     * @returns {BaseService|null} Service instance
     */
    getService(name) {
        return this.services[name] || null;
    }

    /**
     * Get all available services
     * @returns {Object} Services object
     */
    getAllServices() {
        return { ...this.services };
    }

    /**
     * Health check
     * @returns {Object} App health status
     */
    getHealth() {
        return {
            status: 'healthy',
            services: Object.keys(this.services),
            currentService: this.currentService,
            apiConnected: this.apiService ? true : false
        };
    }
}

// =====================================================
// APP INITIALIZATION
// =====================================================

// Global app instance
let teleformApp;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing Teleform App...');
    
    try {
        teleformApp = new TeleformApp();
        
        // Global access for debugging
        window.teleformApp = teleformApp;
        
        console.log('🎉 Teleform App başarıyla başlatıldı!');
        
    } catch (error) {
        console.error('💥 App başlatma hatası:', error);
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

console.log('📦 Teleform Modular App loaded'); 