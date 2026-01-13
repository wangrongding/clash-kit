import ora from 'ora'
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
  const spinner = ora('正在等待 Clash API 就绪以设置系统代理...').start()
  try {
    const config = await api.getConfig()
    const port = config['mixed-port'] || config['port']

    if (!port) {
      throw new Error('未找到 HTTP 代理端口配置 (port 或 mixed-port)')
    }

    // 默认代理地址为 127.0.0.1
    const host = '127.0.0.1'
    const bypass = defaultBypass.join(',')

    // 开启系统代理
    triggerManualProxy(true, host, port, bypass)
    spinner.succeed(`系统代理已开启: ${host}:${port}`)
    return true
  } catch (err) {
    if (spinner && spinner.isSpinning) spinner.fail(`开启系统代理失败: ${err.message}`)
    else console.error(err.message)
    return false
  }
}

export async function disableSystemProxy() {
  try {
    // 关闭系统代理
    triggerManualProxy(false, '', 0, '')

    console.log('系统代理已关闭')
    return true
  } catch (err) {
    console.error(`关闭系统代理失败: ${err.message}`)
    return false
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
    // Windows 可以通过注册表查询，这里简化处理
    return { enabled: false, error: 'Windows 暂不支持获取状态' }
  } else {
    return { enabled: false, error: '不支持的平台' }
  }
}
