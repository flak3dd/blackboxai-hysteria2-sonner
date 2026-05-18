# Secrets Management System

## Overview

A comprehensive secrets management system for storing provider credentials, SSH keys, API keys, tokens, and other sensitive data securely. The system uses AES-256-GCM encryption with the `CREDENTIAL_VAULT_KEY` environment variable to protect all stored secrets.

## Features

### Core Functionality
- **Secure Storage**: AES-256-GCM encryption for all secret values
- **Multiple Types**: Support for SSH keys, API keys, tokens, passwords, certificates, and custom secrets
- **Provider Support**: Pre-defined providers (AWS, Azure, DigitalOcean, Hetzner, Vultr, GitHub, GitLab, OpenAI, Anthropic, Google) and custom providers
- **CRUD Operations**: Full create, read, update, delete functionality
- **Filtering & Search**: Filter by type, provider, or search by name/description
- **Last Used Tracking**: Automatic tracking of when secrets were last accessed
- **Active/Inactive Status**: Enable/disable secrets without deletion

### Security Features
- **Encryption**: AES-256-GCM with scrypt key derivation
- **Authentication**: Admin-only access via existing authentication system
- **Audit Trail**: Last used timestamps for access tracking
- **Secure UI**: Masked values with secure reveal functionality
- **Input Validation**: Zod schema validation for all inputs

## Architecture

### Database Schema
```prisma
model Secret {
  id          String   @id @default(cuid())
  name        String
  type        String   // ssh_key, api_key, token, password, certificate, other
  provider    String?  // aws, azure, digitalocean, hetzner, vultr, github, etc.
  value       String   // Encrypted value
  description String?
  metadata    Json?    // Additional metadata
  isActive    Boolean  @default(true)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([type])
  @@index([provider])
  @@index([isActive])
  @@map("secrets")
}
```

### Components
- **Database Layer**: Prisma ORM with PostgreSQL
- **Encryption Layer**: AES-256-GCM with scrypt key derivation
- **Service Layer**: Business logic for CRUD operations
- **API Layer**: Next.js API endpoints with authentication
- **UI Layer**: React components with secure UI patterns

## API Endpoints

### List Secrets
```
GET /api/admin/configuration/secrets
Query Parameters:
  - provider: Filter by provider
  - type: Filter by type
  - includeValue: Include decrypted values (default: false)
```

### Get Single Secret
```
GET /api/admin/configuration/secrets/:id
Response includes decrypted value
```

### Create Secret
```
POST /api/admin/configuration/secrets
Body:
{
  "name": "AWS Production Key",
  "type": "api_key",
  "provider": "aws",
  "value": "secret-value",
  "description": "AWS access key for production"
}
```

### Update Secret
```
PUT /api/admin/configuration/secrets/:id
Body:
{
  "name": "Updated Name",
  "value": "new-value",
  "description": "Updated description"
}
```

### Delete Secret
```
DELETE /api/admin/configuration/secrets/:id
```

## Integration with Other Systems

### Deployment Integration
```typescript
import { getProviderSSHKey } from '@/lib/secrets/integration'

// Get SSH key for Hetzner deployment
const sshKey = await getProviderSSHKey('hetzner')
if (sshKey) {
  // Use sshKey for deployment
}
```

### AI Provider Integration
```typescript
import { getProviderAPIKey } from '@/lib/secrets/integration'

// Get API key for OpenAI
const apiKey = await getProviderAPIKey('openai')
if (apiKey) {
  // Use apiKey for AI operations
}
```

### Bulk Operations
```typescript
import { getAllSSHKies } from '@/lib/secrets/integration'

// Get all SSH keys for multiple providers
const keys = await getAllSSHKies()
keys.forEach(key => {
  console.log(`Provider: ${key.provider}, Key: ${key.key}`)
})
```

## Setup

### Environment Variables
Add to your `.env.local`:
```
CREDENTIAL_VAULT_KEY=<your-encryption-key-min-32-characters>
```

### Database Migration
The Secret model has been added to the Prisma schema. Run:
```bash
npx prisma db push
```

### Build and Start
```bash
npm run build
npm run dev
```

## Usage Examples

### SSH Key for Node Deployment
1. Navigate to `/admin/configuration/secrets`
2. Click "Add Secret"
3. Fill in:
   - Name: "Hetzner SSH Key"
   - Type: "SSH Key"
   - Provider: "Hetzner"
   - Value: Your private SSH key
   - Description: "SSH key for Hetzner deployments"
