import { select, input } from '@inquirer/prompts'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import * as sub from '../subscription.js'
import { confirm } from '@inquirer/prompts'
import { CLASH_BIN_PATH } from '../../index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function handleAddSubscription(url, name) {
  const profiles = sub.listProfiles()
  // 没有找到可选的订阅，或没找到 config.yaml
  // __dirname here is lib/commands. Config is at ROOT/config.yaml. so join ../../config.yaml
  const isFirst = profiles.length === 0 || !fs.existsSync(path.join(__dirname, '../../config.yaml'))

  await sub.downloadSubscription(url, name)

  if (!isFirst) return
  console.log(`检测到这是第一个订阅，正在自动切换到 ${name}...`)
  await sub.useProfile(name)
}

export async function manageSub(options) {
  // 检查 clash-kit 二进制文件是否存在
  if (!fs.existsSync(CLASH_BIN_PATH)) {
    return console.error(chalk.red('\n找不到 Clash.Meta 内核文件,请先运行 clash init 命令初始化内核！\n'))
  }

  if (options.add) {
    if (!options.name) return console.error('错误: 添加订阅时必须指定名称 (-n)')
    try {
      await handleAddSubscription(options.add, options.name)
    } catch (err) {
      console.error(err.message)
    }
  } else if (options.list) {
    const profiles = sub.listProfiles()
    console.log(`${profiles.length ? '已添加的订阅:' : '暂无已添加的订阅'}`)
    profiles.forEach(p => console.log(`- ${p}`))
  } else if (options.use) {
    try {
      await sub.useProfile(options.use)
    } catch (err) {
      console.error(err.message)
    }
  } else if (options.delete) {
    try {
      sub.deleteProfile(options.delete)
      console.log(chalk.green(`订阅 "${options.delete}" 已删除`))
    } catch (err) {
      console.error(chalk.red(err.message))
    }
  } else {
    // 交互式模式
    const profiles = sub.listProfiles()

    const choices = [
      { name: '切换订阅', value: 'switch' },
      { name: '添加订阅', value: 'add' },
      { name: '修改订阅', value: 'edit' },
      { name: '删除订阅', value: 'delete' },
    ]

    const action = await select({ message: '请选择操作:', choices })

    if (action === 'switch') {
      if (profiles.length === 0) return console.log('暂无订阅，请先添加')
      const profile = await select({
        message: '选择要使用的订阅:',
        choices: profiles.map(p => ({ name: p, value: p })),
      })
      await sub.useProfile(profile)
    } else if (action === 'add') {
      const name = await input({ message: '请输入订阅名称:' })
      const url = await input({ message: '请输入订阅链接:' })
      try {
        await handleAddSubscription(url, name)
      } catch (err) {
        console.error(err.message)
      }
    } else if (action === 'edit') {
      if (profiles.length === 0) return console.log('暂无订阅，请先添加')
      const profile = await select({
        message: '选择要修改的订阅:',
        choices: profiles.map(p => ({ name: p, value: p })),
      })
      const newName = await input({ message: `新名称 (留空保持 "${profile}" 不变):` })
      const newUrl = await input({ message: '新订阅链接 (留空则不重新下载):' })
      const finalName = newName.trim() || profile
      try {
        if (newName.trim() && newName.trim() !== profile) {
          sub.renameProfile(profile, finalName)
          console.log(chalk.green(`已重命名: ${profile} → ${finalName}`))
        }
        if (newUrl.trim()) {
          await sub.downloadSubscription(newUrl.trim(), finalName)
        }
        if (!newName.trim() && !newUrl.trim()) {
          console.log(chalk.gray('未做任何修改'))
        }
      } catch (err) {
        console.error(chalk.red(err.message))
      }
    } else if (action === 'delete') {
      if (profiles.length === 0) return console.log('暂无订阅，请先添加')
      const profile = await select({
        message: '选择要删除的订阅:',
        choices: profiles.map(p => ({ name: p, value: p })),
      })
      const ok = await confirm({ message: `确定删除订阅 "${profile}"?`, default: false })
      if (!ok) return console.log(chalk.gray('已取消'))
      try {
        sub.deleteProfile(profile)
        console.log(chalk.green(`订阅 "${profile}" 已删除`))
      } catch (err) {
        console.error(chalk.red(err.message))
      }
    }
  }
}
