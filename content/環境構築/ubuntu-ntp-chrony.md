---
title: "ubuntu22.04にNTP(chrony)環境を作るよ"
date: 2024-05-31
tags: ["tool", "Ubuntu", "ntp", "chrony"]
source: "https://qiita.com/ohtsuka-shota/items/11f5100f7dcb52b9996d"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

前回LPIC303対策の環境構築の一環で名前解決をするための環境を整えましたが、どうも時刻同期も必要そうでしたので、chronyを使って整えていきたいと思います。

[[ubuntu-dns-server]]

# 構築
## chronyサーバ側

とりあえずのおまじないをします。
その後chronyをインストールします。
```
root@ohtsuka-ntp:~# apt update && apt upgrade -y
root@ohtsuka-ntp:~# apt install -y chrony
```

自動起動を有効化し、ステータスがactiveであることを確認します。
```
root@ohtsuka-ntp:~# systemctl enable chrony
Synchronizing state of chrony.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install enable chrony
root@ohtsuka-ntp:~# systemctl status chrony
● chrony.service - chrony, an NTP client/server
     Loaded: loaded (/lib/systemd/system/chrony.service; enabled; vendor preset>
     Active: active (running) since Thu 2024-05-30 22:15:23 UTC; 27s ago
```

chronyのconfigを弄ります。
バックアップファイルを取得して変更をかけていきます。
日本時間を参照にしたいので既存の参照先をコメントアウトしてntp.nict.jpを設定していきます。
細かい解説はChatGPTにお願いします。それではどうぞ。
>ChatGPTより
>- pool: このキーワードは、指定されたドメイン名がNTPプールサーバのグループであることを示します。プールサーバは、ロードバランシングと高可用性を提供するために使用され、複数のNTPサーバが登録されています。
>- ntp.nict.jp: これは、日本の国立情報通信研究機構（NICT）が提供するNTPプールサーバのドメイン名です。このプールには、複数のNTPサーバが含まれており、クライアントはこれらのサーバからランダムに選ばれたサーバに接続します。
>- iburst:
このオプションは、NTPクライアントがサーバに初めて接続する際に、迅速に時刻を同期するためのオプションです。iburstオプションを使用すると、通常よりも速い間隔で最大8回まで時刻リクエストを送信し、迅速に初期同期を行います。これにより、通常よりも早く時刻同期が確立されます。

allow 192.168.2.0/24に関してはこのchronyサーバが時刻同期を受け付けるクライアントのネットワークのアドレスレンジを指定しています。
```
root@ohtsuka-ntp:~# cp -p /etc/chrony/chrony.conf /etc/chrony/chrony.conf.org
root@ohtsuka-ntp:~# vi /etc/chrony/chrony.conf
root@ohtsuka-ntp:~# diff /etc/chrony/chrony.conf /etc/chrony/chrony.conf.org
20,25c20,23
< #pool ntp.ubuntu.com        iburst maxsources 4
< #pool 0.ubuntu.pool.ntp.org iburst maxsources 1
< #pool 1.ubuntu.pool.ntp.org iburst maxsources 1
< #pool 2.ubuntu.pool.ntp.org iburst maxsources 2
< pool ntp.nict.jp iburst
< allow 192.168.2.0/24
---
> pool ntp.ubuntu.com        iburst maxsources 4
> pool 0.ubuntu.pool.ntp.org iburst maxsources 1
> pool 1.ubuntu.pool.ntp.org iburst maxsources 1
> pool 2.ubuntu.pool.ntp.org iburst maxsources 2
```
chronyを再起動し、状態を確認します。
chronyc sources -vのコマンド結果からntp-b2.nict.go.jpを参照して時刻同期をしているようです。
またこのコマンドでサーバが4つ表示されていますが、これがpoolの様です。
```
root@ohtsuka-ntp:~# systemctl restart chrony
root@ohtsuka-ntp:~# systemctl status chrony
● chrony.service - chrony, an NTP client/server
     Loaded: loaded (/lib/systemd/system/chrony.service; enabled; vendor preset>
     Active: active (running) since Thu 2024-05-30 22:20:05 UTC; 6s ago

root@ohtsuka-ntp:~# chronyc tracking
Reference ID    : 85F3EEA3 (ntp-b2.nict.go.jp)
Stratum         : 2
Ref time (UTC)  : Thu May 30 22:20:11 2024
System time     : 0.000000365 seconds fast of NTP time
Last offset     : -0.000855490 seconds
RMS offset      : 0.000855490 seconds
Frequency       : 6.601 ppm slow
Residual freq   : +25.670 ppm
Skew            : 8.007 ppm
Root delay      : 0.006027476 seconds
Root dispersion : 0.001410064 seconds
Update interval : 1.4 seconds
Leap status     : Normal
root@ohtsuka-ntp:~# chronyc sources -v

  .-- Source mode  '^' = server, '=' = peer, '#' = local clock.
 / .- Source state '*' = current best, '+' = combined, '-' = not combined,
| /             'x' = may be in error, '~' = too variable, '?' = unusable.
||                                                 .- xxxx [ yyyy ] +/- zzzz
||      Reachability register (octal) -.           |  xxxx = adjusted offset,
||      Log2(Polling interval) --.      |          |  yyyy = measured offset,
||                                \     |          |  zzzz = estimated error.
||                                 |    |           \
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^- ntp-k1.nict.jp                1   6    17    53   +448us[ +448us] +/- 7063us
^* ntp-b2.nict.go.jp             1   6    17    53    +86us[ -770us] +/- 3027us
^- ntp-b3.nict.go.jp             1   6    17    53  +1262us[+1262us] +/- 3012us
^- ntp-a2.nict.go.jp             1   6    17    53  -1731us[-1731us] +/- 4506us
```

