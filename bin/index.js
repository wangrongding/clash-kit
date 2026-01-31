#!/usr/bin/env node

import { Command } from 'commander'
import { createRequire } from 'module'
import { init } from '../lib/commands/init.js'
import { start } from '../lib/commands/start.js'
import { restart } from '../lib/commands/restart.js'
import { stop } from '../lib/commands/stop.js'
import { setSysProxy } from '../lib/commands/sysproxy.js'
import { setTun } from '../lib/commands/tun.js'
import { status } from '../lib/commands/status.js'
import { manageSub } from '../lib/commands/sub.js'
import { proxy } from '../lib/commands/proxy.js'
import { test } from '../lib/commands/test.js'
import updateNotifier from 'update-notifier'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

updateNotifier({
  pkg: pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24, // 检查更新间隔，1 day
  shouldNotifyInNpmScript: true,
}).notify({
  isGlobal: true,
  boxenOptions: {
    title: '有新版本的 Clash Kit 可用',
    padding: 1,
    margin: 1,
    align: 'center',
    borderColor: 'yellowBright',
    borderStyle: 'round',
  },
})
const program = new Command()

program.name('clash').alias('ck').description('Clash CLI 管理工具 (Alias: ck)').version(pkg.version, '-v, --version')

// 初始化 clash 内核
program
  .command('init')
  .description('初始化 Clash 内核 (下载、解压并设置权限)')
  .option('-f, --force', '强制重新下载内核')
  .action(init)

// 启动 clash 服务
program
  .command('on')
  .alias('start')
  .description('启动 Clash 服务, -s 自动开启系统代理, -t 自动开启 TUN 模式(全局代理)')
  .option('-s, --sysproxy', '启动后自动开启系统代理')
  .option('-t, --tun', '启动后自动开启 TUN 模式')
  .action(start)

// 停止 clash 服务
program.command('off').alias('stop').description('停止 Clash 服务').action(stop)

// 重启 clash 服务
program
  .command('restart')
  .alias('re')
  .alias('rs')
  .description('重启 Clash 服务')
  .option('-s, --sysproxy', '启动后自动开启系统代理')
  .option('-t, --tun', '启动后自动开启 TUN 模式')
  .action(restart)

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
program.command('info').alias('status').alias('view').description('查看 Clash 运行状态').action(status)

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
program
  .command('use')
  .aliases(['node', 'proxy', 'switch'])
  .description('切换节点 (别名: node, proxy, switch)')
  .action(proxy)

// 列出所有节点，并测速
program
  .command('list')
  .alias('ls')
  .alias('test')
  .alias('t')
  .description('节点测速 (别名: list, ls, test, t) ')
  .action(test)

// Support -V for version
if (process.argv.includes('-V')) {
  process.argv[process.argv.indexOf('-V')] = '-v'
}

program.parse(process.argv)
