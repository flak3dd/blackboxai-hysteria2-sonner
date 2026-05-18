#!/bin/bash

# Deploy 5 nodes using the example configurations
# Panel URL from environment

PANEL_URL="https://panel.anzstaff-club.au"

echo "Deploying 5 nodes to $PANEL_URL..."
echo ""

# 1. Basic Development
echo "1. Deploying Basic Development (DigitalOcean NYC3)..."
curl -X POST "$PANEL_URL/api/admin/operations/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "digitalocean",
    "region": "nyc3",
    "size": "s-1vcpu-1gb",
    "name": "dev-hysteria-01",
    "port": 443,
    "obfsPassword": "dev-pass-12345678901",
    "email": "admin@example.com",
    "panelUrl": "'$PANEL_URL'",
    "tags": ["development", "testing"],
    "bandwidthUp": "1TB",
    "bandwidthDown": "1TB",
    "authBackendSecret": "dev-auth-secret-16chars!!",
    "trafficStatsSecret": "dev-stats-secret-16chars!!"
  }' | jq '.'
echo ""

# 2. Production Standard
echo "2. Deploying Production Standard (Hetzner Falkenstein)..."
curl -X POST "$PANEL_URL/api/admin/operations/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "hetzner",
    "region": "fsn1",
    "size": "cx32",
    "name": "prod-hysteria-01",
    "port": 443,
    "obfsPassword": "prod-secure-pass-789xyz",
    "email": "ops@example.com",
    "panelUrl": "'$PANEL_URL'",
    "tags": ["production", "standard"],
    "bandwidthUp": "20TB",
    "bandwidthDown": "20TB",
    "authBackendSecret": "prod-auth-secret-16chars!!",
    "trafficStatsSecret": "prod-stats-secret-16chars!!"
  }' | jq '.'
echo ""

# 3. High Performance
echo "3. Deploying High Performance (Vultr New Jersey)..."
curl -X POST "$PANEL_URL/api/admin/operations/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "vultr",
    "region": "ewr",
    "size": "vc2-4c-8gb",
    "name": "perf-hysteria-01",
    "port": 443,
    "obfsPassword": "high-perf-pass-abc123def",
    "email": "perf@example.com",
    "panelUrl": "'$PANEL_URL'",
    "tags": ["production", "high-performance"],
    "bandwidthUp": "10TB",
    "bandwidthDown": "10TB",
    "authBackendSecret": "perf-auth-secret-16chars!!",
    "trafficStatsSecret": "perf-stats-secret-16chars!!"
  }' | jq '.'
echo ""

# 4. Budget Multi-Region (AWS Lightsail)
echo "4. Deploying Budget Multi-Region (AWS Lightsail US East)..."
curl -X POST "$PANEL_URL/api/admin/operations/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "lightsail",
    "region": "us-east-1",
    "size": "nano_3_0",
    "name": "budget-hysteria-01",
    "port": 443,
    "obfsPassword": "budget-pass-xyz789abc",
    "email": "budget@example.com",
    "panelUrl": "'$PANEL_URL'",
    "tags": ["budget", "multi-region"],
    "bandwidthUp": "1TB",
    "bandwidthDown": "1TB",
    "authBackendSecret": "budget-auth-secret-16!!",
    "trafficStatsSecret": "budget-stats-secret-16!!"
  }' | jq '.'
echo ""

# 5. Stealth Low Profile
echo "5. Deploying Stealth Low Profile (DigitalOcean Frankfurt)..."
curl -X POST "$PANEL_URL/api/admin/operations/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "digitalocean",
    "region": "fra1",
    "size": "s-1vcpu-2gb",
    "name": "stealth-hysteria-01",
    "port": 8443,
    "obfsPassword": "stealth-pass-secure999xyz",
    "email": "stealth@example.com",
    "panelUrl": "'$PANEL_URL'",
    "tags": ["stealth", "low-profile"],
    "bandwidthUp": "2TB",
    "bandwidthDown": "2TB",
    "authBackendSecret": "stealth-auth-secret-16!!",
    "trafficStatsSecret": "stealth-stats-secret-16!!"
  }' | jq '.'
echo ""

echo "Deployment requests submitted!"
echo "Check the deployments status at: $PANEL_URL/admin/operations/infrastructure"
