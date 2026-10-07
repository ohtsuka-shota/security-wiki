---
title: "SSHポートフォワーディングでWebサーバに接続してみる"
date: 2024-05-04
tags: ["tool", "SSH", "Security", "Wireshark", "tcpdump", "sshポートフォワード"]
source: "https://qiita.com/ohtsuka-shota/items/7b721154a660d2a7addf"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

今回はSSHポートフォワーディングの環境を作ってみたいと思います。

# SSHポートフォワーディングとは
ChatGPT君に聞いてみます。

><b>ワイ</b>
SSHポートフォワーディングについて1行で説明してください。メリットを教えてください
<b>ChatGPT君</b>
SSHポートフォワーディングは、ネットワークトラフィックをセキュアに転送する方法であり、メリットはリモートアクセスやセキュアな通信を可能にし、ネットワークのセキュリティを向上させることです。
<b>ワイ</b>
Webサーバの場合HTTPS接続でセキュアな通信が出来ると思いますが、そことの違いは何ですか？
<b>ChatGPT君</b>
HTTPS接続は、WebブラウザとWebサーバ間の通信を暗号化し、ウェブサイトのセキュリティを確保します。一方、SSHポートフォワーディングは、異なるコンピュータやネットワーク間の通信を暗号化して転送する方法です。HTTPSは主にウェブサイトの通信を保護しますが、SSHポートフォワーディングは通信するサービスの種類に関係なく、通信全体をセキュアにします。

# 環境イメージ
今回の環境は以下となります。Clientは自分自身に対してポート8080を指定して接続を試みると、SSHサーバに接続しに（リダイレクト？）行きます。SSHサーバはその通信を受け取るとWebサーバに対して通信を中継します。

![security01-ページ2.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4768c800-1e0b-d792-d7da-e5680c195b89.png)



以下で作った公開鍵認証環境にWebサーバを別途立ち上げて試験をしてみます。

https://qiita.com/ohtsuka-shota/items/cf4591e5a5c6427bf1bf

# 環境
## Webサーバ構築
以下のコマンドを実行してApache2をインストールします。
```
sudo su -
apt update && apt upgrade -y
apt install -y apache2
systemctl start apache2
systemctl enable apache2
```

## Clientでポートフォワーディングのコマンドを実行する
以下のコマンドを実行してSSHサーバに接続しつつ、転送するIPアドレス：ポートを指定しています。
```
ssh -L “自分のport”:”WebサーバのIPアドレス”:”Webサーバのポート” “SSHサーバのユーザ”@”SSHサーバのIPアドレス”
```
![Untitled.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f549cb62-547a-3492-7d0c-d68459527f9c.png)

この状態でClientのWebブラウザを開いて"http\://localhost:8080"と入力し、接続を試みてみるとApache2のデフォルトの画面が表示されることが分かります。
SSHサーバを経由してWebサーバに接続している感じになりますね。

![Untitled.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b207ac60-65b6-33f1-88c9-e4eff88044f0.png)

# パケットを見てみる
ClientでWiresharkをインストールしていきます。
以下のコマンドをClientで実行してインストール・環境整備をしていきます。
dpkgコマンドやusermodコマンドを実行しないと、root以外のユーザでWiresharkを使ってパケットを観測できませんので実行するようにしましょう。
```
apt install -y wireshark
exit
sudo dpkg-reconfigure wireshark-common
sudo usermod -a -G wireshark "wiresharkグループに追加したいユーザ名"
```

dpkgコマンドの後、以下の様な画面が出てきますが、はいを選択してください。
![Untitled (1).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4013787a-8e4f-525e-b65e-b1abb1fcb47a.png)

上記コマンドを実行しましたら、端末を再起動してください。
再起動後、Wiresharkのアイコンが表示されています。
![Untitled (2).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/40443a16-b67d-c548-a1f8-b0aa80cefa06.png)
IPアドレスが振られている（通信している）ens19を選択します。
![Untitled (3).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/36d206da-f138-a1f8-7cc2-331e1a50a4e4.png)

Wiresharkの条件式でip.addr == "SSHサーバのIP"アドレスと入力し、表示するパケットを絞ります。
SSHサーバに対して改めてポートフォワーディングの通信を投げると、SSH関係の通信が飛んでいることが確認出来ます。
![Untitled (4).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/37472f8f-bd89-2010-04fe-8d89a04124c2.png)

