---
title: "Snortを使ってやっつけレベルのIDS環境を作る"
date: 2024-05-26
tags: ["tool", "Ubuntu", "Security", "snort", "IPS", "IDS"]
source: "https://qiita.com/ohtsuka-shota/items/fade1d9cd7b3f3b6a4a7"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

LPIC303 Securityの受験に際し、セキュリティの勉強をしています。
その中でIDS(IPS)システムのSnortと呼ばれるものが試験範囲に含まれています。
今回は雑ですが、Snort環境を作っていってlogに出ているなぁ的なことを確認していって感覚を掴んでいこうと思います。

# Snortとは？

公式から引用します。
※公式サイトの文章を日本語に翻訳しています。

> Snort は、世界最先端のオープン ソース侵入防止システム (IPS) です。Snort IPS は、悪意のあるネットワーク アクティビティを定義するのに役立つ一連のルールを使用し、それらのルールを使用して一致するパケットを検出し、ユーザーに警告を生成します。
>
>Snort は、これらのパケットを停止するためにインラインで展開することもできます。Snort には、tcpdump のようなパケット スニファーとして、ネットワーク トラフィックのデバッグに役立つパケット ロガーとして、または本格的なネットワーク侵入防止システムとして使用できるという 3 つの主な用途があります。Snort は、個人用にもビジネス用にもダウンロードして構成できます。

https://www.snort.org/

# 環境イメージ
簡単な環境ですが、以下となります。2台ともubuntu22.04です。
以前構築した認証局サーバにSnortをインストールします。その後local.rulesにssh接続を検知するような設定を行います。
別のubuntuサーバ（GUI環境のもの）からSnortに対してssh接続を実行。ログが出力されるかを確認してきたいと思います。
※本当であればもう少しそれっぽい環境を作るべきなのでしょうが、LPIC303でそこまで深い設定内容を求められることもないだろうという事で・・・本当ならDMZとかを作って…的なことをした方が良いんでしょうがそこまでやるよりは他のLPIC303関連のものを広く浅く触りたいので・・・
　必要に応じて拡張を考えます。
![security01-ページ3.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/273c30f2-375c-2f21-3904-23279e895e3b.png)

# 構築
## 環境構築
apt updateとapt upgradeを実行した後にapt install -y snortを実行するだけでインストールすることが出来ます。簡単ですね。
```
root@ca-server:~# apt update && apt upgrade -y
root@ca-server:~# apt install -y snort
```

但し、installを実行しようとすると以下のような設定を求められます。監視したいネットワークを指定すればいいと思います。デフォルトでは192.168.0.0/16と記載がありました。
今回はSnortを作るネットワークである192.168.2.0/24と変更しています。
![snort01.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b83266ed-3e4e-6674-07dd-dcf571d67e16.png)
![snort02.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8007e59c-b69c-8bb9-1be3-ad7bc23240e1.png)
私の環境だけだとは思いますが、以下のような出力がされました。
カーネルのバージョンが若干古いようです。対応しなくても大丈夫そうですが、対応しておきます。
![snort03.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5c0a89dd-2884-66d7-7eb4-9101c272f9ea.png)
現在のカーネルバージョンを確認してrebootを実施する
```
root@ca-server:~# uname -r
5.15.0-105-generic
root@ca-server:~# reboot
```
再起動後カーネルバージョンが上がっていることを確認します。
```
root@ca-server:~# uname -r
5.15.0-107-generic
```
このあとsnortコマンドが有効になっていることを確認します。
ブタが出てくれば問題ありません。併せてsystemctl status snortでsnortが稼働していることを確認します。
```
root@ca-server:~# snort --version

   ,,_     -*> Snort! <*-
  o"  )~   Version 2.9.15.1 GRE (Build 15125)
   ''''    By Martin Roesch & The Snort Team: http://www.snort.org/contact#team
           Copyright (C) 2014-2019 Cisco and/or its affiliates. All rights reserved.
           Copyright (C) 1998-2013 Sourcefire, Inc., et al.
           Using libpcap version 1.10.1 (with TPACKET_V3)
           Using PCRE version: 8.39 2016-06-14
           Using ZLIB version: 1.2.11
           
root@ca-server:/etc/snort/rules# systemctl status snort
● snort.service - LSB: Lightweight network intrusion detection system
     Loaded: loaded (/etc/init.d/snort; generated)
     Active: active (running) since Sun 2024-05-26 00:23:59 UTC; 9min ago
       Docs: man:systemd-sysv-generator(8)
    Process: 676 ExecStart=/etc/init.d/snort start (code=exited, status=0/SUCCESS)
      Tasks: 2 (limit: 4557)
     Memory: 84.8M
        CPU: 680ms
     CGroup: /system.slice/snort.service
             mq775 /usr/sbin/snort -m 027 -D -d -l /var/log/snort -u snort -g snort --pid-path /run/snort/ -c /etc/snort/snort.conf -S "\"HOME_NET=[192.168.>

May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_FTPTELNET  Version 1.2  <Build 13>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: appid  Version 1.1  <Build 5>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_REPUTATION  Version 1.1  <Build 1>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_SSLPP  Version 1.1  <Build 4>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_IMAP  Version 1.0  <Build 1>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_POP  Version 1.0  <Build 1>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_DCERPC2  Version 1.0  <Build 3>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_GTP  Version 1.1  <Build 1>
May 26 00:23:59 ca-server snort[775]:            Preprocessor Object: SF_SSH  Version 1.1  <Build 3>
May 26 00:23:59 ca-server snort[775]: Commencing packet processing (pid=775)
lines 1-21/21 (END) 
```

