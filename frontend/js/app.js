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

    // Service formunu göster
    showServiceForm(service) {
        // Şu anda sadece EC2 var, gelecekte diğer servisleri ekleyebiliriz
        const ec2Form = document.getElementById('ec2Form');
        
        if (service === 'ec2') {
            ec2Form.style.display = 'block';
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
}

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.teleformApp = new TeleformApp();
}); 