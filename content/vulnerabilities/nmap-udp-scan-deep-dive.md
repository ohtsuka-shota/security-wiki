---
title: "nmap UDPスキャン徹底理解：遅い理由・open|filtered・サービス固有プローブ"
date: 2026-10-07
tags: ["vulnerability", "Nmap", "udp", "tcpdump", "Security"]
source: "[[nmap-udp-scan-deep-dive]]"
---
# TCPポートスキャンとUDPポートスキャンの違い

![gpt_image_8e18697f10f54ac894bc5b5c5b3def8a.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/076e7430-416d-478b-8a39-bb124213d059.png)

# UDPポートスキャンでポートが確実に「開いている」ことを確認するフロー
![gpt_image_a193cbdcccfd49f2aeec9adb84341a1c.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/e86cef1a-af7b-40a1-b0a2-84a61d0cdab7.png)
※Openだと確定するためには相手からの折り返しがマスト。つまり以下の記事で記載している通り、以下が揃っている状態で行うのが前提となります。
①相手のポートが開いていて通信経路があること
②ポートの先にリッスンしている相手が動いていること
③リッスンしている相手が返答を返すこと

[[portqry-udp-check]]

# ハンズオン
## 基本的なUDPスキャン
nmapコマンドで-sUオプションを付与することでUDPスキャンをすることが出来ます。TCPを対象としたスキャンと比べてもかなり時間がかかると思います。

今回の出力結果のSTATEを確認するとUDPの53,111,137,2049のポートが開いていることがわかります。
STATEがOpenになっているとそれは確実に開いているとわかっているものの様です。
一方でOpen|Filteredとなっていると、空いていない可能性もあるようです。今回はこの出力だと詳細は出ておりませんが、"43 open|filtered udp ports"と出力されている通り、43個絞り切れていないものがあるようです。
※絞り切れていないので、2回目を行うと数が増えたり減ったりするようです。現に私の環境でも2回目は0個になりました。
```
# nmap -sU 192.168.0.27        
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-06 13:45 +0900
Stats: 0:00:52 elapsed; 0 hosts completed (1 up), 1 undergoing UDP Scan
UDP Scan Timing: About 11.80% done; ETC: 13:53 (0:06:36 remaining)

中略

Stats: 0:16:19 elapsed; 0 hosts completed (1 up), 1 undergoing UDP Scan
UDP Scan Timing: About 99.99% done; ETC: 14:01 (0:00:00 remaining)
Nmap scan report for 192.168.0.27

Host is up (0.00032s latency).
Not shown: 953 closed udp ports (port-unreach), 43 open|filtered udp ports (no-response)
PORT     STATE SERVICE
53/udp   open  domain
111/udp  open  rpcbind
137/udp  open  netbios-ns
2049/udp open  nfs
MAC Address: BC:24:11:5B:51:4E (Proxmox Server Solutions GmbH)

Nmap done: 1 IP address (1 host up) scanned in 1019.63 seconds
```

UDPのスキャンにおいて時間がかかる理由は次の3つがあるようです。
① 無応答ポートのタイムアウト待ち
② ICMPレート制限（これが最大の原因）
③ 再送回数
![UDPスキャンが遅くなる3つの理由.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/09c5c3c7-6db8-4326-87b3-d0030c885197.jpeg)

## UDPスキャンのポートを指定する
-pオプションを追加することでポートを指定することが出来ます。
これであれば、UDPポートスキャンの時間を減らすことが可能です。
```
# nmap -sU -p 53,9999 192.168.0.27
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-06 17:12 +0900
Nmap scan report for 192.168.0.27
Host is up (0.00026s latency).

PORT     STATE  SERVICE
53/udp   open   domain
9999/udp closed distinct
MAC Address: BC:24:11:5B:51:4E (Proxmox Server Solutions GmbH)

Nmap done: 1 IP address (1 host up) scanned in 0.72 seconds
```

## open|filtered状態を意図的に作って観察する
フルスキャンで出た `open|filtered` は数が揺らいで畳まれてしまい、どのポートが該当するか確定できませんでした。そこで、**標的側でファイアウォールを使って「無応答」を人工的に作り**、`open|filtered` を番号つきで観察してみます。

