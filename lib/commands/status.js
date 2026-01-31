import ora from 'ora'
import path from 'path'
import * as api from '../api.js'
import * as sub from '../subscription.js'
import * as tun from '../tun.js'
import * as sysproxy from '../sysproxy.js'
import { getClashProcessInfo } from '../kernel.js'
import chalk from 'chalk'
import boxen from 'boxen'

export async function status() {
  const spinner = ora('正在获取 Clash 状态...').start()
  try {
    const [config, currentProfile, tunEnabled, sysProxyStatus, proxies, processInfo] = await Promise.all([
      api.getConfig(),
      sub.getCurrentProfile(),
      tun.isTunEnabled(),
      sysproxy.getSystemProxyStatus(),
      api.getProxies(),
      getClashProcessInfo(),
    ])

    spinner.stop()
    const apiBase = api.getApiBase()
    const configPath = sub.CONFIG_PATH
    const logPath = path.resolve(path.dirname(configPath), 'clash.log')

    const content = []
    let statusLine = `状态：${chalk.green('运行中')}`
    if (processInfo?.pid) {
      statusLine += ` (PID: ${chalk.yellow(processInfo.pid)})`
    }
    content.push(statusLine)
    content.push(`当前配置: ${currentProfile || '未知'}`)
    content.push(`运行模式: ${config.mode}`)
    content.push(`API 地址:    ${chalk.cyan(apiBase)}`)
    content.push(`HTTP 代理:   ${chalk.cyan(`http://127.0.0.1:${config['port'] || '未设置'}`)}`)
    content.push(`SOCKS5 代理: ${chalk.cyan(`socks5://127.0.0.1:${config['socks-port'] || '未设置'}`)}`)
    content.push(
      `混合代理:    ${config['mixed-port'] ? chalk.cyan(`127.0.0.1:${config['mixed-port']}`) : chalk.gray('未设置')}`,
    )
    content.push('')
    const sysProxyText = sysProxyStatus.enabled
      ? chalk.green(`已开启 (${sysProxyStatus.server}:${sysProxyStatus.port})`)
      : chalk.gray('未开启')
    content.push(`系统代理: ${sysProxyText}`)
    content.push(`TUN 模式(拦截所有流量): ${tunEnabled ? chalk.green('已开启') : chalk.gray('未开启')}`)
    content.push('')
    content.push(`日志文件: ${chalk.blueBright.underline(logPath)}`)
    content.push(`配置文件: ${chalk.blueBright.underline(configPath)}`)
    content.push('')

    content.push('')
    content.push(
      `${chalk.gray('系统代理: ck sys <on|off> , TUN 模式: ck tun <on|off>')} , 更多命令: ${chalk.blue('ck help')}`,
    )

    console.log(
      boxen(content.join('\n'), {
        title: chalk.bold.bgGreen('Clash Kit'),
        titleAlignment: 'center',
        padding: 1,
        borderStyle: 'bold',
        borderColor: 'green',
        margin: { top: 1, bottom: 0, left: 0, right: 0 },
      }),
    )

    // 默认测速 Proxy 组的所有节点
    const group = proxies['Proxy'] || Object.values(proxies).find(p => p.type === 'Selector')
    if (group?.now) {
      const testUrl = group.now === 'DIRECT' ? 'http://connect.rom.miui.com/generate_204' : undefined
      const delay = await api.getProxyDelay(group.now, testUrl)
      let delayStr = ''
      if (delay > 0) {
        if (delay < 200) delayStr = chalk.green(`${delay}ms`)
        else if (delay < 500) delayStr = chalk.yellow(`${delay}ms`)
        else delayStr = chalk.red(`${delay}ms`)
      } else {
        delayStr = chalk.red('超时/失败')
      }
      console.log(`🚀 节点延迟 [${group.name}: ${group.now}]: ${delayStr}`)
    }
  } catch (err) {
    if (spinner.isSpinning) spinner.stop()
    if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('无法连接'))) {
      const configPath = sub.CONFIG_PATH
      const content = []
      content.push(`状态：${chalk.yellow('未运行')}`)
      content.push('提示：请使用 `ck start` 启动服务')
      content.push(`当前配置文件: ${configPath || '未知'}`)
      console.log(
        boxen(content.join('\n'), {
          title: chalk.bold.bgYellow('Clash Kit'),
          titleAlignment: 'center',
          padding: 1,
          borderStyle: 'single',
          margin: { top: 1, bottom: 1, left: 0, right: 0 },
        }),
      )
    } else {
      console.error(`获取状态失败: ${err.message}`)
    }
  }
}
