/**
 * Test Operational Guide via AI Assistant API
 *
 * This script executes each step from the operational guide using the AI Assistant chat API.
 * It authenticates as admin, then sends prompts to the AI assistant to execute each step.
 */

const http = require('http')

const API_BASE = 'http://localhost:3000'
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'DPanel@2024!Secure'

let cookies = ''

// Helper function to make HTTP requests
function makeRequest(path, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE)
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (cookies) {
      options.headers['Cookie'] = cookies
    }

    const req = http.request(options, (res) => {
      let body = ''
      // Extract cookies from response
      if (res.headers['set-cookie']) {
        cookies = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
      }
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(body)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`))
          }
        } catch (e) {
          resolve(body)
        }
      })
    })

    req.on('error', reject)

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

// Login to get auth token
async function login() {
  console.log('\n=== Logging in as admin ===')
  try {
    const response = await makeRequest('/api/auth/login', 'POST', {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    })
    console.log('✓ Login successful')
    console.log('  Cookies set:', cookies.substring(0, 50) + '...')
    return true
  } catch (error) {
    console.error('✗ Login failed:', error.message)
    return false
  }
}

// Execute AI Assistant prompt
async function executeAIAssistant(conversationId, message) {
  const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  try {
    const response = await makeRequest('/api/admin/automation/ai/chat', 'POST', {
      conversationId,
      message,
      clientMessageId,
    })
    return response
  } catch (error) {
    console.error('✗ AI Assistant error:', error.message)
    throw error
  }
}

// Step 1: Setup & Installation
async function step1_Setup() {
  console.log('\n=== Step 1: Setup & Installation ===')
  try {
    const response = await executeAIAssistant('setup-check', 'Check system status and verify all prerequisites for the Hysteria2 C2 framework are properly configured.')
    console.log('✓ Step 1 completed')
    console.log('  Response:', response.messages?.[response.messages.length - 1]?.content?.substring(0, 200) + '...')
    return true
  } catch (error) {
    console.error('✗ Step 1 failed:', error.message)
    return false
  }
}

// Step 2: Hysteria 2 Node Creation
async function step2_NodeCreation() {
  console.log('\n=== Step 2: Hysteria 2 Node Creation ===')
  try {
    const response = await executeAIAssistant('node-creation', 'List all existing Hysteria2 nodes and their status. Then create a test node named "test-guide-node" with hostname "192.0.2.100" in region "test-region" with tags ["test", "guide"].')
    console.log('✓ Step 2 completed')
    console.log('  Response:', response.messages?.[response.messages.length - 1]?.content?.substring(0, 200) + '...')
    return true
  } catch (error) {
    console.error('✗ Step 2 failed:', error.message)
    return false
  }
}

// Step 3: Client Config Generation
async function step3_ConfigGeneration() {
  console.log('\n=== Step 3: Client Config Generation ===')
  try {
    const response = await executeAIAssistant('config-generation', 'Generate a Hysteria2 client configuration with salamander obfuscation, CDN masquerade, port 443, and bandwidth limits of 100 Mbps upload / 500 Mbps download.')
    console.log('✓ Step 3 completed')
    console.log('  Response:', response.messages?.[response.messages.length - 1]?.content?.substring(0, 200) + '...')
    return true
  } catch (error) {
    console.error('✗ Step 3 failed:', error.message)
    return false
  }
}

// Step 8: AI Assistants
async function step8_AIAssistants() {
  console.log('\n=== Step 8: AI Assistants ===')
  try {
    const response = await executeAIAssistant('ai-assistants-test', 'Run a diagnostic check on the AI assistant system and verify all tools are functioning correctly.')
    console.log('✓ Step 8 completed')
    console.log('  Response:', response.messages?.[response.messages.length - 1]?.content?.substring(0, 200) + '...')
    return true
  } catch (error) {
    console.error('✗ Step 8 failed:', error.message)
    return false
  }
}

// Step 10: Infrastructure Monitoring
async function step10_InfrastructureMonitoring() {
  console.log('\n=== Step 10: Infrastructure Monitoring ===')
  try {
    const response = await executeAIAssistant('infrastructure-monitoring', 'Analyze current infrastructure status including node health, traffic patterns, and system metrics.')
    console.log('✓ Step 10 completed')
    console.log('  Response:', response.messages?.[response.messages.length - 1]?.content?.substring(0, 200) + '...')
    return true
  } catch (error) {
    console.error('✗ Step 10 failed:', error.message)
    return false
  }
}

// Main execution
async function main() {
  console.log('Starting Operational Guide Tests via AI Assistant API...')

  // Login first
  const loggedIn = await login()
  if (!loggedIn) {
    console.error('Failed to login. Exiting.')
    process.exit(1)
  }

  // Execute steps
  const results = {
    step1: await step1_Setup(),
    step2: await step2_NodeCreation(),
    step3: await step3_ConfigGeneration(),
    step8: await step8_AIAssistants(),
    step10: await step10_InfrastructureMonitoring(),
  }

  console.log('\n=== Test Results ===')
  Object.entries(results).forEach(([step, passed]) => {
    console.log(`${step}: ${passed ? '✓ PASSED' : '✗ FAILED'}`)
  })

  const allPassed = Object.values(results).every((r) => r)
  console.log(`\nOverall: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`)

  process.exit(allPassed ? 0 : 1)
}

main()