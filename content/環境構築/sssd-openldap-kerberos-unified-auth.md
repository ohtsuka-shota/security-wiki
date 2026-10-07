---
title: "SSSD＋OpenLDAP＋Kerberosで、SSH・RDP・メールのログインを統合認証してみた"
date: 2026-09-22
tags: ["tool", "Kerberos", "sssd", "openldap", "Desktop", "LDAP"]
source: "https://qiita.com/ohtsuka-shota/items/6f7b71568ac6810383d2"
---
# はじめに

こちらの記事の続きとなります。
今ホームラボにメールサーバ・Desktop・メールサーバ等があるので、これらにログイン・操作する際にそれぞれの環境のローカルユーザではなくOpenLDAP/Kerberosで管理しているユーザでログインするためにはどのような設定をしなければいけないかということを確認していきたいと思います。

※本記事は認証統合まで。取得したチケットを使ったパスワード不要のSSO化（SSH GSSAPI等）は別記事で扱う

[[openldap-kerberos-sssd-homelab]]

# 環境イメージ
今回は以下のような環境になります。
上記記事はOpenLDAP/Kerberosが乗っているサーバに対してそれらが管理しているユーザでログインが出来ることを確認しました。今回はOpenLDAP/Kerberosが稼働しているサーバではないサーバに対してSSH/RDP/Thunderbirdによるログイン・操作をする環境をどうやって用意するのかをまとめます。
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img01.png)

# 環境構築
## メールサーバ（Ubuntu24.04）へのSSH接続
### Kerberosクライアント導入
Kerberosクライアントを導入していきます。今回はkrb5-userというパッケージをインストールします。
REALMが聞かれますが、Kerberosで設定したCORP.LOCALと入力します。また、Serverの事を聞かれますが、Kerberosが動いているサーバ（私の場合multi-server-03.corp.local）と入力します。
※間違ってしまっても/etc/krb5.confで修正可能です。
```
root@multi-server-02:~# apt install -y krb5-user
```

Kerberosの設定ファイルを開いて編集していきます。
```
root@multi-server-02:~# cp -p /etc/krb5.conf /etc/krb5.conf.origin
root@multi-server-02:~# nano /etc/krb5.conf
```

以下の内容を入力します。
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

Kerberos単体でTGTが取得できるか確認します。
klistで出力があればKerberosと連携できている状態になります。
```
root@multi-server-02:~# kinit testuser
Password for testuser@CORP.LOCAL:
root@multi-server-02:~# klist
Ticket cache: FILE:/tmp/krb5cc_0
Default principal: testuser@CORP.LOCAL

Valid starting       Expires              Service principal
09/21/2026 12:45:11  09/21/2026 22:45:11  krbtgt/CORP.LOCAL@CORP.LOCAL
        renew until 09/22/2026 12:45:09
```

### SSSDの導入
SSSDを導入します。以下のコマンドでインストールします。
```
root@multi-server-02:~# apt install -y sssd sssd-tools sssd-ldap sssd-krb5 libpam-sss libnss-sss
```

SSSDの設定ファイルを編集していきます。
編集しましたらsssd.confのパーミッションや所有者などを変更します。
```
root@multi-server-02:~# nano /etc/sssd/sssd.conf
root@multi-server-02:~# cat /etc/sssd/sssd.conf
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

root@multi-server-02:~# chmod 600 /etc/sssd/sssd.conf
root@multi-server-02:~# chown root:root /etc/sssd/sssd.conf
```

nsswitch.confにsssの設定が記載されていることを確認します。
```
root@multi-server-02:~# cat /etc/nsswitch.conf
# /etc/nsswitch.conf
#
# Example configuration of GNU Name Service Switch functionality.
# If you have the `glibc-doc-reference' and `info' packages installed, try:
# `info libc "Name Service Switch"' for information about this file.

passwd:         files systemd sss
group:          files systemd sss
shadow:         files systemd sss
gshadow:        files systemd

hosts:          files dns
networks:       files

protocols:      db files
services:       db files sss
ethers:         db files
rpc:            db files

