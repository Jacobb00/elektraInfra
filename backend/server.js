const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process'); //aztfexport komutu için
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { InteractiveBrowserCredential } = require("@azure/identity"); //Azure kimlik doğrulama için     
const { SubscriptionClient } = require("@azure/arm-subscriptions"); //Azure abonelikleri için
const { ResourceManagementClient } = require("@azure/arm-resources"); //Azure kaynak grupları için


const app = express();
const port = process.env.PORT || 5000;

// CORS ayarları fronteenden gelen istekelere izin ver
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
//json ve form verilerini işleeme
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Azure kimlik bilgilerini saklayacak değişken
let azureCredential = new InteractiveBrowserCredential({
    redirectUri: "http://localhost:3000",
    clientId: "04b07795-8ddb-461a-bbee-02f9e1bf7b46", // Azure CLI default client ID
    tenantId: "celikyakup8585gmail.onmicrosoft.com" // Kullanıcının tenant ID'si
});

// Alternatif credential with organizations (all tenants)
let azureCredentialOrg = new InteractiveBrowserCredential({
    redirectUri: "http://localhost:3000",
    clientId: "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
    tenantId: "organizations"
});

// Tenant switching endpoint
app.post('/api/azure/switch-tenant', async (req, res) => {
    try {
        const { useOrganizations } = req.body;
        
        if (useOrganizations) {
            azureCredential = azureCredentialOrg;
            console.log('Switched to organizations tenant');
        } else {
            azureCredential = new InteractiveBrowserCredential({
                redirectUri: "http://localhost:3000",
                clientId: "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
                tenantId: "celikyakup8585gmail.onmicrosoft.com"
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
        
        // Abonelikleri listeleyelim
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

// aztfexport için Azure kaynak türleri - aztfexport doğrudan resource type'ları kullanır
const aztfexportResources = {
    // Analysis Services
    'Microsoft.AnalysisServices/servers': 'azurerm_analysis_services_server',
    
    // App Service
    'Microsoft.Web/sites': 'azurerm_app_service',
    'Microsoft.Web/serverfarms': 'azurerm_app_service_plan',
    
    // Application Gateway
    'Microsoft.Network/applicationGateways': 'azurerm_application_gateway',
    
    // Container Services
    'Microsoft.ContainerInstance/containerGroups': 'azurerm_container_group',
    'Microsoft.ContainerRegistry/registries': 'azurerm_container_registry',
    
    // Cosmos DB
    'Microsoft.DocumentDB/databaseAccounts': 'azurerm_cosmosdb_account',
    
    // Data Factory
    'Microsoft.DataFactory/factories': 'azurerm_data_factory',
    
    // Databases
    'Microsoft.DBforMariaDB/servers': 'azurerm_mariadb_server',
    'Microsoft.DBforMySQL/servers': 'azurerm_mysql_server',
    'Microsoft.DBforPostgreSQL/servers': 'azurerm_postgresql_server',
    'Microsoft.Sql/servers': 'azurerm_mssql_server',
    'Microsoft.Sql/databases': 'azurerm_mssql_database',
    
    // Databricks
    'Microsoft.Databricks/workspaces': 'azurerm_databricks_workspace',
    
    // Disks
    'Microsoft.Compute/disks': 'azurerm_managed_disk',
    
    // DNS
    'Microsoft.Network/dnsZones': 'azurerm_dns_zone',
    
    // Event Hub
    'Microsoft.EventHub/namespaces': 'azurerm_eventhub_namespace',
    
    // Key Vault
    'Microsoft.KeyVault/vaults': 'azurerm_key_vault',
    
    // Load Balancer
    'Microsoft.Network/loadBalancers': 'azurerm_lb',
    
    // Network Security Groups
    'Microsoft.Network/networkSecurityGroups': 'azurerm_network_security_group',
    
    // Public IP
    'Microsoft.Network/publicIPAddresses': 'azurerm_public_ip',
    
    // Resource Groups
    'Microsoft.Resources/resourceGroups': 'azurerm_resource_group',
    
    // Storage
    'Microsoft.Storage/storageAccounts': 'azurerm_storage_account',
    
    // Virtual Machines
    'Microsoft.Compute/virtualMachines': 'azurerm_linux_virtual_machine,azurerm_windows_virtual_machine',
    'Microsoft.Compute/virtualMachineScaleSets': 'azurerm_linux_virtual_machine_scale_set,azurerm_windows_virtual_machine_scale_set',
    
    // Virtual Networks
    'Microsoft.Network/virtualNetworks': 'azurerm_virtual_network',
    'Microsoft.Network/virtualNetworks/subnets': 'azurerm_subnet',
    'Microsoft.Network/networkInterfaces': 'azurerm_network_interface',
    'Microsoft.Network/virtualNetworkGateways': 'azurerm_virtual_network_gateway',
    
    // Web Apps
    'Microsoft.Web/sites': 'azurerm_app_service',
    'Microsoft.Web/sites/slots': 'azurerm_app_service'
};

// New endpoint to get available resource types
app.get('/api/azure/resourceTypes/:subscriptionId/:resourceGroup', async (req, res) => {
    try {
        const { subscriptionId, resourceGroup } = req.params;
        const resourceClient = new ResourceManagementClient(azureCredential, subscriptionId);
        
        const resourcesIter = resourceClient.resources.listByResourceGroup(resourceGroup);
        const availableTypes = new Set();
        
        for await (const resource of resourcesIter) {
            const tfType = aztfexportResources[resource.type];
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

// New endpoint to get individual resources within a resource group
app.get('/api/azure/resources/:subscriptionId/:resourceGroup', async (req, res) => {
    try {
        const { subscriptionId, resourceGroup } = req.params;
        const resourceClient = new ResourceManagementClient(azureCredential, subscriptionId);
        
        const resourcesIter = resourceClient.resources.listByResourceGroup(resourceGroup);
        const resourcesList = [];
        
        for await (const resource of resourcesIter) {
            const tfType = aztfexportResources[resource.type];
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
        const finalOutputDir = path.join(outputDir, 'terraform');
        fs.mkdirSync(finalOutputDir, { recursive: true });

        console.log('Starting aztfexport with:', {
            subscriptionId,
            resourceGroup,
            resources: resources || [],
            resourceIds: resourceIds || []
        });

        // aztfexport komut argümanları
        // Output directory'yi temizle
        if (fs.existsSync(finalOutputDir)) {
            fs.rmSync(finalOutputDir, { recursive: true, force: true });
        }
        fs.mkdirSync(finalOutputDir, { recursive: true });
        
        let aztfexportArgs = [
            'rg',
            '--subscription-id',
            subscriptionId,
            '--output-dir',
            finalOutputDir,
            '--overwrite',
            resourceGroup
        ];

        // If specific resource IDs are provided, use them; otherwise use resource types
        if (resourceIds && resourceIds.length > 0) {
            // For individual resources, we need to determine their types and use those
            const resourceClient = new ResourceManagementClient(azureCredential, subscriptionId);
            const resourcesIter = resourceClient.resources.listByResourceGroup(resourceGroup);
            const selectedResourceTypes = new Set();
            
            for await (const resource of resourcesIter) {
                if (resourceIds.includes(resource.id)) {
                    const tfType = aztfexportResources[resource.type];
                    if (tfType) {
                        selectedResourceTypes.add(tfType);
                    }
                }
            }
            
            // aztfexport için specific resource seçimi desteklenmez, tüm resource group export edilir
            console.log('aztfexport will export all resources in the resource group');
        }

        console.log('aztfexport command:', 'aztfexport', aztfexportArgs.join(' '));

        // aztfexport için gerekli ortam değişkenleri - Azure CLI authentication kullan
        const options = {
            env: {
                ...process.env,
                'ARM_SUBSCRIPTION_ID': subscriptionId
            },
            cwd: process.cwd()
        };

        return new Promise((resolve, reject) => {
            const aztfexport = spawn('aztfexport', aztfexportArgs, options);

            let stdout = '';
            let stderr = '';

            aztfexport.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log(`aztfexport stdout: ${data}`);
                
                // aztfexport'un interaktif menüsünü handle et
                const output = data.toString();
                
                // Menü görünür görünmez 'w' gönder
                if (output.includes('w import') || output.includes('import • s save') || output.includes('↑/k up • ↓/j down')) {
                    setTimeout(() => {
                        aztfexport.stdin.write('w\n');
                        console.log('Automatically sent w (import) command to aztfexport');
                    }, 500);
                }
                
                // Import işlemi tamamlandığında devam et
                if (output.includes('Press any key to continue') || output.includes('continue') || output.includes('Import completed')) {
                    setTimeout(() => {
                        aztfexport.stdin.write('\n');
                        console.log('Automatically pressed enter to continue');
                    }, 500);
                }
                
                // Eğer 'q' ile çıkış gerekiyorsa
                if (output.includes('q quit') && output.includes('Import completed')) {
                    setTimeout(() => {
                        aztfexport.stdin.write('q\n');
                        console.log('Automatically sent q (quit) command to aztfexport');
                    }, 1000);
                }
            });

            aztfexport.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error(`aztfexport stderr: ${data}`);
            });

            aztfexport.on('error', (error) => {
                console.error('Failed to start aztfexport:', error);
                reject(new Error('Failed to start aztfexport. Is it installed and in PATH?'));
            });

            aztfexport.on('close', (code) => {
                if (code !== 0) {
                    console.error(`aztfexport process exited with code ${code}`);
                    const error = `aztfexport failed:\n${stdout}\n${stderr}`;
                    reject(new Error(error));
                    return;
                }
                
                // aztfexport çıktısını düzenle ve Terraform yapısına dönüştür
                try {
                    console.log('Processing aztfexport output...');
                    
                    // aztfexport zaten doğru formatta .tf dosyaları oluşturur
                    
                    const processDirectory = (dir) => {
                        const items = fs.readdirSync(dir, { withFileTypes: true });
                        
                        for (const item of items) {
                            const itemPath = path.join(dir, item.name);
                            
                            if (item.isDirectory()) {
                                // Alt dizinleri işle
                                processDirectory(itemPath);
                            } else if (item.name.endsWith('.tf') && item.name !== 'provider.tf' && item.name !== 'terraform.tf') {
                                // .tf dosyalarını oku ve düzenle
                                let content = fs.readFileSync(itemPath, 'utf8');
                                
                                // aztfexport zaten temiz çıktı üretir, minimal düzeltme yap
                                content = content.trim();
                                
                                if (content.length === 0) {
                                    console.log(`Skipping empty file: ${item.name}`);
                                    continue;
                                }
                                
                                console.log(`Processed: ${item.name}`);
                            }
                        }
                    };
                    
                    // Dosyaları işle
                    processDirectory(finalOutputDir);
                    
                    // aztfexport zaten gerekli dosyaları oluşturur (provider.tf, terraform.tf vb.)
                    // main.tf dosyasını oluştur ve tüm kaynakları buraya topla
                    const mainTfPath = path.join(finalOutputDir, 'main.tf');
                    let allResources = '';
                    
                    // Tüm .tf dosyalarını oku ve main.tf'e birleştir
                    const tfFiles = fs.readdirSync(finalOutputDir).filter(file => 
                        file.endsWith('.tf') && 
                        file !== 'provider.tf' && 
                        file !== 'terraform.tf' && 
                        file !== 'main.tf'
                    );
                    
                    for (const tfFile of tfFiles) {
                        const tfFilePath = path.join(finalOutputDir, tfFile);
                        const content = fs.readFileSync(tfFilePath, 'utf8');
                        if (content.trim()) {
                            allResources += content.trim() + '\n\n';
                        }
                        // Orijinal dosyayı sil
                        fs.unlinkSync(tfFilePath);
                    }
                    
                    // main.tf dosyasını oluştur
                    if (allResources.trim()) {
                        fs.writeFileSync(mainTfPath, allResources.trim());
                        console.log('Created main.tf with all resources');
                    } else {
                        const mainTfContent = `# Main Terraform configuration\n# No resources found to import`;
                        fs.writeFileSync(mainTfPath, mainTfContent);
                        console.log('Created empty main.tf file');
                    }
                    
                    console.log('aztfexport files processed successfully.');
                } catch (err) {
                    console.error('Error processing aztfexport files:', err);
                    reject(err);
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
                        console.log('Cleanup completed.');
                    });
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);
                archive.directory(finalOutputDir, false);
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
