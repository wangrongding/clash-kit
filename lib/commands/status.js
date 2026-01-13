import ora from 'ora'
import * as api from '../api.js'
import * as sub from '../subscription.js'

export async function status() {
  const spinner = ora('正在获取 Clash 状态...').start()
  try {
    const config = await api.getConfig()
    spinner.stop()
    const apiBase = api.getApiBase()
    const currentProfile = sub.getCurrentProfile()

    console.log('\n=== Clash 状态 ===')
    console.log(`状态: \x1b[32m运行中\x1b[0m`)
    console.log(`当前配置: ${currentProfile || '未知 (默认或手动修改)'}`)
    console.log(`API 地址: ${apiBase}`)
    console.log(`运行模式: ${config.mode}`)
    console.log(`HTTP 端口: ${config['port'] || '未设置'}`)
    console.log(`Socks5 端口: ${config['socks-port'] || '未设置'}`)
    if (config['mixed-port']) {
      console.log(`Mixed 端口: ${config['mixed-port']}`)
    }

    const proxies = await api.getProxies()

    // 过滤出 Selector 类型的代理组
    const selectors = Object.entries(proxies)
      .filter(([name, proxy]) => proxy.type === 'Selector')
      .map(([name, proxy]) => ({ name, now: proxy.now }))

    console.log('\n=== 节点信息 ===')

    if (selectors.length === 0) {
      console.log('未找到节点选择组。')
    } else {
      for (const { name, now } of selectors) {
        process.stdout.write(`组 [${name}] 当前节点: ${now} ... 测速中`)
        const testUrl = now === 'DIRECT' ? 'http://connect.rom.miui.com/generate_204' : undefined
        const delay = await api.getProxyDelay(now, testUrl)

        let delayStr = ''
        if (delay > 0) {
          if (delay < 200) delayStr = `\x1b[32m${delay}ms\x1b[0m`
          else if (delay < 500) delayStr = `\x1b[33m${delay}ms\x1b[0m`
          else delayStr = `\x1b[31m${delay}ms\x1b[0m`
        } else {
          delayStr = `\x1b[31m超时/失败\x1b[0m`
        }

        process.stdout.clearLine(0)
        process.stdout.cursorTo(0)
        console.log(`组 [${name}] 当前节点: ${now} - 延迟: ${delayStr}`)
      }
    }
  } catch (err) {
    if (spinner.isSpinning) spinner.stop()
    if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('无法连接'))) {
      console.log('\n=== Clash 状态 ===')
      console.log(`状态: \x1b[31m未运行\x1b[0m`)
      console.log('提示: 请使用 `clash start` 启动服务')
    } else {
      console.error(`获取状态失败: ${err.message}`)
    }
  }
}
