import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import zlib from 'zlib'
import AdmZip from 'adm-zip'
import { fileURLToPath } from 'url'
import ora from 'ora'
import cliProgress from 'cli-progress'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MIHOMO_VERSION_URL = 'https://github.com/MetaCubeX/mihomo/releases/latest/download/version.txt'

const PLATFORM_MAP = {
  'win32-x64': 'mihomo-windows-amd64-compatible',
  'win32-ia32': 'mihomo-windows-386',
  'win32-arm64': 'mihomo-windows-arm64',
  'darwin-x64': 'mihomo-darwin-amd64-compatible',
  'darwin-arm64': 'mihomo-darwin-arm64',
  'linux-x64': 'mihomo-linux-amd64-compatible',
  'linux-arm64': 'mihomo-linux-arm64',
}

export async function downloadClash(targetDir) {
  const platform = os.platform()
  const arch = os.arch()
  const key = `${platform}-${arch}`
  const name = PLATFORM_MAP[key]

  if (!name) {
    throw new Error(`不支持的平台: ${platform}-${arch}`)
  }

  // 1. 获取最新版本
  const spinner = ora('正在获取最新 Mihomo 版本信息...').start()
  let version
  try {
    const { data } = await axios.get(MIHOMO_VERSION_URL)
    version = data.trim()
    spinner.succeed(`检测到最新版本: ${version}`)
  } catch (e) {
    spinner.fail(`获取版本信息失败: ${e.message}`)
    throw new Error(`获取版本信息失败: ${e.message}`)
  }

  // 2. 构建下载 URL
  const isWin = platform === 'win32'
  const urlExt = isWin ? 'zip' : 'gz'
  const downloadUrl = `https://github.com/MetaCubeX/mihomo/releases/download/${version}/${name}-${version}.${urlExt}`
  const tempFileName = `mihomo-temp.${urlExt}`
  const tempPath = path.join(targetDir, tempFileName)
  const targetBinName = `clash-meta${isWin ? '.exe' : ''}`
  const targetBinPath = path.join(targetDir, targetBinName)

  // 3. 下载文件
  console.log(`正在下载: ${downloadUrl}`)
  const bar = new cliProgress.SingleBar(
    {
      format: '下载进度 | {bar} | {percentage}% | {valueFormatted}/{totalFormatted} MB',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  )

  try {
    let started = false
    let totalMB = '0.0'
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      onDownloadProgress: progressEvent => {
        if (progressEvent.total) {
          const loadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(1)
          if (!started) {
            totalMB = (progressEvent.total / 1024 / 1024).toFixed(1)
            bar.start(progressEvent.total, 0, {
              valueFormatted: '0.0',
              totalFormatted: totalMB,
            })
            started = true
          }
          bar.update(progressEvent.loaded, {
            valueFormatted: loadedMB,
            totalFormatted: totalMB,
          })
        }
      },
    })
    bar.stop()

    fs.writeFileSync(tempPath, response.data)
    spinner.start(chalk.green('下载完成，正在解压...'))
  } catch (e) {
    bar.stop()
    throw new Error(`下载失败: ${e.message}`)
  }

  // 4. 解压文件
  try {
    if (isWin) {
      // ZIP 解压
      const zip = new AdmZip(tempPath)
      const zipEntries = zip.getEntries()
      // 查找可执行文件（通常名字包含 mihoo 或 name）
      const entry = zipEntries.find(e => e.entryName.includes(name) || e.entryName.endsWith('.exe'))
      if (!entry) {
        throw new Error('压缩包中未找到可执行文件')
      }
      zip.extractEntryTo(entry, targetDir, false, true, false, targetBinName)
    } else {
      // GZ 解压
      const fileContents = fs.readFileSync(tempPath)
      const unzipped = zlib.gunzipSync(fileContents)
      fs.writeFileSync(targetBinPath, unzipped)
    }

    // 清理临时文件
    fs.unlinkSync(tempPath)
    spinner.succeed(chalk.green(`解压完成: ${targetBinPath}`))
  } catch (e) {
    spinner.fail(chalk.red(`解压失败: ${e.message}`))
    throw new Error(`解压失败: ${e.message}`)
  }

  // 5. 设置权限
  if (!isWin) {
    spinner.start('正在设置执行权限...')
    fs.chmodSync(targetBinPath, 0o755)
    spinner.succeed(chalk.green('设置执行权限完成'))
  }

  return targetBinPath
}

function testDownload() {
  // 测试下载功能
  const rootDir = path.join(__dirname, '..')
  downloadClash(rootDir)
    .then(binPath => {
      console.log(`Mihomo 内核已下载并解压到: ${binPath}`)
    })
    .catch(err => {
      console.error(`下载失败: ${err.message}`)
    })
}

// 如果直接运行此文件，则执行测试
if (import.meta.url === `file://${process.argv[1]}`) testDownload()
