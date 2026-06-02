# Agnes Image API 详细参数

本文档包含图片 API 的完整参数说明。

## API 端点

`POST https://apihub.agnes-ai.com/v1/images/generations`

## 模型

| 模型 | 说明 |
|---|---|
| `agnes-image-2.1-flash` | 最新，推荐 |
| `agnes-image-2.0-flash` | 上一代 |

## 请求参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `model` | string | ✅ | 模型 ID |
| `prompt` | string | ✅ | 图片描述 |
| `size` | string | ❌ | 尺寸，默认 `1024x1024` |
| `n` | int | ❌ | 数量，默认 1 |
| `quality` | string | ❌ | `standard`/`hd`/`low` |
| `output_format` | string | ❌ | `png`/`webp`/`jpeg` |
| `background` | string | ❌ | `transparent`（透明背景） |
| `extra_body` | object | ❌ | 图生图配置 |
| `extra_body.image` | array | ❌ | 输入图片 URL 数组（图生图） |
| `extra_body.response_format` | string | ❌ | `url` |

## 文生图

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "A futuristic cityscape at sunset with flying cars",
  "size": "1024x1024",
  "n": 1
}
```

## 图生图正确用法

**使用 `extra_body.image` 数组：**

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "Transform the scene into a rain-soaked cyberpunk night with neon reflections",
  "size": "1024x768",
  "extra_body": {
    "image": [
      "https://example.com/input-image.png"
    ],
    "response_format": "url"
  }
}
```

## 尺寸选项

| 尺寸 | 比例 |
|---|---|
| `1024x1024` | 1:1 |
| `1792x1024` | 16:9 |
| `1024x1792` | 9:16 |
| `1024x768` | 4:3 |
| `768x1024` | 3:4 |
| `512x512` | 1:1 |
| `256x256` | 1:1 |

## 响应

```json
{
  "data": [{"url": "https://..."}],
  "created": 1234567890
}
```

**注意：** 不支持 `response_format: b64_json`，仅返回 URL。
