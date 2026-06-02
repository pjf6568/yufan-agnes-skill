# yufan-Agnes

Agnes AI 图片与视频生成技能。完全自包含，可直接分发使用。

## 功能

- **文生图 / 图生图**：使用 Agnes Image API
- **文生视频 / 图生视频**：使用 Agnes Video API
- **本地图片转公网 URL**：内置 HTTP 服务器 + Cloudflare 隧道

## 快速开始

### 1. 配置 API Key

复制 `config.example.json` 为 `config.json`，填写你的 API Key：

```json
{
  "agnes_api": {
    "image_api_key": "你的图片 API Key",
    "video_api_key": "你的视频 API Key"
  },
  "output": {
    "directory": "输出目录路径"
  }
}
```

**获取 API Key：** 注册 [Agnes AI Platform](https://platform.agnes-ai.com)，在 Dashboard 创建 Key。

### 2. 基本使用

**文生图：**
```
用户：帮我生成一张图片：一只橘猫坐在窗台上，阳光洒进来
```

**图生图（本地图片）：**
```
用户：把 /path/to/local/image.png 的背景改成海边
```

**文生视频：**
```
用户：生成一个老虎追逐鹿的视频，5秒，电影级镜头
```

**图生视频（本地图片）：**
```
用户：用 /path/to/image.png 作为首帧，生成人物转身看向镜头的视频
```

## 本地图片转 URL（内置 Bridge）

本 skill 内置了一个本地 HTTP 服务器 + Cloudflare 隧道的 bridge，无需依赖外部图床服务。

### 工作原理

1. **本地 HTTP 服务器**：在 127.0.0.1:8787 启动一个资产服务器
2. **Cloudflare 隧道**：通过 cloudflared 创建公网可访问的 URL
3. **资产注册**：本地文件被注册到服务器，生成临时访问 token

### 自动启动

当需要转换本地图片时，bridge 会自动启动：

```
用户：把 /Users/xxx/Desktop/photo.png 转成公网 URL
```

Assistant 会调用内置 bridge，自动：
1. 检查 cloudflared 是否安装（macOS 会通过 Homebrew 自动安装）
2. 启动本地资产服务器
3. 启动 Cloudflare 隧道
4. 注册文件并返回公网 URL

### 手动管理 Bridge

```bash
# 进入 bridge 目录
cd bridge

# 确保 bridge 运行（自动启动服务器 + 隧道）
node bin/agnes-bridge.js ensure

# 查看状态
node bin/agnes-bridge.js status

# 停止 bridge
node bin/agnes-bridge.js stop

# 清理过期资产
node bin/agnes-bridge.js cleanup

# 检查依赖
node bin/agnes-bridge.js doctor
```

## 项目结构

```
yufan-Agnes/
├── SKILL.md              # Skill 定义文件
├── agnes-image.md        # Image API 详细参数
├── agnes-video.md        # Video API 详细参数
├── config.example.json   # 配置示例
├── config.json           # 用户配置（需创建）
└── bridge/               # 本地图片转 URL 的 bridge
    ├── bin/
    │   └── agnes-bridge.js
    ├── src/
    │   ├── assets.js
    │   ├── cli.js
    │   ├── config.js
    │   ├── daemon.js
    │   ├── deps.js
    │   ├── media.js
    │   ├── server.js
    │   ├── state.js
    │   └── tunnel.js
    └── package.json
```

## API 文档

详细的 API 参数说明请参考：
- [Agnes Image API](agnes-image.md)
- [Agnes Video API](agnes-video.md)

## License

MIT