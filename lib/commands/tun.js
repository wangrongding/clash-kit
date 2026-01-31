import { select } from '@inquirer/prompts'
import chalk from 'chalk'
import ora from 'ora'
import boxen from 'boxen'
import * as tun from '../tun.js'
import * as sysnet from '../sysnet.js'
import { main as startClashService } from '../../index.js'

async function turnOn() {
  const spinner = ora('正在配置 TUN 模式...').start()
  let shouldRestart = false

  try {
    if (process.platform !== 'win32') {
      spinner.text = '正在检查权限...'
      const hasPerm = tun.checkTunPermissions()
      const isRoot = process.getuid && process.getuid() === 0

      if (!hasPerm && !isRoot) {
        spinner.stop() // Stop spinner for user interaction
        console.log(chalk.yellow('检测到内核缺少 SUID 权限，TUN 模式可能无法启动。'))
        const confirm = await select({
          message: '是否自动授予内核 SUID 权限 (推荐)?',
          choices: [
            { name: '是 (需要 sudo 密码)', value: true },
            { name: '否 (之后可能需要 sudo 启动)', value: false },
          ],
        })
        if (confirm) {
          tun.setupPermissions() // This is noisy
          shouldRestart = true
        }
        spinner.start('正在继续配置...')
      }
    }

    spinner.text = '正在更新配置文件...'
    await tun.enableTun()

    spinner.text = '正在设置系统 DNS...'
    sysnet.setDNS(['223.5.5.5', '114.114.114.114']) // This is noisy

    spinner.stop()

    const content = [`TUN 模式: ${chalk.green('已开启')}`, `DNS 设置: ${chalk.cyan('223.5.5.5, 114.114.114.114')}`]
    console.log(
      boxen(content.join('\n'), {
        title: 'TUN 配置成功',
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }),
    )

    if (shouldRestart) {
      console.log(chalk.yellow('权限已变更，正在重启 Clash 服务以应用...'))
      await startClashService()
    } else {
      console.log(chalk.gray('提示: 配置已热重载。如 TUN 未生效, 可尝试 `clash restart`。'))
    }
  } catch (err) {
    if (spinner.isSpinning) spinner.fail(`设置 TUN 失败: ${err.message}`)
    else console.error(chalk.red(`设置 TUN 失败: ${err.message}`))
  }
}

async function turnOff(options = {}) {
  const silent = options.silent || false
  const spinner = silent ? null : ora('正在关闭 TUN 模式...').start()
  try {
    if (spinner) spinner.text = '正在更新配置文件...'
    await tun.disableTun()

    if (spinner) spinner.text = '正在恢复系统 DNS...'
    const dnsResult = sysnet.setDNS([]) // This is silent now
    if (!dnsResult.success) {
      throw new Error(`恢复 DNS 失败: ${dnsResult.error}`)
    }

    if (spinner) spinner.stop()
    if (!silent) {
      console.log(
        boxen('TUN 模式: ' + chalk.yellow('已关闭'), {
          title: 'TUN 配置成功',
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
        }),
      )
      console.log(chalk.gray('提示: 配置已热重载。'))
    }
    return { success: true }
  } catch (err) {
    if (spinner) spinner.fail(`关闭 TUN 失败: ${err.message}`)
    return { success: false, error: err.message }
  }
}

export async function setTun(action, options = {}) {
  try {
    if (action === 'on') {
      await turnOn()
    } else if (action === 'off') {
      return await turnOff(options)
    } else {
      const isEnabled = await tun.isTunEnabled()
      const answer = await select({
        message: `请选择 TUN 模式操作 (当前状态: ${isEnabled ? chalk.green('开启') : chalk.gray('关闭')}):`,
        choices: [
          { name: '开启 TUN 模式', value: 'on' },
          { name: '关闭 TUN 模式', value: 'off' },
        ],
      })
      if (answer === 'on') await turnOn()
      else await turnOff(options)
    }
  } catch (err) {
    // Catch errors from select/prompts
    console.error(chalk.red(`操作失败: ${err.message}`))
  }
}
