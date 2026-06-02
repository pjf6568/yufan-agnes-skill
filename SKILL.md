---
name: "yufan-Agnes"
description: "Agnes AI image/video generation with local-to-URL bridge. Invoke when generating images or videos using Agnes API, or when converting local images to URLs for any API requiring URL-based image input."
---

# yufan-Agnes

Agnes AI 图片与视频生成技能。完全自包含，可直接分发使用。

**功能：**
- 文生图 / 图生图（使用 Agnes Image API）
- 文生视频 / 图生视频（使用 Agnes Video API）
- 本地图片转公网 URL（内置 HTTP 服务器 + Cloudflare 隧道）

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

**获取 API Key：** 注册 https://platform.agnes-ai.com，在 Dashboard 创建 Key。

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

### 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `AGNES_BRIDGE_STATE_DIR` | 状态存储目录 | `~/.agnes-local-bridge` |
| `AGNES_BRIDGE_PORT` | 本地服务器端口 | `8787` |
| `AGNES_PUBLIC_BASE_URL` | 手动指定公网 URL | 自动获取 |
| `AGNES_ASSET_TTL_SECONDS` | 资产有效期（秒） | `3600` |
| `AGNES_BRIDGE_IDLE_SECONDS` | Daemon 空闲超时（秒） | `3600` |

### 依赖要求

- **Node.js >= 20**（纯 JS，无外部依赖）
- **cloudflared**（macOS 通过 Homebrew 自动安装，其他平台需手动安装）

安装 cloudflared：
- macOS: `brew install cloudflared`
- Windows: `winget install --id Cloudflare.cloudflared --exact`
- Linux: `sudo apt install cloudflared` 或从官网下载

## 图片生成

### API 端点

```
POST https://apihub.agnes-ai.com/v1/images/generations
```

### 请求参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `model` | string | 模型：`agnes-image-2.1-flash` |
| `prompt` | string | 图片描述（必填） |
| `size` | string | 尺寸：`1024x1024` 等 |
| `n` | int | 生成数量（默认 1） |
| `quality` | string | `standard`/`hd`/`low` |
| `output_format` | string | `png`/`webp`/`jpeg` |
| `background` | string | `transparent`（透明背景） |
| `extra_body` | object | 图生图配置 |
| `extra_body.image` | array | 输入图片 URL 数组（图生图） |

### 文生图

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "A futuristic cityscape at sunset",
  "size": "1024x1024"
}
```

### 图生图正确用法

**使用 `extra_body.image` 数组：**

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "Transform the scene into a rain-soaked cyberpunk night",
  "size": "1024x768",
  "extra_body": {
    "image": [
      "https://example.com/input-image.png"
    ],
    "response_format": "url"
  }
}
```

### 支持尺寸

`1024x1024` | `1792x1024` | `1024x1792` | `1024x768` | `768x1024` | `512x512` | `256x256`

### 响应格式

```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://cdn.agnes-ai.com/xxx.png"
    }
  ]
}
```

详细参数见 `agnes-image.md`。

## 视频生成

### API 端点

```
POST https://apihub.agnes-ai.com/v1/videos
GET  https://apihub.agnes-ai.com/v1/videos/{task_id}
```

### 请求参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `model` | string | `agnes-video-v2.0`（必填） |
| `prompt` | string | 视频描述（必填） |
| `image` | string | 输入图片 URL（单图生视频） |
| `num_frames` | int | 帧数（须满足 8n+1） |
| `frame_rate` | int | 帧率（默认 24） |
| `height` | int | 高度（默认 768） |
| `width` | int | 宽度（默认 1152） |
| `extra_body` | object | 多图/关键帧配置 |
| `extra_body.image` | array | 多图 URL 数组 |
| `extra_body.mode` | string | `keyframes` 关键帧模式 |

### 图生视频正确用法

**单图生视频**（使用 `image` 字段）：

