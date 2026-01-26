import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import YAML from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_PATH = path.join(__dirname, '../../config.yaml')

// 规则类型映射
const RULE_TYPES = {
  domain: 'DOMAIN',
  suffix: 'DOMAIN-SUFFIX',
  keyword: 'DOMAIN-KEYWORD',
  ip: 'IP-CIDR',
  geosite: 'GEOSITE',
  geoip: 'GEOIP',
}

// 解析单条规则
function parseRule(ruleStr) {
  const parts = ruleStr.split(',')
  if (parts.length < 3) return null

  const type = parts[0].toUpperCase()
  const pattern = parts[1]
  const target = parts[2]

  return { type, pattern, target, original: ruleStr }
}

// 按类型分组规则
function groupRules(rules) {
  const groups = {
    DOMAIN: [],
    'DOMAIN-SUFFIX': [],
    'DOMAIN-KEYWORD': [],
    'IP-CIDR': [],
    GEOSITE: [],
    GEOIP: [],
    OTHER: [],
  }

  for (const rule of rules) {
    const parsed = parseRule(rule)
    if (!parsed) {
      groups.OTHER.push({ pattern: rule, target: '' })
      continue
    }
    if (groups[parsed.type]) {
      groups[parsed.type].push(parsed)
    } else {
      groups.OTHER.push(parsed)
    }
  }

  return groups
}

// 过滤规则（模糊查询）
function filterRules(rules, keyword) {
  if (!keyword) return rules
  const lowerKeyword = keyword.toLowerCase()
  return rules.filter(r => r.pattern.toLowerCase().includes(lowerKeyword))
}

// 列出规则
export async function listRules(keyword) {
  if (!fs.existsSync(CONFIG_PATH)) {
    return console.log(chalk.yellow('配置文件不存在，请先添加订阅'))
  }

  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8')
  const config = YAML.parse(configContent)
  const rules = config.rules || []

  if (rules.length === 0) {
    console.log(chalk.yellow('暂未配置规则'))
    return
  }

  // 过滤
  const filteredRules = keyword ? rules.filter(r => r.toLowerCase().includes(keyword.toLowerCase())) : rules

  // 分组
  const groups = groupRules(filteredRules)

  console.log(chalk.cyan('\n=== 代理规则 ===\n'))

  for (const [type, items] of Object.entries(groups)) {
    if (items.length === 0) continue

    console.log(chalk.white(`【${type}】`))
    for (const item of items) {
      console.log(`  ${chalk.green(item.pattern)} -> ${chalk.yellow(item.target)}`)
    }
    console.log()
  }

  if (keyword && filteredRules.length < rules.length) {
    console.log(chalk.gray(`(显示 ${filteredRules.length}/${rules.length} 条规则)`))
  }
}

// 添加规则
export async function addRule(options) {
  const { type, pattern, target } = options

  if (!type || !pattern || !target) {
    return console.error(chalk.red('错误: 需要指定类型、模式和目标'))
  }

  const ruleType = RULE_TYPES[type.toLowerCase()]
  if (!ruleType) {
    return console.error(chalk.red(`不支持的规则类型: ${type}`))
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    return console.error(chalk.red('配置文件不存在，请先添加订阅'))
  }

  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8')
  const config = YAML.parse(configContent)

  if (!config.rules) {
    config.rules = []
  }

  // 检查是否已存在相同规则
  const newRule = `${ruleType},${pattern},${target}`
  const exists = config.rules.some(r => {
    const parsed = parseRule(r)
    return parsed && parsed.type === ruleType && parsed.pattern === pattern
  })

  if (exists) {
    return console.log(chalk.yellow(`规则已存在: ${pattern}`))
  }

  config.rules.push(newRule)

  fs.writeFileSync(CONFIG_PATH, YAML.stringify(config, { lineWidth: -1 }))

  console.log(chalk.green(`规则添加成功: ${ruleType},${pattern},${target}`))
}

// 删除规则（可选功能）
export async function deleteRule(pattern) {
  if (!pattern) {
    return console.error(chalk.red('错误: 需要指定要删除的模式'))
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    return console.error(chalk.red('配置文件不存在'))
  }

  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8')
  const config = YAML.parse(configContent)

  if (!config.rules || config.rules.length === 0) {
    return console.log(chalk.yellow('暂未配置规则'))
  }

  const beforeCount = config.rules.length
  config.rules = config.rules.filter(r => {
    const parsed = parseRule(r)
    return !parsed || parsed.pattern !== pattern
  })

  if (config.rules.length === beforeCount) {
    return console.log(chalk.yellow(`未找到匹配规则: ${pattern}`))
  }

  fs.writeFileSync(CONFIG_PATH, YAML.stringify(config, { lineWidth: -1 }))

  console.log(chalk.green(`规则删除成功: ${pattern}`))
}
