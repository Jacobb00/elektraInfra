const express = require('express'); //http sunucusu rest apileri tanımlar
const cors = require('cors'); //fronteenden gelen istekleri kontrol eder backende ulaşabilmesi için
const { spawn } = require('child_process'); //terminal komutlarını çalıştırmak için kullanılır parantez içine almanın sebebi foksiyon olduğu için direkt alıyor
const path = require('path'); //dosya yollarını yönetmek için kullanılır
const fs = require('fs'); //dosya işlemleri için kullanılır
const archiver = require('archiver'); //zip dosyası oluşturmak için kullanılır
const { InteractiveBrowserCredential } = require("@azure/identity"); //Azure kimlik doğrulama için     
const { SubscriptionClient } = require("@azure/arm-subscriptions"); //Azure abonelikleri için subsciriptionsları
const { ResourceManagementClient } = require("@azure/arm-resources"); //Azure kaynak grupları için

const app = express(); //express sunucusnu başlatır
const port = process.env.PORT || 5000; //portu .env varsa ordan alır yoksa 5000 portunu kullanır

// CORS ayarları fronteenden gelen istekelere izin ver frontend erişebilsin
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
//json ve form verilerini işleeme okunabilir hale getirmek için
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Azure kimlik bilgilerini saklayacak değişken browserdan bağlanabilmek için
let azureCredential = new InteractiveBrowserCredential({
    redirectUri: "http://localhost:3000",
    clientId: "", // Azure CLI default client ID sabittir
    tenantId: "" // Kullanıcının tenant ID'si
});

// Alternatif credential with organizations (all tenants)
let azureCredentialOrg = new InteractiveBrowserCredential({
    redirectUri: "http://localhost:3000",
    clientId: "04",
    tenantId: "organizations"
});

// Tenant switching endpoint kullanıcı isterse organization tenantına geçiş yapsın
app.post('/api/azure/switch-tenant', async (req, res) => {
    try {
        const { useOrganizations } = req.body;
        
        if (useOrganizations) {
            azureCredential = azureCredentialOrg;
            console.log('Switched to organizations tenant');
        } else {
            azureCredential = new InteractiveBrowserCredential({
                redirectUri: "http://localhost:3000",
                clientId: "",
                tenantId: "cm"
            });
            console.log('Switched to specific tenant');
        }
        
        res.json({ success: true, message: 'Tenant switched successfully' });
    } catch (error) {
        console.error('Tenant switch error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Azure'a bağlanma endpoint'i
app.post('/api/azure/login', async (req, res) => {
    try {
        console.log('Starting Azure login process...');
        
        // Abonelikleri listeleyelim kullanıcının tüm aboneliklerini çeker
        const subClient = new SubscriptionClient(azureCredential);
        const subscriptions = await subClient.subscriptions.list();
        
        // Abonelikleri frontend'e gönderelim
        const subList = [];
        console.log('Available subscriptions:');
        for await (const sub of subscriptions) {
            console.log(`- ${sub.displayName} (${sub.subscriptionId})`);
            subList.push({
                id: sub.subscriptionId,
                name: sub.displayName
            });
        }
        
        console.log(`Found ${subList.length} subscriptions total`);
        res.json({ success: true, subscriptions: subList });
    } catch (error) {
        console.error('Azure login error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode
        });
        res.status(500).json({ 
            success: false, 
            error: `Azure login failed: ${error.message}` 
        });
    }
});

// Kaynak gruplarını listeleme endpoint'i
app.get('/api/azure/resourceGroups/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        console.log(`Fetching resource groups for subscription: ${subscriptionId}`);
        
        const resourceClient = new ResourceManagementClient(azureCredential, subscriptionId);
        
        const resourceGroups = await resourceClient.resourceGroups.list();
        const rgList = [];
        
        console.log('Raw resource groups from Azure:');
        for await (const rg of resourceGroups) {
            console.log(`- ${rg.name} (${rg.location})`);
            rgList.push({
                name: rg.name,
                location: rg.location
            });
        }
        
        console.log(`Found ${rgList.length} resource groups total`);
        res.json({ success: true, resourceGroups: rgList });
    } catch (error) {
        console.error('Resource groups fetch error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            stack: error.stack
        });
        res.status(500).json({ 
            success: false, 
            error: `Failed to fetch resource groups: ${error.message}` 
        });
    }
});

