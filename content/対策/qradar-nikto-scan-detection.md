---
title: "QRadarでNiktoスキャンを検知する - カスタムルールによる404エラー監視"
date: 2026-05-05
tags: ["countermeasure", "Apache", "Ubuntu", "Security", "Nikto", "QRadar"]
source: "https://qiita.com/ohtsuka-shota/items/4fac14706cd92ebf99b1"
---
# はじめに
前回の記事では、NiktoによるWeb脆弱性スキャンがQRadarでオフェンスとして検知されない課題を確認しました。

[[qradar-kali-attack-detection]]#%E8%84%86%E5%BC%B1%E6%80%A7%E8%AA%BF%E6%9F%BBweb%E8%84%86%E5%BC%B1%E6%80%A7%E3%82%B9%E3%82%AD%E3%83%A3%E3%83%B3nikto

本記事では、カスタムルールを作成してNiktoスキャンを検知できるようにします。

## 検知の方針
- **検知対象**: HTTP 404エラーの大量発生
- **検知条件**: 同一送信元IPから1分間に50回以上の404エラー
- **理由**: Niktoは存在しないパスを多数リクエストするため、404エラーが集中的に発生します

設定対象はこちらのイベント名"HTTP 404 - Not Found"になります。イベント数を見ると、"4362"となっておりこれがNiktoで脆弱性調査をしたという事を示しています。QID"4500022"は後程使用します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2b6fa676-e2a1-41a1-a975-a173346ab56d.png)

## なぜ404エラーで検知するのか？
Niktoは既知の脆弱性パスやファイルを網羅的にチェックするため、存在しないパスへのアクセスが大量に発生します。
この特性を利用して、短時間での404エラーの集中をスキャン行為として検知します。

### 閾値の考え方
- **50回/1分**: 通常のユーザーアクセスでは発生しにくい頻度
- **送信元IP単位**: 攻撃元を特定しやすくする
- 環境に応じて調整が必要（例：大規模サイトでは閾値を上げる）

# 構築
## ルール作成
今回は「同一IPからの短時間での大量404エラー」という内容でオフェンスを発生させるための設定を行っていきます。
まずQRadarにログインし、ログ・アクティビティーを開きます。
その後、ルール > ルールの順で遷移して押下します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9373b57d-0adf-4ac5-8523-85663f2b7f3b.png)

現在のルール一覧が表示されます。新規イベント・ルールを押下します。
※新規オフェンス・ルールというのは既に発生しているオフェンスに対して重要度を更に上げる等のような時に使うようです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/acc6a05c-5420-45a6-8d22-47c008d8175a.png)

ルール・ウィザードが開きます。
次へボタンを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/06aebf98-54ef-4c96-8eeb-c1e8d668e35b.png)

イベントを選択して次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0d47e3b7-993f-4015-abaf-f8f1d7abd917.png)

ルール・ウィザード: ルール・テスト・スタック・エディターが開きます。
テスト・グループをイベント・プロパティー・テストにして、"when the event matches this search filter"を押下します。すると、下に"and when the event matches this search filter"と表示されます。
this search filterがリンクになっているので、これを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/feee571a-a786-4ca6-a4a3-6e8cd89cbfd3.png)

イベント名で次と等しいを選択します。
この状態で参照を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/982ccf19-829a-4ef8-a2cf-4ec60007df1a.png)

上位・下位カテゴリなどは特段いじらずに、名前のところで"HTTP 404 Not Found"と入力します。するとQRadar上で検知してきたものが一覧で表示されます。ここで控えておいたQIDを検索して選択します。この状態でOKを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2de49365-1992-431d-b566-97e53b30ab6b.png)

HTTP 404 Not Foundが表示されると思います。
追加を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9f896386-4de6-4a39-a4da-04943b5299c3.png)

下の欄に404 Not Foundの表記が現れます。
送信を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6ddc0635-d19f-4825-98fc-655bcd4573b0.png)

元の画面に戻ります。今の設定のままだと1回でも404が発生すると発報するようになっているので、ここで1分間で50回の間という条件を追加してみます。
"when at least this many events are seen with the same event properties in this many event"をダブルクリックすると下に、"and when at least this many events are seen with the same event properties in this many minutes"と表示されます。"this many"を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c42c34d6-756c-42b0-803b-4fb27e2411bd.png)

Enter a valueに1を入力して送信を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/eea9f01d-5b4f-486b-94ec-0dfa65719659.png)

元の画面に戻ります。"event properties"を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ad22f41d-8499-40b2-befd-d12abc5ca0a6.png)

