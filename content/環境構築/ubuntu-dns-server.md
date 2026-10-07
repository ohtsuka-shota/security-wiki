---
title: "ubuntu22.04にDNSサーバを構築する"
date: 2024-05-29
tags: ["tool", "Ubuntu", "dns", "bind"]
source: "https://qiita.com/ohtsuka-shota/items/1456eb891f6ac4164987"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

LPIC303 Securityの勉強をするにあたり環境構築を色々試みている今日この頃。
DNSSECもそうですが、他のサーバを作るにあたりDNS環境が必要そうであったためざっくり構築しました。

# 構築
## 必要なもののインストール
bind9をインストールしていきます。
```
root@ohtsuka-dns01:~# apt update && apt upgrade -y
root@ohtsuka-dns01:~# apt -y install bind9 bind9utils
```

## 設定ファイルを編集する
### named.conf
named.confはBIND (Berkeley Internet Name Domain) DNSサーバーの主要な設定ファイルで、その動作を制御するための設定を記載します。具体的にはBINDサーバーの動作、ゾーンファイルの位置、アクセス制御などを設定します。
include "/etc/bind/named.conf.internal-zones"と追記することでnamed.conf.internal-zonesファイルを読み込むように設定しています。
```
root@ohtsuka-dns01:~# cp -p /etc/bind/named.conf /etc/bind/named.conf.org
root@ohtsuka-dns01:~# vi /etc/bind/named.conf
root@ohtsuka-dns01:~# diff /etc/bind/named.conf /etc/bind/named.conf.org
12,13d11
<
< include "/etc/bind/named.conf.internal-zones";
```

### named.conf.internal-zones
名前解決したいドメイン（ゾーン）とその時に使用するファイルを設定しています。
example.comというドメインの名前解決をするときは/etc/bind/example.comを参照し、逆引きに/etc/bind/2.168.192.dbを使用するという設定になります。
```
root@ohtsuka-dns01:~# ls -ltr /etc/bind/named.conf.internal-zones
ls: cannot access '/etc/bind/named.conf.internal-zones': No such file or directory
root@ohtsuka-dns01:~# vi /etc/bind/named.conf.internal-zones
root@ohtsuka-dns01:~# cat /etc/bind/named.conf.internal-zones
zone "example.com" IN {
        type master;
        file "/etc/bind/example.com";
        allow-update { none; };
};
zone "2.168.192.in-addr.arpa" IN {
        type master;
        file "/etc/bind/2.168.192.db";
        allow-update { none; };
};
```

### named.conf.options
- acl internal-network
- allow-query { localhost; internal-network; };
    - これらの設定があることでクエリを受け付ける対象を制限しています。具体的には自分自身と192.168.2.0/24のネットワークに属するものだけからクエリを受け付けます。
- dnssec-validation auto;
    - DNSSEC（DNS Security Extensions）を有効にし、DNS応答の検証を自動的に行います。これは今後使っていこうかなと・・・
- forwarders { 8.8.8.8; 8.8.4.4; };
- recursion yes;
    - Google Public DNSのIPアドレスを指定しています。BINDは自身のゾーンに存在しないクエリをこれらのフォワーダーに転送します。

```
root@ohtsuka-dns01:~# cp -p /etc/bind/named.conf.options /etc/bind/named.conf.options.org
root@ohtsuka-dns01:~# vi /etc/bind/named.conf.options
root@ohtsuka-dns01:~# cat /etc/bind/named.conf.options
acl internal-network {
        192.168.2.0/24;
};

options {
        directory "/var/cache/bind";

        // If there is a firewall between you and nameservers you want
        // to talk to, you may need to fix the firewall to allow multiple
        // ports to talk.  See http://www.kb.cert.org/vuls/id/800113

        // If your ISP provided one or more IP addresses for stable
        // nameservers, you probably want to use them as forwarders.
        // Uncomment the following block, and insert the addresses replacing
        // the all-0's placeholder.

        // forwarders {
        //      0.0.0.0;
        // };

        //========================================================================
        // If BIND logs error messages about the root key being expired,
        // you will need to update your keys.  See https://www.isc.org/bind-keys
        //========================================================================
        dnssec-validation auto;

        listen-on-v6 { any; };

        allow-query { localhost; internal-network; };
        forwarders {
            8.8.8.8;  // Google Public DNS
            8.8.4.4;  // Google Public DNS
        };
        
        allow-transfer { localhost; };
        recursion yes;

};
```

