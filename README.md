# 资产账本 (assetbook)

个人资产 + 支出记账 App。**React Native (Expo) + TypeScript + 本地 SQLite**，无后端、无账号、纯本地。
当前进度：**四个页面（总览 / 资产 / 统计 / 我的）与记支出流程已实现**，数据落本地 SQLite。

## 网页功能预览（不需要装任何环境）

想在真机之前先点着看功能，起个静态服务即可：

```bash
cd assetbook/preview
python3 -m http.server 8765
```

然后打开 <http://127.0.0.1:8765/app.html>。这是一个**可点击的交互原型**：

- 四个页签（总览 / 资产 / 统计 / 我的）都能切换；
- 底部「＋」记一笔支出 —— **从所选账户扣减余额**，账户余额、净资产、趋势图同步变化；
- 「资产」页可**增删改**资产项（可流动 / 固定资产两组，实物类型支持选照片）；
- 「统计」页切换**本周 / 本月**，删除记录会**自动回滚**余额；
- 「我的」页可改**汇率**、换计价货币、恢复示例数据 / 清空数据；
- 数据存在浏览器 `localStorage`，刷新后仍在。

原型与真机代码**共用同一套设计变量**（`src/theme.ts` ↔ `preview/app.css` 的 `:root`），
图标统一使用开源图标库 **lucide**（原型里 vendored 了 `preview/lucide.min.js`，App 用 `lucide-react-native`）。
另有一张纯静态的主页稿 [`preview/home-receipt.html`](./preview/home-receipt.html)。

## 设计方向：凭条 · 票据质感 (Receipt)

从十个候选方向里定下来的这一个（其余九个已删除，不留在仓库里）。
参照官方 `frontend-design` skill（`~/.zcode/skills/frontend-design/`）筛掉 AI 默认模板后，选它是因为
**它最贴题**：记账本本来就该长得像一张对账单，这个方向的每一处都是「钱」这个题材自身长出来的。

- **母题**：一张刚从热敏打印机里出来的对账单 —— 一屏是一**张纸**，不是一堆卡片。
- **记忆点**：净资产居中的等宽大字，右上角压一枚红色验讫章「对账无误 / VERIFIED」；上下用分段虚线撕口。
- **点线引导**：名目在左、金额贴右，中间一排小点把它们连成一条账（`合计 TOTAL ······ 1,628.00`）。
- **克制**：验讫章的朱红是全屏唯一强调色，只发一次光。

| 语义 | 值 |
|---|---|
| 凭条纸（背景） | `#EDEAE2` |
| 印字蓝黑（主文字） | `#1C2530` |
| 淡印字（次要文字） | `#6C7480` |
| 验讫章红（唯一强调） | `#B3241C` |
| 分段虚线 / 点线 | `rgba(28,37,48,.40)` / `rgba(28,37,48,.22)` |
| 数字 · 拉丁文 | 等宽 IBM Plex Mono |
| 中文 | 思源黑（Noto Sans SC） |

改主题只需改 `src/theme.ts`（预览里对应 `:root` 变量）。

## 在真机运行

需要 Node.js 18+（或 `bun`），然后：

```bash
cd assetbook
bun install        # 依赖已装好；换机器时执行
npx expo start     # 或 bunx expo start
```

用手机上的 **Expo Go** 扫码即可。字体通过 `@expo-google-fonts/*` + `expo-font` 加载，图标用 `lucide-react-native`。

> 本机没有 Node，但用 `bun install` 装好了依赖（含 `lucide-react-native`）。
> 由于没有 Node/模拟器，真机尚未跑过；网页原型用于先验证功能与视觉。

## 目录结构

