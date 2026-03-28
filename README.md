# Clash Kit

<a target="_blank" href="https://github.com/wangrongding/clash-kit"><img src="https://img.shields.io/github/stars/wangrongding/clash-kit" alt="GitHub stars" /></a>
<a target="_blank" href="https://www.npmjs.com/package/clash-kit"><img src="https://img.shields.io/npm/dt/clash-kit?style=flat&label=downloads&color=cb3837&labelColor=cb0000&logo=npm" alt="npm downloads"/></a>

一个基于 Node.js 的 Clash 命令行管理工具，旨在简化 Clash 的配置管理、订阅切换和节点测速等操作。

目前已兼容 Windows，MacOs，Linux。

<img width="604" height="315" alt="image" src="https://github.com/user-attachments/assets/7c97ef51-5a95-4612-aa43-ce66423d7560" />

## 特性

- 🔄 **订阅管理**：支持添加、切换、修改、删除多个订阅源。
- 🌐 **节点切换**：交互式选择并切换当前使用的代理节点。
- 🔥 **热重载**：切换订阅/开关 TUN 后立即生效，无需重启服务。
- ⚡ **节点测速**：支持多线程并发测速，彩色高亮显示延迟结果。
- 📊 **状态监控**：实时查看服务运行状态、当前节点及延迟。
- 🛠 **自动初始化**：自动处理二进制文件权限问题。

- 💻 **系统代理**：一键开启/关闭 macOS 系统 HTTP 代理。
- 🛡 **TUN 模式**：高级网络模式，接管系统所有流量（真 · 全局代理）。

## 安装

- 支持通过 npm 或其它任意包管理器全局安装：

```bash
npm install -g clash-kit
# 或者
pnpm add -g clash-kit
# 或者
yarn global add clash-kit
```

- 也支持通过 Homebrew 安装：

```bash
# 1. 先通过 brew tap 添加仓库
brew tap wangrongding/clash-kit https://github.com/wangrongding/clash-kit
# 2. 安装 clash-kit
brew install clash-kit
```

## 使用

### 1. 初始化

首次安装后，需要先初始化 Clash 内核与权限：

```bash
# 推荐用简化命令（文档后续均以简化命令为例）
ck init # 或者 clash init
```

### 3. 管理订阅

```bash
# 交互式管理订阅（添加、切换、修改、删除）【推荐】
ck sub

# 列出所有订阅
ck sub -l

# 手动添加订阅（-n 名称，-a 链接）
ck sub -n "test123" -a "https://example.com/subscribe?token=xxx"

# 手动切换订阅
ck sub -u "test123"
```

交互式模式 (`ck sub`) 提供以下操作：

| 操作     | 说明                                       |
| -------- | ------------------------------------------ |
| 切换订阅 | 从现有订阅中选择并立即生效（热重载）       |
| 添加订阅 | 依次输入名称和链接，完成下载               |
| 修改订阅 | 重命名 和/或 更换订阅链接（均可留空跳过）  |
| 删除订阅 | 选择后需二次确认，若删除当前订阅会自动解绑 |

### 4. 启动服务

启动 Clash 核心服务（建议在一个单独的终端窗口运行）：

```bash
# 启动 Clash 代理服务
ck on # 或者 ck start

# 启动并自动开启系统代理
ck on -s
# 启动并自动开启 TUN 模式(全局代理, 需要 sudo 权限)
ck on -t
```

### 5. 关闭服务 或 重新启动服务

```bash
# 关闭服务
ck off # 或者 ck stop

# 重新启动服务
ck rs # 或者 ck restart
```

### 6. 节点切换（自动测速）

进入交互式界面，自动对当前节点组进行并发测速，并展示带有即时延迟数据的节点列表供选择。

```bash
# 切换节点 (支持别名: node, proxy, switch)
ck use
```

### 7. 更多功能

```bash
# 查看状态
ck info # 或者 ck status, ck view

# 节点并发测速 (仅测速不切换，支持别名: test, ls, t)
ck ls # 或者 ck list，ck test，ck t

# 设置系统代理
ck sys on
ck sys off

# 开启 TUN 模式 (需要 sudo 权限)
ck tun on # 开启
ck tun off # 关闭
```

## 命令详解

| 命令 (别名)                   | 说明                       | 示例                                                                     |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| `ck init`                     | 初始化内核及权限           | `ck init`                                                                |
| `ck on` (`start`)             | 启动 Clash 服务            | `ck on` `ck on -s` (启动并设置系统代理) `ck on -t` (启动并开启 TUN 模式) |
| `ck off` (`stop`)             | 停止服务并关闭代理         | `ck off`                                                                 |
| `ck rs` (`restart`)           | 重启 Clash 服务            | `ck rs` `ck rs -s` (重启并设置系统代理) `ck rs -t` (重启并开启 TUN 模式) |
| `ck info` (`status`, `view`)  | 查看运行状态及当前节点延迟 | `ck info` / `ck status` / `ck view`                                      |
| `ck sysproxy` (`sys`)         | 设置系统代理               | `ck sys on` / `ck sys off`                                               |
| `ck tun`                      | 设置 TUN 模式 (需要 sudo)  | `ck tun on` / `ck tun off`                                               |
| `ck sub`                      | 管理订阅（交互式）【推荐】 | `ck sub`                                                                 |
| `ck sub -l`                   | 列出所有订阅               | `ck sub -l`                                                              |
| `ck sub -n <name> -a <url>`   | 添加订阅                   | `ck sub -n "pro" -a "http..."`                                           |
| `ck sub -u <name>`            | 切换订阅                   | `ck sub -u "pro"`                                                        |
| `ck use` (`node`, `switch`)   | 切换节点 (自动测速)        | `ck use` / `ck node`                                                     |
| `ck list` (`ls`, `test`, `t`) | 节点测速列表 (不切换)      | `ck list` / `ck test`                                                    |

## 截图

<img width="1920" alt="image" src="https://github.com/user-attachments/assets/1183f778-62b0-4ac7-ab55-b821b66161f0" />

## License

[MIT](./LICENSE).

开源不易，点赞鼓励！
点一个 Star⭐️ 支持我们~ 🌸Let's enjoy it!