### example.com(ゾーンファイル)
```
root@ohtsuka-dns01:~# vi /etc/bind/example.com
root@ohtsuka-dns01:~# cat /etc/bind/example.com
$TTL 86400
@   IN  SOA     example.com. admin.example.com. (
        2024052801  ;Serial
        3600        ;Refresh
        1800        ;Retry
        604800      ;Expire
        86400       ;Minimum TTL
)

        IN  NS      ohtsuka-dns01.example.com.
        IN  A       192.168.2.22

; ホスト名に関連付ける IP アドレス（Aレコード）を定義
ohtsuka-ubuntu-desktop IN  A 192.168.2.104
ohtsuka-ssh-server     IN  A 192.168.2.105
ohtsuka-web-server     IN  A 192.168.2.106
ca-server              IN  A 192.168.2.190
ohtsuka-snort          IN  A 192.168.2.191
ohtsuka-openvas        IN  A 192.168.2.20
ohtsuka-selinux        IN  A 192.168.2.195
ohtsuka-dns01          IN  A 192.168.2.22

; 別名（CNAMEレコード）を定義
desktop  IN  CNAME  ohtsuka-ubuntu-desktop.example.com.
ssh      IN  CNAME  ohtsuka-ssh-server.example.com.
web      IN  CNAME  ohtsuka-web-server.example.com.
ca       IN  CNAME  ca-server.example.com.
snort    IN  CNAME  ohtsuka-snort.example.com.
openvas  IN  CNAME  ohtsuka-openvas.example.com.
selinux  IN  CNAME  ohtsuka-selinux.example.com.
dns      IN  CNAME  ohtsuka-dns01.example.com.
```

### 2.168.192.db（逆引きゾーンファイル）
```
root@ohtsuka-dns01:~# vi /etc/bind/2.168.192.db
root@ohtsuka-dns01:~# cat /etc/bind/2.168.192.db
$TTL 86400
@   IN  SOA     example.com. admin.example.com. (
        2022042601  ;Serial
        3600        ;Refresh
        1800        ;Retry
        604800      ;Expire
        86400       ;Minimum TTL
)
        ; ネームサーバーを定義
        IN  NS      ohtsuka-dns01.example.com.

; IP アドレスに関連付けるホスト名を定義
104.2.168.192.in-addr.arpa.      IN  PTR     ohtsuka-ubuntu-desktop.example.com.
105.2.168.192.in-addr.arpa.      IN  PTR     ohtsuka-ssh-server.example.com.
106.2.168.192.in-addr.arpa.      IN  PTR     ohtsuka-web-server.example.com.
190.2.168.192.in-addr.arpa.      IN  PTR     ca-server.example.com.
191.2.168.192.in-addr.arpa.      IN  PTR     ohtsuka-snort.example.com.
20.2.168.192.in-addr.arpa.       IN  PTR     ohtsuka-openvas.example.com.
195.2.168.192.in-addr.arpa.      IN  PTR     ohtsuka-selinux.example.com.
22.2.168.192.in-addr.arpa.       IN  PTR     ohtsuka-dns01.example.com.
```

## 名前解決できるか試験
namedを起動したり、自動起動を有効化します。
```
root@ohtsuka-dns01:~# systemctl start named
root@ohtsuka-dns01:~# systemctl enable named
Synchronizing state of named.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install enable named
root@ohtsuka-dns01:~# systemctl status named
● named.service - BIND Domain Name Server
     Loaded: loaded (/lib/systemd/system/named.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2024-05-27 21:31:55 UTC; 45min ago
       Docs: man:named(8)
   Main PID: 18517 (named)
      Tasks: 14 (limit: 4558)
     Memory: 8.6M
        CPU: 232ms
     CGroup: /system.slice/named.service
             mq18517 /usr/sbin/named -u bind

May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './DNSKEY/IN': 2001:7fd::1#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './NS/IN': 2001:7fd::1#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './DNSKEY/IN': 2801:1b8:10::b#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './NS/IN': 2801:1b8:10::b#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './DNSKEY/IN': 2001:7fe::53#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './NS/IN': 2001:7fe::53#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './DNSKEY/IN': 2001:500:12::d0d#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: network unreachable resolving './NS/IN': 2001:500:12::d0d#53
May 27 21:31:55 ohtsuka-dns01 named[18517]: managed-keys-zone: Initializing automatic trust anchor management for zone '.'; DNSKEY ID 20326 is now trusted, >
May 27 21:31:55 ohtsuka-dns01 named[18517]: resolver priming query complete: success
```

