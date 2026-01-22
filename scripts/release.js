import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'
import chalk from 'chalk'

// 简单的日志包装
const log = {
  info: msg => console.log(chalk.blue('ℹ'), msg),
  success: msg => console.log(chalk.green('✔'), msg),
  error: msg => console.log(chalk.red('✖'), msg),
}

async function run() {
  try {
    // 1. 读取 package.json
    const pkgPath = path.resolve('package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const { name, version } = pkg
    
    log.info(`开始处理发布流程: ${name}@${version}`)

    // 2. npm pack 生成 tarball
    // npm pack 会输出生成的文件名，例如 clash-kit-1.1.0.tgz
    log.info('正在执行 npm pack...')
    const tgzName = execSync('npm pack', { encoding: 'utf-8' }).trim()
    const tgzPath = path.resolve(tgzName)
    
    if (!fs.existsSync(tgzPath)) {
      throw new Error(`未找到打包文件: ${tgzName}`)
    }
    log.success(`打包完成: ${tgzName}`)

    // 3. 计算 SHA256
    const fileBuffer = fs.readFileSync(tgzPath)
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    log.success(`计算 SHA256: ${hash}`)

    // 4. 更新 Formula 文件
    const formulaPath = path.resolve('Formula', 'clash-kit.rb')
    if (fs.existsSync(formulaPath)) {
      let content = fs.readFileSync(formulaPath, 'utf-8')
      
      // 更新 URL
      // 匹配 url "https://..."
      const urlRegex = /url "https:\/\/registry\.npmjs\.org\/.*?"/
      const newUrl = `url "https://registry.npmjs.org/${name}/-/${name}-${version}.tgz"`
      
      if (content.match(urlRegex)) {
        content = content.replace(urlRegex, newUrl)
        log.success(`更新 Formula URL: ${newUrl}`)
      } else {
        log.error('Formula 中未找到 url 字段，跳过更新 URL')
      }

      // 更新 SHA256
      const shaRegex = /sha256 "[a-f0-9]{64}"/
      const newSha = `sha256 "${hash}"`
      
      if (content.match(shaRegex)) {
        content = content.replace(shaRegex, newSha)
        log.success('更新 Formula SHA256')
      } else {
        log.error('Formula 中未找到 sha256 字段，跳过更新 SHA256')
      }

      fs.writeFileSync(formulaPath, content, 'utf-8')
      log.success('Formula 文件已保存')
    } else {
      log.error(`未找到 Formula 文件: ${formulaPath}`)
    }

    // 5. 提示后续操作
    // 这里我们可以选择直接帮用户 publish 这个 tgz，或者只是提示
    // 为了稳妥，我们提示用户
    
    console.log(chalk.yellow('\n----------------------------------------'))
    console.log(chalk.bold('下一步操作建议：'))
    console.log(chalk.cyan(`1. 发布 NPM 包 (使用生成的 tarball 以确保 hash 一致):`))
    console.log(`   npm publish ${tgzName}`)
    console.log(chalk.cyan(`2. 提交代码:`))
    console.log(`   git add package.json Formula/clash-kit.rb`)
    console.log(`   git commit -m "chore: release ${version}"`)
    console.log(`   git push`)
    console.log(chalk.cyan(`3. 清理文件:`))
    console.log(`   rm ${tgzName}`)
    console.log(chalk.yellow('----------------------------------------\n'))

  } catch (err) {
    log.error(`发生错误: ${err.message}`)
    process.exit(1)
  }
}

run()
