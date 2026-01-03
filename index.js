import { spawn, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import YAML from 'yaml'
import { fileURLToPath } from 'url'
import { getApiBase } from './lib/api.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------- 1. 配置项 ----------------
const CLASH_BIN_PATH = path.join(__dirname, 'clash-meta') // 解压后的二进制文件路径
const CLASH_CONFIG_PATH = path.join(__dirname, 'config.yaml') // 配置文件路径

// TUN 模式配置
const TUN_CONFIG = {
  dns: {
    enable: true,
    listen: '0.0.0.0:1053',
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    nameserver: ['8.8.8.8', '1.1.1.1'],
  },
  tun: {
    enable: true,
    stack: 'system',
    'dns-hijack': ['any:53'],
    'auto-route': true,
    'auto-detect-interface': true,
  },
}

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

// ---------------- 3. 执行流程 ----------------
export function main(options = {}) {
  if (!fs.existsSync(CLASH_CONFIG_PATH)) {
    return console.error('找不到配置文件 config.yaml，请先创建或使用订阅下载配置。')
  }

  // 处理配置文件，开启或关闭 TUN 模式
  try {
    const fileContent = fs.readFileSync(CLASH_CONFIG_PATH, 'utf8')
    const config = YAML.parse(fileContent)

    if (options.tun) {
      console.log('正在开启 TUN 模式...')
      Object.assign(config, TUN_CONFIG)
    } else {
      // 如果未开启 TUN 模式，移除相关配置
      if (config.tun) {
        console.log('正在关闭 TUN 模式...')
        delete config.tun
      }
      // 移除可能由 TUN 模式引入的 DNS 配置
      // 这里简单判断：如果 DNS 开启且模式为 fake-ip，则认为是 TUN 模式配套的 DNS
      if (config.dns && config.dns['enhanced-mode'] === 'fake-ip') {
        delete config.dns
      }
    }

    fs.writeFileSync(CLASH_CONFIG_PATH, YAML.stringify(config))
  } catch (err) {
    console.error('处理配置文件时出错:', err.message)
  }

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
