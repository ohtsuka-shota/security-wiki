---
title: "OpenLDAP + SSSDでLinuxのSSO環境を構築する"
date: 2026-08-02
tags: ["tool", "openldap", "sssd", "Ubuntu24.04", "Linux", "SSO"]
source: "[[openldap-sssd-sso]]"
---
# 用語
## OpenLDAP
オープンソースのLDAPサーバー実装。ユーザーやグループの情報を階層構造で管理するディレクトリサービスで、認証基盤として広く使われる。

## SSSD (System Security Services Daemon)
LinuxシステムがLDAPやKerberosなどの外部認証プロバイダーと通信するためのデーモン。認証情報のキャッシュ機能も持ち、ネットワーク障害時でもログインを可能にする。
SSSDはLDAPプロトコルを使ってOpenLDAPなどのディレクトリサーバーと通信します。

## SSO (Single Sign-On)
一度のログインで複数のシステムやサービスにアクセスできる仕組み。ユーザーはパスワードを何度も入力する手間が省け、管理者側も認証を一元管理できる。

![UPDATE_TEXT Image.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5c46f720-b026-4679-afde-095e7d783853.jpeg)

# 環境構築
## OpenLDAPサーバ構築
ライブラリやモジュールなどの更新と、OpenLDAPサーバを作るのに必要なものをインストールしていきます。
```
root@multi-server:~# apt update && apt upgrade -y
root@multi-server:~# apt install -y slapd ldap-utils
```

以下の画面が出てきます。LDAPを管理するadminユーザのパスワードの設定を求められています。任意のパスワードを設定します。今回はpasswordというパスワードを設定しておきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b9203cb1-9232-48b6-945c-036ced9b7392.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7d147a49-6464-4d31-b9c7-38d41c37b2e1.png)

先程インストールしたの slapd（OpenLDAPのサーバーデーモン）を 再設定するコマンドを実行していきます。
```
root@multi-server:~# dpkg-reconfigure slapd
```
以下の画面が表示されます。omitは省略するという意味らしいです。
今回はこの画面でコンフィグをある程度作成していくので、NOを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1b696ec2-049f-4fbc-b891-0d406a61fae5.png)

ドメインを聞かれます。
これはLDAPディレクトリのベースドメインネームを作るための値とのこと。
今回はtest01.localとし、このドメインのユーザを管理していきたいと思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0ff7ebee-2f62-4186-a17e-a5cc5f0cae76.png)

組織の名前を求められます。今回はtest01という名前の組織名にしたいと思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/354c8dbd-a213-4397-9a2b-befb13ac5099.png)

設定の反映の為にLDAPのadminユーザのパスワードを求められます。
先程設定したパスワードを入力していきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1eb8a77b-9f22-4615-a04d-2ad550d70877.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ad80e4e8-7403-4e52-8a28-e9b14818e196.png)

slapdを削除した時にDBも一緒に削除するかを聞かれました。
今回はNoとして削除されないようにしたいと思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/75974dca-abd8-4a26-abde-b4136418f354.png)

既に存在するDBを削除するかを聞かれます。
さっきapt install slapdをした際に既に一回作成されているとかいないとか・・・
Yesで行きたいと思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/639a356a-9288-4a74-862c-ffbc002ff897.png)

以下のコマンドで現在の設定を確認します。
dn: dc=test01,dc=localと出力されることを確認します。
```
root@multi-server:~# slapcat
dn: dc=test01,dc=local
objectClass: top
objectClass: dcObject
objectClass: organization
o: test01
dc: test01
structuralObjectClass: organization
entryUUID: 30c5931c-2134-1041-8a85-4d1f6a16b8b8
creatorsName: cn=admin,dc=test01,dc=local
createTimestamp: 20260731140220Z
entryCSN: 20260731140220.146293Z#000000#000#000000
modifiersName: cn=admin,dc=test01,dc=local
modifyTimestamp: 20260731140220Z
```

このドメインにドメインユーザを追加していきます。
まずpeopleという入れ物とgroupsという入れ物を作っていきます。
```
root@multi-server:~# cat base.ldif
dn: ou=people,dc=test01,dc=local
objectClass: organizationalUnit
ou: people

dn: ou=groups,dc=test01,dc=local
objectClass: organizationalUnit
ou: groups
```

これを取り込んでいきます。
-x：認証方式の指定（Simple認証を使うという意味（SASL認証を使わない））
-D：誰としてログインして操作するか。今回はtest01.localドメインを作成したデフォルトのadminユーザ
-W：パスワードプロンプトの表示
-f：ファイルの指定
```
root@multi-server:~# ldapadd -x -D "cn=admin,dc=test01,dc=local" -W -f base.ldif
Enter LDAP Password:（←これがパスワードプロンプト）
adding new entry "ou=people,dc=test01,dc=local"

adding new entry "ou=groups,dc=test01,dc=local"

```

