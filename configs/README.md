# Example Deployment Configurations

This directory contains example deployment configurations for the Hysteria2 C2 panel.

## Configuration Files

### `example-configs.json`
Basic configurations with essential fields for quick deployment.

### `detailed-configs.json`
Full-featured configurations including bandwidth limits, auth secrets, and email notifications.

## Configuration Profiles

### 1. Basic Development
- **Purpose**: Testing and development
- **Provider**: DigitalOcean (NYC3)
- **Specs**: 1 vCPU, 1GB RAM
- **Cost**: ~$6/mo
- **Use Case**: Low-cost testing environment

### 2. Production Standard
- **Purpose**: Balanced production workload
- **Provider**: Hetzner (Falkenstein)
- **Specs**: 4 vCPU, 8GB RAM
- **Cost**: ~$7/mo
- **Use Case**: General production use, good performance-to-price

### 3. High Performance
- **Purpose**: Heavy traffic loads
- **Provider**: Vultr (New Jersey)
- **Specs**: 4 vCPU, 8GB RAM
- **Cost**: ~$40/mo
- **Use Case**: High-throughput applications

### 4. Budget Multi-Region
- **Purpose**: Redundant low-cost deployment
- **Provider**: AWS Lightsail (US East)
- **Specs**: 2 vCPU, 512MB RAM
- **Cost**: ~$3.50/mo per node
- **Use Case**: Deploy multiple nodes across regions for redundancy

### 5. Stealth Low Profile
- **Purpose**: Operational security
- **Provider**: DigitalOcean (Frankfurt)
- **Specs**: 1 vCPU, 2GB RAM
- **Cost**: ~$12/mo
- **Use Case**: Non-standard port (8443), EU region for privacy

## Configuration Fields

### Required Fields
- `name`: Unique identifier for the config
- `label`: Human-readable name
- `provider`: Cloud provider (digitalocean, hetzner, vultr, lightsail, azure)
- `region`: Provider-specific region code
- `size`: Instance size/plan
- `port`: Hysteria2 listen port (default 443)
- `obfsPassword**: Obfuscation password (min 8 characters)

### Optional Fields
- `domain`: Custom domain for TLS
- `email`: Email for Let's Encrypt notifications
- `tags`: Array of tags for organization
- `bandwidthUp`: Monthly upload limit
- `bandwidthDown`: Monthly download limit
- `authBackendSecret`: Secret for authentication backend (min 16 characters)
- `trafficStatsSecret`: Secret for traffic statistics (min 16 characters)

## Using These Configs

### Via UI
1. Navigate to Admin > Operations > Infrastructure
2. Click "Deploy New Node"
3. Manually enter values from a config preset

### Via API
```bash
curl -X POST /api/admin/operations/deploy \
  -H "Content-Type: application/json" \
  -d @configs/detailed-configs.json
```

### Programmatic Usage
```typescript
import { config } from './configs/detailed-configs.json'

// Use the production-standard config
const prodConfig = config.configs.find(c => c.name === 'production-standard')
```

## Security Notes

1. **Change secrets**: All example configs use placeholder passwords/secrets. Change these before deployment.
2. **Strong passwords**: Use at least 16 characters for auth secrets and 8+ for obfs passwords.
3. **Unique secrets**: Each deployment should have unique secrets.
4. **Domain recommended**: For production, use a custom domain with TLS.
5. **Port selection**: Standard port 443 is best for compatibility, but non-standard ports (8443) can help with stealth.

## Provider-Specific Notes

### DigitalOcean
- Regions: nyc1, nyc3, sfo3, ams3, sgp1, lon1, fra1, blr1, syd1
- Sizes: s-1vcpu-1gb, s-1vcpu-2gb, s-2vcpu-4gb, s-4vcpu-8gb

### Hetzner
- Regions: nbg1, fsn1, hel1, ash, hil, sin
- Sizes: cx22, cx32, cx42, cx52

### Vultr
- Regions: ewr, ord, dfw, lax, atl, sea, ams, lhr, fra, nrt, sgp, syd
- Sizes: vc2-1c-1gb, vc2-1c-2gb, vc2-2c-4gb, vc2-4c-8gb

### AWS Lightsail
- Regions: us-east-1, us-east-2, us-west-2, eu-west-1, eu-west-2, eu-central-1
- Sizes: nano_3_0, micro_3_0, small_3_0, medium_3_0

### Azure
- Regions: eastus, eastus2, westus2, westus3, centralus, northeurope, westeurope
- Sizes: Standard_B1s, Standard_B1ms, Standard_B2s, Standard_B2ms, Standard_B4ms
