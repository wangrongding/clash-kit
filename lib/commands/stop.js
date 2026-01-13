import { execSync } from 'child_process'
import ora from 'ora'
import * as sysproxy from '../sysproxy.js'
import * as tun from '../tun.js'

export async function stop() {
  const spinner = ora('正在停止 Clash 服务...').start()
  try {
    // 停止前先关闭系统代理
    await sysproxy.disableSystemProxy()

    // 检查并关闭 TUN 模式
    const tunEnabled = await tun.isTunEnabled()
    if (tunEnabled) {
      spinner.text = '正在关闭 TUN 模式...'
      await tun.disableTun()
      console.log('TUN 模式已关闭')
    }

    // 使用 pkill 匹配进程名包含 clash-meta 的进程
    spinner.text = '正在停止 Clash 服务...'
    execSync('pkill -f clash-meta')
    spinner.succeed('Clash 服务已停止')
  } catch (err) {
    // pkill 如果没找到进程会抛出错误，这里捕获并提示
    spinner.warn('未找到运行中的 Clash 服务，或已停止')
  }
}