dateコマンドを実施するとUTC表記になっておりますので最後にこれを修正します。
timedatectl set-timezone Asia/Tokyoとコマンド投入することでUTCからTokyoの時刻を表記してくれます。reboot等を走らせても問題ありません。
```
test@ohtsuka-ntp:~$ date
Thu May 30 11:01:31 PM UTC 2024
test@ohtsuka-ntp:~$ timedatectl
               Local time: Thu 2024-05-30 23:02:28 UTC
           Universal time: Thu 2024-05-30 23:02:28 UTC
                 RTC time: Thu 2024-05-30 23:02:28
                Time zone: Etc/UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
          
test@ohtsuka-ntp:~$ timedatectl set-timezone Asia/Tokyo
==== AUTHENTICATING FOR org.freedesktop.timedate1.set-timezone ===
Authentication is required to set the system timezone.
Authenticating as: test
Password:
==== AUTHENTICATION COMPLETE ===
test@ohtsuka-ntp:~$ timedatectl
               Local time: Fri 2024-05-31 08:02:50 JST
           Universal time: Thu 2024-05-30 23:02:50 UTC
                 RTC time: Thu 2024-05-30 23:02:50
                Time zone: Asia/Tokyo (JST, +0900)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
test@ohtsuka-ntp:~$ date
Fri May 31 08:02:53 AM JST 2024
```

## chronyクライアント側
サーバ側と同じでおまじないをかけてchronyをインストールします。
```
root@ohtsuka-kerberos01:~# apt update && apt upgrade -y
root@ohtsuka-kerberos01:~# apt install -y chrony
```

chronyのconfigを弄っていきます。
デフォルトで設定されているpoolをコメントアウトして参照先から外して、一方で先ほど作成したchronyサーバを参照先に設定しています。
"ntp.example.com"と記載していますが、名前解決が出来ない環境なのであればここはchronyサーバのIPアドレスを指定します。
```
root@ohtsuka-kerberos01:~# cp -p /etc/chrony/chrony.conf /etc/chrony/chrony.conf.org
root@ohtsuka-kerberos01:~# vi /etc/chrony/chrony.conf
root@ohtsuka-kerberos01:~# diff /etc/chrony/chrony.conf /etc/chrony/chrony.conf.org
20,24c20,23
< #pool ntp.ubuntu.com        iburst maxsources 4
< #pool 0.ubuntu.pool.ntp.org iburst maxsources 1
< #pool 1.ubuntu.pool.ntp.org iburst maxsources 1
< #pool 2.ubuntu.pool.ntp.org iburst maxsources 2
< server ntp.example.com iburst
---
> pool ntp.ubuntu.com        iburst maxsources 4
> pool 0.ubuntu.pool.ntp.org iburst maxsources 1
> pool 1.ubuntu.pool.ntp.org iburst maxsources 1
> pool 2.ubuntu.pool.ntp.org iburst maxsources 2
```

chronyを再起動したり自動起動を有効化します。
```
root@ohtsuka-kerberos01:~# systemctl restart chrony
root@ohtsuka-kerberos01:~# systemctl enable chrony
Synchronizing state of chrony.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install enable chrony
root@ohtsuka-kerberos01:~# systemctl status chrony
● chrony.service - chrony, an NTP client/server
     Loaded: loaded (/lib/systemd/system/chrony.service; enabled; vendor preset>
     Active: active (running) since Thu 2024-05-30 22:52:46 UTC; 48s ago
```

こちらも時刻表気がUTCになっていますので、Tokyoに修正します。
```
root@ohtsuka-kerberos01:~# timedatectl
               Local time: Thu 2024-05-30 23:03:46 UTC
           Universal time: Thu 2024-05-30 23:03:46 UTC
                 RTC time: Thu 2024-05-30 23:03:46
                Time zone: Etc/UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
root@ohtsuka-kerberos01:~# timedatectl set-timezone Asia/Tokyo
root@ohtsuka-kerberos01:~# date
Fri May 31 08:03:59 AM JST 2024
```

chronyで時刻同期できているかを確認します。
chronyc sources -vの出力結果を見ますとchronyサーバと時刻同期をしていることを示す"^* ohtsuka-ntp.example.com       2   6    37    25   -240ns[-7002ns] +/- 2633us"の表記があります。
dateコマンドの実行結果も問題なさそうですね。
```
root@ohtsuka-kerberos01:~# chronyc tracking
Reference ID    : C0A80218 (ohtsuka-ntp.example.com)
Stratum         : 3
Ref time (UTC)  : Thu May 30 22:53:55 2024
System time     : 0.000006367 seconds slow of NTP time
Last offset     : -0.000006762 seconds
RMS offset      : 0.000006762 seconds
Frequency       : 4.481 ppm slow
Residual freq   : -0.025 ppm
Skew            : 2.576 ppm
Root delay      : 0.004624658 seconds
Root dispersion : 0.000372544 seconds
Update interval : 64.2 seconds
Leap status     : Normal
root@ohtsuka-kerberos01:~# chronyc sources -v

  .-- Source mode  '^' = server, '=' = peer, '#' = local clock.
 / .- Source state '*' = current best, '+' = combined, '-' = not combined,
| /             'x' = may be in error, '~' = too variable, '?' = unusable.
||                                                 .- xxxx [ yyyy ] +/- zzzz
||      Reachability register (octal) -.           |  xxxx = adjusted offset,
||      Log2(Polling interval) --.      |          |  yyyy = measured offset,
||                                \     |          |  zzzz = estimated error.
||                                 |    |           \
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* ohtsuka-ntp.example.com       2   6    37    25   -240ns[-7002ns] +/- 2633us

root@ohtsuka-kerberos01:~# date
Fri May 31 08:06:27 AM JST 2024
```

