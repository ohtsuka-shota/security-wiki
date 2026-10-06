---
title: "ubuntu22.04でKerberosサーバを構築"
date: 2025-02-17
tags: ["tool", "Ubuntu", "Security", "Kerberos", "LPIC303"]
source: "[[ubuntu-kerberos-server]]"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

今回はubuntu22.04でKerberosサーバを構築する手順をメモって行きたいと思います。

# 手順
まず、以下のコマンドを実行し更新を行ったり、kerberos環境を作るにあたり必要なものをインストールしていきます。

```
root@kerberos:~# apt update && apt upgrade -y
root@kerberos:~# apt install -y krb5-kdc krb5-admin-server krb5-user
```

1. **krb5-kdc**
役割: Key Distribution Center (KDC)
説明: このパッケージは、Kerberosの主要なコンポーネントの一つであるKDCを提供します。KDCは、ユーザーやサービスに対してチケットを発行する役割を担っています。KDCは、主に以下の2つの機能を持っています。
Authentication Service (AS): ユーザーがログインする際に、初期の認証を行い、チケットを発行します。
Ticket Granting Service (TGS): ユーザーが特定のサービスにアクセスする際に、そのためのチケットを発行します。
2. **krb5-admin-server**
役割: Kerberos管理サーバー
説明: このパッケージは、KDCの管理機能を提供します。具体的には、ユーザーやサービスの追加、削除、パスワードの変更などの管理操作を行うためのインターフェースを提供します。通常、kadmin コマンドを使用して管理作業を行います。
3. **krb5-user**
役割: Kerberosクライアント
説明: このパッケージは、Kerberosクライアントの機能を提供します。ユーザーがKerberosを使用して認証を行うために必要なツールやライブラリを含んでいます。具体的には、kinit、klist、kdestroy などのコマンドが含まれており、これらを使用してチケットの取得、表示、削除ができます。

インストールを実行すると途中で以下のような画面になります。ここに入力するのは、Kerberos環境で使用するレルム名です。一般的には、組織のドメイン名を大文字で記述します。
例えば、ドメイン名が `example.com` の場合、ここには `EXAMPLE.COM` と入力します。
今回は検証環境ですので、EXAMPLE.COMとしています。
![01image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c2e0f627-a5a7-466b-9d2c-23eb17b29082.png)
上記入力を完了して次に進むと別のメッセージが表示されます。
ここにはKerberos KDCサーバーのホスト名を入力します。
今回はkerberosとしました。
![02image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c42dbfe9-765a-40dd-bcfb-6866a6590892.png)
上記入力を完了して次に進むと別のメッセージが表示されます。
ここには、Kerberos管理用のサーバーのホスト名を入力します。KDCと同じサーバーが管理サーバーとしても機能しているのであれば、KDCのホスト名と同じものを入力すればOKの様です。
![04image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/56bdfb45-c850-4220-b07e-38b61207e778.png)

この後、上記で設定したホスト名を名前解決できるようにしなければなりません。
私の環境では検証用のDNSサーバを用意していなかったのでサーバ自身の/etc/hostsを編集して名前解決できるようにしました。
下2行が追記したものです。ping等で名前解決できているかを確認しましょう。
```
root@kerberos:~# vi /etc/hosts
root@kerberos:~# cat /etc/hosts
127.0.0.1       localhost

# The following lines are desirable for IPv6 capable hosts
::1     ip6-localhost   ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
ff02::3 ip6-allhosts
127.0.1.1       ubuntu-jammy    ubuntu-jammy

127.0.2.1 kerberos kerberos

# Add new line for Kerberos
192.168.0.118 kerberos.example.com kerberos
```

