import { select } from '@inquirer/prompts'
import ora from 'ora'
import * as api from '../api.js'

export async function proxy() {
  let spinner = ora('正在获取最新代理列表...').start()
  try {
    const proxies = await api.getProxies()
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

    // 选择节点
    const proxyName = await select({
      message: `[${groupName}] 当前: ${group.now}, 请选择节点:`,
      choices: group.all.map(n => ({ name: n, value: n })),
    })

    spinner = ora(`正在切换到 ${proxyName}...`).start()
    await api.switchProxy(groupName, proxyName)
    spinner.succeed(`已切换 ${groupName} -> ${proxyName}`)
  } catch (err) {
    if (spinner && spinner.isSpinning) spinner.fail(err.message)
    else console.error(err.message)
  }
}
