import ora from 'ora'
import * as api from '../api.js'
import * as sub from '../subscription.js'
import * as tun from '../tun.js'
import * as sysproxy from '../sysproxy.js'
import chalk from 'chalk'
import boxen from 'boxen'

export async function status() {
  const spinner = ora('正在获取 Clash 状态...').start()
  try {
    const config = await api.getConfig()
    spinner.stop()
    const apiBase = api.getApiBase()
    const currentProfile = await sub.getCurrentProfile()

    // 获取 TUN 和系统代理状态
    const tunEnabled = await tun.isTunEnabled()
    const sysProxyStatus = await sysproxy.getSystemProxyStatus()
    // 获取代理组信息
    const proxies = await api.getProxies()

    // 配置文件路径
    const configPath = sub.CONFIG_PATH

    console.log(
      boxen(
        `状态：${chalk.green('运行中')}
当前配置: ${currentProfile || '未知 (默认或手动修改)'}
API 地址: ${apiBase}
运行模式: ${config.mode}
HTTP 端口: ${config['port'] || chalk.gray('未设置')}
Socks5 端口: ${config['socks-port'] || chalk.gray('未设置')}
Mixed 端口: ${config['mixed-port'] || chalk.gray('未设置')}

TUN 模式: ${tunEnabled ? chalk.green('已开启') : chalk.gray('未开启')}
系统代理: ${sysProxyStatus.enabled ? chalk.green(`已开启 (${sysProxyStatus.server}:${sysProxyStatus.port})`) : chalk.gray('未开启')}

当前配置文件: ${chalk.blueBright.underline(configPath) || chalk.gray('默认配置文件路径')}`,
        {
          title: chalk.bold.bgGreen('Clash Kit'),
          titleAlignment: 'center',
          padding: 1,
          margin: 1,
          borderStyle: 'bold',
          borderColor: 'green',
          margin: { top: 1, bottom: 0, left: 0, right: 0 },
        },
      ),
    )

    // 默认测速 Proxy 组的所有节点
    const group = proxies['Proxy'] || Object.values(proxies).find(p => p.type === 'Selector')

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
    console.log(`🚀  [${group.name}]: ${group.now} 延迟: ${delayStr}`)
  } catch (err) {
    if (spinner.isSpinning) spinner.stop()
    if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('无法连接'))) {
      // 配置文件路径
      const configPath = sub.CONFIG_PATH
      const stdConfig = {
        title: chalk.bold.bgYellow('Clash Kit'),
        titleAlignment: 'center',
        padding: 1,
        margin: 1,
        borderStyle: 'single',
        margin: { top: 1, bottom: 0, left: 0, right: 0 },
      }
      console.log(
        boxen(
          `状态：未运行
提示：请使用 \`ck start\` 启动服务
当前配置文件: ${configPath || '默认配置文件路径'}`,
          stdConfig,
        ),
      )
    } else {
      console.error(`获取状态失败: ${err.message}`)
    }
  }
}
