---
title: "公開鍵暗号の使い分けを実機で理解する【SSH/GPG/OpenSSL】"
date: 2026-05-09
tags: ["tool", "Security", "lpic", "暗号化", "公開鍵暗号方式", "linuc"]
source: "https://qiita.com/ohtsuka-shota/items/e621b659056f86c26313"
---
# 用語
## 公開鍵暗号方式
鍵を2つ使う暗号化の仕組みで、誰にでも公開する「公開鍵」で暗号化してもらい、自分だけが持つ「秘密鍵」で解読します。2つの鍵は数学的に関連していて、片方で暗号化したものはもう片方でしか解読できない特別なペアになっています。この仕組みのおかげで、事前に秘密の鍵を相手と共有しなくても、安全に暗号通信ができます。

### 公開鍵
公開鍵暗号方式で使われる、誰にでも公開できる鍵のことです。この鍵で暗号化されたデータは、ペアになっている秘密鍵でしか解読できません。インターネット上で自由に配布しても安全なので、メールアドレスのように公開して、誰でもあなた宛ての暗号文を作れるようにできます。

### 秘密鍵
公開鍵暗号方式で使われる、自分だけが持つ鍵のことです。公開鍵で暗号化されたデータを解読できるのは、ペアになっているこの秘密鍵だけです。絶対に他人に知られてはいけない鍵で、これが漏れると暗号化の意味がなくなってしまうため、厳重に管理する必要があります。

## 鍵はどのように準備するのか
公開鍵暗号方式では、専用のソフトウェアを使って公開鍵と秘密鍵のペアを自動生成します。例えば、SSHではssh-keygenコマンド、GitHubなどのリポジトリ認証やコミット署名ではGnuPG（GPG）、SSL/TLS証明書ではOpenSSLなどが使われます。生成後は、公開鍵をサーバーやウェブサイトで公開し、秘密鍵は安全な場所（パスワードで保護されたファイルや専用デバイスなど）に保管します。

