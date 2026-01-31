import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'
import ora from 'ora'
import * as api from './api.js'
import YAML from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const PROFILES_DIR = path.join(__dirname, '../profiles')
export const CONFIG_PATH = path.join(__dirname, '../config.yaml')
export const CURRENT_PROFILE_PATH = path.join(__dirname, '../.current_profile')

// 确保 profiles 目录存在
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR)
}

export async function downloadSubscription(url, name) {
  const spinner = ora(`正在下载订阅 ${name}...`).start()
  try {
    const res = await axios.get(url, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Clash/1.0.0', // 伪装成 Clash 客户端，通常能直接获取 YAML 格式
      },
    })

    let content = res.data

    // 尝试解析 YAML，如果不是对象或者看起来不像配置，尝试 Base64 解码
    let isConfig = false
    try {
      const parsed = YAML.parse(content)
      if (parsed && typeof parsed === 'object' && (parsed.proxies || parsed.Proxy || parsed.port)) {
        isConfig = true
      }
    } catch (e) {
      console.warn('订阅服务商返回的不是有效 YAML，尝试 Base64 解码...')
    }

    if (!isConfig) {
      try {
        // 尝试 Base64 解码
        const decoded = Buffer.from(content, 'base64').toString('utf-8')
        // 再次检查解码后是否为有效 YAML 配置
        const parsedDecoded = YAML.parse(decoded)
        if (
          parsedDecoded &&
          typeof parsedDecoded === 'object' &&
          (parsedDecoded.proxies || parsedDecoded.Proxy || parsedDecoded.port)
        ) {
          content = decoded
        }
      } catch (e) {
        console.warn('Base64 解码失败，保留原始内容')
      }
    }

    const filePath = path.join(PROFILES_DIR, `${name}.yaml`)
    fs.writeFileSync(filePath, content)
    spinner.succeed(`订阅 ${name} 下载成功`)
    return filePath
  } catch (err) {
    spinner.fail(`下载订阅失败: ${err.message}`)
    throw new Error(`下载订阅失败: ${err.message}`)
  }
}

export function listProfiles() {
  return fs
    .readdirSync(PROFILES_DIR)
    .filter(f => f.endsWith('.yaml'))
    .map(f => f.replace('.yaml', ''))
}

export async function getCurrentProfile() {
  if (fs.existsSync(CURRENT_PROFILE_PATH)) {
    return fs.readFileSync(CURRENT_PROFILE_PATH, 'utf8').trim()
  }
  return null
}

export async function useProfile(name) {
  const source = path.join(PROFILES_DIR, `${name}.yaml`)
  if (!fs.existsSync(source)) throw new Error(`配置文件 ${name} 不存在`)

  const spinner = ora(`正在切换到配置 ${name}...`).start()

  // 读取订阅配置
  const subscriptionConfig = YAML.parse(fs.readFileSync(source, 'utf8'))

  // 读取现有配置（如果存在）
  let existingConfig = {}
  if (fs.existsSync(CONFIG_PATH)) {
    existingConfig = YAML.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  }

  // 合并配置：保留用户自定义字段，更新订阅字段
  const mergedConfig = {
    ...subscriptionConfig,
    port: existingConfig['port'],
    'bind-address': existingConfig['bind-address'],
    'socks-port': existingConfig['socks-port'],
    'allow-lan': existingConfig['allow-lan'],
    // 其他需要保留的自定义字段...
  }

  // 写入合并后的配置
  fs.writeFileSync(CONFIG_PATH, YAML.stringify(mergedConfig))

  // 尝试热重载
  if (await api.isClashRunning()) {
    try {
      await api.reloadConfig(CONFIG_PATH)
      spinner.succeed('Clash 配置已切换并热重载生效')
    } catch (err) {
      spinner.warn(`配置已切换，但热重载失败: ${err.message}`)
    }
  } else {
    spinner.succeed('配置已切换（Clash 未运行，将在下次启动时生效）')
  }
}