`open|filtered` の正体は「no-response（無応答）」です。閉じているポートが `closed` になるのは OS が ICMP Port Unreachable を返すからなので、**その ICMP を遮断すれば無応答になり、`open|filtered` に変わる**はずです。

標的側で特定のUDPへの通信を破棄するようなルールを追加してみます。
今回はUDP33333へ到達した通信を破棄する設定を入れてみます。
```
root@metasploitable:~# iptables -A INPUT -p udp --dport 33333 -j DROP
root@metasploitable:~# iptables -L INPUT -n -v --line-numbers
Chain INPUT (policy ACCEPT 587K packets, 151M bytes)
num   pkts bytes target     prot opt in     out     source               destination
1        0     0 DROP       udp  --  *      *       0.0.0.0/0            0.0.0.0/0           udp dpt:33333
```

ルールを入れていない閉ポート `9999` と、DROP した `33333` を同時にスキャンします。`--reason` を付けると判定根拠が表示されます。
33333ポートがopen|filteredになっており、空いているか閉じているのか判断出来ていない状態であることがわかります。`9999` は ICMP が返るので `closed`、`33333` は ICMP が遮断されて無応答になり `open|filtered` と判定されました。REASON 列の `port-unreach` と `no-response` が、両者の判定根拠の違いをそのまま示しています。
※ DROP（破棄）だと ICMP が返らず `open|filtered`、REJECT（拒否）だと ICMP が返って `closed` になります。「無応答かどうか」で状態が分かれるのが UDP スキャンの特徴です。
```
# nmap -sU -p 9999,33333 192.168.0.27 --reason
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-07 05:18 +0900
Nmap scan report for 192.168.0.27
Host is up, received arp-response (0.00035s latency).

PORT      STATE         SERVICE  REASON
9999/udp  closed        distinct port-unreach ttl 64
33333/udp open|filtered unknown  no-response
MAC Address: BC:24:11:5B:51:4E (Proxmox Server Solutions GmbH)

Nmap done: 1 IP address (1 host up) scanned in 1.92 seconds
```

検証が終わったら、追加したルールは削除しておきます。
```
root@metasploitable:~# iptables -D INPUT -p UDP --dport 33333 -j DROP
root@metasploitable:~# iptables -L INPUT -n -v --line-numbers
Chain INPUT (policy ACCEPT 587K packets, 152M bytes)
num   pkts bytes target     prot opt in     out     source               destination
```


## UDPスキャンを受けてる側の動作を見てみる
tcpdumpコマンドでUDPスキャンの通信を確認できます。
今回は「折り返しの応答」まで見たいので、送信元・宛先どちらの通信も拾えるよう
`host`（両方向）で指定します。
```
root@metasploitable:~# tcpdump -ni eth0 'host 192.168.0.25 and (udp or icmp)'
```

上記tcpdumpを実行している状態で、Kali側で以下のコマンドを実行してUDP53,111,137,2049のポートスキャンを行ってみます。
```
# nmap -sU -p 53,111,137,2049 192.168.0.27
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-06 20:32 +0900
Nmap scan report for 192.168.0.27
Host is up (0.00045s latency).

PORT     STATE SERVICE
53/udp   open  domain
111/udp  open  rpcbind
137/udp  open  netbios-ns
2049/udp open  nfs
MAC Address: BC:24:11:5B:51:4E (Proxmox Server Solutions GmbH)

Nmap done: 1 IP address (1 host up) scanned in 0.70 seconds
```

