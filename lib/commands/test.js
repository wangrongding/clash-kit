import chalk from 'chalk'
import * as api from '../api.js'

export async function test() {
  try {
    const proxies = await api.getProxies()
    // 默认测速 Proxy 组的所有节点
    const group = proxies['Proxy'] || Object.values(proxies).find(p => p.type === 'Selector')

    if (!group) {
      console.error('找不到 Proxy 组')
      return
    }

    console.log(`\n[${group.name}]${group.all.length}个节点, 当前选中: ${group.now}\n`)

    const results = []
    const concurrency = 10 // 并发数量
    const queue = [...group.all]
    const total = group.all.length
    let completed = 0
    const current = group.now // 当前选中节点

    const worker = async () => {
      while (queue.length > 0) {
        const name = queue.shift()
        if (!name) break

        try {
          const testUrl = name === 'DIRECT' ? 'http://connect.rom.miui.com/generate_204' : undefined
          const delay = await api.getProxyDelay(name, testUrl)
          completed++
          const progress = `[${completed}/${total}]`
          const isCurrent = name === current
          const nameDisplay = isCurrent ? chalk.bold.bgCyan(name) : chalk.cyan(name)

          if (delay > 0) {
            const color = delay < 200 ? chalk.green : delay < 800 ? chalk.yellow : chalk.red
            console.log(`${chalk.gray(progress)} ${nameDisplay}: ${color(delay + 'ms')}`)
            results.push({ name, delay, isCurrent })
          } else {
            console.log(`${chalk.gray(progress)} ${nameDisplay}: ${chalk.red('超时')}`)
            results.push({ name, delay: 99999, isCurrent })
          }
        } catch (err) {
          completed++
          results.push({ name, delay: 99999, isCurrent: name === current })
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()))

    console.log(chalk.bold.blue('\n=== 测速结果 (Top 5) ==='))
    results.sort((a, b) => a.delay - b.delay)
    results.slice(0, 5).forEach((r, i) => {
      let delayInfo
      if (r.delay === 99999) {
        delayInfo = chalk.red('超时')
      } else {
        const color = r.delay < 200 ? chalk.green : r.delay < 800 ? chalk.yellow : chalk.red
        delayInfo = color(`${r.delay}ms`)
      }
      const nameDisplay = r.isCurrent ? chalk.bold.bgCyan(r.name) : chalk.cyan(r.name)
      console.log(`${chalk.gray(i + 1 + '.')} ${nameDisplay}: ${delayInfo}`)
    })
  } catch (err) {
    console.error(err.message)
  }
}
