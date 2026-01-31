import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import axios from 'axios'
import ora from 'ora'
import YAML from 'yaml'
import { fileURLToPath } from 'url'
import { getApiBase } from './lib/api.js'
import { status } from './lib/commands/status.js'
import * as sysproxy from './lib/sysproxy.js'
import * as tun from './lib/tun.js'
import { isPortOpen, extractPort, getPortOccupier } from './lib/port.js'
import { killClashProcess } from './lib/kernel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ----------------  配置项 ----------------
export const CLASH_BIN_PATH = path.join(__dirname, process.platform === 'win32' ? 'clash-kit.exe' : 'clash-kit') // 解压后的二进制文件路径
export const CLASH_CONFIG_PATH = path.join(__dirname, 'config.yaml') // 配置文件路径

async function checkPorts() {
  try {
    if (fs.existsSync(CLASH_CONFIG_PATH)) {
      const configContent = fs.readFileSync(CLASH_CONFIG_PATH, 'utf8')
      const config = YAML.parse(configContent)

      const checks = [
        { key: 'mixed-port', name: 'Mixed Port' },
        { key: 'port', name: 'HTTP Port' },
        { key: 'socks-port', name: 'SOCKS Port' },
        { key: 'external-controller', name: 'External Controller' },
      ]

      for (const check of checks) {
        const val = config[check.key]
        const port = extractPort(val)
        if (port) {
          const isOpen = await isPortOpen(port)
          if (!isOpen) {
            const occupier = getPortOccupier(port)
            const occupierInfo = occupier ? ` (被 ${occupier} 占用)` : ''

            console.error(chalk.red(`\n启动失败: 端口 ${port} (${check.name}) 已被占用${occupierInfo}`))
            console.error(chalk.yellow(`请检查是否有其他代理软件正在运行，或修改 config.yaml 中的 ${check.key} \n`))

            if (!occupierInfo) {
              console.error(`占用进程未知，可能是权限不足或系统进程`)
              console.error(chalk.yellow(`提示: 可尝试使用 'sudo lsof -i :${port}' 手动查看端口占用情况`))
            }
            process.exit(1)
          }
        }
      }
    }
  } catch (e) {
    console.error(chalk.yellow('警告: 端口检查预检失败，将尝试直接启动内核:', e.message))
  }
}

// ---------------- 启动 Clash.Meta 进程 ----------------
async function startClash() {
  // 尝试停止已存在的进程
  killClashProcess()
  // 稍微等待端口释放，避免 restart 时偶发端口占用报错
  await new Promise(resolve => setTimeout(resolve, 500))

  // 检查端口占用 (核心策略：报错/启动失败)
  await checkPorts()

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

// 清理函数
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
    if (killClashProcess()) {
      console.log('Clash 服务已停止')
    }
  } catch (error) {
    console.error('清理过程出错:', error.message)
  }
}

// 注册进程退出处理
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

// 检查服务健康状态
async function checkServiceHealth(apiBase, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(apiBase, { timeout: 1000 })
      return true
    } catch (e) {
      if (e.response) return true // 端口已通 (即使是 401 也可以)
      await new Promise(r => setTimeout(r, 200)) // 200ms * 20 = 4s
    }
  }
  return false
}

export async function main() {
  // 检查 clash-kit 二进制文件是否存在
  if (!fs.existsSync(CLASH_BIN_PATH)) {
    return console.error(chalk.red('\n找不到 Clash.Meta 内核文件,请先运行 clash init 命令初始化内核！\n'))
  }
  // 检查配置文件是否存在
  if (!fs.existsSync(CLASH_CONFIG_PATH)) {
    return console.error(chalk.red('\n找不到配置文件 config.yaml,请先通过 clash sub 命令添加或选择订阅配置！\n'))
  }

  // 设置退出处理
  setupExitHandlers()

  const clashProcess = await startClash()

  const spinner = ora('正在等待服务启动...').start()
  const started = await checkServiceHealth(getApiBase())

  if (!started) {
    spinner.fail(chalk.red('启动失败'))
    const logPath = path.join(__dirname, 'clash.log')
    if (fs.existsSync(logPath)) {
      console.log(chalk.yellow('\n------- clash.log (Last 20 lines) -------'))
      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n')
      console.log(lines.slice(-20).join('\n'))
      console.log(chalk.yellow('-----------------------------------------\n'))
    }
    try {
      process.kill(clashProcess.pid)
    } catch (e) {
      console.error('停止 Clash 进程时出错:', e)
    }
    process.exit(1)
  }

  spinner.succeed(chalk.green('启动成功'))

  // 调用 status 命令来打印完整的状态信息
  await status()
}

// 运行脚本
if (process.argv[1] === __filename) {
  main()
}