## 環境確認とrulesの追記
設定ファイルは/etc/snort/配下にある様子。
確認してみます。rulesディレクトリの中に細かいruleが設定されているように見えます。
```
root@ca-server:~# cd /etc/snort
root@ca-server:/etc/snort# ls -R
.:
attribute_table.dtd    community-sid-msg.map  gen-msg.map       rules       snort.debian.conf  unicode.map
classification.config  file_magic.conf        reference.config  snort.conf  threshold.conf

./rules:
attack-responses.rules         community-mail-client.rules    community-web-iis.rules   imap.rules        pop3.rules         web-cgi.rules
backdoor.rules                 community-misc.rules           community-web-misc.rules  info.rules        porn.rules         web-client.rules
bad-traffic.rules              community-nntp.rules           community-web-php.rules   local.rules       rpc.rules          web-coldfusion.rules
chat.rules                     community-oracle.rules         ddos.rules                misc.rules        rservices.rules    web-frontpage.rules
community-bot.rules            community-policy.rules         deleted.rules             multimedia.rules  scan.rules         web-iis.rules
community-deleted.rules        community-sip.rules            dns.rules                 mysql.rules       shellcode.rules    web-misc.rules
community-dos.rules            community-smtp.rules           dos.rules                 netbios.rules     smtp.rules         web-php.rules
community-exploit.rules        community-sql-injection.rules  experimental.rules        nntp.rules        snmp.rules         x11.rules
community-ftp.rules            community-virus.rules          exploit.rules             oracle.rules      sql.rules
community-game.rules           community-web-attacks.rules    finger.rules              other-ids.rules   telnet.rules
community-icmp.rules           community-web-cgi.rules        ftp.rules                 p2p.rules         tftp.rules
community-imap.rules           community-web-client.rules     icmp-info.rules           policy.rules      virus.rules
community-inappropriate.rules  community-web-dos.rules        icmp.rules                pop2.rules        web-attacks.rules
```
snort関連のログは/var/log/snort/配下にある様子。catコマンドで中身を確認しようとしても文字化けを発生させてしまうので、別のコマンドを使って中身を確認していきたいと思います。これは後程。
```
root@ca-server:~# cd /var/log/snort/
root@ca-server:/var/log/snort# ls
snort.alert  snort.alert.fast  snort.log
```
ubuntuのdesktopから認証局サーバにsshしようとしたときにalertを出力させてみます。
rules配下にあるlocal.rulesに設定を追加していきます。
ruleを追加した後、Snortに読み込ませるためrestartをかけます。
```
root@ca-server:~# cd /etc/snort/rules/
root@ca-server:/etc/snort/rules# vi local.rules
root@ca-server:/etc/snort/rules# cat local.rules
# $Id: local.rules,v 1.11 2004/07/23 20:15:44 bmc Exp $
# ----------------
# LOCAL RULES
# ----------------
# This file intentionally does not come with signatures.  Put your local
# additions here.
alert tcp 192.168.2.104 any -> 192.168.2.0/24 22 (msg:"SSH connection from ubuntu desktop"; sid:1000002; rev:1;)
root@ca-server:/etc/snort/rules# systemctl restart snort
```
ruleの書き方ですが以下の様です。
alert tcp 192.168.2.104 any -> 192.168.2.0/24 22 (msg:"SSH connection from ubuntu desktop"; sid:1000002; rev:1;)
- alert tcp：tcpを監視し条件に合致した場合はalertを発生させます
- 192.168.2.104：送信元のIPアドレスを示します。今回はこのIPアドレスです
- any：送信元ポートを示します。今回は全部のポートを監視します
- 192.168.2.0/24 22：送信先のIPアドレス（ネットワーク）と送信先のポートを示します。今回はSnortが設置されているネットワーク帯でポート番号は22、つまりSSHを監視します。
- msg:"SSH connection from ubuntu desktop"：アラートメッセージとして "SSH connection from ubuntu desktop" を表示します。
- sid:1000002：このルールの一意の識別子（SID）です。SnortルールでSIDは一意である必要があるようです。
- rev:1：このルールのリビジョン番号です。ルールが更新されるたびにリビジョン番号を増やすことで、変更履歴を管理できるようです。

## テスト
テストを行います。ubuntu desktop環境でterminalを開いて以下のコマンドを実行。
CAサーバにssh接続を行います。ssh出来ていることを確認しましょう。
![snort4.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/125488d8-e38e-2dc5-f70c-38424228f869.png)
Snortサーバでsnort.alertを確認します。
sig idがlocal.rulesで定義したものと同じであることや、IPアドレス的に想定通りかなと思います。
前述の通り、catコマンドだと文字化けで中身を見れませんのでu2spewfooというコマンドで読み込みます。Snortをインストールした際に一緒にインストールしています。
```
root@ca-server:~# cd /var/log/snort/
root@ca-server:/var/log/snort# u2spewfoo snort.alert

中略

(Event)
        sensor id: 0    event id: 42    event second: 1716688977        event microsecond: 788900
        sig id: 1000002 gen id: 1       revision: 1      classification: 0
        priority: 0     ip source: 192.168.2.104        ip destination: 192.168.2.190
        src port: 52020 dest port: 22   protocol: 6     impact_flag: 0  blocked: 0
```

## ちなみに
local.rulesというファイルを読み込ませるためには/etc/snort/snort.confファイルにて以下の記載がないといけないようです。
```
root@ca-server:/etc/snort# cat -n snort.conf | grep -i local
   590  include $RULE_PATH/local.rules
```