netgroup:       nis sss
automount:  sss
```

PAM連携を有効化します（「SSS authentication」「Create home directory on login」にチェック）。
```
root@multi-server-02:~# pam-auth-update
```

SSSDを再起動・自動起動を有効にします。
```
root@multi-server-02:~# systemctl restart sssd
root@multi-server-02:~# systemctl enable sssd
```

動作確認します。
```
root@multi-server-02:~# getent passwd testuser
testuser:*:10000:10000:Test User:/home/testuser:/bin/bash
root@multi-server-02:~# id testuser
uid=10000(testuser) gid=10000(testuser) groups=10000(testuser)
root@multi-server-02:~# ssh testuser@localhost
testuser@multi-server-02:/$ whoami
testuser
```

## 動作確認
自分のローカルPCからそれぞれのメールサーバにOpenLDAP/Kerberosで管理しているユーザでTeratermでログインします。問題なくログイン出来るはずです。
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img02.png)

## Thunderbirdでのメールアカウントログイン
Thunderbirdを起動します。
名前にOpenLDAP/Kerberosで管理しているアカウント、メールアドレスに左記アカウント@ドメインを入力します。その後手動設定を押下します。
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img03.png)

IMAPを選択した状態でアカウントをセットアップボタンを押下します。
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img04.png)

以下の設定画面が表示されます。
私の今のメールサーバの環境では以下のように設定していきます。
※Thunderbirdの自動設定では、ユーザー名欄にメールアドレス全体（testuser@test01.local）が入ってしまうことがあります。この状態だと、SSSD/LDAP側にはtestuser@test01.localというユーザは存在せず、testuserというユーザーしか存在しないため認証エラーになります。ユーザー名欄をtestuserのみに修正してください（恒久対応としてはDovecot側でauth_username_format = %nを設定し、自動的に@以降を切り落とす方法もあります）。

**受信サーバ（IMAP）:**
- サーバー名: mail.test01.local（メールサーバのホスト名）
- ポート: 143
- 接続の保護: 証明書が無ければ接続の保護なし（自己署名証明書があればSTARTTLS＋証明書例外の承認）
- 認証方式: 通常のパスワード認証
- ユーザー名: testuser（OpenLDAP/Kerberosで管理しているユーザ）

**送信サーバ（SMTP）:**
- サーバー名: mail.test01.local（メールサーバのホスト名）
- ポート: 587
- 接続の保護: 上記と同様
- 認証方式: 通常のパスワード認証
- ユーザー名: testuser（OpenLDAP/Kerberosで管理しているユーザ）
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img05.png)

アカウントが見つかって正しいパスワードを入力すると、Thunderbird上でログインができるはずです。
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img06.png)

## 動作確認
OpenLDAP/Kerberosで管理しているユーザからもう一方のメールサーバにメールを送付します。
結果は以下のように遅れていることから問題なさそうです。
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img07.png)

## Ubuntu DesktopへのRDP接続（ubuntu24.04）
XRDPでRDP接続できる環境である場合、基本的にはSSH接続の時と設定手順は変わりません。

### Kerberosクライアント導入
Kerberosクライアントを導入していきます。今回はkrb5-userというパッケージをインストールします。
REALMが聞かれますが、Kerberosで設定したCORP.LOCALと入力します。また、Serverの事を聞かれますが、Kerberosが動いているサーバ（私の場合multi-server-03.corp.local）と入力します。
※間違ってしまっても/etc/krb5.confで修正可能です。

```
root@client:~# apt install -y krb5-user
root@client:~# cp -p /etc/krb5.conf /etc/krb5.conf.origin
root@client:~# nano /etc/krb5.conf
```

以下の内容を入力します。
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

Kerberos単体でTGTが取得できるか確認します。
klistで出力があればKerberosと連携できている状態になります。
```
root@client:~# kinit testuser
Password for testuser@CORP.LOCAL: 
root@client:~# klist
Ticket cache: FILE:/tmp/krb5cc_0
Default principal: testuser@CORP.LOCAL

Valid starting       Expires              Service principal
2026-09-22T00:07:52  2026-09-22T10:07:52  krbtgt/CORP.LOCAL@CORP.LOCAL
	renew until 2026-09-23T00:07:50
```

### SSSDの導入
SSSDを導入します。以下のコマンドでインストールします。
```
root@client:~# apt install -y sssd sssd-tools sssd-ldap sssd-krb5 libpam-sss libnss-sss
```

SSSDの設定ファイルを編集していきます。
編集しましたらsssd.confのパーミッションや所有者などを変更します。
```
root@client:~# nano /etc/sssd/sssd.conf
root@client:~# cat /etc/sssd/sssd.conf
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

root@client:~# chmod 600 /etc/sssd/sssd.conf
root@client-02:~# chown root:root /etc/sssd/sssd.conf
```

nsswitch.confにsssの設定が記載されていることを確認します。
```
root@client:~# cat /etc/nsswitch.conf
# /etc/nsswitch.conf
#
# Example configuration of GNU Name Service Switch functionality.
# If you have the `glibc-doc-reference' and `info' packages installed, try:
# `info libc "Name Service Switch"' for information about this file.

passwd:         files systemd sss
group:          files systemd sss
shadow:         files systemd sss
gshadow:        files systemd

hosts:          files dns
networks:       files

protocols:      db files
services:       db files sss
ethers:         db files
rpc:            db files

netgroup:       nis sss
automount:  sss
```

PAM連携を有効化します（「SSS authentication」「Create home directory on login」にチェック）。
```
root@client:~# pam-auth-update
```

SSSDを再起動・自動起動を有効にします。
```
root@client:~# systemctl restart sssd
root@client:~# systemctl enable sssd
```

動作確認します。
```
root@client:~# getent passwd testuser
testuser:*:10000:10000:Test User:/home/testuser:/bin/bash
root@client:~# id testuser
uid=10000(testuser) gid=10000(testuser) groups=10000(testuser)
root@client:~# ssh testuser@localhost
testuser@client:/$ whoami
testuser
```

## 動作確認
自分のローカルPCからUbuntu DesktopにOpenLDAP/Kerberosで管理しているユーザでRDPでログインします。問題なくログイン出来るはずです。
DesktopだろうがServerだろうが同じ手順でOpenLDAP/Kerberos管理に持っていけるのはありがたいですね。
![](環境構築/sssd-openldap-kerberos-unified-auth-images/img08.png)

![](環境構築/sssd-openldap-kerberos-unified-auth-images/img09.png)

