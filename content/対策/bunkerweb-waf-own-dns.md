---
title: "BunkerWebと自作DNSで学ぶWebアプリをWAFで守る環境構築手順"
date: 2026-04-19
tags: ["countermeasure", "Security", "Web", "xss", "BunkerWeb"]
source: "https://qiita.com/ohtsuka-shota/items/dbbc017b4b64d1b25c02"
---
# 環境イメージ
Proxmox上に構築しているホームラボにはDNS環境が整っており、名前解決をすることが可能です。
BunkerWeb導入前は、権威DNSが管理しているwww.example.comのAレコードにはWebアプリを提供しているサーバのIPアドレスが記載されていましたが、BunkerWeb導入後はBunkerWebのIPアドレスを指定します。
BunkerWebにアクセスがあった時は、Webアプリにつなぐリバースプロキシの設定を入れます。
![自宅ラボ01-ページ-8.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3933d79e-a8ee-46e1-a551-db46fb5bddb1.png)

# 関連記事

[[dns-root-tld-authoritative-cache]]

https://qiita.com/ohtsuka-shota/items/d1923b00f4c72216a390

# BunkerWebでの設定
BunkerWebにログインします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1fd99ad5-3318-4f47-a294-8cc215a0fe00.png)

画面左のサービスタブを押下します。
Create new serviceを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/880e3b8e-c13b-48f7-8e1f-e75fc8506b9e.png)

Web service - Front serviceタブにて以下の設定を行います。
Server name：www.example.com
Security Mode：detect
Let's Encryptの設定は外しておきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a31628d6-3455-4867-8245-fb2937a5322b.png)

Web service - Upstream serverタブにて以下の設定を行います。
USE_REVERSE_PROXY: yes
REVERSE_PROXY_URL: /（ルートパス）を指定
REVERSE_PROXY_HOST: Apache2コンテナのIPアドレスとポートを指定
この状態で、Saveボタンを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/29aab8c0-de5b-47e1-90a9-f1731a4f2ff6.png)

www\.example.comというサービスが作成されていることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f8cb3d4a-bdb5-4626-8ca4-81f6cafc5f6b.png)

BunkerWebの名前解決も自作したDNSに向くように設定します。
BunkerWebコンテナを一度削除して、DNSの設定を含んだ状態で起動させます。
```
root@bunker-web:~# docker stop bunkerweb-aio
root@bunker-web:~# docker rm bunkerweb-aio
root@bunker-web:~# docker run -d --name bunkerweb-aio --dns 192.168.0.53 -v bw-storage:/data -p 80:8080/tcp -p 443:8443/tcp -p 443:8443/udp --restart always bunkerity/bunkerweb-all-in-one:1.6.9
2171d2485359d5d49a8def760962d8d4df72661add97c27936949af1dca3acba
```

# DNS設定
続いてDNSの設定をしていきます。
現在権威DNSサーバにはwww.example.comは192.168.0.54とWebサーバのIPアドレスが指定されています。
このIPアドレスをBunkerWebのIPアドレスである192.168.0.45に変更します。
変更後にbindを再起動しておきます。
```
root@auth-dns:~# cd /etc/bind
root@auth-dns:/etc/bind# nano db.example.com
root@auth-dns:/etc/bind# cat db.example.com | grep -i www
www        IN  A   192.168.0.45
root@auth-dns:/etc/bind# systemctl reload bind9
```

# 動作確認
## BunkerWeb経由でアクセス出来ること確認
/etc/resolv.confを編集してDNSの向き先を自作したDNS環境に変えます。
```
root@test-Standard-PC-i440FX-PIIX-1996:/etc# cat resolv.conf 
nameserver 192.168.0.53
```

名前解決が想定通り、具体的にはBunkerWebのIPアドレスが返ってくることがわかります。
```
root@test-Standard-PC-i440FX-PIIX-1996:~# dig www.example.com

; <<>> DiG 9.18.39-0ubuntu0.24.04.3-Ubuntu <<>> www.example.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 10146
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; COOKIE: 8a0d96f3833146340100000069e446bd3df49a56616b8549 (good)
;; QUESTION SECTION:
;www.example.com.		IN	A

;; ANSWER SECTION:
www.example.com.	86400	IN	A	192.168.0.45

;; Query time: 2 msec
;; SERVER: 192.168.0.53#53(192.168.0.53) (UDP)
;; WHEN: Sun Apr 19 12:06:37 JST 2026
;; MSG SIZE  rcvd: 88
```

Webブラウジングでhttp:\//www.example.comにアクセスしてみます。
最初に念のためキャッシュをクリアしておきます。
FirefoxのプライバシーとセキュリティからCookieとサイトデータを見つけます。
ブラウジングデータを消去を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/29702b81-f6ca-4580-8e2a-036c9db1c111.png)

全ての履歴で全てにチェックを入れて、消去を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a613b56b-e57c-445b-b23f-ae4a18734418.png)

キャッシュクリア後にWebサイトにログイン試行をしたところ表示されました。
www\.example.comはBunkerWebのIPと紐づいている状態ですが、自動でWebアプリに通信を連携してますね。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/79305c01-af82-4bbd-a9f6-7dee6904c9c4.png)

## XSSを用いたDetect確認
簡単な攻撃、XSS（クロスサイトスクリプティング）を仕掛けてみます。
以下のURLを打ち込みます。。
http:\//www.example.com/?q=\<script\>alert\</script>
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d9c3e016-b2db-45e6-9656-603a2ec48ea6.png)

アクセスが出来ました。何度か打ち込んでみましょう。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a421b6fc-2d44-4c51-bf48-16ae0ebb4e8d.png)

BunkerWebのReportsからアクセスが確認できると思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f5e2e241-d096-410e-a7ea-fef3aa05285a.png)

View Detailsを見るとXSS攻撃の情報が出てくると思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ed53bb28-6846-48c4-bf92-6dbfc03903fb.png)

## Block確認
検知だけして通信をブロックしないのは、BunkerWebで設定したServiceのSecurity modeがdetectになっている為です。これをblockにします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1418ebcc-1c63-4dd1-a55b-04cb73778ace.png)

設定反映後少し待機し、改めてhttp:\//www.example.com/?q=\<script\>alert\</script>を打ち込んでみます。403エラー（≒Webサーバーがリクエストを理解したものの、権限不足や禁止設定によりアクセスを拒否した状態）になることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5eb32de5-1625-459e-b118-6229c0954c2a.png)