// Terraformer supported resources mapping azure da ki her resources typin terafromer karşılığı
const terraformerResources = {
    // Analysis Services
    'Microsoft.AnalysisServices/servers': 'analysis',
    
    // App Service
    'Microsoft.Web/sites': 'app_service',
    'Microsoft.Web/serverfarms': 'app_service',
    
    // Application Gateway
    'Microsoft.Network/applicationGateways': 'application_gateway',
    
    // Container Services
    'Microsoft.ContainerInstance/containerGroups': 'container',
    'Microsoft.ContainerRegistry/registries': 'container',
    
    // Cosmos DB
    'Microsoft.DocumentDB/databaseAccounts': 'cosmosdb',
    
    // Data Factory
    'Microsoft.DataFactory/factories': 'data_factory',
    
    // Databases
    'Microsoft.DBforMariaDB/servers': 'database',
    'Microsoft.DBforMySQL/servers': 'database',
    'Microsoft.DBforPostgreSQL/servers': 'database',
    'Microsoft.Sql/servers': 'database',
    'Microsoft.Sql/databases': 'database',
    
    // Databricks
    'Microsoft.Databricks/workspaces': 'databricks',
    
    // Disks
    'Microsoft.Compute/disks': 'disk',
    
    // DNS
    'Microsoft.Network/dnsZones': 'dns',
    
    // Event Hub
    'Microsoft.EventHub/namespaces': 'eventhub',
    
    // Key Vault
    'Microsoft.KeyVault/vaults': 'key_vault',
    
    // Load Balancer
    'Microsoft.Network/loadBalancers': 'load_balancer',
    
    // Network Security Groups
    'Microsoft.Network/networkSecurityGroups': 'network_security_group',
    
    // Public IP
    'Microsoft.Network/publicIPAddresses': 'public_ip',
    
    // Resource Groups
    'Microsoft.Resources/resourceGroups': 'resource_group',
    
    // Storage
    'Microsoft.Storage/storageAccounts': 'storage',
    
    // Virtual Machines
    'Microsoft.Compute/virtualMachines': 'virtual_machine',
    'Microsoft.Compute/virtualMachineScaleSets': 'virtual_machine_scale_set',
    
    // Virtual Networks
    'Microsoft.Network/virtualNetworks': 'virtual_network',
    'Microsoft.Network/virtualNetworks/subnets': 'subnet',
    'Microsoft.Network/networkInterfaces': 'network_interface',
    'Microsoft.Network/virtualNetworkGateways': 'virtual_network_gateway',
    
    // Web Apps
    'Microsoft.Web/sites': 'app_service',
    'Microsoft.Web/sites/slots': 'app_service'
};

// New endpoint to get available resource types resource typleri listelemek için 
app.get('/api/azure/resourceTypes/:subscriptionId/:resourceGroup', async (req, res) => {
    try {
        const { subscriptionId, resourceGroup } = req.params;
        const resourceClient = new ResourceManagementClient(azureCredential, subscriptionId);
        
        const resourcesIter = resourceClient.resources.listByResourceGroup(resourceGroup);
        const availableTypes = new Set();
        
        for await (const resource of resourcesIter) {
            const tfType = terraformerResources[resource.type];
            if (tfType) {
                availableTypes.add(tfType);
            }
        }
        
        res.json({ 
            success: true, 
            resourceTypes: Array.from(availableTypes) 
        });
    } catch (error) {
        console.error('Resource types fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch resource types' 
        });
    }
});

// New endpoint to get individual resources within a resource group bireysel reoucres seçmek için 
app.get('/api/azure/resources/:subscriptionId/:resourceGroup', async (req, res) => {
    try {
        const { subscriptionId, resourceGroup } = req.params;
        const resourceClient = new ResourceManagementClient(azureCredential, subscriptionId);
        
        const resourcesIter = resourceClient.resources.listByResourceGroup(resourceGroup);
        const resourcesList = [];
        
        for await (const resource of resourcesIter) {
            const tfType = terraformerResources[resource.type];
            if (tfType) {
                resourcesList.push({
                    id: resource.id,
                    name: resource.name,
                    type: resource.type,
                    terraformType: tfType,
                    location: resource.location,
                    tags: resource.tags || {}
                });
            }
        }
        
        // Group resources by terraform type for better UI organization
        const groupedResources = resourcesList.reduce((acc, resource) => {
            if (!acc[resource.terraformType]) {
                acc[resource.terraformType] = [];
            }
            acc[resource.terraformType].push(resource);
            return acc;
        }, {});
        
        res.json({ 
            success: true, 
            resources: groupedResources,
            resourceCount: resourcesList.length
        });
    } catch (error) {
        console.error('Individual resources fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch individual resources' 
        });
    }
});

