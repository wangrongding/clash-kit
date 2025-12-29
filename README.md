# Clash CLI

一个基于 Node.js 的 Clash 命令行管理工具，旨在简化 Clash 的配置管理、订阅切换和节点测速等操作。

## 特性

- 🚀 **简单易用**：通过命令行即可完成大部分日常操作。
- 🔄 **订阅管理**：支持添加、切换多个订阅源。
- 🔥 **热重载**：切换订阅后立即生效，无需重启服务。
- ⚡ **节点测速**：一键测试当前订阅下所有节点的延迟，并按速度排序。
- 🌐 **节点切换**：交互式选择并切换当前使用的代理节点。
- 🛠 **自动初始化**：自动处理二进制文件权限问题。

## 安装

```bash
npm install -g clash-cli
# 或者
pnpm add -g clash-cli
```

## 快速开始

### 1. 初始化

首次安装后，需要初始化 Clash 二进制文件的权限：

```bash
clash init
```

### 2. 启动服务

启动 Clash 核心服务（建议在一个单独的终端窗口运行）：

```bash
clash start
```

### 3. 添加订阅

```bash
clash sub -a "https://example.com/subscribe?token=xxx" -n "my-profile"
```

### 4. 切换订阅

```bash
clash sub
# 选择 "切换订阅" -> 选择刚才添加的 "my-profile"
```

### 5. 节点测速

```bash
clash test
```

### 6. 切换节点

```bash
clash proxy
```

## 命令详解

| 命令 | 说明 | 示例 |
| --- | --- | --- |
| `clash init` | 初始化权限 | `clash init` |
| `clash start` | 启动 Clash 服务 | `clash start` |
| `clash sub` | 管理订阅（交互式） | `clash sub` |
| `clash sub -a <url> -n <name>` | 添加订阅 | `clash sub -a "http://..." -n "pro"` |
| `clash sub -u <name>` | 切换订阅 | `clash sub -u "pro"` |
| `clash sub -l` | 列出所有订阅 | `clash sub -l` |
| `clash proxy` | 切换节点（交互式） | `clash proxy` |
| `clash speedtest` | 节点测速 | `clash speedtest` |

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
