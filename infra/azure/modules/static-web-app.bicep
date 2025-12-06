// Static Web App Module (Frontend)
@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Application name')
param appName string

@description('API URL for backend connection')
param apiUrl string

@description('GitHub repository URL')
param repositoryUrl string

@description('GitHub branch name')
param repositoryBranch string

@description('Resource tags')
param tags object

var staticWebAppName = '${appName}-${environment}-web'

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: repositoryBranch
    buildProperties: {
      appLocation: '/apps/web'
      apiLocation: ''
      outputLocation: ''
      appBuildCommand: 'npm run build'
      apiBuildCommand: ''
      skipGithubActionWorkflowGeneration: true // We manage workflow ourselves
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
  }
}

// Configure app settings (environment variables)
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    NEXT_PUBLIC_API_URL: apiUrl
  }
}

output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output url string = 'https://${staticWebApp.properties.defaultHostname}'
