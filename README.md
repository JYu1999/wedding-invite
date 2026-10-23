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
  images/favicon-*.png  網站圖示（分頁小圖）
  images/apple-touch-icon.png  iPhone 加入主畫面的圖示
  images/gallery/       美好剪影照片
  images/lottery/       聖誕扭蛋機抽到的照片（downloadable/ 可下載、non-downloadable/ 只能欣賞）
  audio/bgm.mp3         背景音樂
css/
  base.css              色彩字型變數、重置、共用區塊、頁尾
  intro.css             開場拆信封、翻面、穿越信紙進入首頁
  intro-fx.css          拆信封時的金色光芒與閃光
  hero.css              首頁主視覺、新人與家長資訊
  details.css           倒數計時、婚禮資訊卡片
  gallery.css           相片藝廊（瀑布流、不裁切）、浮水印
  lightbox.css          全螢幕看照片的燈箱、第一次打開的滑動提示
  music-player.css      黑膠唱片音樂播放器
  gacha.css             聖誕扭蛋機、扭蛋、刮刮樂照片卡、手指操作提示
  album.css             扭蛋圖鑑、浮動泡泡、照片飛進泡泡
js/
  main.js               進入點，初始化各模組
  config.js             可調整內容：倒數時間、照片清單、浮水印文字、扭蛋照片清單
  intro.js              拆信封 → 點擊翻面 → 鏡頭穿越信紙的流程
  fx/
    open-effects.js     拆信封「開寶箱」特效：金色冰晶綻放
    particles.js        特效用的粒子系統
    sound.js            Web Audio 即時合成的音效
    haptics.js          手機震動回饋（Android 震動、iPhone 觸覺回饋）
  music-player.js       背景音樂播放與播放器顯示
  countdown.js          倒數計時
  gallery.js            產生照片牆、浮水印
  lightbox.js           燈箱：照片跟著手指滑動切換、上下滑關閉，婚紗剪影與扭蛋圖鑑共用
  device.js             判斷 iPhone、是否用手指操作
  storage.js            存在訪客瀏覽器裡的資料（扭蛋圖鑑、看過的提示）
  scroll-lock.js        全螢幕視窗疊好幾層時的頁面捲動鎖定
  reveal.js             滾動淡入
  gacha/
    gacha.js            點月曆上的 🎄 開啟扭蛋機：轉蛋 → 點擊或搖手機打開 → 刮刮樂 → 恭喜獲得照片
    scratch.js          刮刮樂銀漆畫布與刮除進度
    effects.js          扭蛋機的音效、扭蛋打開的金粉、中獎彩帶
    collection.js       扭蛋圖鑑：記住扭到哪些照片、收集進度、照片飛進泡泡
    bubble.js           扭蛋圖鑑的浮動泡泡（可拖曳、貼齊邊緣）
  snow/
    snow.js             照片上的雪景動畫與融雪互動
    sprites.js          雪花造型
    pile.js             照片底部的積雪
```

## 常見修改

- **新增或更換藝廊照片**：把照片放進 `assets/images/gallery/`，再到 `js/config.js` 的 `GALLERY_PHOTOS` 加上檔名，並標明直式 `portrait` 或橫式 `landscape`。
- **更換置頂放大的照片**：`js/config.js` 的 `GALLERY_FEATURED`。
- **新增或更換扭蛋照片**：開放下載的照片放進 `assets/images/lottery/downloadable/`、只能欣賞的放進 `assets/images/lottery/non-downloadable/`，再到 `js/config.js` 的 `LOTTERY_DOWNLOADABLE`／`LOTTERY_VIEW_ONLY` 加上檔名。抽中時會顯示「恭喜你/妳獲得 {檔名} 一張！」，所以檔名就是照片的標題。扭蛋圖鑑會自動多一格、總數跟著變，訪客已經收集的照片不受影響。
  - 扭蛋圖鑑用檔名記住訪客收集過哪些照片，**已經上線的照片不要改檔名**，否則會被當成新的一張。
- **調整扭到新照片的機率**：`js/config.js` 的 `LOTTERY_NEW_WEIGHT`，還沒收集到的照片被抽中的機會是收集過的幾倍；設成 `1` 就是完全隨機。
- **修改浮水印文字**：`js/config.js` 的 `WATERMARK`。
- **修改倒數目標時間**：`js/config.js` 的 `WEDDING_DATE`。
