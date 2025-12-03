// Smart Apply - Bicep Parameters
// Usage: az deployment sub create --location westeurope --template-file main.bicep --parameters main.bicepparam

using './main.bicep'

// Environment configuration
param environment = 'prod'
param location = 'westeurope'
param appName = 'smartapply'

// Database credentials (CHANGE THESE!)
param postgresAdminUsername = 'sqladmin'
param postgresAdminPassword = '' // TODO: Set via command line or Key Vault reference

// Security secrets (CHANGE THESE!)
param jwtSecret = '' // TODO: Generate with: openssl rand -base64 64
param refreshTokenSecret = '' // TODO: Generate with: openssl rand -base64 64

// GitHub configuration
param repositoryUrl = 'https://github.com/Ar1anit/smart-apply'
param repositoryBranch = 'mvp'

// Azure OpenAI configuration
param openAiDeploymentName = 'gpt-4.1'
param openAiEndpoint = 'https://smart-apply-test-ai.services.ai.azure.com/'
param openAiApiKey = 'BYYHbmL2SsdfPRXnnHA2VuKW8GymK3nEcAZrqIiL3eRlqfndij7TJQQJ99BKACYeBjFXJ3w3AAAAACOGzQKD'
param openAiApiVersion = '2024-10-21'
param enableAzureOpenAI = true

// Azure AI Foundry Agents configuration
param projectEndpoint = 'https://smart-apply-test-ai.services.ai.azure.com/api/projects/smartApplytest'
param cvWriterAgentId = 'asst_ZLNYVwISUTw93NA2Yq53ZW1G'
param clWriterAgentId = 'asst_wXDlhHUsjgnaF6MPOsoSPoCy'
param atsAgentId = 'asst_Jn2tlDlX3ZhzVIQhhw5Qa57W'
param enableAgentParser = true
param agentMaxSteps = 10
param agentTimeout = 30000
