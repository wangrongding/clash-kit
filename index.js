import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { getApiBase } from './lib/api.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------- 1. 配置项 ----------------
const CLASH_BIN_PATH = path.join(__dirname, 'clash-meta') // 解压后的二进制文件路径
const CLASH_CONFIG_PATH = path.join(__dirname, 'config.yaml') // 配置文件路径

// ---------------- 2. 启动 Clash.Meta 进程 ----------------
function startClash() {
  const clashProcess = spawn(CLASH_BIN_PATH, ['-f', CLASH_CONFIG_PATH, '-d', __dirname], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
  })

  clashProcess.on('error', err => {
    console.error(`启动 Clash.Meta 失败: ${err.message}`)
    process.exit(1)
  })

  // 解除与父进程的引用，让子进程在后台独立运行
  clashProcess.unref()

  return clashProcess
}

// ---------------- 3. 执行流程 ----------------
export function main() {
  const clashProcess = startClash()

  console.log('Clash.Meta 已在后台启动')
  if (clashProcess.pid) {
    console.log(`PID: ${clashProcess.pid}`)
  }
  console.log(`API: ${getApiBase()}`)
  console.log('提示: 如需停止可使用 kill <PID>，或手动结束 clash-meta 进程')
}

// 运行脚本
if (process.argv[1] === __filename) {
  main()
}
