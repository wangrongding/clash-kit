import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'
import ora from 'ora'
import crypto from 'crypto'
import { reloadConfig, isClashRunning } from './api.js'
import YAML from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROFILES_DIR = path.join(__dirname, '../profiles')
const CONFIG_PATH = path.join(__dirname, '../config.yaml')
const CURRENT_PROFILE_PATH = path.join(__dirname, '../.current_profile')
const KEY_FILE_PATH = path.join(__dirname, '../.config_key')

// AES-256-GCM 加密配置
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

// 获取或生成主密钥
function getMasterKey() {
  if (fs.existsSync(KEY_FILE_PATH)) {
    return fs.readFileSync(KEY_FILE_PATH, 'utf8').trim()
  }
  // 生成新的 32 字节随机密钥
  const newKey = crypto.randomBytes(32).toString('hex')
  fs.writeFileSync(KEY_FILE_PATH, newKey, { mode: 0o600 })
  return newKey
}

// 加密配置内容
function encryptConfig(content) {
  const key = getMasterKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)

  let encrypted = cipher.update(content, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()

  // 格式: iv:authTag:encryptedData (均为 hex 编码)
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex')
}

// 解密配置内容
function decryptConfig(encryptedContent) {
  const key = getMasterKey()
  const parts = encryptedContent.split(':')

  if (parts.length !== 3) {
    throw new Error('配置文件格式错误或已损坏')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = Buffer.from(parts[2], 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
}

// 检查文件是否为加密格式
function isEncrypted(content) {
  const trimmed = content.trim()
  return trimmed.includes(':') && trimmed.split(':').length === 3
}

// 读取配置（自动解密）
function readConfig(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (isEncrypted(content)) {
    return YAML.parse(decryptConfig(content))
  }
  // 兼容旧明文配置（读取后重新加密保存）
  const config = YAML.parse(content)
  fs.writeFileSync(filePath, encryptConfig(YAML.stringify(config)))
  return config
}

// 确保 profiles 目录存在
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR)
}

export async function downloadSubscription(url, name) {
  const spinner = ora(`正在下载订阅 ${name}...`).start()
  try {
    const res = await axios.get(url, { responseType: 'text' })
    const filePath = path.join(PROFILES_DIR, `${name}.yaml`)
    // 加密保存订阅配置
    fs.writeFileSync(filePath, encryptConfig(res.data))
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
  if (!fs.existsSync(source)) throw new Error(`配置文件 ${name} 不存在`)

  const spinner = ora(`正在切换到配置 ${name}...`).start()

  // 读取订阅配置（自动解密）
  const subscriptionConfig = readConfig(source)

  // 读取现有配置（如果存在）
  let existingConfig = {}
  if (fs.existsSync(CONFIG_PATH)) {
    existingConfig = YAML.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  }

  // 合并配置：保留用户自定义字段，更新订阅字段
  const mergedConfig = {
    ...subscriptionConfig,
    'port': existingConfig['port'],
    'bind-address': existingConfig['bind-address'],
    'socks-port': existingConfig['socks-port'],
    'allow-lan': existingConfig['allow-lan'],
    'rules': existingConfig['rules'] || subscriptionConfig['rules'],
  }

  // 写入合并后的配置
  fs.writeFileSync(CONFIG_PATH, YAML.stringify(mergedConfig))

  // 尝试热重载
  if (await isClashRunning()) {
    try {
      await reloadConfig(CONFIG_PATH)
      spinner.succeed('Clash 配置已切换并热重载生效')
    } catch (err) {
      spinner.warn(`配置已切换，但热重载失败: ${err.message}`)
    }
  } else {
    spinner.succeed('配置已切换（Clash 未运行，将在下次启动时生效）')
  }
}
