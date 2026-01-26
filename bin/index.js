#!/usr/bin/env node

import { Command } from 'commander'
import { install } from '../lib/commands/install.js'
import { init } from '../lib/commands/init.js'
import { start } from '../lib/commands/start.js'
import { stop } from '../lib/commands/stop.js'
import { setSysProxy } from '../lib/commands/sysproxy.js'
import { setTun } from '../lib/commands/tun.js'
import { status } from '../lib/commands/status.js'
import { manageSub } from '../lib/commands/sub.js'
import { proxy } from '../lib/commands/proxy.js'
import { test } from '../lib/commands/test.js'
import { listRules, addRule, deleteRule } from '../lib/commands/rule.js'

const program = new Command()

program.name('clash').alias('ck').description('Clash CLI 管理工具 (Alias: ck)').version('1.0.0')

// 安装服务
program
  .command('install')
  .description('安装 Clash 服务并设置开机自启 (需要 root 权限)')
  .action(install)

// 初始化 clash 内核
program
  .command('init')
  .description('初始化 Clash 内核 (下载、解压并设置权限)')
  .option('-f, --force', '强制重新下载内核')
  .action(init)

// 启动 clash 服务
program.command('start').description('启动 Clash 服务').option('-s, --sysproxy', '启动后自动开启系统代理').action(start)

// 停止 clash 服务
program.command('stop').description('停止 Clash 服务').action(stop)

// 设置系统代理
program
  .command('sysproxy')
  .alias('sys')
  .description('设置系统代理')
  .argument('[action]', 'on 或 off')
  .action(setSysProxy)

// 设置 TUN 模式（真正的全局代理，所有流量都会被代理）
program.command('tun').description('设置 TUN 模式 (可能需要提权)').argument('[action]', 'on 或 off').action(setTun)

// 查看 clash 状态
program.command('status').alias('st').description('查看 Clash 运行状态').action(status)

// 管理订阅
program
  .command('sub')
  .description('管理订阅')
  .option('-a, --add <url>', '添加订阅链接')
  .option('-n, --name <name>', '订阅名称')
  .option('-l, --list', '列出所有订阅')
  .option('-u, --use <name>', '切换使用的订阅')
  .action(manageSub)

// 切换节点
program.command('proxy').alias('p').description('切换节点').action(proxy)

// 节点测速
program.command('test').alias('t').description('节点测速').action(test)

// 管理规则
const ruleCommand = program.command('rule').description('管理代理规则')

ruleCommand.command('ls [keyword]').description('查看规则，支持模糊查询').action(keyword => listRules(keyword))

ruleCommand
  .command('add')
  .description('添加规则')
  .requiredOption('-t, --type <type>', '规则类型: domain|suffix|keyword|ip')
  .requiredOption('-p, --pattern <pattern>', '匹配模式')
  .requiredOption('-T, --target <target>', '目标: PROXY|DIRECT|REJECT 等')
  .action(options => addRule({ type: options.type, pattern: options.pattern, target: options.target }))

ruleCommand
  .command('del')
  .description('删除规则')
  .requiredOption('-p, --pattern <pattern>', '要删除的匹配模式')
  .action(options => deleteRule(options.pattern))

program.parse(process.argv)
