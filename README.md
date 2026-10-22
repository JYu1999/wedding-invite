# 詹傑宇 & 潘昱綺 婚禮邀請函

純靜態網站，使用瀏覽器原生 ES 模組，不需要安裝套件或打包，GitHub Pages 直接從 `main` 分支根目錄發佈。

## 本機預覽

ES 模組無法用 `file://` 直接開啟，需要起一個本機伺服器：

```bash
python3 -m http.server 8000
```

然後打開 http://localhost:8000 。

## 專案結構

```
index.html              頁面結構（只有標記，沒有內嵌樣式與腳本）
assets/
  images/hero.jpg       首頁主視覺照片
  images/gallery/       美好剪影照片
  audio/bgm.mp3         背景音樂
css/
  base.css              色彩字型變數、重置、共用區塊、頁尾
  intro.css             開場拆信封動畫
  hero.css              首頁主視覺、新人與家長資訊
  details.css           倒數計時、婚禮資訊卡片
  gallery.css           相片藝廊、浮水印、燈箱
  music-player.css      黑膠唱片音樂播放器
js/
  main.js               進入點，初始化各模組
  config.js             可調整內容：倒數時間、照片清單、浮水印文字
  intro.js              拆信封流程
  music-player.js       背景音樂播放與播放器顯示
  countdown.js          倒數計時
  gallery.js            產生照片格、浮水印、燈箱
  reveal.js             滾動淡入
  snow/
    snow.js             照片上的雪景動畫與融雪互動
    sprites.js          雪花造型
    pile.js             照片底部的積雪
```

## 常見修改

- **新增或更換藝廊照片**：把照片放進 `assets/images/gallery/`，再到 `js/config.js` 的 `GALLERY_PHOTOS` 加上檔名。
- **修改浮水印文字**：`js/config.js` 的 `WATERMARK`。
- **修改倒數目標時間**：`js/config.js` 的 `WEDDING_DATE`。
