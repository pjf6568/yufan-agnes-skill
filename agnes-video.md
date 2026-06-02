# Agnes Video API 详细参数

本文档包含视频 API 的完整参数说明。

## API 端点

- 创建任务：`POST https://apihub.agnes-ai.com/v1/videos`
- 查询结果：`GET https://apihub.agnes-ai.com/v1/videos/{task_id}`

## 模型

`agnes-video-v2.0`

## 能力

| 能力 | 说明 |
|---|---|
| 文生视频 | 文字直接生成视频 |
| 图生视频 | 静态图动画化 |
| 多图视频 | 多图引导生成 |
| 关键帧动画 | 帧间平滑过渡 |

## 创建任务参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `model` | string | ✅ | `agnes-video-v2.0` |
| `prompt` | string | ✅ | 视频描述 |
| `image` | string | ❌ | 输入图片 URL（单图生视频） |
| `height` | int | ❌ | 高度，默认 768 |
| `width` | int | ❌ | 宽度，默认 1152 |
| `num_frames` | int | ❌ | 帧数（须满足 8n+1） |
| `frame_rate` | int | ❌ | 帧率，默认 24 |
| `seed` | int | ❌ | 随机种子 |
| `negative_prompt` | string | ❌ | 反向提示词 |
| `extra_body` | object | ❌ | 多图/关键帧配置 |
| `extra_body.image` | array | ❌ | 多图 URL 数组 |
| `extra_body.mode` | string | ❌ | `keyframes` 关键帧模式 |

## 图生视频正确用法

**单图生视频：**
```json
{
  "model": "agnes-video-v2.0",
  "prompt": "The woman slowly turns around and looks back at the camera",
  "image": "https://example.com/image.png",
  "num_frames": 121,
  "frame_rate": 24
}
```

**多图生视频：**
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

**关键帧动画：**
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

## 帧数约束

`num_frames` 必须满足 `8n + 1`。

合法值：`81` | `121` | `161` | `241` | `441`

时长计算：`121帧 @ 24fps ≈ 5秒`

## 常用配置

| 场景 | frames | fps | 时长 |
|---|---|---|---|
| 短视频 | 81 | 24 | ~3.4s |
| 标准 | 121 | 24 | ~5s |
| 长视频 | 161 | 24 | ~6.7s |

## 响应

创建任务：

```json
{
  "id": "task_xxx",
  "object": "video",
  "model": "agnes-video-v2.0",
  "status": "queued",
  "progress": 0,
  "created_at": 1234567890
}
```

完成时：

```json
{
  "id": "task_xxx",
  "object": "video",
  "model": "agnes-video-v2.0",
  "status": "completed",
  "progress": 100,
  "created_at": 1234567890,
  "completed_at": 1234567911,
  "video_url": "https://storage.googleapis.com/...",
  "size": "1152x768",
  "seconds": "5.0",
  "usage": {
    "duration_seconds": 151
  }
}
```

**注意：** 视频 URL 在 `video_url` 字段！

## 状态

| 状态 | 说明 |
|---|---|
| `queued` | 排队中 |
| `in_progress` | 生成中 |
| `completed` | 完成 |
| `failed` | 失败 |

## 提示词结构

```
[主体] + [动作] + [场景] + [镜头] + [光影] + [风格]
```

示例：`老虎追逐鹿穿过森林，动态跟拍，尘土飞扬，戏剧光影，纪录片风格`