```json
{
  "model": "agnes-video-v2.0",
  "prompt": "The woman slowly turns around and looks back at the camera",
  "image": "https://example.com/image.png",
  "num_frames": 121,
  "frame_rate": 24
}
```

**多图生视频**（使用 `extra_body.image`）：

```json
{
  "model": "agnes-video-v2.0",
  "prompt": "Create a smooth transformation scene",
  "extra_body": {
    "image": [
      "https://example.com/image1.png",
      "https://example.com/image2.png"
    ]
  },
  "num_frames": 121,
  "frame_rate": 24
}
```

**关键帧动画**（使用 `extra_body.mode: "keyframes"`）：

```json
{
  "model": "agnes-video-v2.0",
  "prompt": "Generate a smooth cinematic transition",
  "extra_body": {
    "image": [
      "https://example.com/keyframe1.png",
      "https://example.com/keyframe2.png"
    ],
    "mode": "keyframes"
  },
  "num_frames": 121,
  "frame_rate": 24
}
```

### 帧数约束

`num_frames` 必须满足 `8n + 1` 格式。合法值：

| 帧数 | 时长（@24fps） |
|---|---|
| 81 | ~3.4秒 |
| 121 | ~5秒 |
| 161 | ~6.7秒 |
| 241 | ~10秒 |
| 441 | ~18.4秒 |

### 异步轮询

视频生成是异步的，需要轮询获取结果：

```json
// 创建任务响应
{
  "id": "task_xxx",
  "object": "video",
  "model": "agnes-video-v2.0",
  "status": "queued",
  "progress": 0,
  "created_at": 1234567890
}

// 轮询响应（完成后）
{
  "id": "task_xxx",
  "object": "video",
  "model": "agnes-video-v2.0",
  "status": "completed",
  "progress": 100,
  "video_url": "https://storage.googleapis.com/xxx.mp4",
  "size": "1152x768",
  "seconds": "5.0"
}
```

**注意：视频 URL 在 `video_url` 字段！**

详细参数见 `agnes-video.md`。

## 提示词最佳实践

### 图片提示词

描述清晰，包含主体、场景、风格：

```
一只橘猫坐在窗台上，阳光洒进来，温暖治愈，水彩画风格
```

### 视频提示词

包含主体、动作、场景、镜头、光影：

```
[主体] + [动作] + [场景] + [镜头运动] + [光影] + [风格]

示例：老虎追逐鹿穿过茂密森林，动态跟拍镜头，尘土飞扬，戏剧性光影，野生动物纪录片风格
```

## 错误处理

| 错误 | 解决方案 |
|---|---|
| API Key 无效 | 检查 Key 是否正确，是否过期 |
| cloudflared 未安装 | macOS 会自动安装，其他平台手动安装 |
| 隧道启动失败 | 检查网络，或手动设置 `AGNES_PUBLIC_BASE_URL` |
| 视频生成超时 | 增加轮询等待时间 |
| num_frames 无效 | 使用合法值：81/121/161/241/441 |
| URL 验证失败 | 检查图片 URL 是否可访问 |

## 详细文档

需要更多参数说明时，读取：

- `agnes-image.md` — 图片 API 详细参数
- `agnes-video.md` — 视频 API 详细参数

## 分发说明

本 skill 完全自包含，可直接复制整个目录分发：

```
yufan-Agnes/
├── SKILL.md              # 主文档
├── config.example.json   # 配置示例
├── agnes-image.md        # 图片 API 详细参数
├── agnes-video.md        # 视频 API 详细参数
└── bridge/               # 内置本地图片转 URL bridge
    ├── package.json
    ├── bin/
    │   └── agnes-bridge.js
    └── src/
        ├── cli.js
        ├── config.js
        ├── state.js
        ├── assets.js
        ├── server.js
        ├── tunnel.js
        ├── daemon.js
        ├── deps.js
        └── media.js
```

用户只需：
1. 复制 `config.example.json` 为 `config.json`
2. 填写 API Key
3. 确保 Node.js >= 20 和 cloudflared 已安装
4. 使用 skill
