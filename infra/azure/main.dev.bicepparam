using './main.bicep'

param environment = 'dev'
param location = 'northeurope'
param appName = 'smartapply'

// Database credentials
param postgresAdminUsername = 'sqladmin'
param postgresAdminPassword = '1ZQ6Ik/KX8zA6/ocAuiZwztK+7Pt2JsIgXckrMZxCGQ='

// Security secrets
param jwtSecret = 'lrAtaqdDFU46X0hw1c93KaqPo98f4GrlUOXbB3+4zu90OvC0Ki1LGZhdiFL4jXzEZjaHT71Mu/MocXTDYJftAg=='
param refreshTokenSecret = 'VrWLdRd37q4x8xSo4Mr1MqVlvYXQSYkZFSCd6ogN6/q1xYh5vZ/bChTu8F7KVeQIsQt3/trADPxRDbIrX9qfvw=='

// Azure OpenAI & AI Foundry Configuration
param openAiDeploymentName = 'gpt-4.1'
param openAiEndpoint = 'https://smart-apply-test-ai.services.ai.azure.com/'
param openAiApiKey = 'BYYHbmL2SsdfPRXnnHA2VuKW8GymK3nEcAZrqIiL3eRlqfndij7TJQQJ99BKACYeBjFXJ3w3AAAAACOGzQKD'
param openAiApiVersion = '2024-10-21'
param projectEndpoint = 'https://smart-apply-test-ai.services.ai.azure.com/api/projects/smartApplytest'
param cvWriterAgentId = 'asst_ZLNYVwISUTw93NA2Yq53ZW1G'
param clWriterAgentId = 'asst_wXDlhHUsjgnaF6MPOsoSPoCy'
param atsAgentId = 'asst_Jn2tlDlX3ZhzVIQhhw5Qa57W'
param enableAgentParser = true
param agentMaxSteps = 10
param agentTimeout = 30000
param enableAzureOpenAI = true
