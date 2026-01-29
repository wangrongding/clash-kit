import { stop } from './stop.js'
import { start } from './start.js'

export async function restart(options) {
  console.log('正在重启 Clash 服务...')
  await stop()
  // 稍微等待一下，确保资源释放
  await new Promise(resolve => setTimeout(resolve, 1000))
  await start(options)
}
