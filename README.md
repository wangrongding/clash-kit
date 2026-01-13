# Clash CLI

一个基于 Node.js 的 Clash 命令行管理工具，旨在简化 Clash 的配置管理、订阅切换和节点测速等操作。

## 特性

- 🔄 **订阅管理**：支持添加、切换多个订阅源。
- 🌐 **节点切换**：交互式选择并切换当前使用的代理节点。
- 🔥 **热重载**：切换订阅后立即生效，无需重启服务。
- ⚡ **节点测速**：支持多线程并发测速，彩色高亮显示延迟结果。
- 📊 **状态监控**：实时查看服务运行状态、当前节点及延迟。
- 🛠 **自动初始化**：自动处理二进制文件权限问题。

- 💻 **系统代理**：一键开启/关闭 macOS 系统 HTTP 代理。
- 🛡 **TUN 模式**：高级网络模式，接管系统所有流量（类 VPN 体验）。

## 使用

### 1. 安装

```bash
npm install -g clash-cli
# 或者
pnpm add -g clash-cli
```

### 2. 初始化

首次安装后，需要先初始化 Clash 内核与权限：

```bash
clash init
```

### 3. 启动服务

启动 Clash 核心服务（建议在一个单独的终端窗口运行）：

```bash
# 启动 Clash 代理服务
clash start

# 启动并自动开启系统代理
clash start -s
```

### 4. 添加订阅

```bash
# 交互式管理订阅（添加、切换、删除等）
clash sub

# 手动添加订阅
clash sub -a "https://example.com/subscribe?token=xxx" -n "abcName"
```

### 4. 节点测速与切换

```bash
# 测速
clash test

# 切换节点
clash proxy
```

### 5. 更多功能

```bash
# 查看状态
clash status

# 开启 TUN 模式 (需要 sudo 权限)
sudo clash tun on
```

## 命令详解

| 命令                  | 说明                       | 示例                                  |
| --------------------- | -------------------------- | ------------------------------------- |
| `clash init`          | 初始化内核及权限           | `clash init`                          |
| `clash start`         | 启动 Clash 服务            | `clash start -s` (启动并设置系统代理) |
| `clash stop`          | 停止服务并关闭代理         | `clash stop`                          |
| `clash status`        | 查看运行状态及当前节点延迟 | `clash status`                        |
| `clash sub`(推荐)     | 管理订阅（交互式）         | `clash sub`                           |
| `clash sub -a <url>`  | 添加订阅                   | `clash sub -a "http..." -n "pro"`     |
| `clash sub -u <name>` | 切换订阅                   | `clash sub -u "pro"`                  |
| `clash sub -l`        | 列出所有订阅               | `clash sub -l`                        |
| `clash proxy`         | 切换节点（交互式）         | `clash proxy`                         |
| `clash test`          | 节点并发测速               | `clash test`                          |
| `clash sysproxy`      | 设置系统代理 (on/off)      | `clash sysproxy on`                   |
| `clash tun`           | 设置 TUN 模式 (on/off)     | `sudo clash tun on`                   |

## 目录结构

- `bin/`: CLI 入口文件
- `lib/`: 核心逻辑库
- `profiles/`: 存放下载的订阅配置文件
- `clash-meta`: Clash 核心二进制文件
- `config.yaml`: 当前生效的配置文件

## 注意事项

- 本工具依赖 `clash-meta` 二进制文件，请确保其与本工具在同一目录下（安装包已包含）。
- 测速功能依赖 Clash API，请确保 `clash start` 正在运行。
- 默认 API 地址为 `http://127.0.0.1:9090`。

## License

ISC
