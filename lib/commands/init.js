import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { downloadClash } from '../kernel.js'
import axios from 'axios'
import ora from 'ora'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_CONFIG = `mixed-port: 7890\n`

const RESOURCES = [
  {
    filename: 'country.mmdb',
    url: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb',
  },
  // {
  //   filename: 'geoip.metadb',
  //   url: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb',
  // },
  // {
  //   filename: 'geosite.dat',
  //   url: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat',
  // },
  // {
  //   filename: 'geoip.dat',
  //   url: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat',
  // },
  // {
  //   filename: 'ASN.mmdb',
  //   url: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb',
  // },
]

async function downloadResource(resource, targetDir) {
  const filePath = path.join(targetDir, resource.filename)
  const spinner = ora(`正在下载 ${resource.filename}...`).start()

  try {
    const response = await axios({
      url: resource.url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30 * 1000, // 30s timeout
    })
    fs.writeFileSync(filePath, response.data)
    spinner.succeed(`${resource.filename} 下载完成`)
  } catch (e) {
    spinner.fail(`${resource.filename} 下载失败: ${e.message}`)
    // 不要抛出错误，让其他资源继续下载
    // throw e
  }
}

export async function init(options) {
  const rootDir = path.join(__dirname, '../..')
  const binName = process.platform === 'win32' ? 'clash-kit.exe' : 'clash-kit'
  const binPath = path.join(rootDir, binName)
  const configPath = path.join(rootDir, 'config.yaml')

  try {
    // 创建默认配置文件（如果不存在）
    if (!fs.existsSync(configPath)) {
      const defaultConfigPath = path.join(rootDir, 'default.yaml')
      if (fs.existsSync(defaultConfigPath)) {
        fs.copyFileSync(defaultConfigPath, configPath)
        console.log(`已从 default.yaml 创建配置文件: ${configPath}`)
      } else {
        console.warn(chalk.yellow('警告: 未找到 default.yaml，将创建最小配置文件'))
        fs.writeFileSync(configPath, DEFAULT_CONFIG, 'utf8')
      }
    }

    // 检查并下载资源文件
    console.log(chalk.blue('\n正在检查资源文件...'))
    for (const resource of RESOURCES) {
      const filePath = path.join(rootDir, resource.filename)
      if (options.force && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
        } catch (e) {}
      }

      if (!fs.existsSync(filePath)) {
        await downloadResource(resource, rootDir)
      } else {
        console.log(chalk.gray(`资源 ${resource.filename} 已存在`))
      }
    }
    console.log(chalk.green('资源检查完成\n'))

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

    console.log(chalk.bold.green('\n✅ 初始化完成！接下来：'))
    console.log(chalk.cyan('  1. ck sub      ') + chalk.gray('添加订阅'))
    console.log(chalk.cyan('  2. ck on    ') + chalk.gray('启动 Clash 服务'))
    console.log(chalk.cyan('  3. ck sys on   ') + chalk.gray('开启系统代理'))
    console.log(chalk.gray('\n  更多帮助: ck help\n'))
  } catch (err) {
    console.error(`初始化失败: ${err.message}`)
    process.exit(1)
  }
}
