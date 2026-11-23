import { spawn } from 'child_process'
import readline from 'readline'

const server = spawn('node', ['index.mjs'], {
  cwd: 'd:\\spss\\mcp-server',
  stdio: ['pipe', 'pipe', 'inherit'],
})

const rl = readline.createInterface({
  input: server.stdout,
  terminal: false,
})

let step = 0

function send(msg) {
  server.stdin.write(JSON.stringify(msg) + '\n')
}

rl.on('line', (line) => {
  const res = JSON.parse(line)
  console.log(`[RESPONSE ${step}] ID: ${res.id}`)

  if (step === 0) {
    // Check initialize response
    if (res.result?.serverInfo?.name === 'spss-statistics-mcp') {
      console.log('✓ Initialize OK!')
      step++
      send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
    } else {
      console.error('Init failed', res)
      process.exit(1)
    }
  } else if (step === 1) {
    // Check tools list
    const tools = res.result?.tools || []
    console.log(`✓ Tools count: ${tools.length}`)
    if (tools.length >= 8) {
      console.log('✓ Tools list OK!')
      step++
      // Test running regression tool
      send({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'spss_run_regression',
          arguments: {
            dependent: 'Y_Keputusan',
            independents: ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'],
          },
        },
      })
    } else {
      console.error('Tools list unexpected', res)
      process.exit(1)
    }
  } else if (step === 2) {
    // Check regression tool call output
    const text = res.result?.content?.[0]?.text || ''
    if (text.includes('REGRESI LINIER BERGANDA') && text.includes('Uji F')) {
      console.log('✓ spss_run_regression tool execution OK!')
      step++
      // Test validity & reliability tool
      send({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'spss_run_validity_reliability',
          arguments: {
            items: ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'],
          },
        },
      })
    } else {
      console.error('Regression output unexpected', res)
      process.exit(1)
    }
  } else if (step === 3) {
    const text = res.result?.content?.[0]?.text || ''
    if (text.includes('VALIDITAS') && text.includes('Cronbach\'s Alpha')) {
      console.log('✓ spss_run_validity_reliability tool execution OK!')
      console.log('\n🎉 ALL MCP SERVER TESTS PASSED SUCCESSFULLY!')
      server.kill()
      process.exit(0)
    } else {
      console.error('Validity output unexpected', res)
      process.exit(1)
    }
  }
})

// Step 0: send initialize
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
})
