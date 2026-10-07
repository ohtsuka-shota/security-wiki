---
title: "【ホームラボ構築】OpenLDAP（ID管理）とKerberos（認証）をSSSDでつなげてみた"
date: 2026-09-21
tags: ["tool", "Kerberos", "openldap", "chrony", "dns", "sssd"]
source: "https://qiita.com/ohtsuka-shota/items/bef8f912278ed06ef19d"
---
# 初めに
私は以下の記事をベースに、自宅のホームラボで検証環境を作りながらセキュリティまわりの勉強をしています。今回はこれまで個別に構築してきたDNS・OpenLDAP・Kerberosの環境を組み合わせ、LDAPで管理しているユーザーをKerberos認証でログインさせる、という統合を行いました。これはその記事となります。

[[dns-root-tld-authoritative-cache]]

[[ubuntu-kerberos-server]]

[[openldap-sssd-sso]]

[[ubuntu-ntp-chrony]]

# 環境イメージ
## 時刻同期
Kerberosは認証にタイムスタンプを利用する仕組み上、サーバ間の時刻がズレていると正しく動作しません。そのため、まず時刻同期の仕組みを用意しています。

流れとしては、サーバがホームラボに用意しているキャッシュDNSへ問い合わせを行い、キャッシュDNSが外部のDNSへNICTのドメインの名前解決を依頼します。取得できたIPアドレスを使って、実際にNICTのNTPサーバへ接続し時刻同期を行う、という構成です。
![](https://private-user-images.githubusercontent.com/127835743/655659749-bc513f83-bef0-46b3-8f54-1a46f2e18c41.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5ODM3OTMsIm5iZiI6MTc4OTk4MzQ5MywicGF0aCI6Ii8xMjc4MzU3NDMvNjU1NjU5NzQ5LWJjNTEzZjgzLWJlZjAtNDZiMy04ZjU0LTFhNDZmMmUxOGM0MS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIxJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMVQwOTM4MTNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02NGJlNmU3ZWQ5OWVhZmM2N2VhZDJiYmY4N2E3N2EyMmUzOWI0NWNkNjZhYTgxNDk1MDA2OGUyMzEwMDVmZTU4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.igwBk4JQBkZjtLayhrbFB6G1F3zNo9uLlDzd4glp08w)

## OpenLDAP/SSSD/Kerberos
続いて、実際にドメインユーザーでログインする際の通信の流れです。

ポイントは、SSSDが「パスワードが正しいかどうかの検証（Kerberos）」と「Linuxユーザーとしての情報取得（OpenLDAP）」という2つの役割を仲介している点です。それぞれの通信の前段階で、ホームラボのDNS環境（キャッシュDNS→ルートDNS→TLD DNS→権威DNS）による名前解決が挟まっており、ここが正しく機能していないとSSSDのバックエンド（今回の場合KerberosとOpenLDAP）がオフラインになって、うまく認証できない状態になります。
![](https://private-user-images.githubusercontent.com/127835743/655702832-98aa8d27-6614-422a-aa0f-ef59bca0dbe2.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODk5ODg2MDgsIm5iZiI6MTc4OTk4ODMwOCwicGF0aCI6Ii8xMjc4MzU3NDMvNjU1NzAyODMyLTk4YWE4ZDI3LTY2MTQtNDIyYS1hYTBmLWVmNTliY2EwZGJlMi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwOTIxJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDkyMVQxMDU4MjhaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mYWI5ODdlOTIwY2I0NjVkYzhjMjg4Y2QxY2UxMTEzNjNiNzgwNDgxOGI5NzFhYWE4NzdmOWJmN2VhMmRjMDdkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.Ez-viVtdiiZmOXqmAoVb7kF87homoiagk_cLxpzCD9E)

# 環境構築
## 名前解決（DNS）周りの整備
### キャッシュDNSサーバでの設定
今回ドメインを追加するcorp.localを内部で解決するようにします。
※ホームラボで使用しているDNSが完全内部用であればこの設定は不要ですが、私のように内外両方の設定をしている場合は、この設定が必要になる可能性があります。
```
root@cache-dns:~# cp -p /etc/bind/named.conf.local /etc/bind/named.conf.local.20260921
root@cache-dns:~# nano /etc/bind/named.conf.local
root@cache-dns:~# sdiff /etc/bind/named.conf.local /etc/bind/named.conf.local.20260921
//                                                              //
// Do any local configuration here                              // Do any local configuration here
//                                                              //

// Consider adding the 1918 zones here, if they are not used    // Consider adding the 1918 zones here, if they are not used
// organization                                                 // organization
//include "/etc/bind/zones.rfc1918";                            //include "/etc/bind/zones.rfc1918";

zone "." {                                                      zone "." {
    type hint;                                                      type hint;
    file "/etc/bind/db.root.hint";                                  file "/etc/bind/db.root.hint";
};                                                              };

// example.com domain forward                                   // example.com domain forward
zone "example.com" {                                            zone "example.com" {
    type forward;                                                   type forward;
    forward only;                                                   forward only;
    forwarders { 192.168.0.49; };                                   forwarders { 192.168.0.49; };
};                                                              };
                                                              <
// *.local domain forward                                     <
zone "local" {                                                <
    type forward;                                             <
    forward only;                                             <
    forwarders { 192.168.0.49; };                             <
};                                                            <
root@cache-dns:~# named-checkconf
root@cache-dns:~# systemctl restart bind9
```

### TLD-DNSサーバでの設定
corp.localに関する委任レコードを作成します。
```
root@tld-dns:~# cd /etc/bind
root@tld-dns:/etc/bind# cp -p db.local.zone db.local.zone.20260921
root@tld-dns:/etc/bind# nano db.local.zone
root@tld-dns:/etc/bind# sdiff db.local.zone db.local.zone.20260921
$TTL 86400                                                      $TTL 86400
@   IN  SOA     tld-dns. admin.local. (                         @   IN  SOA     tld-dns. admin.local. (
        2026092101                                            |         2026092001
        3600                                                            3600
        1800                                                            1800
        604800                                                          604800
        86400 )                                                         86400 )

    IN  NS      tld-dns.                                            IN  NS      tld-dns.

; test01.local delegation                                       ; test01.local delegation
test01.local.    IN  NS  auth-dns.test01.local.                 test01.local.    IN  NS  auth-dns.test01.local.

; test02.local delegation                                       ; test02.local delegation
test02.local.    IN  NS  auth-dns.test02.local.                 test02.local.    IN  NS  auth-dns.test02.local.

; corp.local delegation                                       <
corp.local.      IN  NS  auth-dns.corp.local.                 <
                                                              <
; glue                                                          ; glue
tld-dns.                  IN  A   192.168.0.50                  tld-dns.                  IN  A   192.168.0.50
auth-dns.test01.local.    IN  A   192.168.0.51                  auth-dns.test01.local.    IN  A   192.168.0.51
auth-dns.test02.local.    IN  A   192.168.0.51                  auth-dns.test02.local.    IN  A   192.168.0.51
```

bind9を再起動します。
```
root@tld-dns:/etc/bind# systemctl restart bind9
```

### 権威DNSサーバでの設定
corp.localの名前解決に必要なファイルを作成していきます。
```
root@auth-dns:~# cd /etc/bind
root@auth-dns:/etc/bind# cp -p named.conf.local named.conf.local.20260921
root@auth-dns:/etc/bind# sdiff named.conf.local named.conf.local.20260921
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

zone "test01.local" IN {                                        zone "test01.local" IN {
    type master;                                                    type master;
    file "/etc/bind/db.test01.local";                               file "/etc/bind/db.test01.local";
};                                                              };

zone "test02.local" IN {                                        zone "test02.local" IN {
    type master;                                                    type master;
    file "/etc/bind/db.test02.local";                               file "/etc/bind/db.test02.local";
};                                                              };

zone "corp.local" IN {                                        <
    type master;                                              <
    file "/etc/bind/db.corp.local";                           <
};                                                            <
```

corp.localドメインを管理するdb.corp.localファイルの編集を行います。
```
root@auth-dns:/etc/bind# nano db.corp.local
root@auth-dns:/etc/bind# cat db.corp.local
$TTL 86400
@   IN  SOA     auth-dns.corp.local. admin.corp.local. (
        2026092101
        3600
        1800
        604800
        86400 )

    IN  NS      auth-dns.corp.local.

auth-dns              IN  A   192.168.0.51
multi-server-03       IN  A   192.168.0.28
```
設定確認と動作確認を行います。
まずは各種confファイルのチェックをnamed-checkconfコマンドで実行。
問題なさそうであればbindの再起動を行います。
```
root@auth-dns:/etc/bind# named-checkconf
root@auth-dns:/etc/bind# named-checkzone corp.local /etc/bind/db.corp.local
zone corp.local/IN: loaded serial 2026092101
OK
root@auth-dns:/etc/bind# systemctl restart bind9
```

## OpenLDAP+SSSD+Kerberos+Chronyサーバ
### 初期設定
apt update周りをしたり、mDNSの機能を無効化したりします
（mDNSについては管理するドメインが*.local等であれば実施してください。これ以外であれば一旦は問題ないものと思います。）
```
root@multi-server-03:~# apt update && apt upgrade -y
```

mDNSを無効化したり、名前解決先をホームラボのキャッシュDNS先に指定したりします。
- MulticastDNS=no : mDNS機能を無効化
- LLMNR=no : Link-Local Multicast Name Resolution も無効化
- DNSStubListener=no : ローカルのスタブリスナーを無効化
```
root@multi-server-03:~# nano /etc/systemd/resolved.conf
root@multi-server-03:~# cat /etc/systemd/resolved.conf
～中略～
DNS=192.168.0.53
MulticastDNS=no
LLMNR=no
DNSStubListener=no
～中略～

root@multi-server-03:~# systemctl restart systemd-resolved
root@multi-server-03:~# cat /etc/resolv.conf | grep -i nameserver
nameserver 192.168.0.53
```

## netplanでの名前解決先のDNSの指定
私の環境だと使用していないハズのIPv6のDNSの設定が邪魔をしてこの後導入するSSSDが上手く起動しなかったので、以下のファイルを用意して恒久対応を行っていきます。
adressesはサーバのIPを固定化する場合に使用。rotesのIPアドレスはホームラボのデフォルトゲートウェイ、nameserverはホームラボで用意しているキャッシュDNSを指定します。
```
root@multi-server-03:~# ls /etc/netplan/
50-cloud-init.yaml
root@multi-server-03:~# nano /etc/netplan/60-static-ip.yaml
root@multi-server-03:~# cat /etc/netplan/60-static-ip.yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: false
      addresses:
        - 192.168.0.28/24
      routes:
        - to: default
          via: 192.168.0.1
      nameservers:
        addresses: [192.168.0.53]
```

以下のコマンドを実行して上記ファイルをサーバに反映します。
```
chmod 600 /etc/netplan/60-static-ip.yaml
root@multi-server-03:~# netplan apply
```

multi-server-03.corp.localが名前解決できるかを確認します。
正しいIPアドレスが返ってきているので問題なさそうです。
```
root@multi-server-03:~# nslookup multi-server-03.corp.local
Server:         192.168.0.53
Address:        192.168.0.53#53

Non-authoritative answer:
Name:   multi-server-03.corp.local
Address: 192.168.0.28
```

### OpenLDAP導入
パッケージインストールを行います。インストール後dpkg-reconfigure slapdコマンドで設定を入れていきます。色々設定を聞かれますが、以下で設定を入れます。
- 「Omit OpenLDAP server configuration?」→ No
- DNS domain name → corp.local
- Organization name → corp
- 管理者パスワード → 設定
- データベースを削除するか(configファイル削除確認)→ No
- 古いデータベースを移動するか → Yes

設定入力後ldapsearchコマンドでcorp.localを確認してエントリが返ってくればOKです。
```
root@multi-server-03:~# apt install -y slapd ldap-utils
root@multi-server-03:~# dpkg-reconfigure slapd
root@multi-server-03:~# ldapsearch -x -LLL -b dc=corp,dc=local
dn: dc=corp,dc=local
objectClass: top
objectClass: dcObject
objectClass: organization
o: corp
dc: corp
```

ldapで管理するcorp.localのユーザとグループを管理する入れ物を作成していきます。
作成したものをLDAPに取り込みます。
```
root@multi-server-03:~# nano base.ldif
root@multi-server-03:~# cat base.ldif
dn: ou=People,dc=corp,dc=local
objectClass: organizationalUnit
ou: People

dn: ou=Group,dc=corp,dc=local
objectClass: organizationalUnit
ou: Group

root@multi-server-03:~# ldapadd -x -D "cn=admin,dc=corp,dc=local" -W -f base.ldif
Enter LDAP Password:
adding new entry "ou=People,dc=corp,dc=local"
adding new entry "ou=Group,dc=corp,dc=local"
```

ldapsearchコマンドを使って作成出来ているかを念のため確認していきます。
```
root@multi-server-03:~# ldapsearch -x -LLL -b dc=corp,dc=local -s one
dn: ou=Group,dc=corp,dc=local
objectClass: organizationalUnit
ou: Group

dn: ou=People,dc=corp,dc=local
objectClass: organizationalUnit
ou: People
```

LDAPで管理するユーザとパスワードを設定していきます。
グループ/ユーザを取り込む用のファイルを作成し、作成したファイルをldapaddコマンドで取り込みます。
```
root@multi-server-03:~# nano group.ldif
root@multi-server-03:~# cat group.ldif
dn: cn=testuser,ou=Group,dc=corp,dc=local
objectClass: posixGroup
cn: testuser
gidNumber: 10000

root@multi-server-03:~# nano user.ldif
root@multi-server-03:~# cat user.ldif
dn: uid=testuser,ou=People,dc=corp,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: testuser
cn: Test User
sn: User
uidNumber: 10000
gidNumber: 10000
homeDirectory: /home/testuser
loginShell: /bin/bash

root@multi-server-03:~# ldapadd -x -D "cn=admin,dc=corp,dc=local" -W -f group.ldif
Enter LDAP Password:
adding new entry "cn=testuser,ou=Group,dc=corp,dc=local"

root@multi-server-03:~# ldapadd -x -D "cn=admin,dc=corp,dc=local" -W -f user.ldif
Enter LDAP Password:
adding new entry "uid=testuser,ou=People,dc=corp,dc=local"
```

ldapaddで作成したユーザに対してパスワードを設定していきます。ldappasswdコマンドを使って設定を行っていきます。
```
root@multi-server-03:~# ldappasswd -x -D "cn=admin,dc=corp,dc=local" -W -S "uid=testuser,ou=People,dc=corp,dc=local"
New password:
Re-enter new password:
Enter LDAP Password:
```

### Kerberos（KDC）導入
以下のコマンドを使用してKerberosをインストールしていきます。
インストール時に色々入力が求められますが、以下のように入力します。（/etc/krb5.confで設定できるので間違っても問題ないです。）
- Default Kerberos version 5 realm → CORP.LOCAL
- Kerberos servers for your realm → multi-server-03.corp.local（サーバホスト名.ドメイン）
- Administrative server for your Kerberos realm → multi-server-03.corp.local（サーバホスト名.ドメイン）

```
root@multi-server-03:~# apt install krb5-kdc krb5-admin-server krb5-config -y
```

debconfの入力だけではrdnsとdomain_realmの部分までは入らないので、そこだけ手動で追記します。
kbr5.confは最終的に以下のように設定を入れます。
```
[libdefaults]
    default_realm = CORP.LOCAL
    rdns = false

[realms]
    CORP.LOCAL = {
        kdc = multi-server-03.corp.local
        admin_server = multi-server-03.corp.local
    }

[domain_realm]
    .local = CORP.LOCAL
    local = CORP.LOCAL
```

上記の編集をしたらREALMの初期化を行っていきます。
```
root@multi-server-03:~# cp -p /etc/krb5.conf /etc/krb5.conf.origin
root@multi-server-03:~# nano /etc/krb5.conf
root@multi-server-03:~# krb5_newrealm
```

Kerberos側にOpenLDAPで作成したユーザと同じ名前のプリンシパル（アカウント）を作成していきます。Kerberosで管理しているプリンシパル（アカウント）とOpenLDAPで管理しているアカウントが連携していく形になります。
```
root@multi-server-03:~# kadmin.local -q "addprinc testuser"
Authenticating as principal root/admin@CORP.LOCAL with password.
No policy specified for testuser@CORP.LOCAL; defaulting to no policy
Enter password for principal "testuser@CORP.LOCAL":
Re-enter password for principal "testuser@CORP.LOCAL":
Principal "testuser@CORP.LOCAL" created.
```

KDCと管理サーバを起動します。
```
root@multi-server-03:~# systemctl start krb5-kdc krb5-admin-server
root@multi-server-03:~# systemctl enable krb5-kdc krb5-admin-server
```

kinitやklistで動作確認を行います。
```
root@multi-server-03:~# kinit testuser
Password for testuser@CORP.LOCAL:
root@multi-server-03:~# klist
Ticket cache: FILE:/tmp/krb5cc_0
Default principal: testuser@CORP.LOCAL

Valid starting       Expires              Service principal
09/21/2026 05:33:08  09/21/2026 15:33:08  krbtgt/CORP.LOCAL@CORP.LOCAL
        renew until 09/22/2026 05:33:06
```

### Chrony導入
```
root@multi-server-03:~# apt install -y chrony
root@multi-server-03:~# systemctl start chrony
root@multi-server-03:~# systemctl enable chrony
```

設定ファイルを弄ります。
serverの設定を入れることで、Chronyが同期をしに行くサーバを指定しています。今回は日本の国立情報通信研究機構（NICT）が提供するNTPプールサーバのドメイン名を指定します。また、このChronyが時刻同期を受け付けるクライアントのネットワークを指定します。今回はホームラボのネットワークを指定しています。
```
root@multi-server-03:~# cp -p /etc/chrony/chrony.conf /etc/chrony/chrony.conf.origin
root@multi-server-03:~# nano /etc/chrony/chrony.conf
root@multi-server-03:~# diff /etc/chrony/chrony.conf /etc/chrony/chrony.conf.origin
20,25c20,23
< #pool ntp.ubuntu.com        iburst maxsources 4
< #pool 0.ubuntu.pool.ntp.org iburst maxsources 1
< #pool 1.ubuntu.pool.ntp.org iburst maxsources 1
< #pool 2.ubuntu.pool.ntp.org iburst maxsources 2
< pool ntp.nict.jp iburst
< allow 192.168.0.0/24
---
> pool ntp.ubuntu.com        iburst maxsources 4
> pool 0.ubuntu.pool.ntp.org iburst maxsources 1
> pool 1.ubuntu.pool.ntp.org iburst maxsources 1
> pool 2.ubuntu.pool.ntp.org iburst maxsources 2
```

設定を反映するために再起動します。
```
root@multi-server-03:~# systemctl restart chrony
```

国立情報通信研究機構（NICT）と連携できているか、時刻が正確化を確認します。
```
root@multi-server-03:~# chronyc sources
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* ntp-a3.nict.go.jp             1   6   377    52  +1114us[+1094us] +/- 4922us
^+ 2001:ce8:78::2                1   7   377   115    -65us[  -79us] +/- 9612us
^+ ntp-a2.nict.go.jp             1   7   377    53   -792us[ -812us] +/- 5658us
^+ ntp-a3.nict.go.jp             1   6   377    52  -1646us[-1666us] +/- 6869us

root@multi-server-03:~# timedatectl set-timezone Asia/Tokyo
root@multi-server-03:~# date
Mon Sep 21 04:12:53 PM JST 2026
```

## SSSD導入
OpenLDAPとKerberosを連携するためのSSSDを導入していきます。
```
root@multi-server-03:~# apt install -y sssd sssd-tools sssd-ldap sssd-krb5 libpam-sss libnss-sss
```

SSSDの設定ファイルを作成していきます。
idプロバイダーをOpenLDAP、認証プロバイダーをKerberosに設定しています。
今回は全部同じサーバ上で動かしているので、uriやserver設定のホストネームは同じものを指定しています。servicesでnssとpamを指定しているのはそれぞれ、システムがユーザ情報を引く際にSSSDを割り込ませるため、SSSDにパスワード認証処理を実行させるためになります。
作成したsssd.confに対してパーミッションや所有者等を修正していきます。
```
root@multi-server-03:~# nano /etc/sssd/sssd.conf
root@multi-server-03:~# cat /etc/sssd/sssd.conf
[sssd]
domains = corp.local
config_file_version = 2
services = nss, pam

[domain/corp.local]
id_provider = ldap
ldap_uri = ldap://multi-server-03.corp.local
ldap_search_base = dc=corp,dc=local

auth_provider = krb5
krb5_server = multi-server-03.corp.local
krb5_realm = CORP.LOCAL

cache_credentials = True
enumerate = False

root@multi-server-03:~# chmod 600 /etc/sssd/sssd.conf
root@multi-server-03:~# chown root:root /etc/sssd/sssd.conf
```

nsswitch.confファイルのpasswd,group,shadowにsssを追加します。
ここにsssが無いとLDAPで管理しているユーザを処理の対象としない状態になります。
```
root@multi-server-03:~# cat /etc/nsswitch.conf
# /etc/nsswitch.conf

passwd:         files systemd sss
group:          files systemd sss
shadow:         files systemd sss
```

PAM連携を有効化します。
「SSS authentication」と「Create home directory on login」にチェックを入れてOKを押します。他にもチェック入っているものがありますがそのままでOKです。
```
root@multi-server-03:~# pam-auth-update
```

SSSDを再起動したり、自動起動を有効化します。
```
root@multi-server-03:~# systemctl restart sssd
root@multi-server-03:~# systemctl enable sssd
```

# 動作確認
## OpenLDAP/SSSD/Kerberosサーバでの確認
testuserの情報を確認します。(teratermを別で起動してもOK)
それぞれの操作にエラーが無ければOpenLDAP/Kerberosで管理しているユーザが正しく認識されていることになります。
```
root@multi-server-03:~# getent passwd testuser
testuser:*:10000:10000:Test User:/home/testuser:/bin/bash
root@multi-server-03:~# id testuser
uid=10000(testuser) gid=10000(testuser) groups=10000(testuser)
root@multi-server-03:~# su - testuser
testuser@multi-server-03:~$ whoami
testuser
```

# 他のサーバでも同様のユーザでログインする場合※更新予定

長くなるので別記事で更新予定