改めてlocalhost:8080で通信を試みると、EncryptedされたパケットがSSHサーバに対して送付されているのが分かります。
![Untitled (5).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/83e6a30e-c812-68f5-7c10-d5bcfdfa80d9.png)
チョットズームアップした図が以下です。
![Untitled (6).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c3503e15-5264-ede8-ddd9-19a5a59a6244.png)

また、Webサーバ上で/var/log/apache2/access.logをtail -f でリアルタイムで出力しつつ、SSHポートフォワーディングをしてみた図が以下となります
SSHサーバ経由でWebサーバに接続した際にログの出力が発生することから通信がWebサーバ側に通信が確かに来ていることが分かります。
![Untitled (7).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6874e4b0-de6b-5c37-ee65-25abba9df8a7.png)

出力されていたログの結果は以下となります。ログの先頭に192.168.2.105とあるので、SSHサーバから通信が確かに来ていることが分かります。
```
192.168.2.105 - - [04/May/2024:05:48:39 +0000] "GET / HTTP/1.1" 200 3460 "-" "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0"
192.168.2.105 - - [04/May/2024:05:48:39 +0000] "GET /icons/ubuntu-logo.png HTTP/1.1" 200 3607 "http://localhost:8080/" "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0"
192.168.2.105 - - [04/May/2024:05:48:39 +0000] "GET /favicon.ico HTTP/1.1" 404 489 "http://localhost:8080/" "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0"
```

また、以下はSSHサーバ上でWebサーバのIPアドレスに対してtcpdumpを実行したコマンドの出力結果となります。
この結果からもSSHサーバからWebサーバに対してHTTPで通信していることが分かります。
```
root@ssh-server:~# tcpdump host 192.168.2.106 -v
tcpdump: listening on ens18, link-type EN10MB (Ethernet), snapshot length 262144 bytes
06:03:27.932236 IP (tos 0x0, ttl 64, id 31932, offset 0, flags [DF], proto TCP (6), length 60)
    ssh-server.57534 > 192.168.2.106.http: Flags [S], cksum 0x8652 (incorrect -> 0x9185), seq 2718831031, win 64240, options [mss 1460,sackOK,TS val 2498825120 ecr 0,nop,wscale 7], length 0
06:03:27.932450 IP (tos 0x0, ttl 64, id 0, offset 0, flags [DF], proto TCP (6), length 60)
    192.168.2.106.http > ssh-server.57534: Flags [S.], cksum 0x8652 (incorrect -> 0xf014), seq 2891659181, ack 2718831032, win 65160, options [mss 1460,sackOK,TS val 298493940 ecr 2498825120,nop,wscale 7], length 0
06:03:27.932479 IP (tos 0x0, ttl 64, id 31933, offset 0, flags [DF], proto TCP (6), length 52)
    ssh-server.57534 > 192.168.2.106.http: Flags [.], cksum 0x864a (incorrect -> 0x1b74), ack 1, win 502, options [nop,nop,TS val 2498825120 ecr 298493940], length 0
06:03:33.193924 IP (tos 0x0, ttl 64, id 31934, offset 0, flags [DF], proto TCP (6), length 52)
    ssh-server.57534 > 192.168.2.106.http: Flags [F.], cksum 0x864a (incorrect -> 0x06e5), seq 1, ack 1, win 502, options [nop,nop,TS val 2498830382 ecr 298493940], length 0
06:03:33.194480 IP (tos 0x0, ttl 64, id 34310, offset 0, flags [DF], proto TCP (6), length 52)
    192.168.2.106.http > ssh-server.57534: Flags [F.], cksum 0x864a (incorrect -> 0xf24d), seq 1, ack 2, win 510, options [nop,nop,TS val 298499202 ecr 2498830382], length 0
06:03:33.194509 IP (tos 0x0, ttl 64, id 31935, offset 0, flags [DF], proto TCP (6), length 52)
    ssh-server.57534 > 192.168.2.106.http: Flags [.], cksum 0x864a (incorrect -> 0xf255), ack 2, win 502, options [nop,nop,TS val 2498830382 ecr 298499202], length 0
```

