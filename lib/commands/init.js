import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { downloadClash } from '../kernel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_CONFIG = `mixed-port: 7890
`

export async function init(options) {
  const rootDir = path.join(__dirname, '../..')
  const binName = process.platform === 'win32' ? 'clash-meta.exe' : 'clash-meta'
  const binPath = path.join(rootDir, binName)
  const configPath = path.join(rootDir, 'config.yaml')

  try {
    // 创建默认配置文件（如果不存在）
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, DEFAULT_CONFIG, 'utf8')
      console.log(`已创建默认配置文件: ${configPath}`)
    }

    if (fs.existsSync(binPath) && !options.force) {
      console.log(`Clash 内核已存在: ${binPath}`)
      console.log('正在检查权限...')
      if (process.platform !== 'win32') {
        // 检查是否已有 SUID 权限，如果有则不再重置为 755
        const stats = fs.statSync(binPath)
        const hasSuid = (stats.mode & 0o4000) === 0o4000

        if (!hasSuid) {
          fs.chmodSync(binPath, 0o755)
          console.log('权限已设置为 755 (普通执行权限)。')
        } else {
          console.log('检测到 SUID 权限，保持不变。')
        }
      }
      console.log('权限检查通过！')
      return
    }

    if (options.force && fs.existsSync(binPath)) {
      console.log('强制更新模式，正在移除旧内核...')
      try {
        fs.unlinkSync(binPath)
      } catch (e) {}
    }

    console.log('正在初始化 Clash 内核...')
    await downloadClash(rootDir)
    console.log('Clash 内核初始化成功！')
  } catch (err) {
    console.error(`初始化失败: ${err.message}`)
    process.exit(1)
  }
}
