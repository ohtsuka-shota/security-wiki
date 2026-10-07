---
title: "ZAPとは何か？Dockerで試してみる"
date: 2025-12-06
tags: ["vulnerability", "Security", "waf", "Docker", "OWASP_ZAP", "Inspector"]
source: "https://qiita.com/ohtsuka-shota/items/49323bc7e30fd851b647"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

今回は読んでいる書籍でZAPというツールが出てきましたので、
それを実際に触ってみてどういうものなのかを確認してみたいと思います。

# ZAPとは
OWASP ZAPといいWebアプリケーションのセキュリティ脆弱性を検出するための無料のオープンソースツールを示します。ProxyとしてWebアプリケーションとの間に介在させると、通信の内容を書き換えることが出来るらしい。
Zed Attack Proxyの略でZAPというみたい。

OWASPはOpen Web Application Security Projectの略。
公式サイトには以下のように書かれています。

>Open Worldwide Application Security Project とは、Webをはじめとするソフトウェアのセキュリティ環境の現状、またセキュアなソフトウェア開発を促進する技術・プロセスに関する情報共有と普及啓発を目的としたプロフェッショナルの集まる、オープンソース・ソフトウェアコミュニティです。

オワスプって読み方であっているように思います。ロゴのところにそう書いているので。

https://owasp.org/www-chapter-japan/


# 構築する環境イメージ
Win11 PCにWSL2とDocker Desktopでコンテナをデプロイできる環境を用意しておきます。
その環境に2つコンテナを立ち上げていきます。
※Dockerが動くなら何でも大丈夫です。というか環境作るのが面倒なのでDesktopを使っていますが、正直Linux派です。

![security.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b5970c56-863c-493a-aa91-cb7b30575f05.png)


# 構築
Docker Desktopを起動します。
Docker HubからZAPのコンテナイメージをpullします。

https://hub.docker.com/r/zaproxy/zap-stable

```
C:\Users\ohtsu>docker pull zaproxy/zap-stable:latest
latest: Pulling from zaproxy/zap-stable
8e44f01296e3: Already exists
e4839d1aa0de: Pull complete
88fce0ad8e93: Pull complete
e7da99f19162: Pull complete
6ef41898455e: Pull complete
eb24ee9e89e6: Pull complete
4f4fb700ef54: Pull complete
b7a77a9d521e: Pull complete
b6ed68b22f50: Pull complete
4b275cf3c10c: Pull complete
c3d6aa4be919: Pull complete
0b8658d795d5: Pull complete
93902cb8a5fb: Pull complete
fb61b7a8c3a7: Pull complete
12b17b3e5f5c: Pull complete
419266992a8d: Pull complete
1c5bd09344c4: Pull complete
43e95d27d4db: Pull complete
034116c055bf: Pull complete
Digest: sha256:94c9a8446faba85df43e0c2d0f406c69e234c51cdc879b803bce74066578658b
Status: Downloaded newer image for zaproxy/zap-stable:latest
docker.io/zaproxy/zap-stable:latest

What's next:
    View a summary of image vulnerabilities and recommendations → docker scout quickview zaproxy/zap-stable:latest
```

分析され役としてOWASP Juice Shopというコンテナがあるようなので、これもインストールしていきます。

https://github.com/juice-shop/juice-shop

https://hub.docker.com/r/bkimminich/juice-shop/tags

```
C:\Users\ohtsu>docker pull bkimminich/juice-shop:latest
latest: Pulling from bkimminich/juice-shop
fd4aa3667332: Pull complete
bfb59b82a9b6: Pull complete
017886f7e176: Pull complete
62de241dac5f: Pull complete
2780920e5dbf: Pull complete
7c12895b777b: Pull complete
3214acf345c0: Pull complete
5664b15f108b: Pull complete
045fc1c20da8: Pull complete
4aa0ea1413d3: Pull complete
da7816fa955e: Pull complete
ddf74a63f7d8: Pull complete
e7fa9df358f0: Pull complete
d8a0d911b13e: Pull complete
5b14f6c9a813: Pull complete
33ce0b1d99fc: Pull complete
f45e0372ce60: Pull complete
7faf0cfa885c: Pull complete
9cd2a1476fcc: Pull complete
7b72e6384ef9: Pull complete
0168f69dfb16: Pull complete
Digest: sha256:1c55debeaf4fd5678019b17818a539e1e06ef93d29b268a21f53f0773a9fff5d
Status: Downloaded newer image for bkimminich/juice-shop:latest
docker.io/bkimminich/juice-shop:latest

What's next:
    View a summary of image vulnerabilities and recommendations → docker scout quickview bkimminich/juice-shop:latest
```