取り込んだことでこういう状態になります。
```
dc=test01,dc=local (ドメイン・会社全体)
├── ou=people (社員を入れる入れ物)
└── ou=groups (グループ情報を入れ物)
```

slapcatで以下のように2つの項目が表示されていればOK
```
root@multi-server:~# slapcat
dn: dc=test01,dc=local
objectClass: top
objectClass: dcObject
objectClass: organization
o: test01
dc: test01
structuralObjectClass: organization
entryUUID: 30c5931c-2134-1041-8a85-4d1f6a16b8b8
creatorsName: cn=admin,dc=test01,dc=local
createTimestamp: 20260731140220Z
entryCSN: 20260731140220.146293Z#000000#000#000000
modifiersName: cn=admin,dc=test01,dc=local
modifyTimestamp: 20260731140220Z

dn: ou=people,dc=test01,dc=local
objectClass: organizationalUnit
ou: people
structuralObjectClass: organizationalUnit
entryUUID: 7f47d372-2136-1041-93a7-8f6b21566ddb
creatorsName: cn=admin,dc=test01,dc=local
createTimestamp: 20260731141850Z
entryCSN: 20260731141850.855667Z#000000#000#000000
modifiersName: cn=admin,dc=test01,dc=local
modifyTimestamp: 20260731141850Z

dn: ou=groups,dc=test01,dc=local
objectClass: organizationalUnit
ou: groups
structuralObjectClass: organizationalUnit
entryUUID: 7f486ad0-2136-1041-93a8-8f6b21566ddb
creatorsName: cn=admin,dc=test01,dc=local
createTimestamp: 20260731141850Z
entryCSN: 20260731141850.859558Z#000000#000#000000
modifiersName: cn=admin,dc=test01,dc=local
modifyTimestamp: 20260731141850Z
```

ドメインユーザを作成していきます。
slappasswdというコマンドを使って、ドメインユーザに付与するパスワードをハッシュ化します。今回の場合{SSHA}VgKDbEKxeC1XonPkNdfYF3DK6a/Jm4w3がそれになるので、控えておきます。
```
root@multi-server:~# slappasswd
New password:passwordと入力
Re-enter new password:passwordと入力
{SSHA}VgKDbEKxeC1XonPkNdfYF3DK6a/Jm4w3
```

user.ldifというファイルを用意していきます。
```
root@multi-server:~# cat user.ldif
dn: uid=testuser,ou=people,dc=test01,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: testuser
cn: Test User
sn: User
uidNumber: 10001
gidNumber: 10001
homeDirectory: /home/testuser
loginShell: /bin/bash
userPassword: {SSHA}VgKDbEKxeC1XonPkNdfYF3DK6a/Jm4w3
```
| 項目 | 説明 |
|---|---|
| dn | `ou=people,dc=test01,dc=local`配下に作る、このエントリの識別名(住所) |
| objectClass: inetOrgPerson | 「人物(氏名・連絡先など)」を表すオブジェクトクラス |
| objectClass: posixAccount | Linux/Unixログインに必要な属性(UID番号、ホームディレクトリなど)を使えるようにするオブジェクトクラス |
| objectClass: shadowAccount | パスワード有効期限などのシャドウ情報を扱えるようにするオブジェクトクラス |
| uid | ログインID(ユーザー名) |
| cn | 表示名(フルネーム) |
| sn | 姓(surname、`inetOrgPerson`で必須の属性) |
| uidNumber | LinuxのUID相当の番号(重複不可) |
| gidNumber | 所属するLinuxのGID相当の番号 |
| homeDirectory | ログイン先サーバーでのホームディレクトリパス |
| loginShell | ログイン時に使うシェル |
| userPassword | `slappasswd`で生成したパスワードのハッシュ値 |

登録と確認を行います。
```
root@multi-server:~# ldapadd -x -D "cn=admin,dc=test01,dc=local" -W -f user.ldif
Enter LDAP Password:
adding new entry "uid=testuser,ou=people,dc=test01,dc=local"

root@multi-server:~# slapcat
中略
dn: uid=testuser,ou=people,dc=test01,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: testuser
cn: Test User
sn: User
uidNumber: 10001
gidNumber: 10001
homeDirectory: /home/testuser
loginShell: /bin/bash
userPassword:: e1NTSEF9VmdLRGJFS3hlQzFYb25Qa05kZllGM0RLNmEvSm00dzM=
structuralObjectClass: inetOrgPerson
entryUUID: 4cbb2d96-213b-1041-93a9-8f6b21566ddb
creatorsName: cn=admin,dc=test01,dc=local
createTimestamp: 20260731145313Z
entryCSN: 20260731145313.531499Z#000000#000#000000
modifiersName: cn=admin,dc=test01,dc=local
modifyTimestamp: 20260731145313Z
```


