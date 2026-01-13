import ora from 'ora'
import { triggerManualProxy } from '@mihomo-party/sysproxy'
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
  // @mihomo-party/sysproxy 似乎没有直接获取当前系统代理状态的 API，
  // 通常我们只能通过 set/unset 来控制。
  // 如果需要状态，可能需要自己维护一个状态文件，或者假设 Clash 运行时就是开启的。
  // 这里暂时留空或返回未知。
  return 'unknown'
}
