import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * 手绘彩色小图 · 固定资产 / 乐器全集。
 * flat 多色 SVG，48 视口，随 size 缩放；剪影各不相同，深浅纸底都立得住。
 * id 与 data/icons.ts 的条目一一对应。
 */

type Scene = (size: number) => React.JSX.Element;

/** 等距窗阵，省得一个个手写 */
function grid(xs: number[], ys: number[], w: number, h: number, fill: string, key = 'w') {
  return xs.flatMap((x) => ys.map((y) => <Rect key={`${key}${x}-${y}`} x={x} y={y} width={w} height={h} fill={fill} rx={0.6} />));
}

/* —— 房产五型 —— */

const highrise: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="23" y="1" width="2" height="4" fill="#5C7288" />
    <Rect x="17" y="5" width="14" height="39" fill="#7E97AD" rx="1" />
    <Rect x="15.5" y="43" width="17" height="2" fill="#5C7288" rx="1" />
    {grid([19.5, 24, 28.5], [8, 13, 18, 23, 28, 33], 2.8, 3.4, '#DCE7F2')}
    <Rect x="23" y="37.5" width="3" height="6.5" fill="#4E6478" rx="0.5" />
  </Svg>
);

const apartment: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="4" y="11" width="40" height="3.5" fill="#B97F42" rx="1" />
    <Rect x="6" y="14.5" width="36" height="29.5" fill="#D9A05B" rx="1.5" />
    {grid([9, 17.5, 26, 34.5], [18, 25, 31.5], 4.5, 4.5, '#F6E7C8')}
    <Rect x="21" y="36" width="6" height="8" fill="#8C5A2B" rx="1" />
    <Rect x="27.8" y="39" width="1.4" height="1.4" fill="#F6E7C8" />
  </Svg>
);

const villa: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="30" y="13" width="3.5" height="7" fill="#B97F42" />
    <Path d="M9 25 L24 12.5 L39 25 Z" fill="#C64B3C" />
    <Rect x="13" y="25" width="22" height="17" fill="#F4E8CF" />
    <Rect x="21.5" y="30" width="5" height="12" fill="#8C5A2B" rx="1" />
    <Rect x="15.5" y="28.5" width="4.5" height="4.5" fill="#BBD3E8" rx="0.6" />
    <Rect x="28" y="28.5" width="4.5" height="4.5" fill="#BBD3E8" rx="0.6" />
    <Circle cx="7.5" cy="41" r="3.2" fill="#7CB56B" />
    <Circle cx="41.5" cy="42" r="2.6" fill="#7CB56B" />
    <Rect x="4" y="43" width="40" height="2" fill="#9DB89A" rx="1" />
  </Svg>
);

/** 叠墅：上下两户同宽，中间一层公共楼板 */
const stacked: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="5" y="6" width="38" height="3" fill="#5F8F82" rx="1" />
    <Rect x="7" y="9" width="34" height="12" fill="#8FBFB2" rx="1" />
    {grid([10.5, 29], [11.5], 4.5, 4, '#EAF3F0')}
    <Rect x="19.5" y="11.5" width="9" height="6" fill="#5F8F82" rx="0.6" />
    <Rect x="5" y="21" width="38" height="3.5" fill="#B49B72" rx="1" />
    <Rect x="7" y="24.5" width="34" height="12" fill="#C9A26B" rx="1" />
    {grid([10.5, 29], [27], 4.5, 4, '#F3E6CE')}
    <Rect x="19.5" y="27" width="9" height="6" fill="#8C5A2B" rx="0.6" />
    <Rect x="5" y="36.5" width="38" height="3" fill="#9E7B4F" rx="1" />
    <Rect x="5" y="42" width="38" height="2" fill="#C9BFA6" rx="1" />
  </Svg>
);

