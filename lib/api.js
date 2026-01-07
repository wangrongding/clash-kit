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

export async function getProxies() {
  try {
    const res = await axios.get(`${getApiBase()}/proxies`, { headers })
    return res.data.proxies
  } catch (err) {
    throw new Error(`
      无法连接到 Clash API: ${err.message}
      
      请确保 Clash 正在运行并且 API 密钥正确设置。
      你可以通过 clash status 命令检查状态。
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

export async function getProxyDelay(proxyName) {
  try {
    const res = await axios.get(`${getApiBase()}/proxies/${encodeURIComponent(proxyName)}/delay`, {
      params: {
        timeout: 5000,
        url: 'http://www.gstatic.com/generate_204',
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

export async function reloadConfig(configPath) {
  try {
    // Clash API: PUT /configs
    // payload: { path: '/absolute/path/to/config.yaml' }
    await axios.put(`${getApiBase()}/configs?force=true`, { path: configPath }, { headers })
  } catch (err) {
    throw new Error(`重载配置失败: ${err.message}`)
  }
}
