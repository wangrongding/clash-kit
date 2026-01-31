import axios from 'axios'
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONFIG_PATH = path.join(__dirname, '../config.yaml')

export function getProxyPort() {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8')
    const config = YAML.parse(configContent)
    const httpPort = config['port'] || config['mixed-port']
    const socksPort = config['socks-port']
    return { http: httpPort, socks: socksPort }
  } catch (error) {
    throw new Error(`读取配置文件失败: ${error.message}`)
  }
}

export function getApiBase() {
  let apiBase = 'http://127.0.0.1:9090'
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configContent = fs.readFileSync(CONFIG_PATH, 'utf8')
      const config = YAML.parse(configContent)
      if (config['external-controller']) {
        let host = config['external-controller']
        // 处理 :9090 这种情况
        if (host.startsWith(':')) {
          host = '127.0.0.1' + host
        }
        // 处理 0.0.0.0
        host = host.replace('0.0.0.0', '127.0.0.1')
        apiBase = `http://${host}`
      }
    }
  } catch (e) {
    console.error('读取配置文件失败，使用默认 API 地址', e)
  }
  return apiBase
}

const API_SECRET = 'your-strong-secret-key' // 实际项目中应该从 config 读取

const headers = {
  Authorization: `Bearer ${API_SECRET}`,
}

// 获取所有代理节点信息
export async function getProxies() {
  try {
    const res = await axios.get(`${getApiBase()}/proxies`, { headers })
    return res.data.proxies
  } catch (err) {
    throw new Error(`
      无法连接到 Clash API: ${err.message}
      
      请确保 Clash 正在运行，并且配置文件中的 external-controller 已正确设置。
      你可以通过 ck status 命令检查状态。
    `)
  }
}

export async function switchProxy(groupName, proxyName) {
  try {
    await axios.put(`${getApiBase()}/proxies/${encodeURIComponent(groupName)}`, { name: proxyName }, { headers })
  } catch (err) {
    throw new Error(`切换节点失败: ${err.message}`)
  }
}

export async function getProxyDelay(proxyName, testUrl = 'http://www.gstatic.com/generate_204') {
  try {
    const res = await axios.get(`${getApiBase()}/proxies/${encodeURIComponent(proxyName)}/delay`, {
      params: {
        timeout: 5000,
        url: testUrl,
      },
      headers,
    })
    return res.data.delay
  } catch (err) {
    return -1 // 超时或失败
  }
}

export async function getConfig() {
  try {
    const res = await axios.get(`${getApiBase()}/configs`, { headers })
    return res.data
  } catch (err) {
    throw new Error(`获取配置失败: ${err.message}`)
  }
}
// 重新加载基本配置，必须发送数据，URL 需携带 ?force=true 强制执行
export async function reloadBaseConfig() {
  try {
    const res = await axios.put(`${getApiBase()}/configs?force=true`, {}, { headers })
  } catch (err) {
    throw new Error(`重新加载配置失败: ${err.message}`)
  }
}

// 获取策略组信息
export async function getProxyGroups() {
  try {
    const res = await axios.get(`${getApiBase()}/group`, { headers })
    return res.data
  } catch (err) {
    throw new Error(`获取策略组失败: ${err.message}`)
  }
}

// 获取所有代理集合的所有信息
export async function getProxyProviders() {
  try {
    const res = await axios.get(`${getApiBase()}/providers/proxies`, { headers })
    return res.data
  } catch (err) {
    throw new Error(`获取代理提供者失败: ${err.message}`)
  }
}

// 获取规则信息
export async function getRules() {
  try {
    const res = await axios.get(`${getApiBase()}/rules`, { headers })
    return res.data
  } catch (err) {
    throw new Error(`获取规则失败: ${err.message}`)
  }
}

// 获取连接信息 /connections
export async function getConnections() {
  try {
    const res = await axios.get(`${getApiBase()}/connections`, { headers })
    return res.data
  } catch (err) {
    throw new Error(`获取连接信息失败: ${err.message}`)
  }
}

// 域名解析信息 /dns/query
export async function getDnsQueries(name, type = 'A') {
  try {
    const res = await axios.get(`${getApiBase()}/dns/query`, {
      params: { name, type },
      headers,
    })
    return res.data
  } catch (err) {
    throw new Error(`获取域名解析信息失败: ${err.message}`)
  }
}

export async function reloadConfig(configPath) {
  try {
    // Clash API: PUT /configs
    // payload: { path: '/absolute/path/to/config.yaml' }
    await axios.put(`${getApiBase()}/configs?force=true`, { path: configPath }, { headers })
  } catch (err) {
    throw new Error(`重载配置失败: ${err.message}`)
  }
}

export async function isClashRunning() {
  try {
    // 使用较短的超时时间快速检查
    await axios.get(`${getApiBase()}/version`, { timeout: 200 })
    return true
  } catch (err) {
    return false
  }
}
