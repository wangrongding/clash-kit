import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'
import ora from 'ora'
import { reloadConfig } from './api.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROFILES_DIR = path.join(__dirname, '../profiles')
const CONFIG_PATH = path.join(__dirname, '../config.yaml')
const CURRENT_PROFILE_PATH = path.join(__dirname, '../.current_profile')

// 确保 profiles 目录存在
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR)
}

export async function downloadSubscription(url, name) {
  const spinner = ora(`正在下载订阅 ${name}...`).start()
  try {
    const res = await axios.get(url, { responseType: 'text' })
    const filePath = path.join(PROFILES_DIR, `${name}.yaml`)
    fs.writeFileSync(filePath, res.data)
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

export function getCurrentProfile() {
  if (fs.existsSync(CURRENT_PROFILE_PATH)) {
    return fs.readFileSync(CURRENT_PROFILE_PATH, 'utf8').trim()
  }
  return null
}

export async function useProfile(name) {
  const source = path.join(PROFILES_DIR, `${name}.yaml`)
  if (!fs.existsSync(source)) {
    throw new Error(`配置文件 ${name} 不存在`)
  }

  const spinner = ora(`正在切换到配置 ${name}...`).start()

  // 直接复制配置文件，保持原样
  fs.copyFileSync(source, CONFIG_PATH)
  fs.writeFileSync(CURRENT_PROFILE_PATH, name)

  // 尝试热重载
  try {
    await reloadConfig(CONFIG_PATH)
    spinner.succeed('Clash 配置已切换并热重载生效')
  } catch (err) {
    // 忽略错误，可能是 Clash 未运行
    spinner.warn('配置已切换，但 Clash 未运行或无法连接，将在下次启动时生效')
  }
}