送信元IPを追加します。選択された項目に表示されたら送信を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/40705d75-9a10-4b83-aaed-ee91277fd457.png)

元の画面に戻ります。"this many"を選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f53df57b-ef98-4d24-afae-d50d5b2e3b44.png)

Enter a valueに50を入力して送信を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/369f5020-d1eb-4c00-b559-44c411b45e75.png)

ルール名のところに"Kali Linux Reconnaissance (Nikto)"と入力します。
グループは今回はコンプライアンスとスキャン行為を選択していきます。
ルールについては最終的に以下となります。
- and when the event matches イベント名: HTTP 404 - Not Found
- and when at least 50 events are seen with the same 送信元 IP in 1 minutes
次へボタンを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/12067c7b-3225-4413-a65f-643f267030bc.png)

ルールの応答から新規イベントのディスパッチにチェックを開きます。
イベント名：Nikto Scan Detected
上位カテゴリ：スキャン行為
下位カテゴリ：Webスキャン行為
ディスパッチされたイベントをオフェンスの一部にする：チェック
オフェンスの検索付けの基準：送信元IP
この設定を入れて終了を押下します。
![](./qradar-nikto-scan-detection-images/img01.png)

任意の文言を追加して、OKボタンを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/73825ee0-07c3-4d2e-80b5-f246e02968c5.png)

元の画面に戻ります。
画面上部に検索窓がありますので、Kali Linux Reconnaissance (Nikto)と検索すると、先ほどのルールが表示されると思います。
![](./qradar-nikto-scan-detection-images/img02.png)

## 動作確認
Kali Linuxで改めて攻撃対象に対してniktoを使ってWeb脆弱性を調査してみます。
```
┌──(root㉿ohtsuka-kali)-[~]
└─# nikto -h http://172.18.250.18
- Nikto v2.6.0
---------------------------------------------------------------------------
+ Your Nikto installation is out of date.
+ Target IP:          172.18.250.18
+ Target Hostname:    172.18.250.18
+ Target Port:        80
+ Platform:           Linux/Unix
+ Start Time:         2026-05-05 10:00:08 (GMT9)
---------------------------------------------------------------------------
+ Server: Apache/2.4.58 (Ubuntu)
+ No CGI Directories found (use '-C all' to force check all possible dirs). CGI tests skipped.
+ [999984] /: Server may leak inodes via ETags, header found with file /, inode: 29af, size: 650fb6368d404, mtime: gzip. See: https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2003-1418
+ [013587] /: Suggested security header missing: x-content-type-options. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
+ [013587] /: Suggested security header missing: strict-transport-security. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
+ [013587] /: Suggested security header missing: content-security-policy. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
+ [013587] /: Suggested security header missing: referrer-policy. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
+ [013587] /: Suggested security header missing: permissions-policy. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
+ [600050] Apache/2.4.58 appears to be outdated (current is at least 2.4.66).
+ [740000] Multiple index files found (all unique): /index.html, /index.php.
+ [999990] OPTIONS: Allowed HTTP Methods: OPTIONS, HEAD, GET, POST .

+ [007342] /: X-Frame-Options header is deprecated and was replaced with the Content-Security-Policy HTTP header with the frame-ancestors directive. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
+ [007352] /: The X-Content-Type-Options header is not set. This could allow the user agent to render the content of the site in a different fashion to the MIME type. See: https://www.netsparker.com/web-vulnerability-scanner/vulnerabilities/missing-content-type-header/
+ 8083 requests: 16 errors and 11 items reported on the remote host
+ End Time:           2026-05-05 10:05:41 (GMT9) (333 seconds)
---------------------------------------------------------------------------
+ 1 host(s) tested
```
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/17712c5c-f9c6-4075-a1f3-17dbe80db557.png)

QRadarで検知していることを確認します。
ログ・アクティビティーからフィルタをかけます。今回は以下とします。
パラメータ：カスタム・ルール
演算子：次と等しい
ルール・ブック：Kali Linux Reconnaissance (Nikto)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/76815be8-2a22-484b-84ba-8659ee85813b.png)

フィルタに引っ掛かるイベントがあります。適当に押下します。
![](./qradar-nikto-scan-detection-images/img03.png)

詳細を見ると"Kali Linux Reconnaissance (Nikto)"で検知していることがわかります。
![](./qradar-nikto-scan-detection-images/img04.png)

オフェンスを確認してみます。
Webスキャンでヒットしているものがあることがわかります。これをダブルクリックします。
![](./qradar-nikto-scan-detection-images/img05.png)

詳細は以下となります。
![](./qradar-nikto-scan-detection-images/img06.png)
![](./qradar-nikto-scan-detection-images/img07.png)