## クライアント側の設定
ライブラリ等のアップデートと、OpenLDAPのクライアントになるために必要なものをインストールしていきます。
```
root@multi-server-02:~# apt update && apt upgrade -y
root@multi-server-02:~# apt install -y sssd sssd-ldap ldap-utils sssd-tools
```

サーバをドメインに参加させるためのファイルを作成します。
今回は/etc/sssd/sssd.confというファイルを作成していきました。
内容は以下となります。。
```
root@multi-server-02:/etc/sssd# cat sssd.conf
[sssd]
config_file_version = 2
services = nss, pam
domains = test01.local
debug_level = 9

[domain/test01.local]
id_provider = ldap
auth_provider = ldap
ldap_uri = ldap://192.168.0.73
ldap_search_base = dc=test01,dc=local
ldap_tls_reqcert = never
ldap_id_use_start_tls = False
ldap_auth_disable_tls_never_use_in_production = True
cache_credentials = True
enumerate = False
debug_level = 9
```
それぞれの項目と意味については以下となります。
| 項目 | 意味 |
|---|---|
| services | 有効化する機能(nss=名前解決、pam=認証) |
| domains | 使用するドメイン名(任意の識別子) |
| id_provider | ユーザー情報の取得元 → LDAP |
| auth_provider | 認証の実行元 → LDAP |
| ldap_uri | LDAPサーバーの接続先URL |
| ldap_search_base | 検索対象のベースDN |
| ldap_tls_reqcert | TLS証明書チェックの要否(検証環境なので`never`) |
| cache_credentials | オフライン時も直近の認証情報をキャッシュして使えるようにする |
| enumerate | 全ユーザー一覧を取得するか(通常はFalse推奨) |
| debug_level | ログの詳細度(0〜9、9が最も詳細。トラブルシュート時に使用) |
| ldap_id_use_start_tls | ユーザー情報検索時にStartTLS(暗号化)を使うかどうか(`False`で平文接続) |
| ldap_auth_disable_tls_never_use_in_production | パスワード認証時にStartTLSを要求しない設定(検証専用、本番では絶対使用不可) |

設定を反映するために再起動をしていきます。
```
root@multi-server-02:/etc/sssd# chmod 600 /etc/sssd/sssd.conf
root@multi-server-02:/etc/sssd# systemctl enable --now sssd
Synchronizing state of sssd.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.
Executing: /usr/lib/systemd/systemd-sysv-install enable sssd
root@multi-server-02:/etc/sssd# systemctl status sssd
● sssd.service - System Security Services Daemon
     Loaded: loaded (/usr/lib/systemd/system/sssd.service; enabled; preset: enabled)
     Active: active (running) since Sun 2026-08-02 00:20:14 UTC; 3s ago
   Main PID: 42381 (sssd)
      Tasks: 4 (limit: 4600)
     Memory: 45.2M (peak: 45.4M)
        CPU: 59ms
     CGroup: /system.slice/sssd.service
             tq42381 /usr/sbin/sssd -i --logger=files
             tq42407 /usr/libexec/sssd/sssd_be --domain test01.local --uid 0 --gid 0 --logger=files
             tq42408 /usr/libexec/sssd/sssd_nss --uid 0 --gid 0 --logger=files
             mq42409 /usr/libexec/sssd/sssd_pam --uid 0 --gid 0 --logger=files
```

passwd,group,shadowにsssがあることを確認します。
ここにsssが無いとLDAPで管理しているユーザを対象としない状態になってしまいます。
```
root@multi-server-02:/etc/sssd# cat /etc/nsswitch.conf
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

ドメインユーザに対して反応があることを確認します。
```
root@multi-server-02:/etc/sssd# getent passwd testuser
testuser:*:10001:10001:Test User:/home/testuser:/bin/bash
root@multi-server-02:/etc/sssd# cat /etc/passwd | grep -i testuser
root@multi-server-02:/etc/sssd#(出力無し)
```

ログインしたユーザに対してhomeディレクトリをデフォルトで作成する設定を入れておきます。
```
root@multi-server-02:/etc/sssd# pam-auth-update --enable mkhomedir
```

## 動作確認
Teratermを使ってLDAPユーザにログイン出来ることを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d1cc0841-15c3-4537-805c-4dc4fab183ea.png)

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c9d0e48c-4912-4665-b062-78d74a179690.png)


