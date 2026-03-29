import * as sysproxy from '../sysproxy.js'
import { main as startClashService } from '../service.js'
import { setTun } from './tun.js'
import ora from 'ora'
import boxen from 'boxen'
import chalk from 'chalk'

export async function start(options) {
  const spinner = ora('正在启动 Clash 服务...').start()
  await startClashService()
  spinner.stop()

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  if (options.sysproxy) {
    const sysSpinner = ora('正在等待 Clash API 就绪以设置系统代理...').start()
    let sysOk = false
    for (let i = 0; i < 5; i++) {
      await sleep(1000)
      try {
        const result = await sysproxy.enableSystemProxy()
        if (result.success) {
          sysSpinner.succeed(`系统代理已开启: ${result.host}:${result.port}`)
          sysOk = true
          break
        }
      } catch (e) {
        // 继续重试
      }
    }
    if (!sysOk) sysSpinner.fail('设置系统代理超时，请稍后手动执行: ck sys on')
  }

  if (options.tun) {
    await sleep(500)
    await setTun('on')
  }
}
