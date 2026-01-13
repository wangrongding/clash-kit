import { select, input } from '@inquirer/prompts'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import * as sub from '../subscription.js'

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
  if (options.add) {
    if (!options.name) {
      console.error('错误: 添加订阅时必须指定名称 (-n)')
      return
    }
    try {
      await handleAddSubscription(options.add, options.name)
    } catch (err) {
      console.error(err.message)
    }
  } else if (options.list) {
    const profiles = sub.listProfiles()
    console.log('可用订阅:')
    profiles.forEach(p => console.log(`- ${p}`))
  } else if (options.use) {
    try {
      await sub.useProfile(options.use)
    } catch (err) {
      console.error(err.message)
    }
  } else {
    // 交互式模式
    const profiles = sub.listProfiles()

    const action = await select({
      message: '请选择操作:',
      choices: [
        { name: '切换订阅', value: 'switch' },
        { name: '添加订阅', value: 'add' },
      ],
    })

    if (action === 'switch') {
      if (profiles.length === 0) {
        console.log('暂无订阅，请先添加')
        return
      }
      const profile = await select({
        message: '选择要使用的订阅:',
        choices: profiles.map(p => ({ name: p, value: p })),
      })
      await sub.useProfile(profile)
    } else if (action === 'add') {
      const url = await input({ message: '请输入订阅链接:' })
      const name = await input({ message: '请输入订阅名称:' })

      try {
        await handleAddSubscription(url, name)
      } catch (err) {
        console.error(err.message)
      }
    }
  }
}
