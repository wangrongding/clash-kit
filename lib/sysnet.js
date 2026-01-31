import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const HELPER_BIN = path.join(__dirname, '../bin/dns-helper')

/**
 * 获取 macOS 当前主要的网络服务名称 (Wi-Fi, Ethernet 等)
 */
function getMainNetworkService() {
  try {
    // 这是一个简单的方法，通常第一行是默认路由接口
    // networksetup -listnetworkserviceorder
    // 更精准的方法是 route get default 但输出解析较复杂
    // 这里我们先假设最常见的几种情况
    const output = execSync('networksetup -listallnetworkservices', { encoding: 'utf-8' })
    const services = output.split('\n').filter(s => s && !s.includes('An asterisk'))

    // 优先尝试 Wi-Fi 和 Ethernet
    const wifi = services.find(s => s === 'Wi-Fi')
    const ethernet = services.find(s => s.includes('Ethernet') || s.includes('LAN'))

    // 简单粗暴：优先返回 Wi-Fi，其次 Ethernet，最后第一个
    // TODO: 更严谨的做法是检测哪个接口有 IP 且是 default route
    return wifi || ethernet || services[0]
  } catch (e) {
    console.error('获取网络服务失败:', e)
    return null
  }
}

/**
 * 设置系统 DNS
 * @param {string[]} servers DNS 服务器列表
 */
export function setDNS(servers) {
  if (process.platform !== 'darwin') {
    return { success: true, message: 'Platform is not macOS, skipping DNS change.' }
  }

  const service = getMainNetworkService()
  if (!service) {
    return { success: false, error: 'Could not determine main network service.' }
  }

  // 检查是否存在 helper
  let useHelper = false
  try {
    if (fs.existsSync(HELPER_BIN)) {
      const stats = fs.statSync(HELPER_BIN)
      if (stats.uid === 0 && (stats.mode & 0o4000)) {
        useHelper = true
      }
    }
  } catch (e) {
    /* ignore */
  }

  const serversArg = servers.length > 0 ? servers.join(' ') : 'Empty'
  const command = useHelper
    ? `"${HELPER_BIN}" "${service}" ${serversArg}`
    : `sudo networksetup -setdnsservers "${service}" ${serversArg}`

  try {
    execSync(command, { stdio: 'pipe' }) // Use 'pipe' to suppress output
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
