import { triggerManualProxy } from '@mihomo-party/sysproxy'
import { execSync } from 'child_process'
import * as api from './api.js'

const defaultBypass = (() => {
  switch (process.platform) {
    case 'linux':
      return ['localhost', '127.0.0.1', '192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '::1']
    case 'darwin':
      return [
        '127.0.0.1',
        '192.168.0.0/16',
        '10.0.0.0/8',
        '172.16.0.0/12',
        'localhost',
        '*.local',
        '*.crashlytics.com',
        '<local>',
      ]
    case 'win32':
      return [
        'localhost',
        '127.*',
        '192.168.*',
        '10.*',
        '172.16.*',
        '172.17.*',
        '172.18.*',
        '172.19.*',
        '172.20.*',
        '172.21.*',
        '172.22.*',
        '172.23.*',
        '172.24.*',
        '172.25.*',
        '172.26.*',
        '172.27.*',
        '172.28.*',
        '172.29.*',
        '172.30.*',
        '172.31.*',
        '<local>',
      ]
    default:
      return ['localhost', '127.0.0.1', '192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '::1']
  }
})()

export async function enableSystemProxy() {
  try {
    const config = await api.getConfig()
    const port = config['mixed-port'] || config['port']
    if (!port) throw new Error('未找到 HTTP 代理端口配置 (port 或 mixed-port)')
    // 默认代理地址为 127.0.0.1
    const host = '127.0.0.1'
    const bypass = defaultBypass.join(',')

    // 开启系统代理
    triggerManualProxy(true, host, port, bypass)
    return { success: true, host, port }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function disableSystemProxy() {
  try {
    // 关闭系统代理
    triggerManualProxy(false, '', 0, '')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function getSystemProxyStatus() {
  // 使用 macOS networksetup 命令获取系统代理状态
  if (process.platform === 'darwin') {
    try {
      const output = execSync('networksetup -getwebproxy Wi-Fi', { encoding: 'utf-8' })
      const enabled = output.includes('Enabled: Yes')
      if (enabled) {
        const serverMatch = output.match(/Server: (.+)/)
        const portMatch = output.match(/Port: (\d+)/)
        const server = serverMatch ? serverMatch[1].trim() : ''
        const port = portMatch ? portMatch[1].trim() : ''
        return { enabled: true, server, port }
      }
      return { enabled: false }
    } catch (e) {
      return { enabled: false, error: e.message }
    }
  } else if (process.platform === 'win32') {
    try {
      const regPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
      // 查询 ProxyEnable
      const enableOutput = execSync(`reg query "${regPath}" /v ProxyEnable`, { encoding: 'utf-8' })
      // 检查输出中是否包含 0x1，表示代理已开启
      const isEnabled = /ProxyEnable\s+REG_DWORD\s+0x1/.test(enableOutput)

      if (isEnabled) {
        let server = ''
        let port = ''
        try {
          // 查询 ProxyServer
          const serverOutput = execSync(`reg query "${regPath}" /v ProxyServer`, { encoding: 'utf-8' })
          const match = serverOutput.match(/ProxyServer\s+REG_SZ\s+(.*)/)

          if (match && match[1]) {
            const fullAddress = match[1].trim()
            // 简单的处理 host:port 格式
            const lastColonIndex = fullAddress.lastIndexOf(':')
            if (lastColonIndex !== -1) {
              server = fullAddress.substring(0, lastColonIndex)
              port = fullAddress.substring(lastColonIndex + 1)
            } else {
              server = fullAddress
            }
          }
        } catch (e) {
          // 忽略获取详细信息的错误
        }
        return { enabled: true, server, port }
      }
      return { enabled: false }
    } catch (e) {
      // 如果注册表键不存在或查询出错
      return { enabled: false, error: e.message }
    }
  } else {
    return { enabled: false, error: '不支持的平台' }
  }
}
