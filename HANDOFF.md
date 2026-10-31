# 引き継ぎメモ（Claude との作業用）

新しい会話で作業を続けるときに、最初に読むメモです。最終更新：2026-10-31

## プロジェクト
- 「ほどけない」：絡まったネックレスを指でつまんでほどく 3D 物理パズル。作者は あいざわ（GitHub: shikapenne）。
- 返事は日本語で。説明は専門用語を避けて、手順は番号付きで。
- アプリID：`jp.shikapenne.hodokenai`

## 中身の構成
| 場所 | 中身 |
|---|---|
| `tools/src/sim.js` | 鎖の物理（Verlet/PBD のカプセル鎖。輪 R=4, D=8、摩擦 GRIP/MU、石 = pends、`tangleCheck(ci)` で「ほどけているか」を判定：他の鎖とは上下が一貫しているか、自分自身は閉じた時の結び目行列式が 1 か） |
| `tools/src/game3d.js` | three.js r128 での描画、操作（指/マウス、右クリックで押さえる）、音（高い短い粒の「シャラシャラ」）、留め具で輪にしてクリア、ランキング、広告、ポーズ、遊び方、レベル開放 |
| `tools/src/i18n.js` + `ngwords.json` | 5言語（ja, en, zh-Hans, zh-Hant, ko）の文言、名前の禁止語フィルター |
| `tools/src/template3d.html` | 画面と CSS |
| `tools/src/levels.json` + `levels/*.b64` | レベル。`chains` は `[種類, 輪の数, 石の数]`。L1〜L5 |
| `tools/levelgen/` | 絡まりの自動生成（`pick.js` で候補を作って選ぶ → `resettle.js`） |
| `tools/build_web.py` | `www/` を作る。`--artifact out.html` で1ファイル版 |
| `server/schema.sql` → `server/supabase.sql` | ランキング（Supabase、プロジェクト `xzimzkbrhgymavvkzaik`、publishable key はアプリ内）。`.github/workflows/keepalive.yml` で毎日読みに行き、無料枠の自動停止を防いでいる |
| `android/` `ios/` | Capacitor 8 |
| `.github/workflows/android.yml` | push のたびに APK と署名付き AAB を作る（署名鍵は GitHub Secrets） |
| `docs/privacy.html` | プライバシーポリシー（GitHub Pages） |

## Google Play の状況（2026-10-31 時点）
- クローズドテスト中（個人アカウントのため 12 人 × 14 日が必要。テスターはココナラの業者に依頼）。
- 最新は `4 (1.0.3)`。AdMob は本番ID（アプリ `ca-app-pub-2112904724600297~6823667790`、バナー `.../8986796706`）を入れてあるが、`game3d.js` の `ADS.testing` は **true のまま**。本番公開時に false にする。
- 本番前にやること：`ADS.testing = false`、Supabase で `delete from scores;`、本番申請の質問への回答。
- 次の改善候補：留め具の端どうしを点線で示す、輪にできない理由の表示、L4・L5 の途中保存。

## 次にやること：Steam 版
- あいざわさんの希望：**難易度を上げた Steam 版**を作る。
- 方針（案）
  - 今のゲームを Electron で包んで Windows 版（できれば Mac / Steam Deck も）。GitHub Actions で自動ビルド。
  - マウス1つで遊べる操作：右クリックで押さえ用ピンを刺す／抜く、など（スマホ版の「二本指で押さえる」がPCでは難しいため）。
  - PC は速いので、輪を 1.5〜2 倍、本数・石の多い上級レベルを追加。
  - 広告なしの買い切り。ランキングは Supabase を Steam 版用レベルに分けて使う。Steam 実績も検討。
  - スマホ版のコードと共通化し、プラットフォームごとの違い（操作・広告・レベル）は設定で切り替える。
- あいざわさんの作業：Steamworks 登録（100ドル、売上1,000ドルで返金）、本人確認・税務（W-8BEN）・銀行、支払いから30日は発売不可、「近日登場」ページを2週間以上公開、ストアページとビルドの審査、SteamCMD でのアップロード。
- まだ決めていないこと：価格、対応OS、スマホ版レベルを含めるか（上級だけにするか）。

## 作業のきまり
- コミットの最後に、そのときの会話で指示される Co-Authored-By などの行を付ける。
- 物理を変えたら、すり抜けテスト（`/home/claude/necklace/robust86.js` 相当）と、指への追従を確認する。手元に無ければ同等のテストを作る。
- 署名鍵（.jks）や秘密のキーはリポジトリに入れない（公開リポジトリ）。
