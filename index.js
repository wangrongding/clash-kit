import { spawn, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { getApiBase, getProxyPort } from './lib/api.js'
import * as sysproxy from './lib/sysproxy.js'
import * as tun from './lib/tun.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------- 1. 配置项 ----------------
const CLASH_BIN_PATH = path.join(__dirname, 'clash-meta') // 解压后的二进制文件路径
const CLASH_CONFIG_PATH = path.join(__dirname, 'config.yaml') // 配置文件路径

// ---------------- 2. 启动 Clash.Meta 进程 ----------------
function startClash() {
  // 尝试停止已存在的进程
  try {
    execSync('pkill -f clash-meta')
  } catch (e) {
    // 忽略错误，说明没有运行中的进程
  }

  const logPath = path.join(__dirname, 'clash.log')
  const logFd = fs.openSync(logPath, 'a')

  const clashProcess = spawn(CLASH_BIN_PATH, ['-f', CLASH_CONFIG_PATH, '-d', __dirname], {
    cwd: __dirname,
    detached: true,
    stdio: ['ignore', logFd, logFd], // 重定向 stdout 和 stderr 到日志文件
  })

  clashProcess.on('error', err => {
    console.error(`启动 Clash.Meta 失败: ${err.message}`)
    process.exit(1)
  })

  // 监听子进程退出，方便调试
  clashProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.log(`Clash 进程异常退出，代码: ${code}, 信号: ${signal}。请查看 clash.log 获取详情。`)
    }
  })

  // 解除与父进程的引用，让子进程在后台独立运行
  clashProcess.unref()

  return clashProcess
}

// ---------------- 3. 清理函数 ----------------
async function cleanup() {
  try {
    // 关闭系统代理
    await sysproxy.disableSystemProxy()

    // 检查并关闭 TUN 模式
    const tunEnabled = await tun.isTunEnabled()
    if (tunEnabled) {
      await tun.disableTun()
      console.log('TUN 模式已关闭')
    }

    // 停止 Clash 进程
    try {
      execSync('pkill -f clash-meta')
      console.log('Clash 服务已停止')
    } catch (e) {
      // 进程可能已经停止
    }
  } catch (error) {
    console.error('清理过程出错:', error.message)
  }
}

// ---------------- 4. 注册进程退出处理 ----------------
function setupExitHandlers() {
  // 处理正常退出 (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\n\n正在清理配置并退出...')
    await cleanup()
    process.exit(0)
  })

  // 处理终止信号
  process.on('SIGTERM', async () => {
    console.log('\n正在清理配置并退出...')
    await cleanup()
    process.exit(0)
  })

  // 处理未捕获的异常
  process.on('uncaughtException', async err => {
    console.error('未捕获的异常:', err)
    await cleanup()
    process.exit(1)
  })
}

// ---------------- 5. 执行流程 ----------------
export function main() {
  // 检查 clash-meta 二进制文件是否存在
  if (!fs.existsSync(CLASH_BIN_PATH)) {
    return console.error(chalk.red('\n找不到 Clash.Meta 内核文件,请先运行 clash init 命令初始化内核！\n'))
  }
  // 检查配置文件是否存在
  if (!fs.existsSync(CLASH_CONFIG_PATH)) {
    return console.error(chalk.red('\n找不到配置文件 config.yaml,请先通过 clash sub 命令添加或选择订阅配置！\n'))
  }

  // 设置退出处理
  setupExitHandlers()

  const clashProcess = startClash()
  const { http, socks } = getProxyPort()

  console.log(chalk.green('\n代理服务已在后台启动✅'))
  if (clashProcess.pid) {
    console.log(`PID: ${chalk.yellow(clashProcess.pid)}`)
  }

  console.log(``)
  console.log(`HTTP Proxy:   ${chalk.cyan(`127.0.0.1:${http}`)}`)
  console.log(`SOCKS5 Proxy: ${chalk.cyan(`127.0.0.1:${socks}`)}`)
  console.log(`API:          ${chalk.cyan.underline(getApiBase())}`)
  console.log(``)
  console.log(chalk.gray('提示: 如需停止代理可使用 clash stop 命令'))
}

// 运行脚本
if (process.argv[1] === __filename) {
  main()
}
