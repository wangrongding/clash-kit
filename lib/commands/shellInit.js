import fs from 'fs'
import os from 'os'
import path from 'path'
import chalk from 'chalk'

const FUNC_START = '# >>> clash-kit shell function >>>'
const FUNC_END = '# <<< clash-kit shell function <<<'

// 包装函数：让 `ck sys on/off` 通过 eval 在当前终端立即生效，而不写入任何代理状态。
// 函数体兼容 bash 与 zsh。
const FN_TEXT = [
  FUNC_START,
  'ck() {',
  '  case "$1 $2" in',
  '    "sys on")  eval "$(command ck sys on --export)" ;;',
  '    "sys off") eval "$(command ck sys off --export)" ;;',
  '    *) command ck "$@" ;;',
  '  esac',
  '}',
  FUNC_END,
  '',
].join('\n')

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function blockRegex() {
  return new RegExp(
    `\\r?\\n*${escapeRegExp(FUNC_START)}[\\s\\S]*?${escapeRegExp(FUNC_END)}\\r?\\n*`,
    'g',
  )
}

function upsert(filePath) {
  if (!fs.existsSync(filePath)) return false
  let content = fs.readFileSync(filePath, 'utf8')
  content = content.replace(blockRegex(), '\n').replace(/\n{3,}/g, '\n\n').trimEnd()
  fs.writeFileSync(filePath, `${content}\n${FN_TEXT}`, 'utf8')
  return true
}

function rcFiles() {
  const home = os.homedir()
  return ['.bashrc', '.zshrc', '.profile'].map(file => path.join(home, file))
}

export async function shellInit() {
  const existing = rcFiles().filter(file => fs.existsSync(file))
  // 三个文件都不存在时，退化为创建 ~/.bashrc
  const targets = existing.length > 0 ? existing : [path.join(os.homedir(), '.bashrc')]

  const written = []
  for (const file of targets) {
    try {
      if (upsert(file)) written.push(file)
    } catch (err) {
      console.error(chalk.red(`写入 ${file} 失败: ${err.message}`))
    }
  }

  if (written.length === 0) {
    console.error(chalk.red('未能写入任何 shell 配置文件 (~/.bashrc / ~/.zshrc / ~/.profile)'))
    return
  }

  console.log(chalk.green(`✓ 已安装 ck 包装函数到 ${written.length} 个文件:`))
  for (const file of written) console.log(chalk.gray(`  ${file}`))
  console.log(chalk.gray('之后直接使用 `ck sys on` / `ck sys off` 即可在当前终端立即生效，新终端默认 direct。'))
  console.log(chalk.yellow('注意: 当前已打开的终端需先执行一次: source ~/.bashrc  (或 ~/.zshrc / ~/.profile)'))
}
