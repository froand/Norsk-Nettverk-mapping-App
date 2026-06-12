targetScope = 'resourceGroup'

@description('Primary location for all resources')
param location string = resourceGroup().location

@description('Name suffix for resources')
param environmentName string = 'norsk-nettverk-v2'

@description('Tag applied to every resource so cost reports can group them')
param costCenterTag string = 'norsk-nettverk-v2'

@description('Backend container image (fully qualified). Defaults to a public placeholder so first-time deploys succeed; pass the real ACR tag on subsequent deploys to avoid resetting the running revision.')
param backendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Frontend container image (fully qualified). Same idea as backendImage.')
param frontendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Refresh job container image. Should normally match backendImage so the job entrypoint can run dist/jobs/refresh.js.')
param refreshJobImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var commonTags = {
  app: 'norsk-nettverk-v2'
  env: 'demo'
  costCenter: costCenterTag
}

// Container Registry — admin disabled. Container Apps will pull via managed
// identity with the AcrPull role.
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('${environmentName}acr', '-', '')
  location: location
  tags: commonTags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${environmentName}-logs'
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${environmentName}-appinsights'
  location: location
  tags: commonTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${environmentName}-env'
  location: location
  tags: commonTags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Storage account for the daily refresh job's snapshots + change feed. The
// backend Container App mounts the share at /mnt/data so the API can read
// what the Job writes. Shared-key access stays enabled because Container
// Apps env-storage uses the account key.
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: replace('${environmentName}sa', '-', '')
  location: location
  tags: commonTags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    // Tenant policy disallows shared-key access; we use Microsoft Entra
    // (managed identity + Storage Blob Data Contributor) instead.
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storage
  name: 'default'
}

resource dataContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'data'
  properties: {
    publicAccess: 'None'
  }
}

// User-assigned identity shared by both container apps so we only need to
// grant AcrPull once.
resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${environmentName}-pull-id'
  location: location
  tags: commonTags
}

// AcrPull role assignment scoped to the new ACR.
var acrPullRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)
resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, pullIdentity.id, 'AcrPull')
  scope: acr
  properties: {
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleId
  }
}

// Storage Blob Data Contributor for the workload identity so the backend
// app and the refresh job can read/write snapshot blobs without shared keys.
var blobDataContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)
resource blobDataAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, pullIdentity.id, 'StorageBlobDataContributor')
  scope: storage
  properties: {
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobDataContributorRoleId
  }
}

// Backend Container App — internal ingress only. The frontend Container App
// reaches it over the Container Apps Environment's internal DNS.
resource backendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${environmentName}-api'
  location: location
  tags: commonTags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  dependsOn: [
    acrPullAssignment
    blobDataAssignment
  ]
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: false
        targetPort: 3011
        allowInsecure: false
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          // Image is parameterised so re-deploying Bicep does not reset
          // the running revision back to the helloworld placeholder.
          image: backendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3011'
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT'
              value: storage.name
            }
            {
              name: 'AZURE_STORAGE_CONTAINER'
              value: dataContainer.name
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: pullIdentity.properties.clientId
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3011
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// Frontend Container App — public ingress, talks to backend over internal
// FQDN via API_URL env var (server components only — no NEXT_PUBLIC needed).
resource frontendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${environmentName}-web'
  location: location
  tags: commonTags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  dependsOn: [
    acrPullAssignment
  ]
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: frontendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            // Internal Container Apps Environment FQDN — only resolvable inside
            // the env. http (not https) on internal hop; public ingress terminates TLS.
            {
              name: 'API_URL'
              value: 'http://${backendApp.properties.configuration.ingress.fqdn}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// Daily refresh job — re-scans Brreg + Karantenenemnda, diffs against the
// Daily refresh job — re-scans Brreg + Karantenenemnda, diffs against the
// previous snapshot stored as JSON blobs in `${storage}/data/`, appends new
// entries to `changes.json`. Triggered by cron at 06:00 UTC (~08:00 local).
resource refreshJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${environmentName}-refresh-job'
  location: location
  tags: commonTags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  dependsOn: [
    acrPullAssignment
    blobDataAssignment
  ]
  properties: {
    environmentId: containerAppEnv.id
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 600
      replicaRetryLimit: 1
      scheduleTriggerConfig: {
        cronExpression: '0 6 * * *'
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'refresh'
          // Same image as the backend API; the job uses a different entrypoint
          // (node dist/jobs/refresh.js) rather than starting the HTTP server.
          image: refreshJobImage
          command: [
            'node'
          ]
          args: [
            'dist/jobs/refresh.js'
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT'
              value: storage.name
            }
            {
              name: 'AZURE_STORAGE_CONTAINER'
              value: dataContainer.name
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: pullIdentity.properties.clientId
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
        }
      ]
    }
  }
}

output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output backendAppName string = backendApp.name
output frontendAppName string = frontendApp.name
output backendInternalFqdn string = backendApp.properties.configuration.ingress.fqdn
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output pullIdentityId string = pullIdentity.id
output pullIdentityClientId string = pullIdentity.properties.clientId
output refreshJobName string = refreshJob.name
output storageAccountName string = storage.name
