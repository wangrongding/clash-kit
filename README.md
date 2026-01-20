# Clash Kit

一个基于 Node.js 的 Clash 命令行管理工具，旨在简化 Clash 的配置管理、订阅切换和节点测速等操作。

## 截图

<img width="1920" alt="image" src="https://github.com/user-attachments/assets/1183f778-62b0-4ac7-ab55-b821b66161f0" />

## 特性

- 🔄 **订阅管理**：支持添加、切换多个订阅源。
- 🌐 **节点切换**：交互式选择并切换当前使用的代理节点。
- 🔥 **热重载**：切换订阅后立即生效，无需重启服务。
- ⚡ **节点测速**：支持多线程并发测速，彩色高亮显示延迟结果。
- 📊 **状态监控**：实时查看服务运行状态、当前节点及延迟。
- 🛠 **自动初始化**：自动处理二进制文件权限问题。

- 💻 **系统代理**：一键开启/关闭 macOS 系统 HTTP 代理。
- 🛡 **TUN 模式**：高级网络模式，接管系统所有流量（真 · 全局代理）。

## 使用

### 1. 安装

```bash
npm install -g clash-kit
# 或者
pnpm add -g clash-kit
```

### 2. 初始化

首次安装后，需要先初始化 Clash 内核与权限：

```bash
clash init
# 推荐用简化命令（文档后续均以简化命令为例）
ck init
```

### 3. 添加订阅

```bash
# 交互式管理订阅（添加、切换、删除等）【推荐使用这种方式来管理订阅】
ck sub

# 列出所有订阅
ck sub -l

# 手动添加订阅
ck sub -a "https://example.com/subscribe?token=xxx" -n "abcName"
```

### 4. 启动服务

启动 Clash 核心服务（建议在一个单独的终端窗口运行）：

```bash
# 启动 Clash 代理服务
ck on # 或者 ck start

# 启动并自动开启系统代理
ck on -s

# 关闭服务并关闭系统代理
ck off # 或者 ck stop
```

### 4. 节点切换（自动测速）

进入交互式界面，自动对当前节点组进行并发测速，并展示带有即时延迟数据的节点列表供选择。

```bash
# 切换节点 (支持别名: node, proxy, switch)
ck use
# 或者
ck switch
# 或者
ck node
```

### 5. 更多功能

```bash
# 查看状态
ck info # 或者 ck status, ck view

# 节点并发测速 (仅测速不切换，支持别名: test, ls, t)
ck list # 或者 ck test, ck ls

# 设置系统代理
ck sys on
ck sys off

# 开启 TUN 模式 (需要 sudo 权限)
ck tun on # 开启
ck tun off # 关闭
```

## 命令详解

| 命令 (别名)                   | 说明                       | 示例                                    |
| ----------------------------- | -------------------------- | --------------------------------------- |
| `ck init`                     | 初始化内核及权限           | `ck init`                               |
| `ck on` (`start`)             | 启动 Clash 服务            | `ck on` `ck on -s` (启动并设置系统代理) |
| `ck off` (`stop`)             | 停止服务并关闭代理         | `ck off`                                |
| `ck info` (`status`, `view`)  | 查看运行状态及当前节点延迟 | `ck info` / `ck status` / `ck view`     |
| `ck sysproxy` (`sys`)         | 设置系统代理               | `ck sys on` / `ck sys off`              |
| `ck tun`                      | 设置 TUN 模式 (需要 sudo)  | `ck tun on`                             |
| `ck sub`                      | 管理订阅（交互式）【推荐】 | `ck sub`                                |
| `ck sub -l`                   | 列出所有订阅               | `ck sub -l`                             |
| `ck sub -a <url>`             | 添加订阅                   | `ck sub -a "http..." -n "pro"`          |
| `ck sub -u <name>`            | 切换订阅                   | `ck sub -u "pro"`                       |
| `ck use` (`node`, `switch`)   | 切换节点 (自动测速)        | `ck use` / `ck node`                    |
| `ck list` (`ls`, `test`, `t`) | 节点测速列表 (不切换)      | `ck list` / `ck test`                   |

## License

[MIT](./LICENSE).

开源不易，点赞鼓励！
点一个 Star⭐️ 支持我们~ 🌸Let's enjoy it!