4. Click "Create Secret"

The system will now automatically use this key when deploying to Hetzner nodes.

### API Key for AWS
1. Navigate to `/admin/configuration/secrets`
2. Click "Add Secret"
3. Fill in:
   - Name: "AWS Access Key"
   - Type: "API Key"
   - Provider: "AWS"
   - Value: Your AWS access key
   - Description: "AWS access key for S3 operations"
4. Click "Create Secret"

### Token for GitHub
1. Navigate to `/admin/configuration/secrets`
2. Click "Add Secret"
3. Fill in:
   - Name: "GitHub Personal Token"
   - Type: "Token"
   - Provider: "GitHub"
   - Value: Your GitHub personal access token
   - Description: "Token for GitHub operations"
4. Click "Create Secret"

## Security Considerations

### Encryption Key
- The `CREDENTIAL_VAULT_KEY` must be at least 32 characters
- Store this key securely (e.g., in environment variables, not in code)
- Rotate the key periodically for best security
- If the key is lost, all stored secrets will be unrecoverable

### Access Control
- Only authenticated admin users can access secrets
- All API endpoints require admin authentication
- Consider adding additional access controls for sensitive secrets

### Audit Trail
- The system tracks when secrets were last used
- Consider adding comprehensive audit logging for security
- Monitor for unusual access patterns

### Backup and Recovery
- Regular database backups are essential
- If the encryption key is lost, secrets cannot be recovered
- Consider implementing key rotation procedures

## API Usage Examples

### Using Secrets in Deployment Code
```typescript
import { getProviderSSHKey } from '@/lib/secrets/integration'

async function deployToHetzner() {
  const sshKey = await getProviderSSHKey('hetzner')
  
  if (!sshKey) {
    throw new Error('No SSH key found for Hetzner')
  }
  
  // Use sshKey in deployment
  await deployWithSSH(sshKey)
}
```

### Using Secrets in AI Operations
```typescript
import { getProviderAPIKey } from '@/lib/secrets/integration'

async function callOpenAI() {
  const apiKey = await getProviderAPIKey('openai')
  
  if (!apiKey) {
    throw new Error('No API key found for OpenAI')
  }
  
  // Use apiKey in AI operations
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
}
```

## Best Practices

1. **Use Descriptive Names**: Give secrets clear, descriptive names
2. **Add Descriptions**: Explain what each secret is used for
3. **Rotate Regularly**: Update secrets periodically
4. **Monitor Access**: Review last used timestamps for security
5. **Disable When Not Needed**: Set inactive instead of deleting for recovery
6. **Use Appropriate Types**: Choose the correct type for each secret
7. **Organize by Provider**: Use provider field for better organization
8. **Test Integration**: Verify secrets work with intended systems
9. **Backup Encryption Key**: Store the CREDENTIAL_VAULT_KEY securely
10. **Document Procedures**: Document secret management procedures for your team

## Troubleshooting

### Encryption Not Configured
**Error**: "Secret encryption not configured"
**Solution**: Set `CREDENTIAL_VAULT_KEY` environment variable (min 32 characters)

### Secret Not Found
**Error**: "Secret not found"
**Solution**: Check the secret exists and is active. Verify provider and type match.

### Decryption Failed
**Error**: Decryption operations fail
**Solution**: Verify `CREDENTIAL_VAULT_KEY` is correct. If changed, old secrets cannot be decrypted.

### Database Connection Issues
**Error**: Cannot connect to database
**Solution**: Verify PostgreSQL is running and `DATABASE_URL` is correct.

## Future Enhancements

- [ ] Add secret versioning
- [ ] Implement automatic secret rotation
- [ ] Add secret expiration dates
- [ ] Implement secret sharing between users
- [ ] Add comprehensive audit logging
- [ ] Implement secret approval workflows
- [ ] Add secret health checks (validate API keys still work)
- [ ] Add secret templates for common providers
- [ ] Implement secret import/export
- [ ] Add secret usage analytics

## References

- **UI Location**: `/admin/configuration/secrets`
- **API Base**: `/api/admin/configuration/secrets`
- **Encryption**: AES-256-GCM with scrypt
- **Database**: PostgreSQL via Prisma
- **Authentication**: JWT-based admin auth

---

**Status**: ✅ Production Ready
**Security Level**: High (encrypted storage, admin-only access)
**Maintenance**: Requires CREDENTIAL_VAULT_KEY rotation