const selfbuilt: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="13" y="23" width="21" height="20" fill="#EAD9AE" />
    <Path d="M9 23 L23.5 12 L38 23" fill="none" stroke="#C64B3C" strokeWidth="2.6" strokeDasharray="4.5 3" strokeLinecap="round" />
    <Rect x="18" y="30" width="4.5" height="4.5" fill="#BBD3E8" rx="0.6" />
    <Rect x="25" y="30" width="4.5" height="4.5" fill="#BBD3E8" rx="0.6" />
    <Rect x="21" y="36" width="4.5" height="7" fill="#8C5A2B" rx="1" />
    <Rect x="36.5" y="16" width="1.8" height="27" fill="#A07850" />
    <Rect x="42" y="16" width="1.8" height="27" fill="#A07850" />
    <Rect x="35.5" y="16" width="9.5" height="1.8" fill="#A07850" />
    <Path d="M36.5 30 L43.8 22 M43.8 30 L36.5 22" stroke="#B98F68" strokeWidth="1.4" />
    <Rect x="4.5" y="39" width="7" height="4" fill="#C0392B" rx="0.5" />
    <Rect x="5.5" y="35.5" width="5" height="3.5" fill="#A93226" rx="0.5" />
    <Rect x="4" y="43" width="40" height="2" fill="#C9BFA6" rx="1" />
  </Svg>
);

/* —— 出行 —— */

const car: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="4" y="42" width="40" height="2.5" rx="1.2" fill="#C9C2B4" />
    <Path d="M6 34 Q6 26 14 24 L18 17 Q19 15 22 15 L30 15 Q33 15 34 17 L38 24 Q42 26 42 32 L42 34 Q42 36 40 36 L8 36 Q6 36 6 34 Z" fill="#C0392B" />
    <Path d="M19 24 L21.5 18 L26.5 18 L26.5 24 Z" fill="#BBD3E8" />
    <Path d="M28.5 24 L28.5 18 L31 18.5 L34 24 Z" fill="#BBD3E8" />
    <Rect x="39.5" y="27" width="2.5" height="3.5" rx="1" fill="#F4D03F" />
    <Circle cx="14" cy="36" r="5" fill="#2E3440" />
    <Circle cx="14" cy="36" r="2.2" fill="#9AA2AD" />
    <Circle cx="34" cy="36" r="5" fill="#2E3440" />
    <Circle cx="34" cy="36" r="2.2" fill="#9AA2AD" />
  </Svg>
);

const ebike: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="11" cy="37" r="6" fill="#2E3440" />
    <Circle cx="38" cy="37" r="5" fill="#2E3440" />
    <Path d="M18 36 L30 36 L36 33 L38 30" stroke="#E74C3C" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <Path d="M36 33 L40 12" stroke="#575F6E" strokeWidth="3.5" strokeLinecap="round" />
    <Path d="M34 12 L46 14" stroke="#575F6E" strokeWidth="3" strokeLinecap="round" />
    <Rect x="22" y="24" width="9" height="4" rx="2" fill="#2E3440" />
    <Rect x="25" y="27" width="2.5" height="8" fill="#575F6E" />
    <Circle cx="41.5" cy="11" r="2" fill="#F4D03F" />
  </Svg>
);

const bicycle: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="12" cy="32" r="9" fill="none" stroke="#3C4250" strokeWidth="2.5" />
    <Circle cx="36" cy="32" r="9" fill="none" stroke="#3C4250" strokeWidth="2.5" />
    <Path d="M12 32 L22 18 L34 18 M22 18 L26 32 M12 32 L20 32 M26 32 L36 32 M34 18 L38 24 L36 32" stroke="#2980B9" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <Rect x="30" y="15" width="7" height="2.5" rx="1" fill="#2E3440" />
    <Path d="M33 16 L38 13" stroke="#2E3440" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const parking: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="6" y="6" width="36" height="36" rx="3" fill="#8A8F98" />
    <Rect x="9.5" y="9.5" width="29" height="29" rx="2" fill="none" stroke="#F2F2F4" strokeWidth="2" strokeDasharray="6 4" />
    <Path d="M20 14 L20 34 M20 14 Q28 14 28 20 Q28 26 20 26" stroke="#F2F2F4" strokeWidth="4" fill="none" strokeLinecap="round" />
  </Svg>
);

/* —— 家电 / 数码 —— */

const tv: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="22" y="34" width="4" height="8" fill="#5B6270" />
    <Rect x="14" y="42" width="20" height="2.5" rx="1" fill="#5B6270" />
    <Rect x="4" y="6" width="40" height="28" rx="2.5" fill="#2E3440" />
    <Rect x="7" y="9" width="34" height="22" rx="1.5" fill="#8FC1E3" />
    <Rect x="10" y="12" width="12" height="8" rx="1" fill="#5D93B8" />
    <Rect x="24" y="12" width="14" height="8" rx="1" fill="#5D93B8" />
    <Rect x="10" y="23" width="28" height="2" rx="1" fill="#5D93B8" />
  </Svg>
);

