# Key-Card Mascot Policy — 小芯

Status: ACTIVE  
Effective: 2026-08-20  
Template policy: `KCT-v3.4`

## Core Principle

**主題可變，身份不變；姿態可變，角色鎖定。**

小芯是 iPAS 重點卡系列的固定教學角色。她可以依卡片主題調整造型、姿態、表情與配件，讓畫面更有記憶點，但不可變成另一個角色。

## Base Identity

Canonical identity asset:
- `iPAS_重點卡_角色素材_小芯_v1.0.png`
- Drive file ID: `1rknCaHazFlMqRZ1QSKmmhRJ9F8T9kHdM`

The base asset is the identity reference, not a requirement that every card reuse the exact same pose.

## Fixed Identity Traits

Every variation must preserve enough of these traits to remain unmistakably 小芯:

- Q 版可愛科技少女定位；
- 粉紫／白／科技感主色系；
- 粉紫系大眼與相近臉部辨識語言；
- 大型耳機、科技感頭飾或同系統機械裝置語言；
- AI 教學助理／學習陪伴者氣質；
- 整體角色比例與輪廓維持同一角色系列感。

## Allowed Theme Variations

可依考點調整：

- 姿態：指路、比讚、思考、講解、拿書、操作電腦、展示圖卡、提醒等；
- 表情：微笑、專注、驚訝、提醒、分析、鼓勵等；
- 服裝：在保留角色主識別前提下更換主題制服或職能造型；
- 配件：書本、燈泡、放大鏡、平板、圖表、齒輪、盾牌、資料庫、模型節點等；
- 主題職能角色：
  - AI 基礎概念 → 教學助理風
  - 資料處理 → 資料分析師風
  - 機器學習 → 研究員／工程師風
  - 生成式 AI → 創作助手風
  - AI 治理／資安 → 審核官／守門員風

## Placement

Default placement remains the upper-right visual area.

小芯不得遮住：
- 星級；
- 卡片編號；
- 考試標籤；
- 主標題；
- 任何必要證據型文字。

姿態改變時可以調整角色在右上角區域內的局部位置與縮放，但不可破壞整體資訊層級。

## Prohibited Drift

禁止：
- 變成完全不同人物；
- 改成寫實真人風；
- 主色系完全漂移到與小芯無關；
- 拿掉所有代表性科技／耳機語言而失去辨識度；
- 因服裝或姿態造成角色臉部、眼睛或主輪廓失真；
- 為了主題效果而讓角色蓋住卡片核心資訊。

## Generation Rule

批次產製時，影像生成可以根據卡片主題重繪小芯，但提示必須包含：

1. reference identity = governed 小芯 base asset；
2. preserve identity lock；
3. only vary pose / expression / outfit / props / theme role；
4. keep pink-purple-white technology language；
5. keep upper-right placement intent；
6. do not render governed evidence text inside the mascot artwork.

## QA Gate

新增角色 Gate：`MASCOT_IDENTITY_LOCKED`

卡片不可通過 QA，若：
- 人物已無法明確認出是小芯；
- 主色、臉型、眼睛與科技裝置語言大幅漂移；
- 主題服裝壓過角色主身份；
- 小芯遮住星級、編號、標籤或主標題；
- 角色圖中自行生成或改寫證據型文字。

Theme variation is encouraged, identity drift is not.
