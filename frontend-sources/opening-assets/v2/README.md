# 开场视觉素材 v2

本轮补充7张母版，原v1保持完整。内置imagegen生成；提示词、输入参考、尺寸和哈希见 [assets-manifest.json](assets-manifest.json)。

| 文件 | 用途 |
| --- | --- |
| dialogue.png | 云朵对白框；SIPC以DOM叠在左上空白牌面 |
| narration.png | 旁白纸卡；115以DOM叠在左上空白牌面 |
| sky-cloud.png | 小型天空白云，无硬边轮廓 |
| lamp-desktop-off.png | 电脑灯管熄灭状态 |
| lamp-desktop-bright.png | 电脑灯管暖亮状态 |
| lamp-mobile-off.png | 手机灯管熄灭状态 |
| lamp-mobile-bright.png | 手机灯管暖亮状态 |

灯光与v1正常帧组成每端三状态，运行时仅显示灯管附近区域，避免整幅场景抖动。循环不是全屏闪烁；全局暂停与减弱动态偏好仍生效。

已另导出 `web/public/opening/v2/` 下的WebP副本。文件缩放保留原比例，宽上限1600、高上限1800，libwebp质量86、压缩级别6，保留Alpha。图片内容没有包含业务文字或用户凭据。
