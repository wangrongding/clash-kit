import ora from 'ora'
import * as sysproxy from '../sysproxy.js'
import * as tun from '../tun.js'
import { setTun } from './tun.js'
import { killClashProcess } from '../kernel.js'
import boxen from 'boxen'
import chalk from 'chalk'

export async function stop() {
  const spinner = ora('正在停止服务...').start()
  try {
    let wasTunEnabled = false

    // 1. 关闭系统代理
    spinner.text = '正在关闭系统代理...'
    await sysproxy.disableSystemProxy()

    // 2. 检查并关闭 TUN 模式
    const tunEnabled = await tun.isTunEnabled()
    if (tunEnabled) {
      wasTunEnabled = true
      spinner.text = '正在关闭 TUN 模式...'
      const result = await setTun('off', { silent: true })
      if (!result.success) {
        throw new Error(`关闭 TUN 模式失败: ${result.error}`)
      }
    }

    // 3. 停止 Clash 核心进程
    spinner.text = '正在停止 Clash 核心进程...'
    const stopped = killClashProcess()
    spinner.stop() // All processing is done, stop spinner

    // 4. 显示最终结果
    if (stopped) {
      const content = []
      content.push(`Clash 服务: ${chalk.yellow('已停止')}`)
      content.push(`系统代理: ${chalk.gray('已关闭')}`)
      if (wasTunEnabled) content.push(`TUN 模式: ${chalk.gray('已关闭 (DNS 已恢复)')}`)

      console.log(
        boxen(content.join('\n'), {
          title: 'Clash Kit',
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'green',
          titleAlignment: 'center',
        }),
      )
    } else {
      console.log(
        boxen(chalk.yellow('未找到运行中的 Clash 服务'), {
          title: 'Clash Kit',
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
          titleAlignment: 'center',
        }),
      )
    }
  } catch (err) {
    if (spinner.isSpinning) spinner.stop()
    console.error(`\n停止服务时出错: ${err.message}`)
  }
}
