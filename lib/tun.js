import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import { fileURLToPath } from 'url'
import { reloadConfig } from './api.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONFIG_PATH = path.join(__dirname, '../config.yaml')
const BIN_PATH = path.join(__dirname, '../clash-kit')
const HELPER_SRC = path.join(__dirname, '../scripts/dns-helper.c')
const HELPER_BIN = path.join(__dirname, '../bin/dns-helper')

export function checkTunPermissions() {
  if (process.platform === 'win32') return true // Windows 需要管理员权限终端，难以通过文件属性判断

  try {
    const stats = fs.statSync(BIN_PATH)
    // SUID 位是 0o4000
    // 检查所有者是否为 root (uid 0) 并且拥有 SUID 位
    const isRootOwned = stats.uid === 0
    const hasSuid = (stats.mode & 0o4000) === 0o4000
    
    // 同时也检查 DNS 辅助工具的权限
    let helperOk = false
    if (fs.existsSync(HELPER_BIN)) {
      const hStats = fs.statSync(HELPER_BIN)
      helperOk = hStats.uid === 0 && (hStats.mode & 0o4000) === 0o4000
    }

    return isRootOwned && hasSuid && helperOk
  } catch (e) {
    return false
  }
}

export function setupPermissions() {
  if (process.platform === 'win32') {
    throw new Error('Windows 请使用管理员身份运行终端即可')
  }

  const group = process.platform === 'darwin' ? 'admin' : 'root'
  const cmdChown = `chown root:${group} "${BIN_PATH}"`
  const cmdChmod = `chmod +sx "${BIN_PATH}"`

  try {
    console.log('正在提升内核权限 (需要 sudo 密码)...')
    execSync(`sudo ${cmdChown}`, { stdio: 'inherit' })
    execSync(`sudo ${cmdChmod}`, { stdio: 'inherit' })

    // 编译并设置 DNS 辅助工具
    if (fs.existsSync(HELPER_SRC)) {
      console.log('正在编译 DNS 辅助工具...')
      try {
        execSync(`cc "${HELPER_SRC}" -o "${HELPER_BIN}"`, { stdio: 'inherit' })
        execSync(`sudo chown root:${group} "${HELPER_BIN}"`, { stdio: 'inherit' })
        execSync(`sudo chmod +sx "${HELPER_BIN}"`, { stdio: 'inherit' })
        console.log('DNS 辅助工具设置成功')
      } catch (compileErr) {
        console.warn('DNS 辅助工具编译或设置失败，系统 DNS 切换可能仍需密码:', compileErr.message)
      }
    }

    return true
  } catch (e) {
    throw new Error('权限设置失败')
  }
}

export async function isTunEnabled() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return false
    const file = fs.readFileSync(CONFIG_PATH, 'utf8')
    const config = YAML.parse(file)
    return config?.tun?.enable === true
  } catch (error) {
    return false
  }
}

export async function enableTun() {
  await updateTunConfig(true)
}

export async function disableTun() {
  await updateTunConfig(false)
}

async function updateTunConfig(enable) {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error('配置文件不存在')
    }

    const file = fs.readFileSync(CONFIG_PATH, 'utf8')
    const config = YAML.parse(file) || {}

    // 基础 TUN 配置
    if (!config.tun) {
      config.tun = {}
    }

    // 强制更新关键配置
    config.tun.enable = enable
    if (enable) {
      config.tun.stack = 'mixed' // 推荐使用 mixed 模式 (system/gvisor)
      config.tun['auto-route'] = true
      config.tun['auto-detect-interface'] = true
      config.tun['dns-hijack'] = ['any:53']
      if (process.platform === 'darwin') {
        config.tun.device = 'utun1500' // macOS 推荐指定 device
      }
    }

    // 开启 TUN 时必须配合 DNS 增强模式
    if (enable) {
      if (!config.dns) config.dns = {}

      config.dns.enable = true
      config.dns['enhanced-mode'] = 'fake-ip'
      config.dns.listen = config.dns.listen || '0.0.0.0:1053'
      config.dns.ipv6 = false // 避免 IPv6 导致的一些漏网之鱼，视情况开启

      // 确保有可用的 Nameservers (参考 clash-party 默认值)
      const defaultNameservers = [
        'https://223.5.5.5/dns-query', // AliDNS
        'https://doh.pub/dns-query', // DNSPod
        '8.8.8.8',
      ]

      if (!config.dns.nameserver || config.dns.nameserver.length === 0) {
        config.dns.nameserver = defaultNameservers
      }

      // 添加 Fake-IP 过滤，防止回环
      if (!config.dns['fake-ip-filter']) {
        config.dns['fake-ip-filter'] = ['*', '+.lan', '+.local']
      }
    }

    const newYaml = YAML.stringify(config)
    fs.writeFileSync(CONFIG_PATH, newYaml, 'utf8')

    // 重载配置使生效
    await reloadConfig(CONFIG_PATH)
  } catch (error) {
    throw new Error(`修改 TUN 配置失败: ${error.message}`)
  }
}
