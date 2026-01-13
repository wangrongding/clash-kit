import { execSync } from 'child_process'
import ora from 'ora'
import * as sysproxy from '../sysproxy.js'

export async function stop() {
  const spinner = ora('正在停止 Clash 服务...').start()
  try {
    // 停止前先关闭系统代理
    await sysproxy.disableSystemProxy()

    // 使用 pkill 匹配进程名包含 clash-meta 的进程
    execSync('pkill -f clash-meta')
    spinner.succeed('Clash 服务已停止')
  } catch (err) {
    // pkill 如果没找到进程会抛出错误，这里捕获并提示
    spinner.warn('未找到运行中的 Clash 服务，或已停止')
  }
}