pullしてきたコンテナイメージからコンテナをデプロイしていきます。
まずjuice-shopから。
```
C:\Users\ohtsu>docker run --rm -p 127.0.0.1:3000:3000 bkimminich/juice-shop
info: Detected Node.js version v22.21.1 (OK)
info: Detected OS linux (OK)
info: Detected CPU x64 (OK)
info: Configuration default validated (OK)
info: Entity models 20 of 20 are initialized (OK)
info: Required file server.js is present (OK)
info: Required file index.html is present (OK)
info: Required file styles.css is present (OK)
info: Required file main.js is present (OK)
info: Required file tutorial.js is present (OK)
info: Required file runtime.js is present (OK)
info: Required file vendor.js is present (OK)
info: Port 3000 is available (OK)
info: Chatbot training data botDefaultTrainingData.json validated (OK)
info: Domain https://www.alchemy.com/ is reachable (OK)
info: Server listening on port 3000
```

続いてZAP
zap-webswing.shはコンテナイメージ内に存在しているZAPのGUIをWebブラウザ上で動作させるためのスクリプトの様です。
```
C:\Users\ohtsu>docker run -u zap -p 8080:8080 -p 8090:8090 -i zaproxy/zap-stable:latest zap-webswing.sh
Using ZAP command line options: -host 0.0.0.0 -port 8090 -config stats.pkg.webswing=1
```

Docker Desktopのアプリケーション上でコンテナが2つデプロイされていることを確認します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/48aa1319-40bd-45f7-84fc-1180128a55bf.png)


juice-shopにアクセスしてみます。
以下のURLでアクセスすることが可能です。
http:\//127.0.0.1:3000/#/

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6b69ba0c-388e-4645-8fee-ea4dcc18d90d.png)

ZAPにもアクセスしてみます。
http\://localhost:8080/zap
"/zap"という部分が無いとユーザ名とパスワードの認証が求められます。
dockerコンテナの中に記載がある部分があるのでしょうが、面倒なので確認はしません。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f55240c8-f571-4216-95df-5cec53747bd6.png)

アプリケーションが立ち上がると以下のような画面が表示されます。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2dec1f61-813f-468b-bdc6-69920f2b6ce8.png)

適当に入力してStartボタンを押下します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0d450b86-4fcc-444e-8bd2-62471704a3ef.png)

Add-ONのポップアップが表示されます。
一旦何も選択せずにCloseを押下します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/94cabb45-3297-447a-b77c-906b2212db82.png)

Automated Scanを押下します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/cd4a8227-5686-4e8f-a848-593460c36b4f.png)

URL to Attack：http:\//host.docker.internal:3000/
後はデフォルトの設定のまま、Attackボタンを押下します。

※host.docker.internal はホストマシン（私の場合はWindows PC）を指す特別なDNS名。
　ここでlocalhostを指定すると、ZAPを動かしているコンテナ自身を示すことになるので注意。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8ef5038f-713f-440c-9c63-6e4f6b2d8f15.png)

実行がされると、色々処理が開始されます。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9f5bb48a-4912-436b-9c0f-0f4ba106ffa5.png)


## 確認できる項目（AIに出力させた）

### 📋 各機能の詳細説明

#### 1. **History (履歴)**
- **目的**: 過去のスキャン活動の記録管理
- **主な用途**:
  - 実行したスキャンの履歴確認
  - アクセスしたURLの追跡
  - 過去の診断結果の参照
- **活用場面**: 診断作業の振り返りや、特定の時点での状態確認

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2bf2f1b2-f211-4083-a793-b43f4cdf42fe.png)


---

#### 2. **Search (検索)**
- **目的**: ツール内の情報を効率的に検索
- **主な用途**:
  - 特定の脆弱性名での検索
  - URLやパラメータの検索
  - キーワードベースの情報抽出
- **活用場面**: 大量のデータから必要な情報を素早く見つける

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/96eba964-9d72-4f8c-9542-3df290af90cd.png)


