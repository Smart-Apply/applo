#!/bin/bash

# Azure OIDC Setup for GitHub Actions
# This script creates an Azure AD App Registration with Federated Identity Credentials for GitHub Actions

set -e

echo "🚀 Setting up Azure OIDC for GitHub Actions..."
echo ""

# Configuration
REPO_OWNER="Ar1anit"
REPO_NAME="smart-apply"
APP_NAME="github-${REPO_NAME}-deploy"
RESOURCE_GROUP="smartapply-dev-rg"

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "📋 Configuration:"
echo "  Repository: ${REPO_OWNER}/${REPO_NAME}"
echo "  App Name: ${APP_NAME}"
echo "  Resource Group: ${RESOURCE_GROUP}"
echo "  Subscription: ${SUBSCRIPTION_ID}"
echo "  Tenant: ${TENANT_ID}"
echo ""

# Check if resource group exists
if ! az group show --name $RESOURCE_GROUP &>/dev/null; then
    echo "❌ Resource group '${RESOURCE_GROUP}' does not exist!"
    echo "   Create it first with: az group create --name ${RESOURCE_GROUP} --location eastus"
    exit 1
fi

# Create App Registration
echo "1️⃣  Creating App Registration..."
APP_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --query appId -o tsv)

echo "   ✅ App created with ID: ${APP_ID}"

# Create Service Principal
echo "2️⃣  Creating Service Principal..."
az ad sp create --id $APP_ID &>/dev/null
OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)
echo "   ✅ Service Principal created with Object ID: ${OBJECT_ID}"

# Wait a bit for propagation
echo "   ⏳ Waiting for propagation..."
sleep 10

# Assign Contributor role to Resource Group
echo "3️⃣  Assigning Contributor role to Resource Group..."
az role assignment create \
    --role Contributor \
    --assignee $APP_ID \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
    &>/dev/null
echo "   ✅ Contributor role assigned"

# Assign AcrPush role if ACR exists
ACR_NAME=$(az acr list --resource-group $RESOURCE_GROUP --query "[0].name" -o tsv 2>/dev/null || echo "")
if [ -n "$ACR_NAME" ]; then
    echo "4️⃣  Assigning AcrPush role to Container Registry..."
    ACR_ID=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query id -o tsv)
    az role assignment create \
        --role AcrPush \
        --assignee $APP_ID \
        --scope $ACR_ID \
        &>/dev/null
    echo "   ✅ AcrPush role assigned to ${ACR_NAME}"
else
    echo "4️⃣  ⚠️  No Container Registry found, skipping AcrPush role"
fi

# Create Federated Credential for main branch
echo "5️⃣  Creating Federated Credential for main branch..."
az ad app federated-credential create \
    --id $APP_ID \
    --parameters "{
        \"name\": \"github-main-branch\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:${REPO_OWNER}/${REPO_NAME}:ref:refs/heads/main\",
        \"audiences\": [\"api://AzureADTokenExchange\"],
        \"description\": \"GitHub Actions deployment from main branch\"
    }" &>/dev/null
echo "   ✅ Federated credential created for main branch"

# Create Federated Credential for pull requests
echo "6️⃣  Creating Federated Credential for pull requests..."
az ad app federated-credential create \
    --id $APP_ID \
    --parameters "{
        \"name\": \"github-pull-requests\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:${REPO_OWNER}/${REPO_NAME}:pull_request\",
        \"audiences\": [\"api://AzureADTokenExchange\"],
        \"description\": \"GitHub Actions for pull requests\"
    }" &>/dev/null
echo "   ✅ Federated credential created for pull requests"

# Create Federated Credential for workflow_dispatch
echo "7️⃣  Creating Federated Credential for manual workflows..."
az ad app federated-credential create \
    --id $APP_ID \
    --parameters "{
        \"name\": \"github-workflow-dispatch\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:${REPO_OWNER}/${REPO_NAME}:environment:production\",
        \"audiences\": [\"api://AzureADTokenExchange\"],
        \"description\": \"GitHub Actions manual workflow dispatch\"
    }" &>/dev/null || echo "   ⚠️  Environment-based credential failed (optional)"

echo ""
echo "✅ Azure OIDC setup complete!"
echo ""
echo "📝 Add these secrets to your GitHub repository:"
echo "   (Settings > Secrets and variables > Actions > New repository secret)"
echo ""
echo "   AZURE_CLIENT_ID: ${APP_ID}"
echo "   AZURE_TENANT_ID: ${TENANT_ID}"
echo "   AZURE_SUBSCRIPTION_ID: ${SUBSCRIPTION_ID}"
echo ""
echo "🔗 GitHub Secrets URL:"
echo "   https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"
echo ""
echo "🎉 Done! You can now run GitHub Actions workflows with Azure OIDC authentication."