const fridge: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="12" y="4" width="24" height="40" rx="3" fill="#D8DEE4" />
    <Rect x="12" y="16" width="24" height="1.6" fill="#AEB6C0" />
    <Rect x="31" y="8" width="2" height="5.5" rx="1" fill="#8A94A1" />
    <Rect x="31" y="20" width="2" height="8" rx="1" fill="#8A94A1" />
    <Rect x="15" y="8" width="8" height="6" rx="1" fill="#C7D3DD" />
    <Rect x="15" y="26" width="12" height="2" rx="1" fill="#C7D3DD" />
  </Svg>
);

const sofa: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="6" y="14" width="36" height="10" rx="5" fill="#E89043" />
    <Rect x="6" y="20" width="36" height="16" rx="5" fill="#E67E22" />
    <Rect x="4" y="22" width="6" height="14" rx="3" fill="#D35400" />
    <Rect x="38" y="22" width="6" height="14" rx="3" fill="#D35400" />
    <Rect x="23" y="24" width="2" height="10" fill="#D35400" />
    <Rect x="9" y="36" width="3" height="4" rx="1" fill="#5D4037" />
    <Rect x="36" y="36" width="3" height="4" rx="1" fill="#5D4037" />
  </Svg>
);

const robotvac: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="24" cy="24" r="17" fill="#3C4250" />
    <Circle cx="24" cy="24" r="13" fill="#575F6E" />
    <Rect x="18" y="9" width="12" height="6" rx="3" fill="#8FD0F5" />
    <Circle cx="24" cy="29" r="4.5" fill="#2E3440" />
    <Path d="M10 33 L6 37 M14 37 L11 41 M38 33 L42 37 M34 37 L37 41" stroke="#C9A227" strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const laptop: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="10" y="8" width="28" height="18" rx="2" fill="#B0B6BE" />
    <Rect x="12" y="10" width="24" height="14" rx="1" fill="#8FC1E3" />
    <Path d="M5 26 L43 26 L46 34 Q46 36 43.5 36 L4.5 36 Q2 36 2 34 Z" fill="#9AA2AD" />
    <Rect x="19" y="29" width="10" height="4" rx="1" fill="#C7CDD4" />
  </Svg>
);

const phone: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="15" y="4" width="18" height="40" rx="4" fill="#2E3440" />
    <Rect x="17" y="8" width="14" height="32" rx="2" fill="#9FD0F0" />
    <Rect x="21" y="5.5" width="6" height="1.8" rx="0.9" fill="#1B2027" />
    <Circle cx="30.5" cy="6.5" r="0.9" fill="#556677" />
    <Rect x="19" y="12" width="10" height="12" rx="2" fill="#6FA8DC" />
    <Rect x="21" y="37" width="6" height="1.4" rx="0.7" fill="#2E3440" />
  </Svg>
);

const tablet: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="8" y="6" width="32" height="36" rx="4" fill="#2E3440" />
    <Rect x="11" y="10" width="26" height="28" rx="1.5" fill="#9FD0F0" />
    <Rect x="13" y="12" width="10" height="24" rx="1" fill="#6FA8DC" />
    <Rect x="25" y="12" width="10" height="10" rx="1" fill="#6FA8DC" />
    <Circle cx="24" cy="8" r="1" fill="#556677" />
  </Svg>
);

const camera: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="18" y="8" width="10" height="3" rx="1" fill="#3A3F4B" />
    <Path d="M6 16 L14 16 L17 12 L29 12 L32 16 L40 16 Q42 16 42 18 L42 38 Q42 40 40 40 L8 40 Q6 40 6 38 Z" fill="#4A4F5C" />
    <Circle cx="24" cy="27" r="9" fill="#2E3440" />
    <Circle cx="24" cy="27" r="6" fill="#5D93B8" />
    <Circle cx="21.8" cy="24.8" r="1.6" fill="#BFE0F5" />
    <Rect x="34" y="18" width="4" height="3" rx="1" fill="#F4D03F" />
  </Svg>
);

const lens: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="24" cy="24" r="17" fill="#D8DEE4" />
    <Circle cx="24" cy="24" r="13.5" fill="#3C4250" />
    <Circle cx="24" cy="24" r="9" fill="#5D93B8" />
    <Circle cx="24" cy="24" r="5" fill="#2C3E50" />
    <Path d="M24 24 L28.5 21.5 L27.8 27 Z" fill="#8FD0F5" />
    <Circle cx="24" cy="8.5" r="1.4" fill="#C0392B" />
  </Svg>
);

