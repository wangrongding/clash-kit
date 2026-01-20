import { select } from '@inquirer/prompts'
import ora from 'ora'
import chalk from 'chalk'
import * as api from '../api.js'

export async function proxy() {
  let spinner = ora('正在获取最新代理列表...').start()
  try {
    let proxies = await api.getProxies()
    spinner.stop()

    // 通常我们只关心 Proxy 组或者 Selector 类型的组
    const groups = Object.values(proxies).filter(p => p.type === 'Selector')

    if (groups.length === 0) {
      console.log('没有找到可选的节点组')
      return
    }

    // 选择组
    const groupName = await select({
      message: '请选择节点组:',
      choices: groups.map(g => ({ name: g.name, value: g.name })),
    })

    const group = proxies[groupName]

    // 自动对组内所有节点进行测速
    spinner = ora(`测速后选择合适的节点，正在对 [${groupName}] 进行测速...`).start()
    await Promise.all(group.all.map(n => api.getProxyDelay(n).catch(() => {})))

    // 测速完成后，刷新数据以获取最新状态
    proxies = await api.getProxies()
    spinner.stop()

    const updatedGroup = proxies[groupName]

    // 选择节点
    const proxyName = await select({
      message: `[${groupName}] 当前: ${updatedGroup.now}, 请选择节点:`,
      pageSize: 15,
      choices: updatedGroup.all.map(n => {
        const node = proxies[n]
        const lastHistory = node?.history && node.history.length ? node.history[node.history.length - 1] : null
        let delayInfo = ''

        if (lastHistory && lastHistory.delay > 0) {
          const delay = lastHistory.delay
          if (delay < 800) {
            delayInfo = chalk.green(` ${delay}ms`)
          } else if (delay < 1500) {
            delayInfo = chalk.yellow(` ${delay}ms`)
          } else {
            delayInfo = chalk.red(` ${delay}ms`)
          }
        } else if (lastHistory && lastHistory.delay === 0) {
          delayInfo = chalk.red(' [超时]')
        } else {
          delayInfo = chalk.gray(' [未测速]')
        }

        return { name: `${n}${delayInfo}`, value: n }
      }),
    })

    spinner = ora(`正在切换到 ${proxyName}...`).start()
    await api.switchProxy(groupName, proxyName)
    spinner.succeed(`已切换 ${groupName} -> ${proxyName}`)
  } catch (err) {
    if (spinner && spinner.isSpinning) spinner.fail(err.message)
    else console.error(err.message)
  }
}
