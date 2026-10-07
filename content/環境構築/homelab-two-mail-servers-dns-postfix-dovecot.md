---
title: "ホームラボで2台のメールサーバ間送受信環境を構築 - 自作DNS + Postfix + Dovecot + Thunderbird"
date: 2026-09-20
tags: ["tool", "dns", "mDNS", "postfix", "dovecot", "thunderbird"]
source: "https://qiita.com/ohtsuka-shota/items/b977a3acb56ad587f264"
---
# はじめに
私はホームラボ上に以下の記事のようにメールサーバを2台構築していたり、ホームラボ用のDNS環境を用意しております。

以前公開した記事：

[[postfix-dovecot-mail-server]]

[[dns-root-tld-authoritative-cache]]

本記事では、これらの環境を統合し、**独自ドメイン（.local）のメールアドレスをDNSで名前解決して、Thunderbirdで2台のメールサーバ間でメールを送受信できる環境**を構築します。

## 実現する内容
- test@test01.local と test@test02.local 間でのメール送受信
- 自作DNS環境による名前解決（ルートDNS → TLD DNS → 権威DNS）
- TLS証明書なしの検証環境（本番では非推奨）

# 全体環境イメージ
![](https://private-user-images.githubusercontent.com/127835743/655365008-998df2c5-bf7a-4607-9ecd-50bda11f4908.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5MDkyMzcsIm5iZiI6MTc4OTkwODkzNywicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzY1MDA4LTk5OGRmMmM1LWJmN2EtNDYwNy05ZWNkLTUwYmRhMTFmNDkwOC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQxMjU1MzdaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05Zjc2ZjY3NmZiNzhmYjQxZjQ4NDE2MzU0NWNjYmFiNDkyZDg1YTA2YTdhOGUwNWRiYjYzMDE1NzU3ZDM3YmZjJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.dGhNvLc0zOMI88w0PcWyoUxRACBLmyj2w7ryVz4b9vU)

# 環境構築
## Ubuntu Desktopの環境整備
Thunderbirdを導入します。アプリセンターから導入が便利そうです。
ここからインストールするだけであとは何もせずに起動することが出来ます。
![](https://private-user-images.githubusercontent.com/127835743/655329692-7a371cec-e0ff-4d1d-8489-b18e6ece898a.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk4OTA4OTQsIm5iZiI6MTc4OTg5MDU5NCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzI5NjkyLTdhMzcxY2VjLWUwZmYtNGQxZC04NDg5LWIxOGU2ZWNlODk4YS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQwNzQ5NTRaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1lMDBkMWE4YTAwMGRmMjZlMWQ4NzJhY2JiOTJmNTczZjNiMWU3M2E5YjEyYzUzYzdhOWMwMTViZWRmNmIwYmMyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.jqwji6c9QbTogpUM1p8hlARJWexoaZf2fzaqx_ybuMQ)

次にこのDesktopが参照するDNSをホームラボで作っているDNSに指定します。
![](https://private-user-images.githubusercontent.com/127835743/655330211-3c7e63d0-045c-4e06-a7cd-67917e35b84b.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk4OTExOTAsIm5iZiI6MTc4OTg5MDg5MCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzMwMjExLTNjN2U2M2QwLTA0NWMtNGUwNi1hN2NkLTY3OTE3ZTM1Yjg0Yi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQwNzU0NTBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT01NmQ2OTVhYjlmOWQyMWRlNzYzNGFjNzQ3MmYwMTc4OTMyZDJhNDU2NTA3MzcwMzc3OGI2MzEzMWZlYTA1NTMxJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.v_5-UEL_41dTxMivh1_VbmZMoTOAApYL2U6cgbIvQZI)

**mDNS (Multicast DNS) の無効化について**

.local ドメインは通常mDNSで使用される特別なドメインです。今回のように独自のDNSサーバで .local を管理する場合、systemd-resolved がmDNSとして処理しないよう明示的に無効化する必要があります。

変更箇所：
- `MulticastDNS=no` : mDNS機能を無効化
- `LLMNR=no` : Link-Local Multicast Name Resolution も無効化
- `DNSStubListener=no` : ローカルのスタブリスナーを無効化

これにより、.local ドメインのクエリが確実に指定したDNSサーバ（192.168.0.53）に送られます。
```
test@client:~$ sudo su -
[sudo] test のパスワード: 
root@client:~# cp -p /etc/systemd/resolved.conf /etc/systemd/resolved.conf.origin
root@client:~# sdiff  /etc/systemd/resolved.conf /etc/systemd/resolved.conf.origin 
#  This file is part of systemd.				#  This file is part of systemd.
#								#
#  systemd is free software; you can redistribute it and/or m	#  systemd is free software; you can redistribute it and/or m
#  terms of the GNU Lesser General Public License as publishe	#  terms of the GNU Lesser General Public License as publishe
#  Software Foundation; either version 2.1 of the License, or	#  Software Foundation; either version 2.1 of the License, or
#  any later version.						#  any later version.
#								#
# Entries in this file show the compile time defaults. Local 	# Entries in this file show the compile time defaults. Local 
# should be created by either modifying this file (or a copy 	# should be created by either modifying this file (or a copy 
# /etc/ if the original file is shipped in /usr/), or by crea	# /etc/ if the original file is shipped in /usr/), or by crea
# the /etc/systemd/resolved.conf.d/ directory. The latter is 	# the /etc/systemd/resolved.conf.d/ directory. The latter is 
# recommended. Defaults can be restored by simply deleting th	# recommended. Defaults can be restored by simply deleting th
# configuration file and all drop-ins located in /etc/.		# configuration file and all drop-ins located in /etc/.
#								#
# Use 'systemd-analyze cat-config systemd/resolved.conf' to d	# Use 'systemd-analyze cat-config systemd/resolved.conf' to d
#								#
# See resolved.conf(5) for details.				# See resolved.conf(5) for details.

[Resolve]							[Resolve]
# Some examples of DNS servers which may be used for DNS= and	# Some examples of DNS servers which may be used for DNS= and
# Cloudflare: 1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-d	# Cloudflare: 1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-d
# Google:     8.8.8.8#dns.google 8.8.4.4#dns.google 2001:4860	# Google:     8.8.8.8#dns.google 8.8.4.4#dns.google 2001:4860
# Quad9:      9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9	# Quad9:      9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9
DNS=192.168.0.53					      |	#DNS=
MulticastDNS=no						      <
LLMNR=no						      <
DNSStubListener=no					      <
#FallbackDNS=							#FallbackDNS=
#Domains=							#Domains=
#DNSSEC=no							#DNSSEC=no
#DNSOverTLS=no							#DNSOverTLS=no
#MulticastDNS=no						#MulticastDNS=no
#LLMNR=no							#LLMNR=no
#Cache=no-negative						#Cache=no-negative
#CacheFromLocalhost=no						#CacheFromLocalhost=no
#DNSStubListener=yes						#DNSStubListener=yes
#DNSStubListenerExtra=						#DNSStubListenerExtra=
#ReadEtcHosts=yes						#ReadEtcHosts=yes
#ResolveUnicastSingleLabel=no					#ResolveUnicastSingleLabel=no
#StaleRetentionSec=0						#StaleRetentionSec=0

```

修正を反映するために、再起動します。
```
root@client:~# systemctl restart systemd-resolved
```

## メールサーバの環境整備
今の状態だと証明書・認証・名前解決で問題があるので1つずつ対応していきます。
まずはPostfixの設定ファイルである/etc/postfix/master.cfを修正します。両方のメールサーバで以下の設定を行っていきます。
smtpd_tls_security_level=none に変更したり-o smtpd_relay_restrictions=permit_sasl_authenticated,rejectにしたり、submissionでコメントアウトされているものを外して有効にしたりします。
```
root@multi-server:~# cp -p /etc/postfix/master.cf /etc/postfix/master.cf.20260920
root@multi-server:~# nano /etc/postfix/master.cf
root@multi-server:~# diff /etc/postfix/master.cf /etc/postfix/master.cf.20260920
19,22c19,22
< submission inet n       -       y       -       -       smtpd
<   -o syslog_name=postfix/submission
<   -o smtpd_tls_security_level=none
<   -o smtpd_sasl_auth_enable=yes
---
> #submission inet n       -       y       -       -       smtpd
> #  -o syslog_name=postfix/submission
> #  -o smtpd_tls_security_level=encrypt
> #  -o smtpd_sasl_auth_enable=yes
33,35c33,35
<   -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
<   -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
<   -o milter_macro_daemon_name=ORIGINATING
---
> #  -o smtpd_relay_restrictions=
> #  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
> #  -o milter_macro_daemon_name=ORIGINATING
```

修正が出来ましたら、Postfixを再起動します。
```
root@multi-server:~# systemctl restart postfix
```

また、/etc/postfix/main.cfのSASLについても修正します。
**SASL認証について**
SASL (Simple Authentication and Security Layer) はメール送信時のユーザ認証機構です。

なぜ必要か：
Thunderbirdなどのメールクライアントがメールを送信（SMTP）する際、正当なユーザであることを証明するために認証が必要です。これがないと、ThunderbirdからのSMTP接続が拒否されます。

設定のポイント：
- PostfixがDovecotの認証ソケットを使用
- `/var/spool/postfix/private/auth` を通じて認証情報をやり取り
- submission ポート（587）で認証を要求
```
root@multi-server:~# cp -p /etc/postfix/main.cf /etc/postfix/main.cf.20260920
root@multi-server:~# nano /etc/postfix/main.cf
root@multi-server:~# diff /etc/postfix/main.cf /etc/postfix/main.cf.20260920
49,56d48
<
< # SASL認証設定
< smtpd_sasl_type = dovecot
< smtpd_sasl_path = private/auth
< smtpd_sasl_auth_enable = yes
< smtpd_sasl_security_options = noanonymous
< smtpd_sasl_local_domain = $myhostname
< broken_sasl_auth_clients = yes
```

続いて、Dovecotの認証ソケットの設定を行います。
```
root@multi-server:~# cp -p /etc/dovecot/conf.d/10-master.conf /etc/dovecot/conf.d/10-master.conf.20260920
root@multi-server:~# nano /etc/dovecot/conf.d/10-master.conf
```

/etc/dovecot/conf.d/10-master.conf内のservice authのセクションを以下のようにします。
```
service auth {
  # auth_socket_path points to this userdb socket by default. It's typically
  # used by dovecot-lda, doveadm, possibly imap process, etc. Users that have
  # full permissions to this socket are able to get a list of all usernames and
  # get the results of everyone's userdb lookups.
  #
  # The default 0666 mode allows anyone to connect to the socket, but the
  # userdb lookups will succeed only if the userdb returns an "uid" field that
  # matches the caller process's UID. Also if caller's uid or gid matches the
  # socket's uid or gid the lookup succeeds. Anything else causes a failure.
  #
  # To give the caller full permissions to lookup all users, set the mode to
  # something else than 0666 and Dovecot lets the kernel enforce the
  # permissions (e.g. 0777 allows everyone full permissions).
  unix_listener auth-userdb {
    #mode = 0666
    #user =
    #group =
  }

  # ← ここに追加
  unix_listener /var/spool/postfix/private/auth {
    mode = 0666
    user = postfix
    group = postfix
  }

  # Postfix smtp-auth
  #unix_listener /var/spool/postfix/private/auth {
  #  mode = 0666
  #}

  # Auth process is run as this user.
  #user = $default_internal_user
}
```

修正できましたら、dovecotを再起動します。
```
root@multi-server:~# systemctl restart dovecot
```

最後にメールサーバもホームラボの自作DNSへ名前解決するように設定します。
```
root@multi-server:~# nano /etc/resolv.conf
root@multi-server:~# cat /etc/resolv.conf | grep -i nameserver
nameserver 192.168.0.53
```

Ubuntu Desktopの環境整備のところでも修正しましたが、今回メールアドレスが*.localになるのでmDNSが働いてしまっております。同様に修正します。
```
root@multi-server:~# cp -p /etc/systemd/resolved.conf /etc/systemd/resolved.conf.origin
root@multi-server:~# nano /etc/systemd/resolved.conf
root@multi-server:~# sdiff /etc/systemd/resolved.conf /etc/systemd/resolved.conf.origin
#  This file is part of systemd.                                #  This file is part of systemd.
#                                                               #
#  systemd is free software; you can redistribute it and/or m   #  systemd is free software; you can redistribute it and/or m
#  terms of the GNU Lesser General Public License as publishe   #  terms of the GNU Lesser General Public License as publishe
#  Software Foundation; either version 2.1 of the License, or   #  Software Foundation; either version 2.1 of the License, or
#  any later version.                                           #  any later version.
#                                                               #
# Entries in this file show the compile time defaults. Local    # Entries in this file show the compile time defaults. Local
# should be created by either modifying this file (or a copy    # should be created by either modifying this file (or a copy
# /etc/ if the original file is shipped in /usr/), or by crea   # /etc/ if the original file is shipped in /usr/), or by crea
# the /etc/systemd/resolved.conf.d/ directory. The latter is    # the /etc/systemd/resolved.conf.d/ directory. The latter is
# recommended. Defaults can be restored by simply deleting th   # recommended. Defaults can be restored by simply deleting th
# configuration file and all drop-ins located in /etc/.         # configuration file and all drop-ins located in /etc/.
#                                                               #
# Use 'systemd-analyze cat-config systemd/resolved.conf' to d   # Use 'systemd-analyze cat-config systemd/resolved.conf' to d
#                                                               #
# See resolved.conf(5) for details.                             # See resolved.conf(5) for details.

[Resolve]                                                       [Resolve]
# Some examples of DNS servers which may be used for DNS= and   # Some examples of DNS servers which may be used for DNS= and
# Cloudflare: 1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-d   # Cloudflare: 1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-d
# Google:     8.8.8.8#dns.google 8.8.4.4#dns.google 2001:4860   # Google:     8.8.8.8#dns.google 8.8.4.4#dns.google 2001:4860
# Quad9:      9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9   # Quad9:      9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9
DNS=192.168.0.53                                              | #DNS=
MulticastDNS=no                                               <
LLMNR=no                                                      <
DNSStubListener=no                                            <
#FallbackDNS=                                                   #FallbackDNS=
#Domains=                                                       #Domains=
#DNSSEC=no                                                      #DNSSEC=no
#DNSOverTLS=no                                                  #DNSOverTLS=no
#MulticastDNS=no                                                #MulticastDNS=no
#LLMNR=no                                                       #LLMNR=no
#Cache=no-negative                                              #Cache=no-negative
#CacheFromLocalhost=no                                          #CacheFromLocalhost=no
#DNSStubListener=yes                                            #DNSStubListener=yes
#DNSStubListenerExtra=                                          #DNSStubListenerExtra=
#ReadEtcHosts=yes                                               #ReadEtcHosts=yes
#ResolveUnicastSingleLabel=no                                   #ResolveUnicastSingleLabel=no
#StaleRetentionSec=0                                            #StaleRetentionSec=0
```

再起動します。
postfixも再起動します。
```
root@multi-server:~# systemctl restart systemd-resolved
root@multi-server:~# systemctl restart postfix
```


## DNS周りの環境整備
今回メールアドレスはtest01.localとtest02.localになるので、これを名前解決できるようにDNSサーバの環境を整えます。私の環境ではキャッシュDNSにクエリが投げられた後、ルートDNS→TLD DNS→権威DNSというフローになるので、ルートDNSから順番に更新していきます。

Postfixのconfファイルでmyhostname = mail.test01.localやmyhostname = mail.test02.localという設定をしておりますが、名前解決をしてメールサーバにアクセスるときはここに記載されているドメインを名前解決できれば良いようなのでその点を考慮して環境整備していきます。

### ルートDNS 
/etc/bind/db.rootに対してlocalというドメインがどこで管理しているかの情報を追記します。
```
root@root-dns:~# cd /etc/bind
root@root-dns:/etc/bind# cp -p db.root db.root.20260920
root@root-dns:/etc/bind# nano db.root
root@root-dns:/etc/bind# sdiff db.root db.root.20260920
$TTL 86400                                                      $TTL 86400
@   IN  SOA     root-dns. admin.root. (                         @   IN  SOA     root-dns. admin.root. (
        2026092001                                            |         2026040403
        3600                                                            3600
        1800                                                            1800
        604800                                                          604800
        86400 )                                                         86400 )

    IN  NS      root-dns.                                           IN  NS      root-dns.

; com delegation                                                ; com delegation
com.    IN  NS  tld-dns.                                        com.    IN  NS  tld-dns.
                                                              <
; local delegation                                            <
local.  IN  NS  tld-dns.                                      <

; glue                                                          ; glue
root-dns.  IN  A   192.168.0.49                                 root-dns.  IN  A   192.168.0.49
tld-dns.   IN  A   192.168.0.50                                 tld-dns.   IN  A   192.168.0.50
```

bind9を再起動します。
```
root@root-dns:/etc/bind# systemctl restart bind9
```

## TLD-DNS
named.conf.localに名前解決の際に必要となるファイルを指定します。
今回はlocalというトップレベルドメインの名前解決の情報を新規ファイルdb.local.zoneファイルで管理するので、これを指定します。
```
root@tld-dns:~# cd /etc/bind
root@tld-dns:/etc/bind# cp -p named.conf.local named.conf.local.2026920
root@tld-dns:/etc/bind# vi named.conf.local
root@tld-dns:/etc/bind# sdiff named.conf.local named.conf.local.2026920
//                                                              //
// Do any local configuration here                              // Do any local configuration here
//                                                              //

// Consider adding the 1918 zones here, if they are not used    // Consider adding the 1918 zones here, if they are not used
// organization                                                 // organization
//include "/etc/bind/zones.rfc1918";                            //include "/etc/bind/zones.rfc1918";

zone "com" IN {                                                 zone "com" IN {
    type master;                                                    type master;
    file "/etc/bind/db.com";                                        file "/etc/bind/db.com";
};                                                              };
                                                              <
zone "local" IN {                                             <
    type master;                                              <
    file "/etc/bind/db.local.zone";                           <
};                                                            <
```

db.local.zoneファイルを作成します。
```
root@tld-dns:/etc/bind# vi db.local.zone
root@tld-dns:/etc/bind# cat db.local.zone
$TTL 86400
@   IN  SOA     tld-dns. admin.local. (
        2026092001
        3600
        1800
        604800
        86400 )

    IN  NS      tld-dns.

; test01.local delegation
test01.local.    IN  NS  auth-dns.test01.local.

; test02.local delegation
test02.local.    IN  NS  auth-dns.test02.local.

; glue
tld-dns.                  IN  A   192.168.0.50
auth-dns.test01.local.    IN  A   192.168.0.51
auth-dns.test02.local.    IN  A   192.168.0.51
```

bind9を再起動します。
```
root@tld-dns:/etc/bind# systemctl restart bind9
```

### 権威DNS
named.conf.localに名前解決の際に必要となるファイルを指定します。
今回はtest01.localというドメインとtest02.localというドメインの名前解決の情報を新規ファイルdb.test01.localとdb.test02.localファイルで管理するので、これを指定します。
```
root@auth-dns:~# cd /etc/bind/
root@auth-dns:/etc/bind# cp -p named.conf.local named.conf.local.20260920
root@auth-dns:/etc/bind# vi named.conf.local
root@auth-dns:/etc/bind# sdiff named.conf.local named.conf.local.20260920
//                                                              //
// Do any local configuration here                              // Do any local configuration here
//                                                              //

// Consider adding the 1918 zones here, if they are not used    // Consider adding the 1918 zones here, if they are not used
// organization                                                 // organization
//include "/etc/bind/zones.rfc1918";                            //include "/etc/bind/zones.rfc1918";

zone "example.com" IN {                                         zone "example.com" IN {
    type master;                                                    type master;
    file "/etc/bind/db.example.com";                                file "/etc/bind/db.example.com";
};                                                              };

zone "test01.local" IN {                                      <
    type master;                                              <
    file "/etc/bind/db.test01.local";                         <
};                                                            <
                                                              <
zone "test02.local" IN {                                      <
    type master;                                              <
    file "/etc/bind/db.test02.local";                         <
};                                                            <
                                                              <
```

それぞれのファイルを新規作成していきます。
まずはtest01.localドメインを管理するdb.test01.localファイルです。
```
root@auth-dns:/etc/bind# vi db.test01.local
root@auth-dns:/etc/bind# cat db.test01.local
$TTL 86400
@   IN  SOA     auth-dns.test01.local. admin.test01.local. (
        2026092001
        3600
        1800
        604800
        86400 )

    IN  NS      auth-dns.test01.local.

auth-dns   IN  A   192.168.0.51
mail       IN  A   192.168.0.73
@          IN  MX  10  mail.test01.local.
```

次にtest02.localドメインを管理するdb.test02.localファイルです。
```
root@auth-dns:/etc/bind# vi db.test02.local
root@auth-dns:/etc/bind# cat db.test02.local
$TTL 86400
@   IN  SOA     auth-dns.test02.local. admin.test02.local. (
        2026092001
        3600
        1800
        604800
        86400 )

    IN  NS      auth-dns.test02.local.

auth-dns   IN  A   192.168.0.51
mail       IN  A   192.168.0.32
@          IN  MX  10  mail.test02.local.
```

設定確認と動作確認を行います。
まずは各種confファイルのチェックをnamed-checkconfコマンドで実行。
問題なさそうであればbindの再起動を行います。
```
root@auth-dns:/etc/bind# named-checkconf
root@auth-dns:/etc/bind# named-checkzone test01.local /etc/bind/db.test01.local
zone test01.local/IN: loaded serial 2026092001
OK
root@auth-dns:/etc/bind# named-checkzone test02.local /etc/bind/db.test02.local
zone test02.local/IN: loaded serial 2026092001
OK
root@auth-dns:/etc/bind# systemctl restart bind9
```

## Desktop側で名前解決できるか確認
terminalを開きnslookupで名前解決できることを確認します。
サーバのIPアドレスがちゃんと返ってきておりますので、問題なさそうです。
```
test@client:~$ nslookup mail.test01.local
Server:		192.168.0.53
Address:	192.168.0.53#53

Non-authoritative answer:
Name:	mail.test01.local
Address: 192.168.0.73

test@client:~$ nslookup mail.test02.local
Server:		192.168.0.53
Address:	192.168.0.53#53

Non-authoritative answer:
Name:	mail.test02.local
Address: 192.168.0.32
```

![](https://private-user-images.githubusercontent.com/127835743/655341748-1e33ab58-112b-4c7b-87f8-30093c1a3324.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk4OTcyNDMsIm5iZiI6MTc4OTg5Njk0MywicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzQxNzQ4LTFlMzNhYjU4LTExMmItNGM3Yi04N2Y4LTMwMDkzYzFhMzMyNC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQwOTM1NDNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zNjEzOTA5MGYxMzdmNTJlODFkNWVlNTdjZGNiZmE5NzU1Y2I0MjJjNTEwODRhMzJlYjQ0MjRjYmYxZTQyM2Q1JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.02aC3amgoduS77DhTe85o50i4y5xCkPjgb_YH6oVddU)

次にThunderbirdでそれぞれのメールアカウントにドメインでログイン出来ることを確認します。
ユーザ名：test
メールアドレス：test@test01.localと入力し続けるボタンを押下します。
![](https://private-user-images.githubusercontent.com/127835743/655342059-a7b4b799-a805-4526-b69e-f72086db2e72.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk4OTc0MTAsIm5iZiI6MTc4OTg5NzExMCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzQyMDU5LWE3YjRiNzk5LWE4MDUtNDUyNi1iNjllLWY3MjA4NmRiMmU3Mi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQwOTM4MzBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT01OWRlYzBkZDRlNGE0MTg2Nzc4NTlmYmQ0M2ZjMTVhZWE3MmRhMDA2YjVhMTRkMjM5YzMxOTAxN2Q3MmFjMzYxJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.ArlAzjvnRzcqzJX-hPd42eXztuXiWTJXgHFfwNTuJg8)

名前解決などの通信が問題なければ恐らく対象メールサーバでユーザが見つかり、後続の処理が走るはずです。
![](https://private-user-images.githubusercontent.com/127835743/655342088-73cfecd5-edc5-4afb-9b8a-a4b1b769df8d.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk4OTc0MzEsIm5iZiI6MTc4OTg5NzEzMSwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzQyMDg4LTczY2ZlY2Q1LWVkYzUtNGFmYi05YjhhLWE0YjFiNzY5ZGY4ZC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQwOTM4NTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hNjI2OTlhZDQxZGY4MTZiOTgzZjU2NTY1Nzc1NGZiMDI3NmFiYjZkYWJjZWM4Y2RmOGQ3NjU5NmM5NTZkMDFmJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.zqZQ8TZGoSwuofdPdltgs-Fte1JBRwzp4s4sIsOFzPA)

test01.localとtest02.localのメールアカウントにThunderboltでログイン出来ました。
![](https://private-user-images.githubusercontent.com/127835743/655342495-f023ee3d-d0ef-4f84-8b56-4671207d109a.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk4OTc2MjEsIm5iZiI6MTc4OTg5NzMyMSwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzQyNDk1LWYwMjNlZTNkLWQwZWYtNGY4NC04YjU2LTQ2NzEyMDdkMTA5YS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQwOTQyMDFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02YjIyYTBmM2JlOTBkMTZlYTVmZTVjYTYwYjdhOWQ1Y2I4MWYzYTgyZjIzZTk1MDgwOGRhYjA3N2NhMzU0MDg0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.jkWCw302PNtoJYaaNhw7R57olapN3AiEtOCu6vwLMV4)

## メール送受信確認
それぞれのメールサーバにログインできましたので、送受信手素を行っていきたいと思います。
その前にThunderbirdでの設定を修正していきます。

まず送信サーバについて。
選択したサーバのポートが25になっています。これを587にします。
また、検証環境用に接続の保護をSTARTTLSからなしに変更します。
画面右の編集ボタンから編集することが出来ます。
![](https://private-user-images.githubusercontent.com/127835743/655351356-d6bcacb4-d6ab-40a0-986e-e9cb4de859bd.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5MDI0OTgsIm5iZiI6MTc4OTkwMjE5OCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzUxMzU2LWQ2YmNhY2I0LWQ2YWItNDBhMC05ODZlLWU5Y2I0ZGU4NTliZC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQxMTAzMThaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1jNzQ2NTQ3YTIyYjMxODZiNDg0NzQyYWE2NmFiNjkyYWJlYTRlMjYwMzBjNTIwOWQ4YTM0Zjk3MDBmODJlNWYyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.zCWPpwd8Bp6SIoEQmYvqyFCeCskbmjuysHlS5PqiWtk)

編集を実行すると、このように表記が変わります。
![](https://private-user-images.githubusercontent.com/127835743/655352329-6ed99168-6235-4f68-acbf-e2bf43b18da0.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5MDMwMDcsIm5iZiI6MTc4OTkwMjcwNywicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzUyMzI5LTZlZDk5MTY4LTYyMzUtNGY2OC1hY2JmLWUyYmY0M2IxOGRhMC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQxMTExNDdaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05ZjY5ZjI1ZmVhZTU5NDQ4YmJjMTA3OGY1MWIyMzBhZWM1YzNhNDIwMDgwZWJhNGE5NDRiYzhjZmQ2NjdlYmE2JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.iE_pTbJyULVjjMoXx9cKA41rqnusiaKKy4e9fN0R15o)



### test@test01.local⇒test@test02.localへの送付
画面左のtest01.local上のユーザからメールを送信し、test02.local上のユーザにメールが正常に飛んでいくことを確認します。
![](https://private-user-images.githubusercontent.com/127835743/655359413-81f21591-5983-4306-b524-14e45f93411f.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5MDY2OTYsIm5iZiI6MTc4OTkwNjM5NiwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzU5NDEzLTgxZjIxNTkxLTU5ODMtNDMwNi1iNTI0LTE0ZTQ1ZjkzNDExZi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQxMjEzMTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wMTg3YzA1M2QwM2FlYzcwZDU4OWU3NzBlMzQ3YzRkMzBkYTg0MjM2Y2Y0Y2Q2NjVkYjUxZmZkY2JmODY2NWE2JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.cU7QtwML3xQxdSzpgKUHsnJJCAYYKXwC-6lSQkAoRQI)

結果正常に送受信できていることがわかりました。
![](https://private-user-images.githubusercontent.com/127835743/655359448-f60160e9-9870-4f2a-991c-1a719e206f4f.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5MDY3MjAsIm5iZiI6MTc4OTkwNjQyMCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzU5NDQ4LWY2MDE2MGU5LTk4NzAtNGYyYS05OTFjLTFhNzE5ZTIwNmY0Zi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQxMjEzNDBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zMmUwNTEyYjYwYTQ2MDE5NTUxMzMzYjE2YmIxNTQ3OWIyZWI4MTI1NjlkM2FmYjg5ZTJlZTI5MmNjYjA5NmEzJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.U8OwvUs1jMKY4A8pYRAiGKUUTxp17WweUxNMPKq5wnM)

### test@test02.local⇒test@test01.localへの送付
今度は逆に、画面右のtest02.local上のユーザからメールを送信し、test01.local上のユーザにメールが正常に飛んでいくことを確認します。
![](https://private-user-images.githubusercontent.com/127835743/655359607-77b2873c-a201-4bc7-a3ca-5314126eeba8.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5MDY4MjAsIm5iZiI6MTc4OTkwNjUyMCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzU5NjA3LTc3YjI4NzNjLWEyMDEtNGJjNy1hM2NhLTUzMTQxMjZlZWJhOC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQxMjE1MjBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1lMGVhNzc0OGYyZDQ3ODliNjFhMjFkM2I1MTVmN2JmMmY1ZjM4MGI0NDg0ODI2NTU1Y2Q2OGRhY2YwZTJiODQwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.87rlfQuzY9g4ewZYHaGT8E5KQKDO7_6EpkEC27QAmmg)

こちらも、結果正常に送受信できていることがわかりました。
![](https://private-user-images.githubusercontent.com/127835743/655359658-ffd92872-a965-43bf-b181-fc3a968dfbec.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5MDY4NTAsIm5iZiI6MTc4OTkwNjU1MCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1MzU5NjU4LWZmZDkyODcyLWE5NjUtNDNiZi1iMTgxLWZjM2E5NjhkZmJlYy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIwJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMFQxMjE1NTBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05NDk4ZGQyZjE0MzhmYzMyY2M3OGZiZTNmZDczZGMyNzA2ZDA4NDE4MTRkZDMwYmUzNTFkODM2NGQ3ZDAwZTA0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.RJ0yki3OMazpnj2ZO3WhQEDHTTv9kzf1ySew3wQE5zs)


## まとめ

本記事では以下を実現しました：

✅ 自作DNS環境（ルート・TLD・権威）で .local ドメインの名前解決
✅ 2台のメールサーバ（test01.local / test02.local）の構築
✅ SASL認証によるThunderbirdからの送信
✅ 異なるドメイン間でのメール送受信

### 学んだポイント
- mDNSと独自DNSの競合回避方法
- PostfixとDovecotの連携（SASL認証）
- MXレコードによるメール配送の仕組み
- submission ポート（587）の重要性

### 次のステップ
- TLS証明書の導入（Let's Encrypt）
- SPF/DKIM/DMARCの設定
- スパムフィルタ（SpamAssassin）の導入
- Webメール（Roundcube）の導入