const drone: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M14 14 L9 9 M34 14 L39 9 M14 34 L9 39 M34 34 L39 39" stroke="#575F6E" strokeWidth="3.4" strokeLinecap="round" />
    <Circle cx="7" cy="7" r="5.5" fill="#8FD0F5" opacity="0.85" />
    <Circle cx="41" cy="7" r="5.5" fill="#8FD0F5" opacity="0.85" />
    <Circle cx="7" cy="41" r="5.5" fill="#8FD0F5" opacity="0.85" />
    <Circle cx="41" cy="41" r="5.5" fill="#8FD0F5" opacity="0.85" />
    <Rect x="15" y="17" width="18" height="14" rx="5" fill="#3C4250" />
    <Circle cx="24" cy="31" r="3" fill="#5D93B8" />
  </Svg>
);

const console: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="4" y="15" width="40" height="20" rx="9" fill="#3C4250" />
    <Rect x="11" y="21" width="3" height="9" rx="1" fill="#D8DEE4" />
    <Rect x="8" y="24" width="9" height="3" rx="1" fill="#D8DEE4" />
    <Circle cx="34" cy="21.5" r="2.4" fill="#E74C3C" />
    <Circle cx="39" cy="25.5" r="2.4" fill="#8FD0F5" />
    <Circle cx="29" cy="25.5" r="2.4" fill="#F4D03F" />
    <Circle cx="34" cy="29.5" r="2.4" fill="#7CB56B" />
    <Circle cx="20" cy="29" r="2.6" fill="#575F6E" />
  </Svg>
);

const pencil: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <G transform="rotate(40 24 24)">
      <Rect x="19" y="6" width="10" height="24" rx="1" fill="#E8B04B" />
      <Rect x="19" y="2" width="10" height="4" rx="2" fill="#E78A8A" />
      <Rect x="19" y="6" width="10" height="3" fill="#D8983B" />
      <Path d="M19 30 L29 30 L24 42 Z" fill="#F2D9A0" />
      <Path d="M21.8 35.2 L26.2 35.2 L24 40 Z" fill="#3B3B45" />
    </G>
  </Svg>
);

const earbuds: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="8" y="26" width="32" height="16" rx="5" fill="#F0F1F4" />
    <Rect x="8" y="26" width="32" height="4" rx="2" fill="#D8DEE4" />
    <Circle cx="17" cy="13" r="5" fill="#FAFAFC" />
    <Rect x="15" y="16" width="4" height="9" rx="2" fill="#FAFAFC" />
    <Circle cx="17" cy="11" r="2" fill="#8FD0F5" />
    <Circle cx="31" cy="13" r="5" fill="#FAFAFC" />
    <Rect x="29" y="16" width="4" height="9" rx="2" fill="#FAFAFC" />
    <Circle cx="31" cy="11" r="2" fill="#8FD0F5" />
  </Svg>
);

const watch: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="17" y="3" width="14" height="10" rx="3" fill="#5D6470" />
    <Rect x="17" y="35" width="14" height="10" rx="3" fill="#5D6470" />
    <Rect x="11" y="11" width="26" height="26" rx="7" fill="#2E3440" />
    <Rect x="14" y="14" width="20" height="20" rx="4.5" fill="#8FD0F5" />
    <Path d="M24 19 L24 24 L28 26" stroke="#2E3440" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <Rect x="37" y="20" width="2.5" height="5" rx="1" fill="#5D6470" />
  </Svg>
);

const keyboard: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="3" y="14" width="42" height="22" rx="3" fill="#3C4250" />
    {[7, 13, 19, 25, 31, 37].map((x, i) => (
      <Rect key={`r1${x}`} x={x} y={17.5} width={4} height={4} rx={1} fill={i === 0 ? '#C0392B' : '#D8DEE4'} />
    ))}
    {[7, 13, 19, 25, 31, 37].map((x) => (
      <Rect key={`r2${x}`} x={x} y={23} width={4} height={4} rx={1} fill="#D8DEE4" />
    ))}
    {[7, 37].map((x) => (
      <Rect key={`r3${x}`} x={x} y={28.5} width={4} height={4} rx={1} fill="#D8DEE4" />
    ))}
    <Rect x="13" y="28.5" width={22} height={4} rx={1} fill="#D8DEE4" />
  </Svg>
);

