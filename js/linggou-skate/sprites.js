// 跟令狗一起收集紅蘿蔔：2D 角色與道具圖（SVG 字串）
// 令狗照扭蛋裡令狗的照片畫：超大立耳、額頭細白線、白嘴白胸、白襪子短腳、橘 → 深色一圈 → 白尖的蓬鬆尾巴
// 側面圖（遊戲裡）原點在左上，腳底 y = 182、中心 x = 125；正面圖（標題、結算）viewBox 0 -14 200 230
// 會動的部位用 class 標記，動畫寫在 css/linggou-skate.css：ls-lg 腳（a / b 兩組輪流、f 前腳 / h 後腳）、ls-tail 尾巴、ls-pulse 一縮一放、ls-mlg 小豬與麻吉的腳

export const C = {
  tan: '#e4a35a', shade: '#c9823f', dark: '#6b4a36', white: '#fffaf2', far: '#eadccb',
  pink: '#f2b1aa', nose: '#231815', eye: '#2a1912', tongue: '#ef7f93', boot: '#d8463c',
  bootFar: '#a9302a', blade: '#9aa6b2', line: '#3e2618',
};
let uid = 0;

export function carrotSVG(x, y, rot = 0, s = 1, gold = false) {
  const body = gold ? '#f5c542' : '#f28a2e';
  const ridge = gold ? '#c9961c' : '#c4621c';
  const leaf = gold ? '#c9e86a' : '#76bf55';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" stroke="${C.line}" stroke-width="2.2" stroke-linejoin="round">
    <ellipse cx="-5" cy="-20" rx="3.6" ry="8" transform="rotate(-28 -5 -20)" fill="${leaf}"/>
    <ellipse cx="5" cy="-20" rx="3.6" ry="8" transform="rotate(28 5 -20)" fill="${leaf}"/>
    <ellipse cx="0" cy="-22" rx="3.6" ry="8.5" fill="${leaf}"/>
    <path d="M-10,-12 C-11,0 -6,13 0,21 C6,13 11,0 10,-12 C9,-18 -9,-18 -10,-12 Z" fill="${body}"/>
    <path d="M-7,-3 h5 M2,4 h5 M-4,11 h4" stroke="${ridge}" stroke-width="1.6"/>
    ${gold ? '<path d="M-4,-9 l2,-4 l2,4 l4,1 l-3,3 l1,4 l-4,-2 l-4,2 l1,-4 l-3,-3 z" fill="#fff" stroke="none" opacity=".9"/>' : ''}
  </g>`;
}

// 造型：side（側面座標）與 front（正面座標）
export const COSTUMES = [
  { id: 'none', name: '原本的樣子', lv: 1 },
  { id: 'scarf', name: '紅圍巾', lv: 2 },
  { id: 'santa', name: '聖誕帽', lv: 3 },
  { id: 'carrot', name: '紅蘿蔔頭套', lv: 4 },
  { id: 'antler', name: '麋鹿角', lv: 5 },
  { id: 'bow', name: '婚禮領結', lv: 6 },
  { id: 'flower', name: '花圈', lv: 7 },
];
export function costumeSide(id, layer) {
  if (id === 'scarf' && layer === 'neck') return `<path d="M150,84 C158,98 172,106 186,102" stroke="#c8413a" stroke-width="11" fill="none"/>
    <path d="M150,84 C158,98 172,106 186,102" stroke="#fff" stroke-width="2" stroke-dasharray="4 7" fill="none"/>
    <path d="M156,96 L144,122 L156,120 L162,99 Z" fill="#c8413a"/>`;
  if (id === 'bow' && layer === 'neck') return `<g transform="translate(168 106) rotate(-12)"><path d="M0,0 L-14,-9 L-14,9 Z M0,0 L14,-9 L14,9 Z" fill="#2b2b33"/><circle r="4" fill="#2b2b33"/></g>`;
  if (id === 'santa' && layer === 'head') return `<g transform="rotate(14 206 30)"><path d="M188,34 C190,14 204,2 224,4 C216,12 214,22 220,34 Z" fill="#d8463c"/><rect x="184" y="30" width="40" height="10" rx="5" fill="#fff"/><circle cx="224" cy="4" r="6" fill="#fff"/></g>`;
  if (id === 'carrot' && layer === 'head') return carrotSVG(192, 22, 98, 1.5);
  if (id === 'antler' && layer === 'back') return `<g stroke="#7a4b2a" stroke-width="5" fill="none"><path d="M178,30 C176,14 170,6 160,2 M174,16 C178,10 184,8 188,8"/><path d="M196,30 C198,14 206,6 216,4 M202,16 C206,12 210,12 214,14"/></g>`;
  if (id === 'flower' && layer === 'head') return ['#ff8fb1:176,30', '#fff:188,26', '#ffd84d:200,26', '#ff8fb1:212,30', '#fff:220,38']
    .map((s) => { const [c, p] = s.split(':'); const [x, y] = p.split(','); return `<g transform="translate(${x} ${y})"><circle r="5" fill="${c}"/><circle r="1.8" fill="#f2a81d" stroke="none"/></g>`; }).join('');
  return '';
}
export function costumeFront(id, layer) {
  if (id === 'scarf' && layer === 'neck') return `<path d="M64,118 C80,132 120,132 136,118" stroke="#c8413a" stroke-width="13" fill="none"/><path d="M118,126 L126,160 L136,156 L130,124 Z" fill="#c8413a"/>`;
  if (id === 'bow' && layer === 'neck') return `<g transform="translate(100 132)"><path d="M0,0 L-16,-10 L-16,10 Z M0,0 L16,-10 L16,10 Z" fill="#2b2b33"/><circle r="5" fill="#2b2b33"/></g>`;
  if (id === 'santa' && layer === 'head') return `<g transform="rotate(-8 100 40)"><path d="M76,46 C80,18 98,4 124,8 C114,16 112,30 120,46 Z" fill="#d8463c"/><rect x="72" y="40" width="54" height="12" rx="6" fill="#fff"/><circle cx="124" cy="8" r="8" fill="#fff"/></g>`;
  if (id === 'carrot' && layer === 'head') return carrotSVG(100, 34, 88, 1.8);
  if (id === 'antler' && layer === 'back') return `<g stroke="#7a4b2a" stroke-width="6" fill="none"><path d="M80,44 C70,26 62,18 50,16 M68,28 C64,20 64,14 66,8"/><path d="M120,44 C130,26 138,18 150,16 M132,28 C136,20 136,14 134,8"/></g>`;
  if (id === 'flower' && layer === 'head') return ['#ff8fb1:66,52', '#fff:78,42', '#ffd84d:90,38', '#ff8fb1:100,37', '#fff:110,38', '#ffd84d:122,42', '#ff8fb1:134,52']
    .map((s) => { const [c, p] = s.split(':'); const [x, y] = p.split(','); return `<g transform="translate(${x} ${y})"><circle r="6" fill="${c}"/><circle r="2.2" fill="#f2a81d" stroke="none"/></g>`; }).join('');
  return '';
}

// 令狗側面（面向右），原點在左上，腳底 y = 182、中心 x = 125
export function dogSide(o = {}) {
  const id = `ds${uid++}`;
  const eyes = o.eyes ?? 'normal';
  const carry = o.carry ?? [];
  const cos = o.costume ?? 'none';
  const leg = (cls, d, bx, far) => `<g class="ls-lg ${cls}"><path d="${d}" fill="${far ? C.far : C.white}"/>
      <rect x="${bx}" y="160" width="${far ? 26 : 28}" height="${far ? 13 : 14}" rx="6" fill="${far ? C.bootFar : C.boot}"/>
      ${far ? '' : `<path d="M${bx},163 h28" stroke="#fff" stroke-width="3"/>`}
      <path d="M${bx + 6},174 V180 M${bx + 22},174 V180" stroke-width="2.2"/>
      <path d="M${bx - 2},181 H${bx + 30} C${bx + 36},181 ${bx + 36},174 ${bx + 32},173" stroke="${C.blade}" stroke-width="3.4" fill="none"/></g>`;
  let eyeSVG = '';
  if (eyes === 'heart') eyeSVG = `<path class="ls-pulse" d="M195,72 C182,63 182,51 189,50 C192,49 195,52 195,55 C195,52 198,49 201,50 C208,51 208,63 195,72 Z" fill="#ff4f7b"/>`;
  else if (eyes === 'dizzy') eyeSVG = `<path d="M195,60 m-1,0 a1.6,1.6 0 1,1 3.2,0 a3.6,3.6 0 1,1 -7.2,0 a6,6 0 1,1 12,0 a8,8 0 1,1 -16,0" fill="none" stroke-width="2.2"/>`;
  else if (eyes === 'happy') eyeSVG = `<path d="M186,63 C189,53 201,53 204,63" fill="none" stroke-width="3.4"/>`;
  else if (eyes === 'white') eyeSVG = `<circle cx="195" cy="60" r="8" fill="#fff"/><circle cx="196" cy="61" r="2.6" fill="${C.eye}" stroke="none"/>`;
  else eyeSVG = `<ellipse cx="195" cy="60" rx="8.6" ry="10.6" fill="${C.eye}" stroke="none"/>
      <path d="M186,54 C189,48 198,47 204,53" fill="none" stroke-width="2.4"/>
      <circle cx="198" cy="55" r="3.4" fill="#fff" stroke="none"/><circle cx="192" cy="65" r="1.6" fill="#fff" stroke="none"/>`;
  const mouthCarrot = carry.length ? carrotSVG(223, 104, -78, 0.95, carry[0] > 1) : '';
  const basket = carry.length > 1 ? `<g>
      ${carry.slice(1).map((v, i) => carrotSVG(104 + i * 18, 60 - i * 2, i ? 14 : -12, 0.85, v > 1)).join('')}
      <path d="M88,68 L132,68 L127,88 L93,88 Z" fill="#c08a4e"/>
      <path d="M90,75 H130 M92,82 H128" stroke="#8a5a2c" stroke-width="1.6"/></g>` : '';
  return `<g stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
    <defs>
      <path id="${id}t" d="M76,100 C54,108 26,100 18,78 C10,56 22,30 44,26 C60,23 70,34 66,44 C62,52 62,62 70,72 C78,82 88,92 76,100 Z"/>
      <clipPath id="${id}tc"><use href="#${id}t"/></clipPath>
      <path id="${id}b" d="M66,96 C80,80 122,78 158,84 C176,88 182,112 176,132 C172,146 160,152 146,152 L90,152 C70,152 56,138 58,118 C59,108 61,101 66,96 Z"/>
      <clipPath id="${id}bc"><use href="#${id}b"/></clipPath>
      <path id="${id}h" d="M148,66 C146,38 168,22 194,24 C214,26 224,44 222,62 C228,66 233,73 233,81 C233,91 225,96 215,96 C207,106 193,111 178,109 C158,106 149,88 148,66 Z"/>
      <clipPath id="${id}hc"><use href="#${id}h"/></clipPath>
    </defs>
    ${leg('b h', 'M98,130 L98,158 Q98,166 107,166 Q116,166 116,158 L116,130 Z', 94, true)}
    ${leg('a f', 'M160,130 L160,158 Q160,166 168.5,166 Q177,166 177,158 L177,130 Z', 156, true)}
    <g class="ls-tail">
      <use href="#${id}t" fill="${C.tan}"/>
      <g clip-path="url(#${id}tc)" stroke="none"><ellipse cx="40" cy="64" rx="30" ry="10" transform="rotate(-20 40 64)" fill="${C.dark}"/><ellipse cx="42" cy="30" rx="28" ry="16" fill="${C.white}"/></g>
      <use href="#${id}t" fill="none"/>
    </g>
    ${leg('a h', 'M80,128 L80,158 Q80,166 90,166 Q100,166 100,158 L100,128 Z', 76, false)}
    ${leg('b f', 'M142,128 L142,158 Q142,166 151.5,166 Q161,166 161,158 L161,128 Z', 138, false)}
    <use href="#${id}b" fill="${C.tan}"/>
    <g clip-path="url(#${id}bc)" stroke="none">
      <ellipse cx="112" cy="80" rx="56" ry="13" fill="${C.shade}"/>
      <ellipse cx="118" cy="160" rx="54" ry="16" fill="${C.white}"/>
      <ellipse cx="60" cy="136" rx="12" ry="20" fill="${C.white}"/>
    </g>
    <use href="#${id}b" fill="none"/>
    <path d="M72,124 C80,114 96,114 104,126" stroke-width="2" fill="none" opacity=".55"/>
    ${basket}
    <path d="M150,96 C168,94 182,110 181,128 C180,144 168,154 152,152 C156,146 150,142 155,136 C150,132 154,126 151,120 C155,114 148,108 150,96 Z" fill="${C.white}"/>
    ${costumeSide(cos, 'neck')}
    ${costumeSide(cos, 'back')}
    <path d="M154,46 C146,28 144,8 148,-8 C162,2 176,18 182,34 Z" fill="${C.shade}"/>
    <path d="M166,42 C160,24 160,4 166,-14 C186,-4 202,14 208,34 Z" fill="${C.tan}"/>
    <path d="M173,35 C169,22 169,6 172,-4 C186,6 196,18 200,30 Z" fill="${C.pink}" stroke="none"/>
    <path d="M175,32 C178,26 177,18 178,12 M180,33 C184,28 184,22 186,16 M186,33 C190,29 191,25 193,22 M192,33 C195,30 196,29 198,28" stroke="${C.white}" stroke-width="2.2" fill="none"/>
    <use href="#${id}h" fill="${C.tan}"/>
    <g clip-path="url(#${id}hc)" stroke="none">
      <path d="M188,76 C204,70 222,70 234,80 C236,94 224,98 214,98 C204,108 186,113 170,107 C178,96 180,84 188,76 Z" fill="${C.white}"/>
      <path d="M200,72 C198,58 194,42 188,28 L194,27 C201,42 206,58 208,70 Z" fill="${C.white}"/>
      <ellipse cx="162" cy="98" rx="16" ry="12" fill="${C.white}"/>
      ${o.soot ? '<rect x="140" y="10" width="110" height="110" fill="#2b2b2b" opacity=".78"/>' : ''}
    </g>
    <use href="#${id}h" fill="none"/>
    <path d="M164,104 L156,112 L166,111 L162,119 L172,113 L176,118 L178,108" fill="${C.white}"/>
    <ellipse cx="190" cy="44" rx="8" ry="3.6" fill="${C.shade}" stroke="none"/>
    ${eyeSVG}
    <path d="M220,94 C216,98 210,99 205,96" fill="none" stroke-width="2"/>
    ${carry.length || o.soot ? '' : `<path d="M208,97 C208,109 216,113 220,106 C221,102 220,99 218,97 Z" fill="${C.tongue}" stroke-width="2"/>`}
    <ellipse cx="230" cy="80" rx="5.6" ry="4.6" fill="${C.nose}" stroke="none"/>
    <circle cx="228.5" cy="78.5" r="1.4" fill="#fff" stroke="none"/>
    ${mouthCarrot}
    ${costumeSide(cos, 'head')}
    ${o.sweat ? '<path class="ls-pulse" d="M222,30 C216,40 216,46 222,48 C228,46 228,40 222,30 Z" fill="#8fd3ff" stroke-width="2"/>' : ''}
    ${o.soot ? '<g fill="#bdbdbd" stroke-width="2"><circle cx="196" cy="2" r="9"/><circle cx="210" cy="-8" r="7"/><circle cx="222" cy="-16" r="5"/></g>' : ''}
  </g>`;
}

// 令狗正面（標題、結算）
export function dogFront(cos = 'none', mood = 'happy') {
  const id = `df${uid++}`;
  const eyes = mood === 'cry'
    ? `<path d="M70,82 C76,76 86,76 90,82" fill="none" stroke-width="3"/><path d="M110,82 C114,76 124,76 130,82" fill="none" stroke-width="3"/>
       <path d="M78,88 C76,96 76,100 80,102 C84,100 84,96 82,88 Z" fill="#8fd3ff" stroke-width="2"/><path d="M122,88 C120,96 120,100 124,102 C128,100 128,96 126,88 Z" fill="#8fd3ff" stroke-width="2"/>`
    : `<ellipse cx="80" cy="80" rx="9" ry="10.5" fill="${C.eye}" stroke="none"/><ellipse cx="120" cy="80" rx="9" ry="10.5" fill="${C.eye}" stroke="none"/>
       <path d="M70,74 C74,67 84,66 90,72 M110,72 C116,66 126,67 130,74" fill="none" stroke-width="2.4"/>
       <circle cx="83" cy="76" r="3.4" fill="#fff" stroke="none"/><circle cx="123" cy="76" r="3.4" fill="#fff" stroke="none"/>
       <circle cx="77" cy="85" r="1.6" fill="#fff" stroke="none"/><circle cx="117" cy="85" r="1.6" fill="#fff" stroke="none"/>`;
  return `<g stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
    <defs>
      <path id="${id}t" d="M132,150 C150,140 166,120 170,96 C173,80 170,66 162,58 C178,56 194,74 192,98 C190,126 166,152 138,162 Z"/>
      <clipPath id="${id}tc"><use href="#${id}t"/></clipPath>
      <path id="${id}h" d="M50,86 C48,56 70,38 100,38 C130,38 152,56 150,86 C150,104 140,118 124,124 C114,128 86,128 76,124 C60,118 50,104 50,86 Z"/>
      <clipPath id="${id}hc"><use href="#${id}h"/></clipPath>
    </defs>
    <g class="ls-tail"><use href="#${id}t" fill="${C.tan}"/>
      <g clip-path="url(#${id}tc)" stroke="none"><ellipse cx="176" cy="96" rx="22" ry="8" transform="rotate(-30 176 96)" fill="${C.dark}"/><ellipse cx="174" cy="62" rx="20" ry="14" fill="${C.white}"/></g>
      <use href="#${id}t" fill="none"/></g>
    <path d="M60,142 C58,118 76,104 100,104 C124,104 142,118 140,142 C140,162 134,178 122,182 L78,182 C66,178 60,162 60,142 Z" fill="${C.tan}"/>
    <path d="M79,160 L79,188 Q79,196 88,196 Q97,196 97,188 L97,160 Z" fill="${C.white}"/>
    <path d="M103,160 L103,188 Q103,196 112,196 Q121,196 121,188 L121,160 Z" fill="${C.white}"/>
    <path d="M68,112 C84,104 116,104 132,112 C138,128 134,150 126,166 L120,160 L114,168 L107,160 L100,168 L93,160 L86,168 L80,160 L74,166 C66,150 62,128 68,112 Z" fill="${C.white}"/>
    <rect x="75" y="188" width="26" height="14" rx="6" fill="${C.boot}"/><rect x="99" y="188" width="26" height="14" rx="6" fill="${C.boot}"/>
    <path d="M75,191 H101 M99,191 H125" stroke="#fff" stroke-width="3"/>
    <path d="M88,202 V210 M112,202 V210" stroke-width="2.4"/>
    <path d="M80,211 H96 M104,211 H120" stroke="${C.blade}" stroke-width="4"/>
    ${costumeFront(cos, 'neck')}
    ${costumeFront(cos, 'back')}
    <path d="M62,60 C50,40 42,14 44,-8 C64,2 84,24 90,44 Z" fill="${C.tan}"/>
    <path d="M138,60 C150,40 158,14 156,-8 C136,2 116,24 110,44 Z" fill="${C.tan}"/>
    <path d="M66,52 C58,36 53,18 53,4 C66,12 78,28 82,42 Z" fill="${C.pink}" stroke="none"/>
    <path d="M134,52 C142,36 147,18 147,4 C134,12 122,28 118,42 Z" fill="${C.pink}" stroke="none"/>
    <path d="M68,48 C66,40 62,32 60,24 M74,46 C72,38 70,32 66,26 M80,44 C78,38 76,34 73,30 M132,48 C134,40 138,32 140,24 M126,46 C128,38 130,32 134,26 M120,44 C122,38 124,34 127,30" stroke="${C.white}" stroke-width="2.2" fill="none"/>
    <use href="#${id}h" fill="${C.tan}"/>
    <g clip-path="url(#${id}hc)" stroke="none">
      <path d="M68,98 C78,86 92,84 100,84 C108,84 122,86 132,98 C138,112 128,128 100,130 C72,128 62,112 68,98 Z" fill="${C.white}"/>
      <path d="M96,86 C95,70 96,54 98,38 L102,38 C104,54 105,70 104,86 Z" fill="${C.white}"/>
    </g>
    <use href="#${id}h" fill="none"/>
    <path d="M52,94 L44,100 L52,102 L46,110 L56,108 L56,116 L64,110" fill="${C.tan}"/>
    <path d="M148,94 L156,100 L148,102 L154,110 L144,108 L144,116 L136,110" fill="${C.tan}"/>
    <ellipse cx="78" cy="64" rx="8" ry="3.6" fill="${C.shade}" stroke="none" transform="rotate(-12 78 64)"/>
    <ellipse cx="122" cy="64" rx="8" ry="3.6" fill="${C.shade}" stroke="none" transform="rotate(12 122 64)"/>
    ${eyes}
    <path d="M92,97 C92,92 108,92 108,97 C108,101 104,104 100,105 C96,104 92,101 92,97 Z" fill="${C.nose}" stroke="none"/>
    <circle cx="97" cy="95.5" r="1.5" fill="#fff" stroke="none"/>
    <path d="M90,110 C94,114 98,113 100,108 C102,113 106,114 110,110" fill="none" stroke-width="2"/>
    ${mood === 'cry' ? '' : `<path d="M95,112 C94,124 106,124 105,112 Z" fill="${C.tongue}" stroke-width="2"/>`}
    ${costumeFront(cos, 'head')}
  </g>`;
}

// 小豬（側面、面向右，腳底 y = 92、中心 x = 60）
export function pigSVG() {
  return `<g stroke="${C.line}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M20,54 c-8,-4 -10,-14 -2,-16 c6,-1 6,8 0,8" fill="none"/>
    <g class="ls-mlg"><rect x="34" y="72" width="10" height="20" rx="4" fill="#e98da3"/></g>
    <g class="ls-mlg b"><rect x="74" y="72" width="10" height="20" rx="4" fill="#e98da3"/></g>
    <ellipse cx="58" cy="60" rx="40" ry="28" fill="#f6a8bb"/>
    <g class="ls-mlg b"><rect x="44" y="74" width="10" height="18" rx="4" fill="#f6a8bb"/></g>
    <g class="ls-mlg"><rect x="84" y="72" width="10" height="20" rx="4" fill="#f6a8bb"/></g>
    <circle cx="94" cy="48" r="22" fill="#f6a8bb"/>
    <path d="M84,30 L88,14 L100,28 Z" fill="#f08aa3"/>
    <ellipse cx="114" cy="52" rx="8" ry="10" fill="#f9c6d3"/>
    <circle cx="112" cy="49" r="1.8" fill="#9c4a5c" stroke="none"/><circle cx="113" cy="56" r="1.8" fill="#9c4a5c" stroke="none"/>
    <circle cx="99" cy="42" r="3" fill="#2a1912" stroke="none"/><circle cx="100" cy="41" r="1" fill="#fff" stroke="none"/>
    <ellipse cx="100" cy="56" rx="5" ry="3" fill="#f27b97" stroke="none" opacity=".8"/>
  </g>`;
}

// 麻吉（側面、面向右，腳底 y = 182、中心 x = 125）：白色米克斯、大立耳、藍綠項圈掛紫色吊牌
export function majiSVG(loot = false) {
  const W2 = '#f8f3ea', S2 = '#e6dccb';
  return `<g stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
    <g class="ls-mlg b"><path d="M96,118 L94,170 Q94,178 102,178 Q110,178 110,170 L112,118 Z" fill="${S2}"/></g>
    <g class="ls-mlg"><path d="M150,118 L150,170 Q150,178 158,178 Q166,178 166,170 L166,118 Z" fill="${S2}"/></g>
    <path d="M62,92 C46,82 38,62 46,44 C48,58 56,72 70,82 Z" fill="${W2}"/>
    <g class="ls-mlg"><path d="M76,116 L74,172 Q74,180 82,180 Q90,180 90,172 L94,116 Z" fill="${W2}"/></g>
    <g class="ls-mlg b"><path d="M136,116 L136,172 Q136,180 144,180 Q152,180 152,172 L152,116 Z" fill="${W2}"/></g>
    <path d="M60,88 C80,72 140,72 162,80 C176,86 178,104 170,118 C164,128 150,130 136,128 L88,128 C70,128 56,116 56,104 C56,96 57,92 60,88 Z" fill="${W2}"/>
    <path d="M150,48 C144,32 144,12 150,-4 C162,8 172,24 174,40 Z" fill="${S2}"/>
    <path d="M150,72 C148,48 164,36 182,38 C196,40 204,50 206,58 L234,70 C240,74 238,84 228,86 L204,88 C196,98 182,100 170,96 C156,92 150,84 150,72 Z" fill="${W2}"/>
    <path d="M164,44 C158,28 158,8 164,-8 C178,4 188,20 190,40 Z" fill="${W2}"/>
    <path d="M170,38 C166,26 166,12 169,2 C178,12 184,22 185,34 Z" fill="#f2b2ad" stroke="none"/>
    <path d="M150,78 C156,94 166,100 174,102" stroke="#2f8f8a" stroke-width="9" fill="none"/>
    <circle cx="170" cy="110" r="7" fill="#b9a6e8"/>
    <path d="M178,52 C182,48 190,48 194,52" stroke-width="2.6" fill="none"/>
    <ellipse cx="187" cy="60" rx="4.5" ry="6" fill="${C.eye}" stroke="none"/><circle cx="188.5" cy="57.5" r="1.6" fill="#fff" stroke="none"/>
    <ellipse cx="235" cy="74" rx="5" ry="4.2" fill="${C.nose}" stroke="none"/>
    <path d="M206,86 C214,90 222,88 228,84" fill="none" stroke-width="2.2"/>
    ${loot ? carrotSVG(220, 94, -80, 0.95) : ''}
  </g>`;
}

// 紅蘿蔔箱（正面）：照令狗的拔蘿蔔玩具，上面 6 個洞；寬 120、底 y = 86、中心 x = 60
export function boxSVG(fill = 0, hot = false) {
  const holes = [[26, 26], [52, 24], [78, 24], [104, 26], [39, 34], [91, 34]];
  return `<g stroke="${C.line}" stroke-width="2.4" stroke-linejoin="round">
    ${hot ? '<ellipse class="ls-pulse" cx="60" cy="60" rx="70" ry="44" fill="#ffd84d" stroke="none" opacity=".45"/>' : ''}
    <rect x="6" y="28" width="108" height="58" rx="16" fill="#a66a3f"/>
    <rect x="10" y="18" width="100" height="24" rx="12" fill="#8c5531"/>
    ${holes.map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4.2" fill="#3e2416"/>${i < fill ? `<g transform="translate(${x} ${y - 2})"><ellipse cx="-3" cy="-7" rx="3" ry="6" transform="rotate(-22 -3 -7)" fill="#76bf55"/><ellipse cx="3" cy="-7" rx="3" ry="6" transform="rotate(22 3 -7)" fill="#76bf55"/><rect x="-6" y="-2" width="12" height="5" rx="2.5" fill="#f28a2e"/></g>` : ''}`).join('')}
    <rect x="40" y="48" width="40" height="30" rx="8" fill="none" stroke="#e7c08c" stroke-dasharray="3 3" stroke-width="1.6"/>
    ${carrotSVG(60, 63, 0, 0.55)}
    ${hot ? '<g fill="#7a3d00" stroke="#fff" stroke-width="4" paint-order="stroke" font-weight="900" font-size="20" font-family="sans-serif"><text x="60" y="6" text-anchor="middle">×2</text></g>' : ''}
  </g>`;
}

export function bombSVG() {
  return `<g stroke="${C.line}" stroke-width="2.4">
    <path d="M2,-28 C6,-36 12,-38 16,-34" fill="none" stroke="#a77b4a" stroke-width="3"/>
    <rect x="-6" y="-29" width="12" height="7" rx="2" fill="#6c7180"/>
    <circle r="16" cy="-8" fill="#2b2d3a"/>
    <circle cx="-6" cy="-14" r="4" fill="#8a90a8" stroke="none"/>
    <g class="ls-pulse"><path d="M16,-34 l3,-6 l2,6 l6,1 l-5,4 l2,6 l-5,-3 l-5,3 l1,-6 l-5,-4 z" fill="#ffd84d" stroke="#ff8a00" stroke-width="1.5"/></g>
  </g>`;
}
export function heartSVG() {
  return `<path class="ls-pulse" d="M0,8 C-14,-2 -14,-14 -7,-15 C-3,-16 0,-12 0,-9 C0,-12 3,-16 7,-15 C14,-14 14,-2 0,8 Z" fill="#e8455d" stroke="${C.line}" stroke-width="2.2"/>`;
}


// 跳台：一塊乾淨的板子，上面一條亮邊表示站得上去；會動的跳台是黃色、中間有箭頭
export function platSVG(w, moving) {
  const body = moving ? '#ffd98a' : '#a9d6ee';
  const top = moving ? '#fff3cf' : '#eaf7ff';
  const edge = moving ? '#d9a441' : '#7fb6d6';
  return `<g stroke="${C.line}" stroke-width="2.4" stroke-linejoin="round">
    <rect x="0" y="0" width="${w}" height="18" rx="7" fill="${body}"/>
    <rect x="2" y="1.5" width="${w - 4}" height="6" rx="3" fill="${top}" stroke="none"/>
    <path d="M8,15 H${w - 8}" stroke="${edge}" stroke-width="2"/>
    ${moving ? `<path d="M${w / 2 - 16},10 h32 M${w / 2 - 16},10 l6,-4 M${w / 2 - 16},10 l6,4 M${w / 2 + 16},10 l-6,-4 M${w / 2 + 16},10 l-6,4" stroke="#8a5a10" stroke-width="2.2" fill="none"/>` : ''}
  </g>`;
}
