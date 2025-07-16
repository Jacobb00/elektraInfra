// =====================================================
// AWS VPC SERVICE - VPC NETWORK FORM VE LOGİK
// =====================================================

class VPCService extends BaseService {
    constructor(apiService) {
        super('vpc', 'aws', apiService);
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

            const result = await this.apiService.generateTerraform('aws', 'vpc', formData);

            if (result.success) {
                this.showResult(result, false);
                this.showNotification('VPC Terraform kodu başarıyla oluşturuldu!', 'success');
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
        const awsRegion = document.getElementById('vpcRegion').value;
        const vpcName = document.getElementById('vpcName').value;
        const vpcCidr = document.getElementById('vpcCidr').value;
        const availabilityZones = parseInt(document.getElementById('availabilityZones').value);
        
        // NAT Gateway settings
        const enableNatGateway = document.getElementById('enableNatGateway').checked;
        const singleNatGateway = document.getElementById('singleNatGateway').checked;
        
        // DNS settings
        const enableDnsHostnames = document.getElementById('enableDnsHostnames').checked;
        const enableDnsSupport = document.getElementById('enableDnsSupport').checked;
        
        // Additional features
        const enableDatabaseSubnets = document.getElementById('enableDatabaseSubnets').checked;
        const enableVpnGateway = document.getElementById('enableVpnGateway').checked;
        const enableFlowLogs = document.getElementById('enableFlowLogs').checked;
        const flowLogsRetention = parseInt(document.getElementById('flowLogsRetention').value || 7);
        
        // Tags
        const tags = {};
        document.querySelectorAll('#vpcTagsContainer .tag-input').forEach(tagInput => {
            const keyInput = tagInput.querySelector('input[name="tagKey"]');
            const valueInput = tagInput.querySelector('input[name="tagValue"]');
            if (keyInput.value && valueInput.value) {
                tags[keyInput.value] = valueInput.value;
            }
        });

        return {
            awsRegion,
            vpcName,
            vpcCidr,
            availabilityZones,
            enableNatGateway,
            singleNatGateway,
            enableDnsHostnames,
            enableDnsSupport,
            enableDatabaseSubnets,
            enableVpnGateway,
            enableFlowLogs,
            flowLogsRetention: enableFlowLogs ? flowLogsRetention : undefined,
            tags
        };
    }

    validateForm(data) {
        if (!data.vpcName) {
            this.showNotification('VPC Name gereklidir', 'error');
            return false;
        }

        if (!data.vpcCidr) {
            this.showNotification('VPC CIDR Block gereklidir', 'error');
            return false;
        }

        // CIDR validation
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        if (!cidrRegex.test(data.vpcCidr)) {
            this.showNotification('Geçersiz CIDR formatı (örn: 10.0.0.0/16)', 'error');
            return false;
        }

        // CIDR range check (8-28)
        const cidrBits = parseInt(data.vpcCidr.split('/')[1]);
        if (cidrBits < 16 || cidrBits > 28) {
            this.showNotification('VPC CIDR block /16 ile /28 arasında olmalıdır', 'error');
            return false;
        }

        if (data.availabilityZones < 1 || data.availabilityZones > 3) {
            this.showNotification('Availability Zones 1-3 arasında olmalıdır', 'error');
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
        this.bindVpcTagEvents();
    }

    setupConditionalSections() {
        // NAT Gateway conditional section
        const natGatewayCheckbox = document.getElementById('enableNatGateway');
        const natGatewayOptions = document.getElementById('natGatewayOptions');
        
        if (natGatewayCheckbox && natGatewayOptions) {
            natGatewayCheckbox.addEventListener('change', (e) => {
                natGatewayOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Flow Logs conditional section
        const flowLogsCheckbox = document.getElementById('enableFlowLogs');
        const flowLogsOptions = document.getElementById('flowLogsOptions');
        
        if (flowLogsCheckbox && flowLogsOptions) {
            flowLogsCheckbox.addEventListener('change', (e) => {
                flowLogsOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    bindVpcTagEvents() {
        const addTagBtn = document.getElementById('addVpcTag');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.addVpcTag());
        }

        this.bindVpcTagRemoveEvents();
    }

    addVpcTag() {
        const container = document.getElementById('vpcTagsContainer');
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
        this.bindVpcTagRemoveEvents();
    }

    bindVpcTagRemoveEvents() {
        document.querySelectorAll('#vpcTagsContainer .btn-remove-tag').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('#vpcTagsContainer .btn-remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tagInput = btn.closest('.tag-input');
                if (tagInput && document.querySelectorAll('#vpcTagsContainer .tag-input').length > 1) {
                    tagInput.remove();
                }
            });
        });
    }
}

window.VPCService = VPCService; 