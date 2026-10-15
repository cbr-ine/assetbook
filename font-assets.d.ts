// 直引字体文件（见 App.tsx 顶部的字重说明）；expo/types 未声明 *.ttf，这里补上。
declare module '*.ttf' {
  const asset: number;
  export default asset;
}

declare module '*.png' {
  const asset: number;
  export default asset;
}
