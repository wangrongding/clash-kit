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

export async function setSysProxy(action) {
  if (action === 'on' || action === 'off') {
    await handleAction(action)
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
