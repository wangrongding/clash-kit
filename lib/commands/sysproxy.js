import { select } from '@inquirer/prompts'
import * as sysproxy from '../sysproxy.js'
import ora from 'ora'
import boxen from 'boxen'
import chalk from 'chalk'

async function handleAction(action) {
  if (action === 'on') {
    const spinner = ora('正在开启系统代理...').start()
    const result = await sysproxy.enableSystemProxy()
    if (result.success) {
      spinner.stop()
      const content = [`状态: ${chalk.green('已开启')}`, `地址: ${chalk.cyan(`${result.host}:${result.port}`)}`]
      console.log(
        boxen(content.join('\n'), {
          title: '系统代理',
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'green',
        }),
      )
    } else {
      spinner.fail(`开启失败: ${result.error}`)
    }
  } else if (action === 'off') {
    const spinner = ora('正在关闭系统代理...').start()
    const result = await sysproxy.disableSystemProxy()
    if (result.success) {
      spinner.stop()
      console.log(
        boxen(chalk.yellow('状态: 已关闭'), {
          title: '系统代理',
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
        }),
      )
    } else {
      spinner.fail(`关闭失败: ${result.error}`)
    }
  }
}

// --export 模式：只向 stdout 输出 shell 语句，供 `eval "$(ck sys on --export)"` 捕获执行，
// 让「当前终端」立即生效（由 `ck shell-init` 安装的包装函数调用）。
async function handleExport(action) {
  const result =
    action === 'on' ? await sysproxy.enableSystemProxy() : await sysproxy.disableSystemProxy()
  if (!result.success) {
    console.error(`失败: ${result.error}`)
    process.exitCode = 1
    return
  }
  if (!result.shellCommands) {
    console.error('当前平台不支持此方式')
    process.exitCode = 1
    return
  }
  process.stdout.write(result.shellCommands + '\n')
  // 反馈走 stderr：stdout 只输出 export/unset 语句给 eval 捕获，stderr 直接显示在终端
  if (action === 'on') {
    console.error(chalk.green(`✓ 系统代理已开启 ${result.host}:${result.port}`))
  } else {
    console.error(chalk.gray('✓ 系统代理已关闭'))
  }
}

export async function setSysProxy(action, options) {
  if (action === 'on' || action === 'off') {
    if (options?.export) {
      await handleExport(action)
    } else {
      await handleAction(action)
    }
  } else {
    // 交互式选择
    const answer = await select({
      message: '请选择系统代理操作:',
      choices: [
        { name: '开启系统代理', value: 'on' },
        { name: '关闭系统代理', value: 'off' },
      ],
    })
    await handleAction(answer)
  }
}