次にKerberosの設定ファイルを少し編集していきます。
★マークのところが要確認・追記した部分になります。
```
root@kerberos:~# cp -p /etc/krb5.conf /etc/krb5.conf.org
root@kerberos:~# vi /etc/krb5.conf
root@kerberos:~# cat /etc/krb5.conf
[libdefaults]
        default_realm = EXAMPLE.COM ★

# The following krb5.conf variables are only for MIT Kerberos.
        kdc_timesync = 1
        ccache_type = 4
        forwardable = true
        proxiable = true
        
[realms]
        EXAMPLE.COM = {
                kdc = kerberos ★
                admin_server = kerberos ★
        }
        
[domain_realm]
        .mit.edu = ATHENA.MIT.EDU
        mit.edu = ATHENA.MIT.EDU
        .media.mit.edu = MEDIA-LAB.MIT.EDU
        media.mit.edu = MEDIA-LAB.MIT.EDU
        .csail.mit.edu = CSAIL.MIT.EDU
        csail.mit.edu = CSAIL.MIT.EDU
        .whoi.edu = ATHENA.MIT.EDU
        whoi.edu = ATHENA.MIT.EDU
        .stanford.edu = stanford.edu
        .slac.stanford.edu = SLAC.STANFORD.EDU
        .toronto.edu = UTORONTO.CA
        .utoronto.ca = UTORONTO.CA
        .example.com = EXAMPLE.COM ★
        example.com = EXAMPLE.COM ★
```
上記が終わりましたらkrb5_newrealmコマンドを使ってKDCのデータベースを初期化していきます。
```
root@kerberos:~# krb5_newrealm
This script should be run on the master KDC/admin server to initialize
a Kerberos realm.  It will ask you to type in a master key password.
This password will be used to generate a key that is stored in
/etc/krb5kdc/stash.  You should try to remember this password, but it
is much more important that it be a strong password than that it be
remembered.  However, if you lose the password and /etc/krb5kdc/stash,
you cannot decrypt your Kerberos database.
Loading random data
Initializing database '/var/lib/krb5kdc/principal' for realm 'EXAMPLE.COM',
master key name 'K/M@EXAMPLE.COM'
You will be prompted for the database Master Password.
It is important that you NOT FORGET this password.
Enter KDC database master key:(passwordと入力)
Re-enter KDC database master key to verify:（passwordと入力）


Now that your realm is set up you may wish to create an administrative
principal using the addprinc subcommand of the kadmin.local program.
Then, this principal can be added to /etc/krb5kdc/kadm5.acl so that
you can use the kadmin program on other computers.  Kerberos admin
principals usually belong to a single user and end in /admin.  For
example, if jruser is a Kerberos administrator, then in addition to
the normal jruser principal, a jruser/admin principal should be
created.

Don't forget to set up DNS information so your clients can find your
KDC and admin servers.  Doing so is documented in the administration
guide.
```

KDCにユーザを追加していきます。
kadmin.localコマンドでKDCの管理コンソールを開きます。
addprincコマンドでユーザを追加します。
以下はtestユーザを追加した例です。
```
root@kerberos:~# kadmin.local
Authenticating as principal root/admin@EXAMPLE.COM with password.
kadmin.local:  addprinc test
No policy specified for test@EXAMPLE.COM; defaulting to no policy
Enter password for principal "test@EXAMPLE.COM":
Re-enter password for principal "test@EXAMPLE.COM":
Principal "test@EXAMPLE.COM" created.
kadmin.local:  exit
```

KDCと管理サーバを起動します。
```
root@kerberos:~# systemctl enable krb5-kdc
Synchronizing state of krb5-kdc.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install enable krb5-kdc
root@kerberos:~# systemctl enable krb5-admin-server
Synchronizing state of krb5-admin-server.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install enable krb5-admin-server
root@kerberos:~# systemctl start krb5-kdc
root@kerberos:~# systemctl start krb5-admin-server
root@kerberos:~# systemctl status krb5-kdc
● krb5-kdc.service - Kerberos 5 Key Distribution Center
     Loaded: loaded (/lib/systemd/system/krb5-kdc.service; enabled; vendor preset: enabled)
     Active: active (running) since Sun 2025-02-16 11:12:18 UTC; 7min ago
   Main PID: 1502 (krb5kdc)
      Tasks: 1 (limit: 2309)
     Memory: 1.5M
        CPU: 108ms
     CGroup: /system.slice/krb5-kdc.service
             mq1502 /usr/sbin/krb5kdc -P /var/run/krb5-kdc.pid
root@kerberos:~# systemctl status krb5-admin-server
● krb5-admin-server.service - Kerberos 5 Admin Server
     Loaded: loaded (/lib/systemd/system/krb5-admin-server.service; enabled; vendor preset: enabled)
     Active: active (running) since Sun 2025-02-16 11:12:20 UTC; 7min ago
   Main PID: 1510 (kadmind)
      Tasks: 1 (limit: 2309)
     Memory: 636.0K
        CPU: 107ms
     CGroup: /system.slice/krb5-admin-server.service
             mq1510 /usr/sbin/kadmind -nofork
```
最後にKerberosの動作を確認していきます。
kinitコマンドでチケットが取得できることを確認。
klistで取得したチケットの内容が出力されればOKです。
```
root@kerberos:~# kinit test
Password for test@EXAMPLE.COM:

root@kerberos:~# klist
Ticket cache: FILE:/tmp/krb5cc_0
Default principal: test@EXAMPLE.COM

Valid starting     Expires            Service principal
02/16/25 11:20:59  02/16/25 21:20:59  krbtgt/EXAMPLE.COM@EXAMPLE.COM
        renew until 02/17/25 11:20:56
```