// Terraform kodu oluşturma endpoint'i
app.post('/api/generate', async (req, res) => {
    try {
        const { subscriptionId, resourceGroup, resources, resourceIds } = req.body;

        if (!subscriptionId || !resourceGroup) {
            return res.status(400).json({
                success: false,
                error: 'Subscription ID and Resource Group are required'
            });
        }

        // Check if we have either resources (types) or resourceIds (specific resources)
        if ((!resources || resources.length === 0) && (!resourceIds || resourceIds.length === 0)) {
            return res.status(400).json({
                success: false,
                error: 'Either resource types or specific resource IDs are required'
            });
        }

        // Çıktı dizinini oluştur
        const outputDir = path.join(__dirname, 'generated', `${resourceGroup}_${Date.now()}`);
        fs.mkdirSync(outputDir, { recursive: true });

        console.log('Starting Terraformer with:', {
            subscriptionId,
            resourceGroup,
            resources: resources || [],
            resourceIds: resourceIds || []
        });

        // Terraformer komut argümanları terraformer kaynakları 
        let terraformerArgs = [
            'import',
            'azure',
            '--resource-group=' + resourceGroup,
            '--path-output=' + outputDir
        ];

        // If specific resource IDs are provided, use them; otherwise use resource types
        if (resourceIds && resourceIds.length > 0) {
            // For individual resources, we need to determine their types and use those
            const resourceClient = new ResourceManagementClient(azureCredential, subscriptionId);
            const resourcesIter = resourceClient.resources.listByResourceGroup(resourceGroup);
            const selectedResourceTypes = new Set();
            
            for await (const resource of resourcesIter) {
                if (resourceIds.includes(resource.id)) {
                    const tfType = terraformerResources[resource.type];
                    if (tfType) {
                        selectedResourceTypes.add(tfType);
                    }
                }
            }
            
            if (selectedResourceTypes.size > 0) {
                terraformerArgs.push('--resources=' + Array.from(selectedResourceTypes).join(','));
                console.log('Using resource types for selected resources:', Array.from(selectedResourceTypes));
            } else {
                throw new Error('No supported resource types found for selected resources');
            }
        } else {
            terraformerArgs.push('--resources=' + resources.join(','));
            console.log('Using resource types:', resources);
        }

        console.log('Terraformer command:', 'terraformer', terraformerArgs.join(' '));

        // Terraformer için gerekli ortam değişkenleri - Azure CLI authentication kullan
        const options = {
            env: {
                ...process.env,
                'ARM_SUBSCRIPTION_ID': subscriptionId
            }
        };

        return new Promise((resolve, reject) => {
            const terraformer = spawn('terraformer', terraformerArgs, options);

            let stdout = '';
            let stderr = '';

            terraformer.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log(`Terraformer stdout: ${data}`);
            });

            terraformer.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error(`Terraformer stderr: ${data}`);
            });

            terraformer.on('error', (error) => {
                console.error('Failed to start Terraformer:', error);
                reject(new Error('Failed to start Terraformer. Is it installed and in PATH?'));
            });

            terraformer.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Terraformer process exited with code ${code}`);
                    const error = `Terraformer failed:\n${stdout}\n${stderr}`;
                    reject(new Error(error));
                    return;
                }

                // Başarılı - çıktıyı ziple
                const zipPath = path.join(__dirname, 'generated', `${resourceGroup}.zip`);
                const output = fs.createWriteStream(zipPath);
                const archive = archiver('zip', {
                    zlib: { level: 9 }
                });

                output.on('close', () => {
                    res.download(zipPath, (err) => {
                        if (err) {
                            console.error('Error sending zip file:', err);
                        }
                        // Temizlik
                        fs.rmSync(outputDir, { recursive: true, force: true });
                        fs.unlinkSync(zipPath);
                    });
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);
                archive.directory(outputDir, false);
                archive.finalize();
            });
        }).catch(error => {
            // Hata durumunda temizlik yap
            if (fs.existsSync(outputDir)) {
                fs.rmSync(outputDir, { recursive: true, force: true });
            }
            res.status(500).json({
                success: false,
                error: error.message
            });
        });
    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Terraform code'
        });
    }
});

// Sunucuyu başlat
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