const ereader: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="8" y="6" width="32" height="36" rx="3" fill="#4A4F5C" />
    <Rect x="11" y="10" width="26" height="28" rx="1" fill="#F4F1E8" />
    {[14, 19, 24, 29].map((y, i) => (
      <Rect key={y} x="14" y={y} width={i === 2 ? 14 : 20} height={2} rx={1} fill="#B9B2A4" />
    ))}
    <Circle cx="24" cy="41" r="1.5" fill="#D8DEE4" />
  </Svg>
);

const speaker: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="13" y="4" width="22" height="40" rx="4" fill="#4A4F5C" />
    <Circle cx="24" cy="15" r="4" fill="#2E3440" />
    <Circle cx="24" cy="15" r="1.8" fill="#8A94A1" />
    <Circle cx="24" cy="32" r="6.5" fill="#2E3440" />
    <Circle cx="24" cy="32" r="3" fill="#8A94A1" />
  </Svg>
);

const projector: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M36 19 L46 12 L46 38 L36 31 Z" fill="#F4D03F" opacity="0.55" />
    <Rect x="6" y="16" width="30" height="18" rx="4" fill="#E4E7EC" />
    <Circle cx="34" cy="25" r="6" fill="#3C4250" />
    <Circle cx="34" cy="25" r="3.4" fill="#5D93B8" />
    <Rect x="9" y="34" width="4" height="3" rx="1" fill="#AEB6C0" />
    <Rect x="22" y="34" width="4" height="3" rx="1" fill="#AEB6C0" />
    <Rect x="10" y="20" width="10" height="2" rx="1" fill="#AEB6C0" />
    <Rect x="10" y="24" width="10" height="2" rx="1" fill="#AEB6C0" />
  </Svg>
);

const vr: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M6 22 Q2 25 6 28 M42 22 Q46 25 42 28" stroke="#3C4250" strokeWidth="2.5" fill="none" />
    <Rect x="6" y="16" width="36" height="18" rx="8" fill="#3C4250" />
    <Rect x="9" y="18" width="30" height="14" rx="6" fill="#E8E8EC" />
    <Circle cx="17.5" cy="25" r="4.5" fill="#5D93B8" />
    <Circle cx="30.5" cy="25" r="4.5" fill="#5D93B8" />
  </Svg>
);

/* —— 保值物件 —— */

const bag: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M17 16 Q17 8 24 8 Q31 8 31 16" stroke="#8C6B1F" strokeWidth="3" fill="none" />
    <Path d="M10 16 L38 16 L41 42 Q41 44 39 44 L9 44 Q7 44 7 42 Z" fill="#C9A227" />
    <Path d="M10 16 L38 16 L39.5 26 L8.5 26 Z" fill="#B8901F" />
    <Circle cx="24" cy="30" r="2.2" fill="#F4E8CF" />
  </Svg>
);

const jewelry: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M14 10 L22 10 L26 15 L18 26 L10 15 Z" fill="#8FD0F5" />
    <Path d="M14 10 L18 26 M22 10 L18 26 M10 15 L26 15" stroke="#5D93B8" strokeWidth="1.2" />
    <Path d="M32 26 L38 26 L35 22 Z" fill="#BFE0F5" />
    <Circle cx="35" cy="35" r="8" fill="none" stroke="#E6B84C" strokeWidth="3" />
  </Svg>
);

const gold: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M16 19 L42 19 L38 29 L12 29 Z" fill="#D4A73C" />
    <Path d="M10 30 L36 30 L32 40 L6 40 Z" fill="#E6B84C" />
    <Rect x="14" y="33" width="8" height="1.6" rx="0.8" fill="#F4D9A0" />
    <Rect x="20" y="22" width="8" height="1.6" rx="0.8" fill="#F4D9A0" />
  </Svg>
);

/* —— 乐器 —— */

