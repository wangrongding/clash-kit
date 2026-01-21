import * as sysproxy from '../sysproxy.js'
import { main as startClashService } from '../../index.js'
import { setTun } from './tun.js'

export async function start(options) {
  await startClashService()

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  if (options.sysproxy) {
    console.log('正在等待 Clash API 就绪以设置系统代理...')

    // 尝试 5 次，每次间隔 1 秒
    for (let i = 0; i < 5; i++) {
      await sleep(1000)
      try {
        const success = await sysproxy.enableSystemProxy()
        if (success) break
      } catch (e) {
        if (i === 4) console.error('设置系统代理超时，请稍后手动设置: clash sysproxy on')
      }
    }
  }

  if (options.tun) {
    // 稍微延迟一下，确保服务可能有响应
    await sleep(1000)
    await setTun('on')
  }
}