問い合わせ先のDNSを変更します。
```
root@ohtsuka-dns01:~# cat /etc/netplan/00-installer-config.yaml
# This is the network config written by 'subiquity'
network:
  ethernets:
    ens18:
      addresses:
      - 192.168.2.22/24
      gateway4: 192.168.2.254
      nameservers:
        addresses:
        - 192.168.2.22　★構築したDNSに修正
        search: []
  version: 2
root@ohtsuka-dns01:~# netplan apply

** (generate:18923): WARNING **: 22:30:30.217: Permissions for /etc/netplan/00-installer-config.yaml are too open. Netplan configuration should NOT be accessible by others.
** (generate:18923): WARNING **: 22:30:30.217: `gateway4` has been deprecated, use default routes instead.
See the 'Default routes' section of the documentation for more details.
WARNING:root:Cannot call Open vSwitch: ovsdb-server.service is not running.
** (process:18921): WARNING **: 22:30:30.611: Permissions for /etc/netplan/00-installer-config.yaml are too open. Netplan configuration should NOT be accessible by others.
** (process:18921): WARNING **: 22:30:30.611: `gateway4` has been deprecated, use default routes instead.
See the 'Default routes' section of the documentation for more details.
** (process:18921): WARNING **: 22:30:30.806: Permissions for /etc/netplan/00-installer-config.yaml are too open. Netplan configuration should NOT be accessible by others.
** (process:18921): WARNING **: 22:30:30.806: `gateway4` has been deprecated, use default routes instead.
See the 'Default routes' section of the documentation for more details.
** (process:18921): WARNING **: 22:30:30.806: Permissions for /etc/netplan/00-installer-config.yaml are too open. Netplan configuration should NOT be accessible by others.
** (process:18921): WARNING **: 22:30:30.807: `gateway4` has been deprecated, use default routes instead.
See the 'Default routes' section of the documentation for more details.
```

digコマンドやpingコマンドで名前解決が出来るか確認します。今回はohtsuka-web-serverを確認してみます。AレコードとCNAMEレコードを参照して名前解決できていることがわかりました。
```
root@ohtsuka-dns01:~# dig ohtsuka-web-server.example.com

; <<>> DiG 9.18.18-0ubuntu0.22.04.2-Ubuntu <<>> ohtsuka-web-server.example.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 15283
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 65494
;; QUESTION SECTION:
;ohtsuka-web-server.example.com.        IN      A

;; ANSWER SECTION:
ohtsuka-web-server.example.com. 86400 IN A      192.168.2.106

;; Query time: 0 msec
;; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)
;; WHEN: Mon May 27 22:37:04 UTC 2024
;; MSG SIZE  rcvd: 75

root@ohtsuka-dns01:~# ping web.example.com
PING ohtsuka-web-server.example.com (192.168.2.106) 56(84) bytes of data.
64 bytes from ohtsuka-web-server.example.com (192.168.2.106): icmp_seq=1 ttl=64 time=0.202 ms
64 bytes from ohtsuka-web-server.example.com (192.168.2.106): icmp_seq=2 ttl=64 time=0.234 ms
64 bytes from ohtsuka-web-server.example.com (192.168.2.106): icmp_seq=3 ttl=64 time=0.270 ms
64 bytes from ohtsuka-web-server.example.com (192.168.2.106): icmp_seq=4 ttl=64 time=0.288 ms
64 bytes from ohtsuka-web-server.example.com (192.168.2.106): icmp_seq=5 ttl=64 time=0.374 ms
^C
--- ohtsuka-web-server.example.com ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4086ms
rtt min/avg/max/mdev = 0.202/0.273/0.374/0.058 ms
```