const guitar: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="21.7" y="4" width="4.6" height="14" fill="#8C6B1F" />
    <Rect x="19.5" y="2" width="9" height="5" rx="1.5" fill="#3B2B20" />
    <Circle cx="24" cy="22" r="8.5" fill="#C0392B" />
    <Circle cx="24" cy="32" r="11" fill="#C0392B" />
    <Circle cx="24" cy="27" r="4" fill="#3B2B20" />
    <Rect x="20" y="39.5" width="8" height="2" rx="1" fill="#3B2B20" />
    <Path d="M22.5 7 L22.5 37 M25.5 7 L25.5 37" stroke="#F2E7CE" strokeWidth="0.7" />
  </Svg>
);

const piano: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="8" y="10" width="32" height="26" rx="2" fill="#2E3440" />
    <Rect x="18" y="14" width="12" height="9" rx="1" fill="#3C4250" />
    <Rect x="10" y="30" width="28" height="8" rx="1" fill="#F4F1E8" />
    {[12.5, 16, 23, 26.5, 30, 33.5].map((x) => (
      <Rect key={x} x={x} y={30} width={2} height={5} fill="#2E3440" />
    ))}
  </Svg>
);

const keys: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="4" y="14" width="40" height="12" rx="2" fill="#3C4250" />
    <Circle cx="10" cy="20" r="2" fill="#8FD0F5" />
    <Circle cx="16" cy="20" r="2" fill="#E74C3C" />
    <Rect x="22" y="17" width="10" height="6" rx="1" fill="#8FD0F5" />
    <Rect x="6" y="26" width="36" height="12" rx="1.5" fill="#F4F1E8" />
    {[10, 14, 18, 26, 30, 34].map((x) => (
      <Rect key={x} x={x} y={26} width={2.4} height={6} fill="#2E3440" />
    ))}
  </Svg>
);

const drum: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M8 6 L40 14 M40 6 L8 14" stroke="#C9A227" strokeWidth="2.4" strokeLinecap="round" />
    <Path d="M10 18 L10 36 Q10 41 24 41 Q38 41 38 36 L38 18 Z" fill="#C0392B" />
    <Ellipse cx="24" cy="17" rx="14" ry="5" fill="#E74C3C" />
    <Path d="M10 36 Q24 41 38 36" stroke="#3B2B20" strokeWidth="2" fill="none" />
    {[15, 24, 33].map((x) => (
      <Rect key={x} x={x - 0.9} y={22} width={1.8} height={3} rx={0.5} fill="#3B2B20" />
    ))}
  </Svg>
);

const mic: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="24" cy="16" r="9" fill="#AEB6C0" />
    <Path d="M16.5 13 L31.5 13 M16.5 19 L31.5 19 M20 9.5 L20 22.5 M28 9.5 L28 22.5" stroke="#8A94A1" strokeWidth="1.1" />
    <Rect x="20" y="24" width="8" height="16" rx="3" fill="#3C4250" />
    <Path d="M24 40 Q24 45 30 45 L34 45" stroke="#3C4250" strokeWidth="2" fill="none" />
  </Svg>
);

const music: Scene = (size) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M18 8 L18 32 M32 12 L32 36" stroke="#3C6E91" strokeWidth="2.8" strokeLinecap="round" />
    <Path d="M18 8 L32 12 L32 16 L18 12 Z" fill="#3C6E91" />
    <Ellipse cx="14.5" cy="33" rx="4.5" ry="3.4" fill="#3C6E91" transform="rotate(-15 14.5 33)" />
    <Ellipse cx="28.5" cy="37" rx="4.5" ry="3.4" fill="#3C6E91" transform="rotate(-15 28.5 37)" />
  </Svg>
);

const SCENES: Record<string, Scene> = {
  'house-highrise': highrise,
  'house-apartment': apartment,
  'house-villa': villa,
  'house-stacked': stacked,
  'house-selfbuilt': selfbuilt,
  car,
  parking,
  tv,
  fridge,
  sofa,
  robotvac,
  laptop,
  phone,
  tablet,
  camera,
  lens,
  drone,
  console,
  pencil,
  earbuds,
  watch,
  keyboard,
  ereader,
  speaker,
  projector,
  vr,
  ebike,
  bicycle,
  bag,
  jewelry,
  gold,
  guitar,
  piano,
  keys,
  drum,
  mic,
  music,
};

/** 按图标 id 渲染手绘小图；不在册的 id 画一枚中性的方框章兜底 */
export function Illus({ id, size }: { id: string; size: number }) {
  const scene = SCENES[id];
  if (scene) return scene(size);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x="6" y="6" width="36" height="36" rx="6" fill="#8A94A1" />
    </Svg>
  );
}