※FeloAIで生成
![](https://private-user-images.githubusercontent.com/127835743/589847323-55c15ca7-3486-4993-b1a8-0953ef5393ce.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyODI4OTUsIm5iZiI6MTc3ODI4MjU5NSwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODQ3MzIzLTU1YzE1Y2E3LTM0ODYtNDk5My1iMWE4LTA5NTNlZjUzOTNjZS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOFQyMzIzMTVaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1lZTg4M2UzM2FlMmY3OGFlOGU3ODIxOGIxOGU4NjNlN2JiNGVkMjViOTJjODhjYTFmZmIyYzM1M2MzN2U1MWVkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.FZyrOGmfnPTZWP87sUYCgc7ThRVEPhP9SHnvWKn53HI)

## 公開鍵暗号方式を使う4つのパターン
もうちょっとあるかもですが、基本この4つのパターンになります。

### データの暗号化（「中身を見るな！」の保護）
目的： ファイルやメールを特定の人にだけ見せること。
GnuPGの例： 相手の公開鍵（南京錠）を借りてきて、ファイルをロックして送る。
ポイント： 相手の「秘密鍵」でしか開けられないから、途中で盗まれても安心。

※FeloAIで生成
![](https://private-user-images.githubusercontent.com/127835743/589847686-c4fe5ba1-e18d-41f0-aed3-80de45ac6849.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyODI5ODMsIm5iZiI6MTc3ODI4MjY4MywicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODQ3Njg2LWM0ZmU1YmExLWUxOGQtNDFmMC1hZWQzLTgwZGU0NWFjNjg0OS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOFQyMzI0NDNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wY2MwNzA2ZmE4Njk5ZWFkZTNiMmQ5YmM0MTAzYjRmZWZjODNmY2YxMzA1MzliYmJmZDZhMWEwNWU3MTk1M2MwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.D6UfH_U77GZ87UnGzSs9uBCbkx9f_v5U90DOy4mSsjE)

### SSH接続（「お前は誰だ？」の認証）
目的： サーバーに安全にログインすること。
EC2の例： AWSからダウンロードした .pem（秘密鍵）を使って、サーバーに「私が本人です」と証明するイメージ。
ポイント： 鍵が合えば「本人」と認めてもらえる。

公開鍵をサーバに登録することに違和感を感じるかもしれませんが、
これは「クライアントが自分の身元を証明する」仕組みだからです。
もし逆（サーバが秘密鍵、クライアントが公開鍵）にすると、
公開鍵は誰でも入手できるため、誰でもサーバにアクセスできてしまいます。
**クライアントが秘密鍵を持つ理由：** 「私が本人である」ことを証明するため。秘密鍵は世界で1つ。
**サーバーが公開鍵を持つ理由：** クライアントの身元を確認するため（公開鍵なので漏れても問題ない）

※FeloAIで生成
![](https://private-user-images.githubusercontent.com/127835743/589847917-1d285a24-866f-43ad-b5b3-b224363823db.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyODMwMzUsIm5iZiI6MTc3ODI4MjczNSwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODQ3OTE3LTFkMjg1YTI0LTg2NmYtNDNhZC1iNWIzLWIyMjQzNjM4MjNkYi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOFQyMzI1MzVaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0yNjQ5ZWFlYWUxZTNkMWU0YWZiNDhlZWZlMWM1NWMxZjBmODhiZWM4MTU1M2Q4YzM0Y2Q3MmU1NGFkYjkwNzAyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.pNFydHPmtzdW6giHKk8lX1wnQ_OCdrRDhsEtp99TR_o)

### デジタル署名（「本当にお前が書いたのか？」の証明）
目的： データが本人によって作成され、改ざんされていないことを証明すること。
Gitの例： 自分の秘密鍵でコミットに署名し、他の人が公開鍵で「確かにこの人が書いた」と検証できる。Git以外にもメール署名、ソフトウェア署名で使われる。GPGはDockerソフトウェアをインストールする時に使うことが個人的には印象に残っている。
ポイント： 
暗号化とは逆で、秘密鍵で署名→公開鍵で検証。なりすましや改ざんを防げる。
データ自体は暗号化されない（誰でも読める）。実際には「ハッシュ値を秘密鍵で暗号化したもの」が署名です。受信者は公開鍵でそれを復号し、自分で計算したハッシュ値と比較します。一致すれば「改ざんされていない」「本人が作成した」と確認できます。
          
※FeloAIで生成
![](https://private-user-images.githubusercontent.com/127835743/589850679-49db0ee9-64bc-4497-85bb-c5eb1f67487b.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyODM5NDIsIm5iZiI6MTc3ODI4MzY0MiwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODUwNjc5LTQ5ZGIwZWU5LTY0YmMtNDQ5Ny04NWJiLWM1ZWIxZjY3NDg3Yi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOFQyMzQwNDJaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wMDE0MjQ2YzkwZjg4NmNmZDAyYzllZjY1NWY4ZjM4Y2M2MTM2NTk3NjNiZjY5ZjZmZWI4ZTYzNzBhYTNlMTc5JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.pXZb_2S8u2bzj2xxdw9OtOFrWmfM4ugaAK2YeljENlk)

### SSL/TLS証明書（「本当にそのサーバーか？」の証明）
目的：Webサーバーが本物であることを証明し、通信を暗号化
例：HTTPSでアクセスしたとき、ブラウザが「🔒安全な接続」と表示
ポイント：CA（認証局）がサーバーの証明書に署名 → ブラウザがCAの公開鍵で検証。「このサーバーは本物のexample.comだ」と確認できる。

※SSL/TLSは「公開鍵暗号 + 共通鍵暗号のハイブリッド」なので、他の3つとは性質が異なります。
1. サーバーの公開鍵で「共通鍵」を安全に送る（公開鍵暗号）
2. 以降の通信はその共通鍵で暗号化（共通鍵暗号）

これにより「サーバー認証 + 高速な暗号化通信」を実現しています。

※Felo AIで生成
![## 公開鍵暗号方式_鍵を2つ使う暗号化の仕組みで、誰にでも公開する「公開鍵」で暗号化してもらい、自分だけが持つ「秘密鍵」で解読します。2つの鍵は数学的に関連していて、片方で暗号化したものはもう片方で.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/64f6fe7e-1db7-49b5-9959-1f855038c6ec.jpeg)


## ここまでのまとめ
| パターン | 誰が秘密鍵？ | 誰が公開鍵？ | 暗号方式 | 何を証明？ |
|---------|------------|------------|---------|----------|
| **データ暗号化** | 受信者 | 送信者が使用 | 公開鍵暗号 | 機密性 |
| **デジタル署名** | 送信者 | 受信者が使用 | 公開鍵暗号 | 本人確認・改ざん検知 |
| **SSH認証** | クライアント | サーバー | 公開鍵暗号 | ログイン認証 |
| **SSL/TLS証明書** | サーバー | ブラウザが検証（CA経由） | **ハイブリッド**<br>（公開鍵+共通鍵） | サーバーの正当性<br>+ 通信の暗号化 |

## フィンガープリント（fingerprint）
非常に長い文字列である「公開鍵」を、特定の計算（ハッシュ関数）によって短い文字列に凝縮したものです

## ssh-keygen
SSH接続で使用する公開鍵と秘密鍵のペアを生成・管理するための専用ツールです。GitHubへの接続やサーバーへのパスワードレスログインに必須のコマンドであり、鍵のアルゴリズム指定（RSAやEd25519など）やパスフレーズの設定、フィンガープリントの確認が可能です

## openssl
SSL/TLSプロトコルを扱うための多機能なコマンドラインツールです。ウェブサイトのSSL証明書（CSR）の作成や有効期限の確認、ファイルの暗号化・復号、ハッシュ値の計算など、セキュリティ全般に関する広範な操作を網羅しています

## gpg
OpenPGP規格に準拠した、ファイルやメールを暗号化・署名するためのツールです。特定の相手と安全にファイルをやり取りするための公開鍵暗号方式だけでなく、パスフレーズのみを用いた共通鍵暗号方式もサポートしており、データの機密性と真正性の確保に利用されます

## authorized_keysファイル
SSHサーバー側で「どの公開鍵（ユーザー）にログインを許可するか」を管理するリストを保存するテキストファイルです

## ハッシュ関数とは
入力された任意の長さのデータを、規則性のない固定長の文字列（ハッシュ値やダイジェスト）に変換するアルゴリズムのこと。ハッシュ関数には「不可逆性（元のデータに戻せない）」「固定長出力」「衝突困難性（異なるデータから同じハッシュ値が生成されにくい）」という特徴があります。

### 不可逆性
以下の記事がイメージとしてわかりやすいような気がします。「9を5で割った余りは4」という結果（4）だけを見ても、元の数字が「9」だったのか「14」だったのか、「19」だったのか特定が出来なくなる。ここでいう元の数字というのが元データの事ですね。

https://bigdrea6.hatenablog.com/entry/2022/02/25/160639

### 固定長出力
入力するデータのサイズに関わらず、常にあらかじめ決められた一定の長さ（サイズ）の文字列が出力されるということ。どんなに巨大なデータでも短い文字列に要約できるため、データ処理や比較が高速かつ効率的になります。また、出力結果から元のデータの長さを推測されることも防ぎます。

### 衝突困難性
異なる2つのデータから、偶然『まったく同じハッシュ値』が生成されてしまうこと（衝突）が極めて起こりにくいという特性（※）。「ハッシュ値が一致していれば、元のデータも100%同じである」と見なすことができるため、ダウンロードしたファイルが途中で改ざんされていないかの確認（完全性の証明）や、デジタル署名などで重要な役割を果たしています。

※ハッシュ値が偶然一致してしまう「衝突（コリジョン）」が起こる確率は、使用するハッシュ関数のビット長（出力される文字列の長さ）と、生成するデータの数によって決まるようです。SHA-256というハッシュ関数がハッシュ値のパターンは、2の256乗とのこと。つまり異なるデータが偶然同じハッシュ値になる確率は2の256乗分の1。実質0に限りなく等しいという事が言えます。宝くじの1等に当籤する確率が1000万分の1らしいので、それを考えても途方もない数値であると言えるでしょう。

![](https://private-user-images.githubusercontent.com/127835743/600424429-d36c4138-a901-45db-9939-c93bc772a275.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODAxMDk2NDcsIm5iZiI6MTc4MDEwOTM0NywicGF0aCI6Ii8xMjc4MzU3NDMvNjAwNDI0NDI5LWQzNmM0MTM4LWE5MDEtNDVkYi05OTM5LWM5M2JjNzcyYTI3NS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTMwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUzMFQwMjQ5MDdaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zNjE3YzAxN2M1ZWIwYWIxOTVkOGMzZDc3ZGU4NDEzM2I3OTI0NDAyMWE5OWI5ZjMyMTY5NzY1NzQxYjRiY2Y0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.94PXEs8H_bEon8pZfY9IXWrcd6W2NVGTsBu8Cfe-XVw)

## ハッシュ関数の種類
### MD5 (Message Digest 5)
任意のデータから128ビットの固定長ハッシュ値を生成する関数。
現在では衝突脆弱性が発見されており、セキュリティ用途での使用は非推奨。

### SHA-1 (Secure Hash Algorithm 1)
160ビットのハッシュ値を生成。
計算機の性能向上により衝突攻撃が現実的となったため、2011年に非推奨。

### SHA-2
現在最も主流で、安全性が高いとされているハッシュ関数
出力されるハッシュ値のビット長に応じて「SHA-224」「SHA-256」「SHA-384」「SHA-512」などのバリエーションがある。SHA-256がもっとも主流

### SHA-3
SHA-2に未知の脆弱性が発見された場合のリスクヘッジとして、NIST（米国国立標準技術研究所）のコンペティションを経て2015年に標準化された最新のハッシュ関数。


※Felo AIで生成
![](https://private-user-images.githubusercontent.com/127835743/600425096-6dbe8566-6b7e-4d28-9e97-0207993b2879.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODAxMTAyMTksIm5iZiI6MTc4MDEwOTkxOSwicGF0aCI6Ii8xMjc4MzU3NDMvNjAwNDI1MDk2LTZkYmU4NTY2LTZiN2UtNGQyOC05ZTk3LTAyMDc5OTNiMjg3OS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTMwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUzMFQwMjU4MzlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT04OTdkMTMyMmMyZGE3MjI3NDU4OGNmMjRiYWQ2ZDM3NDQzNTA1NDA4ODc2YWQ5MzQ1N2Q4ZWQxZGZmZGM3ZTAxJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.ZFuOZlGkhhDfGbKSTEFujHpB0hJt4ibgj23IuyIcggk)

## 暗号化とハッシュ化の整理
「誰かに安全にデータを届けたい（後で読みたい）」場合は暗号化を使い、「データが正しいか（改ざんされていないか）だけを確認したい」場合はハッシュ化を使う
※Felo AIで生成
![](https://private-user-images.githubusercontent.com/127835743/600421277-261e65d6-4e88-4add-af2c-0757ac700658.jpeg?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODAxMDczODUsIm5iZiI6MTc4MDEwNzA4NSwicGF0aCI6Ii8xMjc4MzU3NDMvNjAwNDIxMjc3LTI2MWU2NWQ2LTRlODgtNGFkZC1hZjJjLTA3NTdhYzcwMDY1OC5qcGVnP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI2MDUzMCUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjA1MzBUMDIxMTI1WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9N2NkMzBhOGJkMWRjZThlMzUyNzViMDRjODMxNDM2NDlhYjVmYzYxZTUwMzIyNzFhOWZmOTRhZmI5YTNjNTIwOSZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmcmVzcG9uc2UtY29udGVudC10eXBlPWltYWdlJTJGanBlZyJ9.Ps27_KBG-N1coa8XTiaBifF48fHVEPbvG2oG36Wp6GE)

# 実機検証
## 環境準備
ubuntu24.04のGUI環境を2つ用意しておきます。
CUIで良いと思うのですが、GUIの方が馴染みがあるので。

ssh-keygenコマンド、gpgコマンド、opensslコマンドが使える状態であることを確認します。
```
root@test-Standard-PC-i440FX-PIIX-1996:~# which ssh-keygen
/usr/bin/ssh-keygen
root@test-Standard-PC-i440FX-PIIX-1996:~# which gpg
/usr/bin/gpg
root@test-Standard-PC-i440FX-PIIX-1996:~# which openssl
/usr/bin/openssl
```

また、ssh接続（port:22）での通信を受け付けるようにします。
```
root@target:~# apt install -y ssh
root@target:~# systemctl enable ssh
root@target:~# systemctl start ssh
```

## SSH認証（ssh-keygen使用）
### client側
公開鍵を作成していきます。
今回はssh-keygenコマンドを使ってカギを作成していきます。（opensslでも可）

**-t:** 生成する鍵タイプを指定。今回はRSAと呼ばれるよく使用されるものを指定。他にもrsa, ed25519, ecdsa等がある。
**-b:** 鍵のビット数を指定。RSAの場合2048は標準的。長いとその分セキュリティ強度は高くなるが、HWリソースに負荷がかかる。
**-f:** 生成する鍵をどのフォルダに格納するかを指定。
**-N:** 生成する鍵のパスフレーズを指定。今回は空白。

```
test@client:~$ pwd
/home/test
test@client:~$ ls -a .ssh/
.  ..  authorized_keys
test@client:~$ ssh-keygen -t rsa -b 2048 -f ~/.ssh/test_key -N ""
Generating public/private rsa key pair.
Your identification has been saved in /home/test/.ssh/test_key　★秘密鍵のファイル名と格納場所
Your public key has been saved in /home/test/.ssh/test_key.pub　★公開鍵のファイル名と格納場所
The key fingerprint is:
SHA256:B0GiBAnmAXzRcQGqDqFzf0RJ7+/kC4IgIOM+oo5qomE test@client　★鍵の「指紋」。公開鍵が正しいものか、改ざんされていないかを識別するためのハッシュ値。
The key's randomart image is:
+---[RSA 2048]----+
|=+.++o=++        |
|o.oo.+.+ .       |
|=.... o o        |
|=o.  . . .       |
|=oo   . S .      |
|++ o o   o       |
|oE  o o . o      |
|*o.  . . =       |
|@.        +.     |
+----[SHA256]-----+
```

鍵が生成されていることを確認します。
.pub（=publicの略）が記載されていない方が秘密鍵です。絶対に外に漏らしてはダメです。
```test@client:~$ ls -ltr .ssh/
合計 8
-rw------- 1 test test    0  5月  2 09:53 authorized_keys
-rw------- 1 test test 1823  5月  9 09:31 test_key
-rw-r--r-- 1 test test  393  5月  9 09:31 test_key.pub
```

![](https://private-user-images.githubusercontent.com/127835743/589864288-aa3f9b62-27b2-4b7d-90c7-e2ab619ab289.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyODgyNDksIm5iZiI6MTc3ODI4Nzk0OSwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODY0Mjg4LWFhM2Y5YjYyLTI3YjItNGI3ZC05MGM3LWUyYWI2MTlhYjI4OS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwMDUyMjlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1iNDM3NjQ2YjYzMmEwMWZjYjQwYjExZjk5YzVlNzYzZTUxMzRkOTMwZGY3YWI1ZDZjM2QyODlhNjJmMDZkZTU5JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.1zZaokkcKQRrfBSSZ7aQHV8fQQarv_ufdkQx8bXJ9x4)


fingerprintについては、公開鍵をハッシュ化したものであるという事なので、元の公開鍵も見ておきます。これに処理を加えた結果がfingerprintの"SHA256:B0GiBAnmAXzRcQGqDqFzf0RJ7+/kC4IgIOM+oo5qomE test@client"になるという事です。
この出力結果（ssh-rsa AAAA...で始まる1行）をコピーしておきます。
```
test@client:~$ cat .ssh/test_key.pub 
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDn+ltabBZ1vpVxTSkRt/TJiukbpTHLi5QQbMRBTlNpYspVFfU26mwd3lCeoPxZ0AFKPRwMeLjiY7dJINfm4yHAqZtz4/Lk2ff7PnAcdu7ulOEW85kWHf0ruTc9TnjoPX758J1a4/abkLZtjNoriw9/4NBMhSUR1DpL7lq1mEz4fXc8zpRfKFTxDmbFolvSZ5ci/c8pNyDYZ540dkanoU4zU/slfgTNOIPHeaYx84C3W63vfq+0xa6RW+0cSJQZo6/ENnNA8NtgDnEhZtm08iiREhP19i9c8Y7sMYBdBbfD44JrCoyZ7SL1O40zj9uZfSV9dIuyMr8gmfxv3NK73UGr test@client
```

### target（接続先）側
.ssh/authorized_keysを確認します。
catコマンドの結果何も出力されていないので、何も登録されていないことがわかります。
```
test@target:~$ pwd
/home/test
test@target:~$ ls -a
.              .cache    .ssh                       ダウンロード  ミュージック
..             .config   .sudo_as_admin_successful  テンプレート  公開
.Xauthority    .gnupg    .xorgxrdp.10.log           デスクトップ
.bash_history  .local    .xsession-errors           ドキュメント
.bash_logout   .pcsc10   snap                       ビデオ
.bashrc        .profile  thinclient_drives          ピクチャ
test@target:~$ cat .ssh/authorized_keys 
test@target:~$ 
```

ここにclient側で作成した公開鍵の情報を追記します。
```
test@target:~$ nano .ssh/authorized_keys 
test@target:~$ cat .ssh/authorized_keys
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDn+ltabBZ1vpVxTSkRt/TJiukbpTHLi5QQbMRBTlNpYspVFfU26mwd3lCeoPxZ0AFKPRwMeLjiY7dJINfm4yHAqZtz4/Lk2ff7PnAcdu7ulOEW85kWHf0ruTc9TnjoPX758J1a4/abkLZtjNoriw9/4NBMhSUR1DpL7lq1mEz4fXc8zpRfKFTxDmbFolvSZ5ci/c8pNyDYZ540dkanoU4zU/slfgTNOIPHeaYx84C3W63vfq+0xa6RW+0cSJQZo6/ENnNA8NtgDnEhZtm08iiREhP19i9c8Y7sMYBdBbfD44JrCoyZ7SL1O40zj9uZfSV9dIuyMr8gmfxv3NK73UGr test@client
```

### 動作確認 - clientからtargetにssh接続
sshコマンドでtargetに対して接続を試みます。
**-i:** SSH接続時に使用する秘密鍵を指定する
**test@192.168.0.62:** targetのIPアドレスと、targetの内部にいるユーザを指定している。このユーザのauthorized_keysファイルにclientのユーザの公開鍵を登録している必要がある

targetに初めて接続する時は、「このサーバを信用していい？」と聞かれるので、yesを押下します。
接続後、hostnameコマンドを実行するとtargetと出力されていることから接続出来ていることがわかります。

```
test@client:~$ ssh -i ~/.ssh/test_key test@192.168.0.62
The authenticity of host '192.168.0.62 (192.168.0.62)' can't be established.
ED25519 key fingerprint is SHA256:ew2zS1hbRUHC1sWXHc4uuPzkPVBpMrIiIuGFWbYJ4Gg.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '192.168.0.62' (ED25519) to the list of known hosts.
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.17.0-23-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

Expanded Security Maintenance for Applicationsが無効化されています。

0のアップデートはすぐに適用されます。

6個の追加のセキュリティアップデートが、ESM Appsによって適用できます。
ESM Appsの有効化方法についてはこちらを参照してください： at https://ubuntu.com/esm


The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

test@target:~$ hostname
target
```

また、接続に成功すると.ssh/配下にknown_hostsファイルが生成されます。
![](https://private-user-images.githubusercontent.com/127835743/589869927-124d3fa3-c60c-45d9-b243-6a7333469347.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyODk1MTksIm5iZiI6MTc3ODI4OTIxOSwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODY5OTI3LTEyNGQzZmEzLWM2MGMtNDVkOS1iMjQzLTZhNzMzMzQ2OTM0Ny5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwMTEzMzlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mNWM1NzY2ZTRiOTBlNGNmNmVkNjIxZTljNjAzZDFlNzk4NGMwNzg1ZTcyMTA4Mzg1YjE1NmY1Y2RjODgzNmFiJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.8tdEMIi8baqj0LBNuoFg2Ir0O9K_l49LCPDdYbS6QSo)

中身は以下のようになっています。
known_hostsには「ハッシュ化されたホスト名 + サーバーの公開鍵」が記録されます。
次回接続時、サーバーの公開鍵が変わっていれば警告が出るため、中間者攻撃（MITM（Man In The Middle））を検知できます。
```
test@client:~$ cat .ssh/known_hosts
|1|DpztrkvwqbNmjOCOaHIITPvTrvs=|YK6Xq5YJEA42y9C9Dm1YouI4cHw= ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEpSbWR5ISj74xgc5J4BNaTvLaYsOKFo5zmrFWpcqXW5
|1|zeJUxJzUYwkBVP2zv851a8XyE9I=|Z+brCCRet7MrFir4lyTiaQ/bADI= ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCjBC6hjaanNRJ5xILALR1MgN/iq0jw9Cl8e9qpCJ89zYQfyL5eA8xSXB730jni0KPFh87afXc3RRgTtYtd08St9vIePZeDUuqceSIMp8Ffe5qxk1SkHIsri8+46sbK7Q8VGoI91BehyIDNPzx0y/bud3FnNWXOLEk0TgjPXWWMvKfhOdDWCpwNTTI237QsT+t67sRR5AQ2gAVSKtgBaX38dAORYRHhU/cfE3DokbVgu7tcqxC8aVLGL6FTnac2namKJ4kJXN/IShUU5n3R1ESUll39UtRrMUGBMtE4s9vHe9tZl79dMM6cmCvQQGaftPOvewQLQ63nebKA+HYI7zjrfN/fWIaKncmoEM8uYBf16gU+vz5mgaaWMD95xU7aJ8xrVnXm/O89fe7cvQ8M/n2gMW8Wu2WmTbz2PEYksPkmogOrNYqOcpTaYheMArv+GIjINZxfhMM2EMk056hiuoQgTyjj0QHb/toKBqv02FpBqVatSJn44WAl/TgoA+JVY5E=
|1|gx5OXVWmbgF4BbQmanFF3mVLMFA=|zW76PGOvDBfZeGEWK6QpEDwwXwY= ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBOe3W3vitqdpGDU67bQUD9b6eD3fmsbxjVzXnIZRn8VIC61cRIRKaw7N/7bRA5eW42hnJqrw8LAzZhpQVDRwK/8=
```

## デジタル署名（GPG使用）
### client側
GPGの鍵のペアを作成します。以下の設定を行ったうえで作成しました。
- 鍵の種類: (1) RSA and RSA 
- 鍵のサイズ: 3072
- 有効期限: 1y (1年)
- 名前: test-user
- メールアドレス: test@example.com
- コメント: demo
- パスフレーズ: password
```
test@client:~$ gpg --full-generate-key
gpg (GnuPG) 2.4.4; Copyright (C) 2024 g10 Code GmbH
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

ご希望の鍵の種類を選択してください:
   (1) RSA と RSA
   (2) DSA と Elgamal
   (3) DSA (署名のみ)
   (4) RSA (署名のみ)
   (9) ECC (署名と暗号化) *デフォルト
  (10) ECC (署名のみ)
  (14) カードに存在する鍵
あなたの選択は? 1
RSA 鍵は 1024 から 4096 ビットの長さで可能です。
鍵長は? (3072) 3072
要求された鍵長は3072ビット
鍵の有効期限を指定してください。
         0 = 鍵は無期限
      <n>  = 鍵は n 日間で期限切れ
      <n>w = 鍵は n 週間で期限切れ
      <n>m = 鍵は n か月間で期限切れ
      <n>y = 鍵は n 年間で期限切れ
鍵の有効期間は? (0) 1y
鍵は2027年05月09日 10時24分40秒 JSTで期限切れとなります
これで正しいですか? (y/N) y

GnuPGはあなたの鍵を識別するためにユーザIDを構成する必要があります。

本名: test-user
電子メール・アドレス: test@example.com
コメント: demo
次のユーザIDを選択しました:
    "test-user (demo) <test@example.com>"

名前(N)、コメント(C)、電子メール(E)の変更、またはOK(O)か終了(Q)? O
たくさんのランダム・バイトの生成が必要です。キーボードを打つ、マウスを動か
す、ディスクにアクセスするなどの他の操作を素数生成の間に行うことで、乱数生
成器に十分なエントロピーを供給する機会を与えることができます。
たくさんのランダム・バイトの生成が必要です。キーボードを打つ、マウスを動か
す、ディスクにアクセスするなどの他の操作を素数生成の間に行うことで、乱数生
成器に十分なエントロピーを供給する機会を与えることができます。
gpg: ディレクトリ'/home/test/.gnupg/openpgp-revocs.d'が作成されました
gpg: 失効証明書を '/home/test/.gnupg/openpgp-revocs.d/D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FB.rev' に保管しました。
公開鍵と秘密鍵を作成し、署名しました。

pub   rsa3072 2026-05-09 [SC] [有効期限: 2027-05-09]
      D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FB
uid                      test-user (demo) <test@example.com>
sub   rsa3072 2026-05-09 [E] [有効期限: 2027-05-09]
```

GUI環境で作っている場合、パスフレーズを設定する際に以下のような画面が表示されます。
![](https://private-user-images.githubusercontent.com/127835743/589870986-a232f9da-4c7d-4a80-a8f0-3f5edc5b45ed.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyOTAyMzYsIm5iZiI6MTc3ODI4OTkzNiwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODcwOTg2LWEyMzJmOWRhLTRjN2QtNGE4MC1hOGYwLTNmNWVkYzViNDVlZC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwMTI1MzZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wMzk0ZjhhMzMzNTdlZjhhZGRkZjc3NjA1OWI2NmVkYjZlNjI1NjllZDE1YmMyYzgwNzIzMjZiYjQ4ZTgzYWU1JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.lrNZ0tlY5mM-5h7CvF_YVdnbm1tygPRWPmAIZp-URjg)

GPGキー作成が完了すると.gnupgディレクトリが作成され、その中に鍵が生成されます。
- **pubring.kbx:** 「公開鍵の鍵束（キーリング）」です。自分自身の公開鍵だけでなく、インポートした他人の公開鍵もすべてこのバイナリファイルに保存されます。
- **pubring.kbx~:** pubring.kbx のバックアップファイルです。更新時に自動的に作成されます。
- **trustdb.gpg:** 「信用データベース」です。あなたが各公開鍵をどの程度信頼しているか（例：この鍵は間違いなく本人のものだと究極的に信頼する、など）という情報が記録されています
- **D60~.rev:**  秘密鍵を紛失したり、盗まれたりした場合に、その鍵が無効であることを世界に知らせるために使用します。
- ***.key:** データの復号（読み取り）や、デジタル署名の作成に使用します。秘密鍵本体。
```
test@client:~$ ls -lR .gnupg/
.gnupg/:
合計 20
drwx------ 2 test test 4096  5月  9 10:25 openpgp-revocs.d
drwx------ 2 test test 4096  5月  9 10:25 private-keys-v1.d
-rw-rw-r-- 1 test test 1980  5月  9 10:25 pubring.kbx　
-rw------- 1 test test   32  5月  2 14:43 pubring.kbx~ 
-rw------- 1 test test 1240  5月  9 10:25 trustdb.gpg

.gnupg/openpgp-revocs.d:
合計 4
-rw------- 1 test test 1841  5月  9 10:25 D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FB.rev

.gnupg/private-keys-v1.d:
合計 8
-rw------- 1 test test 3105  5月  9 10:25 22774C6320888CD05AE50812C229FD02E4BBAF6F.key
-rw------- 1 test test 3105  5月  9 10:25 5700C317CBA6AC160FA3FB9BD5C79A62BACC00FD.key
```
![](https://private-user-images.githubusercontent.com/127835743/589872459-9d08d0c6-1915-487a-93de-6d6c93e2f4a5.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyOTExMTgsIm5iZiI6MTc3ODI5MDgxOCwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODcyNDU5LTlkMDhkMGM2LTE5MTUtNDg3YS05M2RlLTZkNmM5M2UyZjRhNS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwMTQwMThaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0yYzU3ZDdjMTJhMWU1NTE2MTllODY4NGFmNTI4ZTc1MDI4ZTAyNDhiZDBmNzMwZjFlZDc2ZTQ5NTM5NTA3OTQxJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.-HRmI1cYixn7VtPbcCG82CQfAfRuG4IIS5Ca5epzfR4)

**trustdb.gpgとD60~.revについて**
![](https://private-user-images.githubusercontent.com/127835743/600430971-15bb199f-5a91-4b9d-8234-7dc62a5e2d5b.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODAxMTQzNDIsIm5iZiI6MTc4MDExNDA0MiwicGF0aCI6Ii8xMjc4MzU3NDMvNjAwNDMwOTcxLTE1YmIxOTlmLTVhOTEtNGI5ZC04MjM0LTdkYzYyYTVlMmQ1Yi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTMwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUzMFQwNDA3MjJaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1kMzRlNGQxNWUwZDc1OGViYjUxZTQ3ZDVmYjkzMWQxOGUxNjE2NzZkYTViODliMjAxZGNhNWQ4MjlmM2FmMjA4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.vkJUEXjrk_UNrzkzoBznX8O6ZwH3Tl1MixfkDPPBK_M)

![](https://private-user-images.githubusercontent.com/127835743/600430995-9f5c2f39-ed7c-46cb-aade-0e56604ff833.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODAxMTQzNDksIm5iZiI6MTc4MDExNDA0OSwicGF0aCI6Ii8xMjc4MzU3NDMvNjAwNDMwOTk1LTlmNWMyZjM5LWVkN2MtNDZjYi1hYWRlLTBlNTY2MDRmZjgzMy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTMwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUzMFQwNDA3MjlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02ZDY1NGNiODk0ZjdlZDY2ZTk4OWM5OGUzYWQ2NjY0NDFjODIwYmJhMmEyM2ZhMmYxYTQ5ZGI5NzUxNWVkM2ZiJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.LrrhmOPrvr5PtzPeoG0E2yinTnTtnXRuDRLT2awq7bU)

秘密鍵しか生成されていないので、targetに送る用の公開鍵を作成します。
`gpg --armor --export test@example.com > ~/test_client_public_gpg_key.asc`は「特定のメールアドレスに関連付けられたGPG公開鍵を、テキスト形式でファイルに書き出す」操作になります。
- **--armor:** 出力を「ASCII Armor」形式（テキスト形式）にするオプション
- **--export:** 鍵束（キーリング）から公開鍵を取り出す指示
```
test@client:~$ gpg --list-keys
gpg: 信用データベースの検査
gpg: marginals needed: 3  completes needed: 1  trust model: pgp
gpg: 深さ: 0  有効性:   1  署名:   0  信用: 0-, 0q, 0n, 0m, 0f, 1u
gpg: 次回の信用データベース検査は、2027-05-09です
/home/test/.gnupg/pubring.kbx
-----------------------------
pub   rsa3072 2026-05-09 [SC] [有効期限: 2027-05-09]
      D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FB
uid           [  究極  ] test-user (demo) <test@example.com>
sub   rsa3072 2026-05-09 [E] [有効期限: 2027-05-09]

test@client:~$ gpg --armor --export test@example.com > ~/test_client_public_gpg_key.asc
test@client:~$ cat test_client_public_gpg_key.asc 
-----BEGIN PGP PUBLIC KEY BLOCK-----

mQGNBGn+jP8BDAC+jr++XjzdkttydyUcR9w4rF2FhTgVo2Yk3WhmgWRrPSnfWX7h
eAG5x+2i449lypWfdB5+gzPtNBw5VHrsj58XOJE01t7DQrzELX4oi1km3Au3S+L9

中略

/HnUuTurQeefjtsBVXXzhFIYERGv4mkK1xeZLNWC/cI9U17aRBcCQHrsisiakvUK
TWA9lPdP7+aEJL6Tr5JW9LX/zdej59/Y74MBuQYecVEbQjsZKTfUQAJomn6I0B0k
4rVcvdN19FPFuqPa5J77FxY/1bHjLX0EPIK1hE+s
=jbkK
-----END PGP PUBLIC KEY BLOCK-----
```
![](https://private-user-images.githubusercontent.com/127835743/589873382-daa4cdae-e415-48e9-8986-808862608691.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyOTE2NTksIm5iZiI6MTc3ODI5MTM1OSwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODczMzgyLWRhYTRjZGFlLWU0MTUtNDhlOS04OTg2LTgwODg2MjYwODY5MS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwMTQ5MTlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wYjhiOGY3YzMxZmU4ZmNiMTY1NDQ2NThkODQ3N2U0M2I4MjRiY2YzZjk1NDEzNTU3NmFkMzIyNzRhZTgzZDhkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.llFV1OHGjE5kP1bJRZUGXlOtDbEHzZ5pyvmmHB8eZwE)

GPGキーの準備が出来たので、テストファイルを作成してそれに対して署名を行います。
署名をするタイミングでパスフレーズを求められるので、設定しているパスフレーズを入力します。署名が正常に行われると、ファイル名.ascファイルが作成されます。
```
test@client:~$ echo "test GPG" >> test_GPG.txt
test@client:~$ cat test_GPG.txt 
test GPG

test@client:~$ gpg --detach-sign --armor test_GPG.txt 
test@client:~$ ls test*
test_GPG.txt  test_GPG.txt.asc  test_client_public_gpg_key.asc
test@client:~$ cat test_GPG.txt.asc
-----BEGIN PGP SIGNATURE-----

iQGzBAABCgAdFiEE1g7D85Zc7QQB1h5qsObOnwv6pPsFAmn+ldAACgkQsObOnwv6
pPuc3QwAsxZ/KN5MWrgkT6Oz5dYvqRa7fVBDO6gHIgeNUds8ZLZoKbpcqnXhBfAn
VpO3de0NeUkVdgax5wyLeZCQwc0fLepDzkFm/JSYhRvRI1/RJXb9sCdpSkk3tw+n
XlXHKCBLxh0zS6+fyoOcMxmVubMb7/2gFY5ViuFSVa0xz+smyjSNNT9WAKurzrW9
sNyA1acqiV4a1RvfVZVU1RMDHtkSr+kf/Ghw7dLq1l1w7z66mEsBHhXdFVJXHDJS
/svzFa6fnDFVkwF0VS1P+XDIf52+63+GUlj3UFe4tK2kLoTuSvB4pAdJo4afy6Ye
CYYq6JdXWmmHNagWUeWD/EEZcvwr+0n1unwhn+5tMU/cnDzvaOC+OjoZyHs3gj5o
NavDhZ5+hHW1tYJvJDuGn9e7LyCtc/DhJ/FbIIMb/9hWItqEcSiJXX8un2vymuA4
9jfRt5t2cJ7byDxXK94qDKTvoEi4otJ+UKIhTijQTMpxtHiOaPJhDWdwBlIdqfkU
H5PM8J7j
=iSX3
-----END PGP SIGNATURE-----
```

署名ファイルの検証を行ってみます。
```
test@client:~$ gpg --verify test_GPG.txt.asc test_GPG.txt
gpg: 2026年05月09日 11時02分56秒 JSTに施された署名
gpg:                RSA鍵D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FBを使用
gpg: "test-user (demo) <test@example.com>"からの正しい署名 [究極]
```

### 動作確認 - targetにファイルとGPG公開鍵を送付して署名検証を行う
clientで作成したテストファイル、署名ファイル、GPG公開鍵をtargetに送付します。
ssh -iの後のtest_keyはSSH認証で作成した秘密鍵を使っています。
```
test@client:~$ scp -i ~/.ssh/test_key ~/test_GPG.txt ~/test_GPG.txt.asc ~/test_client_public_gpg_key.asc test@192.168.0.62:~/
test_GPG.txt                                  100%    9    28.4KB/s   00:00    
test_GPG.txt.asc                              100%  659     2.3MB/s   00:00    
test_client_public_gpg_key.asc                100% 2460     3.7MB/s   00:00   
```

target側でファイルがあることを確認します。
![](https://private-user-images.githubusercontent.com/127835743/589879082-2ab75749-2a95-42f3-b887-a1f22b4d1566.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgyOTMzNzgsIm5iZiI6MTc3ODI5MzA3OCwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5ODc5MDgyLTJhYjc1NzQ5LTJhOTUtNDJmMy1iODg3LWExZjIyYjRkMTU2Ni5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwMjE3NThaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mMDE0YWM3Y2E2MTdkN2Q3NjU5YmViZTYwMzE2YTc2NWY3YWRjNjNhYWZkYWZkZDE5MWUyZDA1N2FmZGRlZmQwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.vzJvGbkY4Q54t9aiaMKLp2Rk4A0hvG7NMDHeeApzzQE)

target側で検証します。
まず、GPG公開鍵をインポートします。
```
test@target:~$ gpg --import test_client_public_gpg_key.asc 
gpg: 鍵B0E6CE9F0BFAA4FB: 公開鍵"test-user (demo) <test@example.com>"をインポートしました
gpg: 処理数の合計: 1
gpg:               インポート: 1
test@target:~$ gpg --list-keys
/home/test/.gnupg/pubring.kbx
-----------------------------
pub   rsa3072 2026-05-09 [SC] [有効期限: 2027-05-09]
      D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FB
uid           [  不明  ] test-user (demo) <test@example.com>
sub   rsa3072 2026-05-09 [E] [有効期限: 2027-05-09]
```

続いて検証を行います。
警告は出ていますが「"`test-user (demo) <test@example.com>`"からの正しい署名」という記載があるように、署名が検証出来ていることがわかります。
```
test@target:~$ gpg --verify  test_GPG.txt.asc test_GPG.txt
gpg: 2026年05月09日 11時02分56秒 JSTに施された署名
gpg:                RSA鍵D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FBを使用
gpg: "test-user (demo) <test@example.com>"からの正しい署名 [不明の]
gpg: *警告*: この鍵は信用できる署名で証明されていません!
gpg:          この署名が所有者のものかどうかの検証手段がありません。
主鍵フィンガープリント: D60E C3F3 965C ED04 01D6  1E6A B0E6 CE9F 0BFA A4FB
```

試しにtarget上でファイルを書き換え（≒改竄）した上で、改めて署名検証を行います。
結果として「gpg: "`test-user (demo) <test@example.com>`"からの*不正な*署名 [不明の]」という記載があるように、署名が検証できなかったことを示します。
※あくまで改竄されているか否かを確認するために署名があるのであって、ファイル自体を暗号化したりしているわけではありません。
```
test@target:~$ echo "fake_text" >> test_GPG.txt
test@target:~$ cat test_GPG.txt
test GPG
fake_text
test@target:~$ gpg --verify  test_GPG.txt.asc test_GPG.txt
gpg: 2026年05月09日 11時02分56秒 JSTに施された署名
gpg:                RSA鍵D60EC3F3965CED0401D61E6AB0E6CE9F0BFAA4FBを使用
gpg: "test-user (demo) <test@example.com>"からの*不正な*署名 [不明の]
```

## データ暗号化（openssl使用）
### client側の準備、鍵の生成
openssl（名前は任意）というディレクトリを作成して、そこで秘密鍵を生成しいます。
-　**genrsa:** RSAアルゴリズムの秘密鍵を生成するオプション
-　**out:** 生成する鍵のファイル名を指定
-　**3072** ビット数の指定
```
test@client:~$ pwd
/home/test
test@client:~$ mkdir openssl
test@client:~$ cd openssl/
test@client:~/openssl$ openssl genrsa -out private_key.pem 3072
test@client:~/openssl$ cat private_key.pem 
-----BEGIN PRIVATE KEY-----
MIIG/QIBADANBgkqhkiG9w0BAQEFAASCBucwggbjAgEAAoIBgQDByuV7t6xXaGQK
jGzvByb0hy1UEU5jlOXZjuqpzDrPZFYHvOHmVzEiccLOksFqRkP6VuDYoxgCcePc

中略

wm44Z2EuSgmhnibQ69zvb3GQKecINbhSDI9VqyAGQa8/0G2nS+bgBM+Ul39eOwX9
wRt71VH7cG+uEPvJBbl2nubsvmo5lItuOLQ6KhYg/t46QLe9ITwPtGa8oHHDquCX
1Rv02y+XvrBSemkXRD8JmF0=
-----END PRIVATE KEY-----
```

作成した秘密鍵から公開鍵を生成します。
- **in:** 入力元の秘密鍵を指定する
- **pubout:**　公開鍵を出力するという意味。(PUBlic key OUTの略だと思われる)
- **out:** 出力する公開鍵のファイル名を指定する。
```
test@client:~/openssl$ openssl rsa -in private_key.pem -pubout -out public_key.pem
writing RSA key
test@client:~/openssl$ cat public_key.pem 
-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAwcrle7esV2hkCoxs7wcm
9IctVBFOY5Tl2Y7qqcw6z2RWB7zh5lcxInHCzpLBakZD+lbg2KMYAnHj3EYqq54u
lBjWbt05awfb2u3n91AdK5AykFtaQ/G6FTGV/9XTaXh1yNEWVZr4vx7EhEI09nZb
0jfq29/W//k2klj0/jxrW08N6Gyux5xfKSVycpvPXbSTKHhg8W4bgpLS/fr/3yDS
vy1BuXEWiDJFQe8VRqCew5FoLHm2fhm7jDsLMPED7d7Q+yNrXxb3eq8JTGhZTCwA
pEgLuwhwvX0j/rPZbjUb6yfapL2qZWpTWzRKt9J0Lh2C5TdFv5o62kvmtbHsc3gG
kEfmxTy6jEZnuMpyVDFZUUGGDfcRdRk4Wkw0yhwDP5ewJ5ONgdNtoeSck8G56qMF
UVTFVUGOEBga0kOgdEYxePMUX2gPqifPuLpaE2Na0p3VWWCtssMSFhH9dnizsd6C
yWy82AJKI30qCZ4Sf3L/WE5l7puhmTwreGqeufYN3RkJAgMBAAE=
-----END PUBLIC KEY-----
```

![](https://private-user-images.githubusercontent.com/127835743/589919849-d221489d-b78f-4b15-9595-468a6926d41e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgzMDk5NDEsIm5iZiI6MTc3ODMwOTY0MSwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5OTE5ODQ5LWQyMjE0ODlkLWI3OGYtNGIxNS05NTk1LTQ2OGE2OTI2ZDQxZS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwNjU0MDFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05ODhlYTJkYTMwZGYyNjgzYjM3NGI0MjY4NzNiOWY0ZmFkNmRhZTEzYzM4M2NiMDQwMTQ1ODJiNDViZTA2NjE3JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.fkC0DLx4xbwMdLnKn5CyWwkldeuNCkZbGodYbeOmkwE)

作成した鍵のうち、公開鍵をtargetに送ります。
```
test@client:~/openssl$ scp public_key.pem test@192.168.0.62:~/
public_key.pem                                100%  625     1.8MB/s   00:00   
```

### target側
client側から公開鍵が送付されていることを確認します。
```
test@target:~$ ls
public_key.pem    test_client_public_gpg_key.asc  デスクトップ  ミュージック
snap              thinclient_drives               ドキュメント  公開
test_GPG.txt      ダウンロード                    ビデオ
test_GPG.txt.asc  テンプレート                    ピクチャ
```
![](https://private-user-images.githubusercontent.com/127835743/589921277-37e6b925-7288-4234-92f9-5e034c81e887.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgzMTA4MDIsIm5iZiI6MTc3ODMxMDUwMiwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5OTIxMjc3LTM3ZTZiOTI1LTcyODgtNDIzNC05MmY5LTVlMDM0YzgxZTg4Ny5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwNzA4MjJaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mODM0MDk2MTk1NWQzNzE1MTA3NjczYmNhNmVjYmU1Y2QzODg1MWY2ZGMzZmU5N2I2Zjg0NzlhN2RhMjA5YTNlJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.LlwC0qIGI4XSdIdC5WQHvQ6bcNGYZmdIp9BFta4hgPU)

テストファイルを作成してそのファイルを受け取った公開鍵で暗号化します。
- **rsautl:** RSA鍵を使用して暗号化、復号、署名、検証などを行うためのサブコマンド ※pkeyutlを使用するのが推奨になった様子。
- **encrypt:** 暗号化の指示
- **pubin:** 入力する鍵（-inkeyで指定したもの）が「公開鍵」であることを明示
- **inkey:**  暗号化に使用する鍵ファイルを指定
- **in:** 暗号化の対象ファイルを指定
- **out:** 暗号化したファイル名を指定

生成された暗号化ファイルを見ると、中身が見れないことがわかります。
```
test@target:~$ echo "test_openssl" >> test_OPENSSL.txt
test@target:~$ cat test_OPENSSL.txt 
test_openssl
test@target:~$ ls -lh test_OPENSSL.txt 
-rw-rw-r-- 1 test test 13  5月  9 16:12 test_OPENSSL.txt
test@target:~$ openssl rsautl -encrypt -pubin -inkey public_key.pem  -in test_OPENSSL.txt -out secret_test_OPENSSL.txt
The command rsautl was deprecated in version 3.0. Use 'pkeyutl' instead.
```
![](https://private-user-images.githubusercontent.com/127835743/589923872-5caa0e19-2559-4c07-a6be-9d0aff1eb8d5.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgzMTE1NzEsIm5iZiI6MTc3ODMxMTI3MSwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5OTIzODcyLTVjYWEwZTE5LTI1NTktNGMwNy1hNmJlLTlkMGFmZjFlYjhkNS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwNzIxMTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT01YmVlZWI0NjBhMGJjN2NmYWZlNWI3MTZmZGRkNDMxMjliNmZjMjg1NmJhZGNlZjM3OGMwNTNlNWEyZTUyYzNmJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.rgt5kAKxyRFWD6tM2tC-jJ73o1fkG2t-RV6dxTRcxcc)

この鍵をclient側に持っていきます。
```
test@target:~$ scp secret_test_OPENSSL.txt test@192.168.0.60:~/openssl/
The authenticity of host '192.168.0.60 (192.168.0.60)' can't be established.
ED25519 key fingerprint is SHA256:7MtvdGMuwbJNlk7tSIJDNNMQZS3Zc/S60o0Y1WmcnYY.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '192.168.0.60' (ED25519) to the list of known hosts.
test@192.168.0.60's password: 
secret_test_OPENSSL.txt                       100%  384   819.1KB/s   00:00    
```

### client側 復号化
暗号化されたファイルがあることを確認します。
![](https://private-user-images.githubusercontent.com/127835743/589926812-46cc317e-750b-4dfb-938e-8701b5176936.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgzMTIyNjcsIm5iZiI6MTc3ODMxMTk2NywicGF0aCI6Ii8xMjc4MzU3NDMvNTg5OTI2ODEyLTQ2Y2MzMTdlLTc1MGItNGRmYi05MzhlLTg3MDFiNTE3NjkzNi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwNzMyNDdaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0xYTM5NjgzOTJlMWU4NGZhMTY1NzNmOTRkNzU0ODUzMDBmMTQ2MTc2N2NjNDVjYzE2NGU0ODMyNjEwYjI1YTEwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.GAZe3Wu9IGTpKZM7PuZlIbKuWMLB3v3YYcm5UNorV2E)

これを秘密鍵を使って復号化します。
復号化されたファイル、test_OPENSSL.txtを確認すると開けることがわかります。
```
test@client:~/openssl$ ls
private_key.pem  public_key.pem  secret_test_OPENSSL.txt  test@192.168.0.62
test@client:~/openssl$ openssl rsautl -decrypt -inkey private_key.pem -in secret_test_OPENSSL.txt -out test_OPENSSL.txt
The command rsautl was deprecated in version 3.0. Use 'pkeyutl' instead.
test@client:~/openssl$ ls
private_key.pem  secret_test_OPENSSL.txt  test_OPENSSL.txt
public_key.pem   test@192.168.0.62
```
![](https://private-user-images.githubusercontent.com/127835743/589928024-b7b1d74a-4982-4cb5-87d7-a7563b1a296b.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzgzMTI1MTAsIm5iZiI6MTc3ODMxMjIxMCwicGF0aCI6Ii8xMjc4MzU3NDMvNTg5OTI4MDI0LWI3YjFkNzRhLTQ5ODItNGNiNS04N2Q3LWE3NTYzYjFhMjk2Yi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUwOVQwNzM2NTBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1lMzY1ZTE1OWZlMDMyNWYxMTE3MTVjZWM2M2VjNjcyOTY2YWQ1MDRkNWNjMzIxYWI3YjE4YmI3OWFkOTkwM2YzJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.zexiKOdNfQQqhxOVOmA5MrALTxOjjeQ9f6YtY34wzvs)

### 参考：pkeyutlのサンプルコマンド
```
# 暗号化
openssl pkeyutl -encrypt -pubin -inkey public_key.pem \
  -in test_OPENSSL.txt -out secret_test_OPENSSL.txt

# 復号化
openssl pkeyutl -decrypt -inkey private_key.pem \
  -in secret_test_OPENSSL.txt -out test_OPENSSL.txt
```

## 余談：ファイル暗号化 + 署名
署名のみ       → 改ざんや偽装は検知できるが、内容は平文で見える
暗号化のみ     → 内容は秘密だが、改ざんや送信者の偽装を検知できない
暗号化 + 署名  → 両方を実現！

コマンドサンプル：
```
# 暗号化 + 署名（送信者）
gpg --encrypt --sign --recipient target@example.com file.txt

# 検証 + 復号化（受信者）
gpg --decrypt file.txt.gpg
```