```
assetbook/
├── App.tsx                     # 入口：加载字体 + 底部导航 + 页面切换 + 记支出弹层
├── src/
│   ├── theme.ts                # ★ 设计变量：纸 / 印字 / 印章红 / 遮罩、等宽字体、虚线
│   ├── utils/
│   │   ├── format.ts           # 金额、日期格式化
│   │   └── labels.ts           # 分组 / 类型的中英文标签
│   ├── data/
│   │   ├── types.ts            # 数据模型
│   │   ├── currencies.ts       # 币种字典（31 种：代码 / 中文名 / 符号）
│   │   ├── schema.ts           # SQLite 建表语句（assets / expenses / rates / meta）
│   │   ├── db.ts               # openDb：建表 + 首次灌示例数据；resetDb
│   │   ├── repo.ts             # 增删改查（记支出扣减 / 删支出回滚，同一事务）
│   │   └── sample.ts           # 示例数据 + 汇总 / 折算函数
│   ├── state/AppContext.tsx    # AppProvider / useApp：状态 + 汇总 + 落库
│   ├── components/
│   │   ├── Rule.tsx            # 印刷记号：分段虚线 / 点线引导 / 分区小标题
│   │   ├── Bars.tsx            # 热敏柱状图（峰值加深）
│   │   ├── NetWorthHero.tsx    # 等宽大数字 + 点线明细
│   │   ├── ExpenseTrendCard.tsx# 支出分区（柱 + 点线合计）
│   │   ├── RecentList.tsx      # 点线账行
│   │   ├── TabBar.tsx          # 底部导航（lucide 图标 + 正中实心圆键）
│   │   ├── AssetEditor.tsx     # 资产项新增/编辑弹层（含实物照片）
│   │   └── ExpenseSheet.tsx    # 记支出弹层（金额键盘 + 选账户）
│   └── screens/
│       ├── HomeScreen.tsx      # 总览
│       ├── AssetsScreen.tsx    # 资产（两组列表 + 分组小计 + ≈折算）
│       ├── StatsScreen.tsx     # 统计（本周 / 本月）
│       └── MeScreen.tsx        # 我的（汇率 / 联网更新 / 币种 / 清空数据）
└── preview/
    ├── app.html / app.css / app.js  # ★ 可点击的网页功能原型
    ├── lucide.min.js                # 原型用的 lucide（vendored）
    └── home-receipt.html            # 纯静态主页稿
```

## 数据模型（SQLite 表）

```
assets(资产项)   id, name, value(可负), currency, asset_group[liquid|fixed],
                 type[cash|investment|receivable|payable|physical],
                 photo_uri?, note?, sort
expenses(支出)   id, amount, currency, note, date, account_id
rates(汇率)      currency, to_cny
meta(键值)       meta_key, meta_value     # base_currency / seeded
```

- **净资产** = Σ(资产项 value × 汇率)。应付项本身为负，直接加总。
- 「资产」页每组末尾给**小计**，页面底部给**合计**；非基准币种的行补一行 `≈ 折算`（如 `$12,000 ≈ ¥85,200`）。
- **汇率可联网更新**：点「我的 → 联网更新汇率」拉 `open.er-api.com` 实时价（1 CNY = X 外币，故 `to_cny = 1/X`）；内置 31 种币种可挑选添加。
- 记支出时选账户，**自动扣减该账户余额**（删除回滚），两步在同一事务里。
- 投资持仓只记「名称 + 现值 + 币种」；实物记「名称 + 现值 + 照片」。
- 删除资产项**不回滚**历史支出（支出仍指向旧 accountId，界面显示「未知账户」），保持账目可追溯。

## 下一步

- [x] 接入 `expo-sqlite`：建表 + 增删改查 + 首次灌示例数据
- [x] 「资产」页：流动资产 / 固定资产两组列表 + 资产项编辑
- [x] 「＋」支出录入（金额键盘 + 选账户 + 备注 + 日期）
- [x] 「统计」页：消费趋势（月 / 周切换）
- [x] 「我的」页：汇率管理（含**联网更新**）、计价货币、清空数据
- [x] 「资产」页分组小计 / 合计、外币 `≈ 折算`、31 种币种字典
- [ ] 真机试跑（本机无 Node/模拟器，需在有 Node 的环境 `bun install && npx expo start`）
- [ ] 首次启动的空白引导页（目前首启直接灌示例数据）
- [ ] 用 `@react-navigation/bottom-tabs` 替换手写的 tab 切换（可选，现方案更轻）
- [ ] 支出支持「收入」方向、按标签分类統計
