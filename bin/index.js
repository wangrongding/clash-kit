#!/usr/bin/env node

import { Command } from 'commander'
import { select, input } from '@inquirer/prompts'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { main as startClashService } from '../index.js'
import * as api from '../lib/api.js'
import * as sub from '../lib/subscription.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const program = new Command()

program.name('clash').description('Clash CLI 管理工具').version('1.0.0')

// 1. Init 命令
program
  .command('init')
  .description('初始化 Clash 二进制文件权限')
  .action(() => {
    const binPath = path.join(__dirname, '../clash-meta')
    console.log(`正在设置权限: ${binPath}`)
    try {
      if (!fs.existsSync(binPath)) {
        console.error(`错误: 找不到文件 ${binPath}`)
        process.exit(1)
      }
      fs.chmodSync(binPath, 0o755)
      console.log('权限设置成功！')
    } catch (err) {
      console.error(`权限设置失败: ${err.message}`)
    }
  })

// 2. Start 命令
program
  .command('start')
  .description('启动 Clash 服务')
  .action(() => {
    startClashService()
  })

// 2.1 Stop 命令
program
  .command('stop')
  .description('停止 Clash 服务')
  .action(() => {
    try {
      // 使用 pkill 匹配进程名包含 clash-meta 的进程
      execSync('pkill -f clash-meta')
      console.log('Clash 服务已停止')
    } catch (err) {
      // pkill 如果没找到进程会抛出错误，这里捕获并提示
      console.log('未找到运行中的 Clash 服务，或已停止')
    }
  })

// 2.2 Status 命令
program
  .command('status')
  .description('查看 Clash 运行状态')
  .action(async () => {
    try {
      const config = await api.getConfig()
      const apiBase = api.getApiBase()
      const currentProfile = sub.getCurrentProfile()

      console.log('\n=== Clash 状态 ===')
      console.log(`状态: \x1b[32m运行中\x1b[0m`)
      console.log(`当前配置: ${currentProfile || '未知 (默认或手动修改)'}`)
      console.log(`API 地址: ${apiBase}`)
      console.log(`运行模式: ${config.mode}`)
      console.log(`HTTP 端口: ${config['port'] || '未设置'}`)
      console.log(`Socks5 端口: ${config['socks-port'] || '未设置'}`)
      if (config['mixed-port']) {
        console.log(`Mixed 端口: ${config['mixed-port']}`)
      }

      const proxies = await api.getProxies()

      // 过滤出 Selector 类型的代理组
      const selectors = Object.entries(proxies)
        .filter(([name, proxy]) => proxy.type === 'Selector')
        .map(([name, proxy]) => ({ name, now: proxy.now }))

      console.log('\n=== 节点信息 ===')

      if (selectors.length === 0) {
        console.log('未找到节点选择组。')
      } else {
        for (const { name, now } of selectors) {
          process.stdout.write(`组 [${name}] 当前节点: ${now} ... 测速中`)
          const delay = await api.getProxyDelay(now)

          let delayStr = ''
          if (delay > 0) {
            if (delay < 200) delayStr = `\x1b[32m${delay}ms\x1b[0m`
            else if (delay < 500) delayStr = `\x1b[33m${delay}ms\x1b[0m`
            else delayStr = `\x1b[31m${delay}ms\x1b[0m`
          } else {
            delayStr = `\x1b[31m超时/失败\x1b[0m`
          }

          process.stdout.clearLine(0)
          process.stdout.cursorTo(0)
          console.log(`组 [${name}] 当前节点: ${now} - 延迟: ${delayStr}`)
        }
      }
    } catch (err) {
      if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('无法连接'))) {
        console.log('\n=== Clash 状态 ===')
        console.log(`状态: \x1b[31m未运行\x1b[0m`)
        console.log('提示: 请使用 `clash start` 启动服务')
      } else {
        console.error(`获取状态失败: ${err.message}`)
      }
    }
  })

// 3. Subscribe 命令
program
  .command('sub')
  .description('管理订阅')
  .option('-a, --add <url>', '添加订阅链接')
  .option('-n, --name <name>', '订阅名称')
  .option('-l, --list', '列出所有订阅')
  .option('-u, --use <name>', '切换使用的订阅')
  .action(async options => {
    if (options.add) {
      if (!options.name) {
        console.error('错误: 添加订阅时必须指定名称 (-n)')
        return
      }
      try {
        console.log(`正在下载订阅: ${options.add}...`)
        await sub.downloadSubscription(options.add, options.name)
        console.log(`订阅 ${options.name} 添加成功！`)
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
        console.log(`已切换到订阅: ${options.use}`)
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
        console.log(`已切换到订阅: ${profile}`)
      } else if (action === 'add') {
        const url = await input({ message: '请输入订阅链接:' })
        const name = await input({ message: '请输入订阅名称:' })

        try {
          console.log('正在下载...')
          await sub.downloadSubscription(url, name)
          console.log('添加成功！')
        } catch (err) {
          console.error(err.message)
        }
      }
    }
  })

// 4. Proxy 命令 (切换节点)
program
  .command('proxy')
  .description('切换节点')
  .action(async () => {
    try {
      const proxies = await api.getProxies()
      // 通常我们只关心 Proxy 组或者 Selector 类型的组
      const groups = Object.values(proxies).filter(p => p.type === 'Selector')

      if (groups.length === 0) {
        console.log('没有找到可选的节点组')
        return
      }

      // 选择组
      const groupName = await select({
        message: '请选择节点组:',
        choices: groups.map(g => ({ name: g.name, value: g.name })),
      })

      const group = proxies[groupName]

      // 选择节点
      const proxyName = await select({
        message: `[${groupName}] 当前: ${group.now}, 请选择节点:`,
        choices: group.all.map(n => ({ name: n, value: n })),
      })

      await api.switchProxy(groupName, proxyName)
      console.log(`已切换 ${groupName} -> ${proxyName}`)
    } catch (err) {
      console.error(err.message)
    }
  })

// 5. test 命令
program
  .command('test')
  .description('节点测速')
  .action(async () => {
    try {
      const proxies = await api.getProxies()
      // 默认测速 Proxy 组的所有节点
      const group = proxies['Proxy'] || Object.values(proxies).find(p => p.type === 'Selector')

      if (!group) {
        console.error('找不到 Proxy 组')
        return
      }

      console.log(`\n当前测速目标组: [${group.name}]`)
      console.log(`包含节点数: ${group.all.length}`)
      console.log('注意: 测速针对的是当前 Clash 正在运行的配置。')
      console.log('如果刚切换了订阅，请确保看到"配置已热重载生效"提示，或手动重启 clash start。\n')

      const results = []
      for (const name of group.all) {
        process.stdout.write(`测速中: ${name} ... `)
        const delay = await api.getProxyDelay(name)
        if (delay > 0) {
          console.log(`${delay}ms`)
          results.push({ name, delay })
        } else {
          console.log('超时/失败')
          results.push({ name, delay: 99999 })
        }
      }

      console.log('\n=== 测速结果 (Top 5) ===')
      results.sort((a, b) => a.delay - b.delay)
      results.slice(0, 5).forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}: ${r.delay === 99999 ? '超时' : r.delay + 'ms'}`)
      })
    } catch (err) {
      console.error(err.message)
    }
  })

program.parse(process.argv)