---

#### 3. **Alerts (アラート)**
- **目的**: 検出されたセキュリティ問題の一覧表示
- **主な用途**:
  - 脆弱性の重要度別表示(High/Medium/Low)
  - セキュリティリスクの可視化
  - 対応優先度の判断材料
- **活用場面**: 脆弱性の評価と対応計画の策定

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6bc463d0-5ec6-4805-85a1-fe699b7d5c3d.png)

この辺りの出力を見ると、なんとなくですが、AWS Inspectorっぽいなと思いました。
そう思ってAIに壁打ちしてみたのですが、以下のような回答を得て納得です。

| 項目 | ZAP Alerts | AWS Inspector |
|------|-----------|---------------|
| **対象** | Webアプリケーション | AWSインフラ・EC2・コンテナ |
| **検出範囲** | アプリケーション層の脆弱性 | OS・ネットワーク・設定の脆弱性 |
| **実行方法** | 手動スキャン・プロキシ経由 | 自動・継続的スキャン |
| **環境** | オンプレ・クラウド問わず | AWS環境専用 |
| **主な検出内容** | SQLi, XSS, CSRF等 | CVE、パッチ不足、設定ミス |

セキュリティ診断の階層
┌─────────────────────────────┐
│  アプリケーション層          │ ← ZAP Alerts
│  (Webアプリの脆弱性)         │
├─────────────────────────────┤
│  ミドルウェア層              │
├─────────────────────────────┤
│  OS・インフラ層              │ ← AWS Inspector
│  (システムの脆弱性)          │
├─────────────────────────────┤
│  ネットワーク層              │ ← AWS Inspector
└─────────────────────────────┘

ZAPでアプリケーションレイヤの脆弱性診断をして、それを修正。
修正したうえでZAPで再診断をかましつつ、実環境ではAWSの場合WAFを使って攻撃を防いでいくという形が良さそうに思った。

---

#### 4. **Output (出力)**
- **目的**: 診断結果の詳細情報表示
- **主な用途**:
  - スキャンログの確認
  - レポート生成
  - 技術的な詳細情報の参照
- **活用場面**: 詳細な分析やレポート作成時

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/01ca2a8d-fcf1-4956-97a3-30387aa1fae2.png)

---

#### 5. **Spider (スパイダー)**
- **目的**: Webサイトの構造解析とコンテンツ収集
- **主な用途**:
  - リンクを辿ってページを自動収集
  - サイトマップの作成
  - 静的コンテンツの発見
- **特徴**: 従来型のHTMLベースのサイトに有効

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/48ae403f-bc7f-4b84-a7ac-e7314f7e1c3f.png)

---

#### 6. **AJAX Spider (AJAXスパイダー)**
- **目的**: 動的コンテンツの解析と収集
- **主な用途**:
  - JavaScriptで生成されるコンテンツの収集
  - Single Page Application (SPA)の解析
  - 非同期通信で読み込まれるコンテンツの発見
- **特徴**: 通常のSpiderでは検出できない動的要素に対応

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/fa26d2d7-ce4f-44a7-8cce-d58ed4cfbaa0.png)

---

#### 7. **WebSockets (ウェブソケット)**
- **目的**: WebSocket通信の監視と分析
- **主な用途**:
  - リアルタイム通信の傍受
  - 双方向通信のセキュリティ検証
  - メッセージ内容の分析
- **対象**: チャットアプリ、リアルタイム更新機能など

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d20847ae-bfac-40b1-b451-1d9f32bd54a0.png)

---

#### 8. **Active Scan (アクティブスキャン)**
- **目的**: 積極的な脆弱性診断の実行
- **主な用途**:
  - SQLインジェクションの検出
  - XSS(クロスサイトスクリプティング)の検証
  - その他の既知の脆弱性の検査
- **注意点**: 実際に攻撃を試みるため、本番環境では慎重に使用

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0fc8e500-baf9-42b4-ad92-e4db6f10c725.png)

---

### 🔄 推奨される使用順序

1. **Spider / AJAX Spider** → サイト構造の把握
2. **Active Scan** → 脆弱性の検出
3. **Alerts** → 検出結果の確認
4. **Output** → 詳細分析
5. **History / Search** → 必要に応じて過去データの参照


ZAPを用いた攻撃等は今後やってみようかな。

