using './main.bicep'

param environment = 'dev'
param location = 'northeurope'
param appName = 'smartapply'

// Database credentials
param postgresAdminUsername = 'sqladmin'
param postgresAdminPassword = 'dfBVip7txci63GcVReig9/dedn/nxb/9BcVwGeQZg3k='

// Security secrets
param jwtSecret = 'WYv8z0VcI2+02/kl5LCoDLpNGL8zhbogIe658At7nWEBR3/v8R0pt0Bw6xM5WsGb7zlOXMe9dIfMw70BQ0/ctg=='
param refreshTokenSecret = 'Y0S1cAgNO6NQNXXTX/Y9UvWj0pJn7duQ73dFHHGmW6umrolDu/U5VCBcpYV6JWC9chAOHz2XLB/f5XBOlHxHkw=='

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
