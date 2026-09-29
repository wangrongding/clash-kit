import fs from 'fs'
import path from 'path'
import { CURRENT_GROUP_PATH } from './paths.js'

// 记录 / 读取用户最后切换的节点组，让 ck list / ck status 与 ck use 保持一致。

export function getCurrentGroup() {
  try {
    const name = fs.readFileSync(CURRENT_GROUP_PATH, 'utf8').trim()
    return name || null
  } catch {
    return null
  }
}

export function setCurrentGroup(name) {
  try {
    fs.mkdirSync(path.dirname(CURRENT_GROUP_PATH), { recursive: true })
    fs.writeFileSync(CURRENT_GROUP_PATH, name, 'utf8')
  } catch {
    // 写入失败不影响切换本身
  }
}

// 解析要展示的组：优先用户最后切换的组（若仍存在且为 Selector），否则回退 Proxy / 第一个 Selector。
export function resolveCurrentGroup(proxies) {
  const remembered = getCurrentGroup()
  if (remembered && proxies[remembered] && proxies[remembered].type === 'Selector') {
    return proxies[remembered]
  }
  return proxies['Proxy'] || Object.values(proxies).find(p => p.type === 'Selector')
}