tcpdumpの実行結果は以下です。
このキャプチャの中にUDPポートスキャン時に行われるサービス固有のスキャンが出力されています。
```
root@metasploitable:~# tcpdump -ni eth0 'host 192.168.0.25 and (udp or icmp)'
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 96 bytes
08:07:15.858408 IP 192.168.0.25.1055712202 > 192.168.0.27.2049: 40 null
08:07:15.858429 IP 192.168.0.25.0 > 192.168.0.27.2049: 40 null
08:07:15.858431 IP 192.168.0.25.43344 > 192.168.0.27.111: UDP, length 40
08:07:15.858434 IP 192.168.0.25.43344 > 192.168.0.27.111: UDP, length 40
08:07:15.858436 IP 192.168.0.25.43344 > 192.168.0.27.53: 6+ TXT CHAOS? version.bind. (30)
08:07:15.858439 IP 192.168.0.25.43344 > 192.168.0.27.53: 0 stat [0q] (12)
08:07:15.858440 IP 192.168.0.25.43344 > 192.168.0.27.53: 0 PTR? _services._dns-sd._udp.local. (46)
08:07:15.858441 IP 192.168.0.25.43344 > 192.168.0.27.137: NBT UDP PACKET(137): QUERY; REQUEST; BROADCAST
08:07:15.858444 IP 192.168.0.25.43344 > 192.168.0.27.137: NBT UDP PACKET(137): QUERY; REQUEST; UNICAST
08:07:15.858445 IP 192.168.0.25.43344 > 192.168.0.27.137: NBT UDP PACKET(137): QUERY; REQUEST; BROADCAST
08:07:15.858475 IP 192.168.0.27.2049 > 192.168.0.25.1055712202: reply ok 24 null
08:07:15.858510 IP 192.168.0.27.111 > 192.168.0.25.43344: UDP, length 32
08:07:15.858519 IP 192.168.0.27.111 > 192.168.0.25.43344: UDP, length 24
08:07:15.858573 IP 192.168.0.27.2049 > 192.168.0.25.0: reply ok 24 null
08:07:15.858748 IP 192.168.0.27.53 > 192.168.0.25.43344: 6*- 1/1/0 CHAOS TXT "9.4.2" (62)
08:07:15.858801 IP 192.168.0.27.53 > 192.168.0.25.43344: 0 stat NotImp- [0q] 0/0/0 (12)
08:07:15.858906 IP 192.168.0.25 > 192.168.0.27: ICMP 192.168.0.25 udp port 43344 unreachable, length 60
08:07:15.858909 IP 192.168.0.25 > 192.168.0.27: ICMP 192.168.0.25 udp port 43344 unreachable, length 68
08:07:15.858910 IP 192.168.0.25 > 192.168.0.27: ICMP 192.168.0.25 udp port 43344 unreachable, length 60
08:07:15.858911 IP 192.168.0.25 > 192.168.0.27: ICMP 192.168.0.25 udp port 43344 unreachable, length 60
08:07:15.858945 IP 192.168.0.27.53 > 192.168.0.25.43344: 0 0/13/0 (257)
08:07:15.859030 IP 192.168.0.25 > 192.168.0.27: ICMP 192.168.0.25 udp port 43344 unreachable, length 98
08:07:15.859032 IP 192.168.0.25 > 192.168.0.27: ICMP 192.168.0.25 udp port 43344 unreachable, length 48
08:07:15.859093 IP 192.168.0.27.137 > 192.168.0.25.43344: NBT UDP PACKET(137): QUERY; POSITIVE; RESPONSE; UNICAST
08:07:15.859192 IP 192.168.0.27.137 > 192.168.0.25.43344: NBT UDP PACKET(137): QUERY; POSITIVE; RESPONSE; UNICAST
08:07:15.859255 IP 192.168.0.27.137 > 192.168.0.25.43344: NBT UDP PACKET(137): QUERY; POSITIVE; RESPONSE; UNICAST

26 packets captured
26 packets received by filter
0 packets dropped by kernel
```

内容ごとにグルーピングした結果が以下です。
UDPは「送り付けるだけ」が基本なので、空パケットでは開いているポートも無応答になりがちです。「開いている」と確定させるには、そのサービスが返事をする"正しいパケット"（DNSクエリなど）を投げる必要があり、nmapはポート別の専用ペイロード（`nmap-payloads`）をあらかじめ持っていて、これを行っているようです。DNSに至っては version.bind の応答からBINDのバージョン（9.4.2）まで判明しています。
![udp_roundtrip_tcpdump.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d57ff7c3-76a8-428b-a058-060fb0ef6783.png)


