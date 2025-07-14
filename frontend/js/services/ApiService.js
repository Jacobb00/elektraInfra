// =====================================================
// API SERVICE - HTTP İSTEKLERİ YÖNETİMİ
// =====================================================
// Bu class tüm API isteklerini handle eder
// Centralized error handling ve response processing

class ApiService {
    /**
     * API Service Constructor
     * @param {string} baseUrl - API base URL
     */
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * HTTP GET isteği
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    /**
     * HTTP POST isteği
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    /**
     * HTTP PUT isteği
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    /**
     * HTTP DELETE isteği
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    /**
     * Generic HTTP request metodu
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async request(method, endpoint, data = null, options = {}) {
        try {
            // Full URL oluştur
            const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

            // Request config oluştur
            const config = {
                method: method,
                headers: {
                    ...this.defaultHeaders,
                    ...(options.headers || {})
                },
                ...options
            };

            // Body ekle (GET ve DELETE hariç)
            if (data && method !== 'GET' && method !== 'DELETE') {
                config.body = JSON.stringify(data);
            }

            console.log(`🔄 API Request: ${method} ${url}`, data);

            // Request gönder
            const response = await fetch(url, config);

            // Response'u parse et
            const result = await this.parseResponse(response);

            console.log(`✅ API Response: ${method} ${url}`, result);

            return result;

        } catch (error) {
            console.error(`❌ API Error: ${method} ${endpoint}`, error);
            throw this.handleError(error, endpoint);
        }
    }

    /**
     * Response'u parse et
     * @param {Response} response - Fetch response
     * @returns {Promise<Object>} Parsed data
     */
    async parseResponse(response) {
        // Content type kontrol et
        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // HTTP status kontrol et
        if (!response.ok) {
            throw new ApiError(
                data.message || `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                data
            );
        }

        return data;
    }

    /**
     * Error handling
     * @param {Error} error - Original error
     * @param {string} endpoint - API endpoint
     * @returns {ApiError} Formatted error
     */
    handleError(error, endpoint) {
        if (error instanceof ApiError) {
            return error;
        }

        // Network hatası
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return new ApiError(
                'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.',
                0,
                { endpoint }
            );
        }

        // JSON parse hatası
        if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
            return new ApiError(
                'Sunucudan geçersiz yanıt alındı.',
                500,
                { endpoint, originalError: error.message }
            );
        }

        // Generic error
        return new ApiError(
            error.message || 'Bilinmeyen bir hata oluştu.',
            500,
            { endpoint, originalError: error }
        );
    }

    /**
     * Server status kontrolü
     * @returns {Promise<Object>} Server status
     */
    async checkServerStatus() {
        return this.get('/status');
    }

    /**
     * Dosya indirme
     * @param {string} fileName - İndirilecek dosya adı
     * @returns {string} Download URL
     */
    getDownloadUrl(fileName) {
        return `${this.baseUrl}/download/${fileName}`;
    }

    /**
     * Terraform kod generate et
     * @param {string} provider - Cloud provider (aws, azure, gcp)
     * @param {string} service - Service name (ec2, s3, rds)
     * @param {Object} formData - Form data
     * @returns {Promise<Object>} Generation result
     */
    async generateTerraform(provider, service, formData) {
        return this.post(`/${provider}/${service}`, formData);
    }

    /**
     * Legacy generate (backward compatibility)
     * @param {string} service - Service name
     * @param {Object} formData - Form data
     * @returns {Promise<Object>} Generation result
     */
    async generateLegacy(service, formData) {
        return this.post(`/generate/${service}`, formData);
    }
}

/**
 * Custom API Error Class
 */
class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Export et
window.ApiService = ApiService;
window.ApiError = ApiError; 