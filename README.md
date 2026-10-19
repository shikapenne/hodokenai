# ほどけない（アプリ版）

絡まったネックレスをほどく物理パズル「ほどけない」を、iPhone・Android向けのアプリとして配信するためのプロジェクト一式です。中身はブラウザ版と同じゲームで、[Capacitor](https://capacitorjs.com/) でアプリにしています。

- ネット接続なしで動きます（three.js とフォントを同梱）。
- 縦画面固定、ノッチやホームバーをよける配置、アプリを閉じている間はタイマーと音が止まる処理を入れています。
- 鎖をつまむと軽く、ネックレスがほどけると「成功」のハプティクス（振動）が返ります。

---

## フォルダの中身

| 場所 | 中身 |
|---|---|
| `tools/src/` | **ゲームの本体（ここを直す）**。`sim.js` 物理、`game3d.js` 描画と操作、`template3d.html` 画面とデザイン、`levels.json` と `levels/` レベル |
| `tools/build_web.py` | `tools/src` から `www/`（アプリに入るファイル）を作るスクリプト |
| `tools/levelgen/` | 絡まりを自動生成するツール（新しいレベル作り用） |
| `android/` | Android Studio のプロジェクト |
| `ios/` | Xcode のプロジェクト |
| `assets/` | アイコンとスプラッシュ画面の元画像 |
| `.github/workflows/` | GitHub が自動でアプリを組み立てる設定 |

---

## 1. Android で試す（PCにAndroid Studioがなくても可）

GitHub に置くと、GitHub のサーバーが自動で APK（Androidのインストールファイル）を作ります。

1. GitHub で新しいリポジトリを作る（非公開でOK）。
2. このフォルダの中身をアップロードする（`node_modules` は不要。`.gitignore` で除外済み）。
3. リポジトリの **Actions** タブで「Android build」が動くのを待つ（約5〜10分）。
4. 終わった実行を開き、下の **Artifacts** から `hodokenai-debug-apk` をダウンロード。
5. 中の `app-debug.apk` をAndroidスマホに送ってタップ。初回は「提供元不明のアプリ」を許可する必要があります。

PCに Android Studio がある場合は、次でも動かせます。

```
npm install
pip install fonttools brotli
npm run android      # ゲームを組み立てて Android Studio を開く → ▶ で実機に転送
```

## 2. Google Play に出す

1. **アプリIDを決める**：`jp.shikapenne.hodokenai`（`capacitor.config.json`、`android/app/build.gradle`、Xcodeの Bundle Identifier）。公開後は変えられません。
2. **署名鍵を作る**（1回だけ。なくすと更新できなくなるので必ずバックアップ）
   ```
   keytool -genkey -v -keystore hodokenai-release.keystore -alias hodokenai -keyalg RSA -keysize 2048 -validity 10000
   ```
3. GitHub のリポジトリ → Settings → Secrets and variables → Actions に4つ登録：
   - `ANDROID_KEYSTORE_BASE64`：鍵ファイルを base64 にした文字列（`base64 -w0 hodokenai-release.keystore`、Macは `base64 -i …`）
   - `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS`（上の例なら `hodokenai`）/ `ANDROID_KEY_PASSWORD`
4. もう一度 Actions を動かすと `hodokenai-release-aab`（Google Play用の AAB）もできます。
5. [Google Play Console](https://play.google.com/console) に登録（登録料25ドル・1回のみ）し、アプリを作成して AAB をアップロード。
6. **個人アカウントの場合**：本番公開の前に、12人以上のテスターに14日間連続でクローズドテストに参加してもらう必要があります。
7. ストア掲載情報（説明文・スクリーンショット・アイコン512px）、**プライバシーポリシーのURL**、データセーフティ（現状は「データを収集しない」）、コンテンツのレーティングを入力して審査へ。

## 3. App Store に出す（Mac が必要）

1. [Apple Developer Program](https://developer.apple.com/programs/) に登録（年99ドル）。
2. Mac に Xcode を入れ、このフォルダで：
   ```
   npm install
   pip3 install fonttools brotli
   npm run ios          # ゲームを組み立てて Xcode を開く
   ```
3. Xcode で「App」ターゲット → Signing & Capabilities → Team に自分のアカウントを選ぶ。
4. iPhone をつないで ▶ で実機確認 → Product → Archive → App Store Connect にアップロード。
5. [App Store Connect](https://appstoreconnect.apple.com/) で TestFlight（テスト配信）→ 説明文・スクリーンショット・プライバシー情報を入力して審査へ。

Mac がない場合は、Mac のクラウドビルドサービス（Codemagic など）や GitHub の macOS ランナーで作る方法もありますが、証明書の設定が必要です。`.github/workflows/ios-check.yml` は署名なしでビルドが通るかだけを確かめる設定です。

---

## 4. 公開した後の修正・機能追加

公開後も、何度でも直してアップデートを出せます。

1. `tools/src/` のファイルを直す。
2. `npm run sync`（`www/` を作り直してアプリのプロジェクトにコピー）。
3. **バージョン番号を上げる**
   - Android：`android/app/build.gradle` の `versionCode`（毎回+1）と `versionName`
   - iOS：Xcode の Version と Build
4. 上と同じ手順でビルドしてアップロード → 審査 → ユーザーにアップデートが届く。

### 予定している機能のメモ

- **ネックレスの種類を増やす**：見た目は `game3d.js` の `METAL`、音は `VOICE`、輪の形は `linkGeo`／`pearlGeo`。真珠のように輪の形ごと変える種類も追加できます。
- **長さの調整**：`levels.json` の `chains` の数字が輪の数（普通の鎖は1輪8px、喜平は12px）。スマホの重さの目安は、1レベルの輪の合計がおよそ370個まで。長さを変えたら `tools/levelgen/` で絡まりを作り直します（例：`node export.js '{"chains":[{"links":120}]}' 7 2800 ../src/levels/L6.b64`）。
- **オンラインランキング（タイムだけ）**：サーバーが必要です。
  - 手軽なのは Firebase や Supabase に「レベルID・名前・タイム」を保存する方法です。
  - Game Center（iPhone）と Google Play Games（Android）のリーダーボードを使う方法もありますが、iPhoneとAndroidで別々のランキングになります。
  - 不正なタイムをはじく仕組み（ありえない速さを弾く、操作記録の簡易チェックなど）があると安心です。
  - 名前などを送るようになるので、プライバシーポリシーとストアのデータ申告の更新が必要です。
  - レベルは `levels.json` の `id`（L1〜L5）で区別しています。ランキング開始後は、同じIDのレベルの絡まりを変えないようにしてください（変えるなら新しいIDにする）。

---

## 5. 広告（AdMob のバナー）

画面の一番下にバナー広告を常に表示します。誤タップを防ぐため、ボタンはすべて画面の上に置いています。また、広告と鎖のトレイの間には24pxのすき間を空けています。

**今は Google のテスト広告が出る状態です。** 公開前に、自分の AdMob のIDに差し替えてください。

1. [AdMob](https://admob.google.com/) に登録し、「アプリを追加」で Android 版と iOS 版をそれぞれ登録する。
   - Androidのパッケージ名と、iOSのBundle IDは、どちらも `jp.shikapenne.hodokenai`。
2. それぞれのアプリで「広告ユニットを追加」→「バナー」を作る。
3. 発行されたIDを次の場所に入れる。
   - **アプリID**（`~` が入っているもの）
     - Android：`android/app/src/main/res/values/strings.xml` の `admob_app_id`
     - iOS：`ios/App/App/Info.plist` の `GADApplicationIdentifier`
   - **バナーの広告ユニットID**（`/` が入っているもの）
     - `tools/src/game3d.js` の `ADS` の `android` と `ios`
   - 同じ `ADS` の `testing` を `false` にする。
4. AdMob の「プライバシーとメッセージ」で、GDPR（EU向けの同意画面）のメッセージを作成する。アプリは起動時にこれを自動で表示します。
5. 自分のサイトに `app-ads.txt` を置き、ストアの「デベロッパーのウェブサイト」にそのサイトを登録する。
6. ストアの申告を更新する。
   - Google Play：データセーフティで「広告ID」「おおよその利用状況」などを広告目的で収集と申告し、「広告を含む」にチェックを入れる。
   - App Store：App Privacy で「識別子」「利用状況データ」を「サードパーティ広告」として申告する。
7. プライバシーポリシーに、Google AdMob で広告を表示していることを書き加える。

**注意**：テスト中に、自分のスマホで本番の広告を何度もタップしないでください。AdMobのアカウントが停止されることがあります。確認はテスト広告（`testing: true`）で行ってください。

---

## 6. オンラインランキングと X への投稿

### ランキング（Supabase）
クリア時に名前を入れると全国ランキングに登録されます。各端末につき、レベルごとの自己ベストだけが残ります。順位は「全国 ◯位／△人中」と表示され、レベル選択画面の「ランキングを見る」から上位50人を見られます。

設定するまでは、ランキング関係の表示は出ません（Xへの投稿は使えます）。

1. [Supabase](https://supabase.com/) で無料プロジェクトを作る（リージョンは Tokyo がおすすめ）。
2. 左メニューの **SQL Editor** を開き、`server/supabase.sql` の中身を貼って **Run**。
   - 表（scores）、だれでも読めて直接は書けない設定、自己ベストだけを残す登録用の関数ができます。
3. **Project Settings → API Keys** から **Project URL** と **Publishable key**（`sb_publishable_` で始まるもの。古いプロジェクトでは anon public キー）をコピーする。
4. `tools/src/game3d.js` の `RANKING` に入れる。
   ```js
   const RANKING = { url: 'https://xxxx.supabase.co', anonKey: 'eyJ...' };
   ```
   - Publishable key（anon キー）はアプリに入れて公開してよい種類のキーです。書き込みは登録用の関数経由しかできません。**Secret key（service_role）は絶対にアプリに入れないでください。**
5. ストアのページができたら、`STORE_URL` にそのURLを入れる（Xの投稿に付きます）。

不正対策は最低限です。5秒未満と24時間超のタイム、13文字以上の名前、禁止語を含む名前は、サーバー側で受け付けません。

### X への投稿
クリア画面の「Xにポスト」から、次のような文面が入った X の投稿画面が開きます（Xのアプリがあればアプリで開きます）。

> 絡まったネックレスをほどくゲーム「ほどけない」
> 二本を 2:08.4 でほどいた（全国 2 位／4 人中）
> #ほどけない

### 公開前に必要なこと
- **プライバシーポリシー**に「ランキング用のニックネームとクリアタイム、端末ごとのランダムID を保存する」と書く。
- **ストアの申告**に追加する。
  - Google Play：データセーフティに「ユーザーID」「その他のユーザー生成コンテンツ（ニックネーム）」を追加する。
  - App Store：App Privacy に「ユーザーID」「その他のユーザーコンテンツ」を追加する。
- **名前の扱い**：他の人が入力した名前が表示されるので、Appleの審査では不適切な名前への対策を求められることがあります。禁止語フィルター（下記）は入っています。さらに求められた場合は、通報やブロックの手段を追加します。

### 禁止語フィルター
ランキングの名前に、悪口・性的な言葉・差別語・URL・「運営」などのなりすましを使えないようにしています。

- **リスト**：`tools/src/ngwords.json`
  - `contains` に入れた語は、名前のどこかに含まれていたら不可。
  - `exact` に入れた語は、名前がその語ぴったりのときだけ不可。「ass」のように、普通の名前（Cassie など）の中に隠れやすい短い語はこちらに入れます。
- **比べる前に名前を整えます**：全角・半角、大文字・小文字、カタカナ・ひらがなをそろえます。空白と記号は消し、`0→o` `1→i` `3→e` `5→s` `@→a` などの置き換えもします。同じ文字の連続は1文字にします（`ＦＵＣＫ` `f u c k` `fuuuck` `5h1t` `ｼﾈ` はどれも引っかかります）。
- **2か所でチェック**します。
  - アプリ：送信前に止めて、入れ直してもらいます。
  - サーバー：アプリを改造されても通りません。
  - リストを変える前に登録された名前は、ランキングに `＊＊＊` と表示されます。
- **リストを直したら**：`npm run sync` を実行し、新しくできた `server/supabase.sql` を Supabase の SQL Editor でもう一度 **Run** します。何度実行しても大丈夫で、登録済みのタイムは消えません。

---

## 7. 多言語対応

日本語、英語、中国語（簡体字・繁体字）、韓国語に対応しています。

- 端末の言語に合わせて、最初の言語が自動で選ばれます。どれにも当てはまらない言語の端末では英語になります。
- タイトル画面の右上で切り替えられます（選んだ言語は保存されます）。
- タイトルロゴの「ほどけない」は、どの言語でもそのままです。
- **文言の場所**：`tools/src/i18n.js` の `STRINGS`。言語を増やすときは、`ja` をまるごとコピーして訳し、`LANG_NAMES` に追加します。
- **フォント**：中国語と韓国語の文字は端末のフォントで表示します（アプリのサイズを増やさないため）。
- **ストア側でも必要なこと**：
  - アプリ名と説明文、スクリーンショットは、Google Play Console / App Store Connect で言語ごとに登録します。
  - ホーム画面のアプリ名を言語ごとに変えたい場合は、Android の `values-en/strings.xml` などと、iOS の `InfoPlist.strings` を追加します。
