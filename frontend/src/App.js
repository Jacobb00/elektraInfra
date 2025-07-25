import React, { useState } from 'react';
import './App.css';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [subscriptions, setSubscriptions] = useState([]);
    const [resourceGroups, setResourceGroups] = useState([]);
    const [selectedSubscription, setSelectedSubscription] = useState('');
    const [selectedResourceGroup, setSelectedResourceGroup] = useState('');
    const [availableResources, setAvailableResources] = useState([]);
    const [resources, setResources] = useState({});
    const [individualResources, setIndividualResources] = useState({});
    const [selectedIndividualResources, setSelectedIndividualResources] = useState([]);
    const [viewMode, setViewMode] = useState('types'); // 'types' or 'individual'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/azure/login', {
                method: 'POST',
            });
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Login failed');
            }

            setSubscriptions(data.subscriptions);
            setIsLoggedIn(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscriptionChange = async (e) => {
        const subId = e.target.value;
        setSelectedSubscription(subId);
        setSelectedResourceGroup('');
        setResourceGroups([]);
        
        if (!subId) return;

        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/azure/resourceGroups/${subId}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch resource groups');
            }

            setResourceGroups(data.resourceGroups);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResourceGroupChange = async (e) => {
        const rg = e.target.value;
        setSelectedResourceGroup(rg);
        setResources({});
        setAvailableResources([]);
        setIndividualResources({});
        setSelectedIndividualResources([]);
        
        if (!rg) return;

        setLoading(true);
        setError('');
        try {
            // Fetch both resource types and individual resources
            const [typesResponse, resourcesResponse] = await Promise.all([
                fetch(`/api/azure/resourceTypes/${selectedSubscription}/${rg}`),
                fetch(`/api/azure/resources/${selectedSubscription}/${rg}`)
            ]);
            
            const typesData = await typesResponse.json();
            const resourcesData = await resourcesResponse.json();
            
            if (!typesData.success) {
                throw new Error(typesData.error || 'Failed to fetch resource types');
            }
            
            if (!resourcesData.success) {
                throw new Error(resourcesData.error || 'Failed to fetch individual resources');
            }

            setAvailableResources(typesData.resourceTypes);
            setIndividualResources(resourcesData.resources);
            
            // Initialize resources state for types
            const initialResources = {};
            typesData.resourceTypes.forEach(type => {
                initialResources[type] = false;
            });
            setResources(initialResources);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setResources(prev => ({ ...prev, [name]: checked }));
    };

    const handleIndividualResourceChange = (resourceId, checked) => {
        setSelectedIndividualResources(prev => {
            if (checked) {
                return [...prev, resourceId];
            } else {
                return prev.filter(id => id !== resourceId);
            }
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        let requestBody = {
            subscriptionId: selectedSubscription,
            resourceGroup: selectedResourceGroup,
        };

        if (viewMode === 'individual') {
            if (selectedIndividualResources.length === 0) {
                setError('Please select at least one individual resource.');
                setLoading(false);
                return;
            }
            requestBody.resourceIds = selectedIndividualResources;
        } else {
            const selectedResources = Object.keys(resources).filter(key => resources[key]);
            if (selectedResources.length === 0) {
                setError('Please select at least one resource type.');
                setLoading(false);
                return;
            }
            requestBody.resources = selectedResources;
        }

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'An error occurred while generating the files.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedResourceGroup}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Azure Terraformer</h1>
                
                {!isLoggedIn ? (
                    <div className="login-section">
                        <button 
                            onClick={handleLogin} 
                            disabled={loading}
                            className="login-button"
                        >
                            {loading ? 'Connecting...' : 'Connect to Azure'}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Azure Subscription:</label>
                            <select
                                value={selectedSubscription}
                                onChange={handleSubscriptionChange}
                                required
                            >
                                <option value="">Select a subscription</option>
                                {subscriptions.map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Resource Group:</label>
                            <select
                                value={selectedResourceGroup}
                                onChange={handleResourceGroupChange}
                                required
                                disabled={!selectedSubscription}
                            >
                                <option value="">Select a resource group</option>
                                {resourceGroups.map(rg => (
                                    <option key={rg.name} value={rg.name}>
                                        {rg.name} ({rg.location})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Selection Mode:</label>
                            <div className="view-mode-toggle">
                                <label>
                                    <input 
                                        type="radio" 
                                        name="viewMode" 
                                        value="types" 
                                        checked={viewMode === 'types'} 
                                        onChange={(e) => setViewMode(e.target.value)}
                                        disabled={!selectedResourceGroup}
                                    />
                                    Resource Types (All resources of selected types)
                                </label>
                                <label>
                                    <input 
                                        type="radio" 
                                        name="viewMode" 
                                        value="individual" 
                                        checked={viewMode === 'individual'} 
                                        onChange={(e) => setViewMode(e.target.value)}
                                        disabled={!selectedResourceGroup}
                                    />
                                    Individual Resources (Select specific resources)
                                </label>
                            </div>
                        </div>

                        {viewMode === 'types' ? (
                            <div className="form-group">
                                <label>Select Resource Types:</label>
                                <div className="checkbox-group">
                                    {availableResources.length > 0 ? (
                                        availableResources.map(type => (
                                            <label key={type}>
                                                <input 
                                                    type="checkbox" 
                                                    name={type} 
                                                    checked={resources[type] || false} 
                                                    onChange={handleCheckboxChange}
                                                    disabled={!selectedResourceGroup}
                                                />
                                                {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
                                            </label>
                                        ))
                                    ) : (
                                        <p>No resource types available or select a resource group.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label>Select Individual Resources:</label>
                                <div className="individual-resources">
                                    {Object.keys(individualResources).length > 0 ? (
                                        Object.entries(individualResources).map(([resourceType, resourceList]) => (
                                            <div key={resourceType} className="resource-type-group">
                                                <h4>{resourceType.charAt(0).toUpperCase() + resourceType.slice(1).replace(/_/g, ' ')}</h4>
                                                <div className="resource-list">
                                                    {resourceList.map(resource => (
                                                        <label key={resource.id} className="resource-item">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedIndividualResources.includes(resource.id)}
                                                                onChange={(e) => handleIndividualResourceChange(resource.id, e.target.checked)}
                                                                disabled={!selectedResourceGroup}
                                                            />
                                                            <div className="resource-info">
                                                                <span className="resource-name">{resource.name}</span>
                                                                <span className="resource-location">({resource.location})</span>
                                                                <div className="resource-type">{resource.type}</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No individual resources available or select a resource group.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading || !selectedResourceGroup}
                        >
                            {loading ? 'Generating...' : 'Generate Terraform Code'}
                        </button>
                    </form>
                )}

                {error && <p className="error">{error}</p>}
            </header>
        </div>
    );
}

export default App;
