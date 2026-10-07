---
title: "KerberosチケットでSSHのパスワード入力を省く（SSH GSSAPI化）をやってみた"
date: 2026-10-03
tags: ["tool", "sssd", "Kerberos", "openldap", "SSO", "GSSAPI"]
source: "https://qiita.com/ohtsuka-shota/items/8901a64e6a404d4619ff"
---
# はじめに
こちらの記事（SSSD＋OpenLDAP＋Kerberosで、SSH・RDP・メールのログインを統合認証してみた）の続きとなります。

[[sssd-openldap-kerberos-unified-auth]]

前回までで「全サーバを同じ OpenLDAP/Kerberos のユーザでログインできる」ところまでは出来ました。ただしあれは認証の統合（一元管理）であって、ログインのたびに毎回パスワードは聞かれていました。つまり「どこでも同じパスワードが通る」だけで、「一度サインオンすれば以降は不要」という本来のSSO（シングルサインオン）にはなっていません。

本記事では、Kerberos で取得したチケット（TGT）を使って SSH のパスワード入力を省く（＝SSH GSSAPI化） ことで、統合認証基盤を本物のSSO にしていきます。

# ゴール（Before / After）

| | Before（前回まで） | After（本記事） |
|---|---|---|
| ログインに必要な資格情報 | 全サーバ共通（LDAP/Kerberos） | 同じ |
| **SSH 時のパスワード入力** | **毎回聞かれる** | **`kinit` 済みなら不要** |
| 認証に使うもの | パスワード | Kerberos チケット（TGS） |

Beforeの状態だと以下のようになります。
パスワードの入力が求められています。
```
testuser@client:~$ klist
Ticket cache: FILE:/tmp/krb5cc_10000_qI3Jym
Default principal: testuser@CORP.LOCAL

Valid starting       Expires              Service principal
2026-10-03T11:35:06  2026-10-03T21:35:06  krbtgt/CORP.LOCAL@CORP.LOCAL
	renew until 2026-10-04T11:35:06
    
testuser@client:~$ ssh testuser@multi-server-02.corp.local ★
The authenticity of host 'multi-server-02.corp.local (192.168.0.74)' can't be established.
ED25519 key fingerprint is SHA256:bFI/f8EwbXpdVZXrDTJXW1AUtaJ5wiq4AJSXhJPIfew.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'multi-server-02.corp.local' (ED25519) to the list of known hosts.
testuser@multi-server-02.corp.local's password: ★パスワード入力が求められる
```

これがSSO化すると以下のようになります。
一回kinitをしておくと、それをベースに認証を行います。
```
testuser@client:~$ klist
Ticket cache: FILE:/tmp/krb5cc_10000_qI3Jym
Default principal: testuser@CORP.LOCAL

Valid starting       Expires              Service principal
2026-10-03T11:22:31  2026-10-03T21:22:31  krbtgt/CORP.LOCAL@CORP.LOCAL
	renew until 2026-10-04T11:22:25

testuser@client:~$ ssh testuser@multi-server-02.corp.local ★
testuser@multi-server-02:/$ ★パスワード入力が求められずにそのままSSH接続できる
```

![Kerberos認証シーケンスとCLIコマンド対応図解.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/14ab88cb-ba00-47fa-be44-14bd7522551f.jpeg)

# 環境イメージ

今回は前回構築済みの環境をそのまま使います。KDC と SSH 先が別ホストになる構成です。

| 役割 | ホスト | 備考 |
|---|---|---|
| クライアント（SSH する側） | Ubuntu Desktop | 前回 krb5-user / SSSD 導入済み |
| KDC | `multi-server-03.corp.local` | Kerberos 稼働中。`krb5-admin-server` も稼働 |
| SSH 先（SSH される側） | `multi-server-02.corp.local`（メールサーバ） | 今回 host/ プリンシパル＋keytab を用意 |




# 用語
## Keytab
Kerberosプリンシパルの秘密鍵をファイルに保存しておくものです。「パスワードを打つ代わりに、鍵そのものをファイルに置いておく」仕組み、と考えると分かりやすいです。
※Felo AIで生成
![Keytabファイル認証図解.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/184da2da-12ff-4004-a1f0-3077ba0f35fb.jpeg)


## kadm5.aclファイル
「誰がKDCに対してどんな管理操作をしてよいか」を決めるアクセス制御リスト（ACL）ファイル。
kadmind（krb5-admin-server）が、リモート kadmin の要求を受け取ったときに「この人に許可していいか」を判断するために読みます。

## GSSAPI
アプリケーションが特定の認証方式やプロトコルに依存せず、安全なセキュリティ機能を利用できるようにする標準インターフェイス（フレームワーク）
※Felo AIで生成
![GSSAPIとKerberosの関係図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/66bea14c-998c-4e99-8a88-f3c9d7cf8bcb.jpeg)


# 手順
## Kerberos(Admin Server)での設定投入など
SSOでログインできるようにしたいサーバ（今回は multi-server-02）を設定していく前の準備として、別ホストからKDCを操作するためのリモート kadmin 用の管理プリンシパルをKDC側で用意します。これはOSのユーザではなく、KDCで管理するKerberosプリンシパルです。

Kerberosが稼働しているサーバで以下のコマンドを実行します。
```
root@multi-server-03:~# kadmin.local -q "addprinc root/admin"
Authenticating as principal testuser/admin@CORP.LOCAL with password.
No policy specified for root/admin@CORP.LOCAL; defaulting to no policy
Enter password for principal "root/admin@CORP.LOCAL":
Re-enter password for principal "root/admin@CORP.LOCAL":
Principal "root/admin@CORP.LOCAL" created.
```

作成出来ているかを確認します。
```
root@multi-server-03:~# kadmin.local -q "listprincs"
Authenticating as principal testuser/admin@CORP.LOCAL with password.
K/M@CORP.LOCAL
kadmin/admin@CORP.LOCAL
kadmin/changepw@CORP.LOCAL
krbtgt/CORP.LOCAL@CORP.LOCAL
root/admin@CORP.LOCAL
testuser@CORP.LOCAL
```

kadm5.aclを確認します。デフォルトでは*/admin *がコメントアウトされていると思うので、コメントアウトを外してリモートからの操作を受け付けるようにします。
```
root@multi-server-03:~# cp -p /etc/krb5kdc/kadm5.acl /etc/krb5kdc/kadm5.acl.origin
root@multi-server-03:~# nano /etc/krb5kdc/kadm5.acl
root@multi-server-03:~# diff /etc/krb5kdc/kadm5.acl /etc/krb5kdc/kadm5.acl.origin
6c6
< */admin *
---
> # */admin *
```

設定ファイルを編集したので、反映するためにkrb5-admin-serverをリスタートします。
```
root@multi-server-03:~# systemctl restart krb5-admin-server
```

## SSOしたいサーバでの設定投入
SSOしたいサーバ上にkadminコマンドがインストールされていることを前提に、以下のコマンドを実行して、host/プリンシパルを作成します。
- -p root/admin … さっき作った管理プリンシパルで接続（ACLで認可される）
- -randkey … ランダム鍵で作成（人間パスワードにしない＝Kerberoast対策。ここ重要）
- host/multi-server-02.corp.local … このサーバのSSHサービス用プリンシパル
```
root@multi-server-02:~# kadmin -p root/admin -q "addprinc -randkey host/multi-server-02.corp.local"
Authenticating as principal root/admin with password.
Password for root/admin@CORP.LOCAL:
No policy specified for host/multi-server-02.corp.local@CORP.LOCAL; defaulting to no policy
Principal "host/multi-server-02.corp.local@CORP.LOCAL" created.
```

この状態でプリンシパルが作成されているかをKDC側で確認します。
host/multi-server-02.corp.localがあることがわかります。
```
root@multi-server-03:~# kadmin.local -q "listprincs"
Authenticating as principal testuser/admin@CORP.LOCAL with password.
K/M@CORP.LOCAL
host/multi-server-02.corp.local@CORP.LOCAL
kadmin/admin@CORP.LOCAL
kadmin/changepw@CORP.LOCAL
krbtgt/CORP.LOCAL@CORP.LOCAL
root/admin@CORP.LOCAL
testuser@CORP.LOCAL
```

次にSSOしたいサーバでKeytabを払い出します。
```
root@multi-server-02:~# kadmin -p root/admin -q "ktadd host/multi-server-02.corp.local"
Authenticating as principal root/admin with password.
Password for root/admin@CORP.LOCAL:
Entry for principal host/multi-server-02.corp.local with kvno 2, encryption type aes256-cts-hmac-sha1-96 added to keytab FILE:/etc/krb5.keytab.
Entry for principal host/multi-server-02.corp.local with kvno 2, encryption type aes128-cts-hmac-sha1-96 added to keytab FILE:/etc/krb5.keytab.
```

keytabの中身を見てみます。
2つエントリが入っていますが、これは暗号化方式ごとに1つずつ鍵が登録されているためです。方式は aes256-cts-hmac-sha1-96 と aes128-cts-hmac-sha1-96 の2つで、いずれも共通鍵暗号方式です（公開鍵ではなく、KDCとこのサーバだけが持つ秘密の共有鍵です）。
```
root@multi-server-02:~# klist -ke /etc/krb5.keytab
Keytab name: FILE:/etc/krb5.keytab
KVNO Principal
---- --------------------------------------------------------------------------
   2 host/multi-server-02.corp.local@CORP.LOCAL (aes256-cts-hmac-sha1-96)
   2 host/multi-server-02.corp.local@CORP.LOCAL (aes128-cts-hmac-sha1-96)
root@multi-server-02:~# ls -l /etc/krb5.keytab
-rw------- 1 root root 188 Oct  3 00:33 /etc/krb5.keytab
```

次にsshdでGSSAPIを有効化します。GSSAPIAuthenticationとGSSAPICleanupCredentialsのコメントアウトを外してyesに設定します。
```
root@multi-server-02:~# cp -p /etc/ssh/sshd_config /etc/ssh/sshd_config.origin
root@multi-server-02:~# nano /etc/ssh/sshd_config
root@multi-server-02:~# diff /etc/ssh/sshd_config /etc/ssh/sshd_config.origin
80,81c80,81
< GSSAPIAuthentication yes
< GSSAPICleanupCredentials yes
---
> #GSSAPIAuthentication no
> #GSSAPICleanupCredentials yes
```

設定反映後、sshdをrestartします。
```
root@multi-server-02:~# systemctl restart ssh
```

/etc/hostsを以下のように修正します。
```
root@multi-server-02:~# cat /etc/hosts
127.0.0.1 localhost
127.0.1.1 multi-server-02.corp.local multi-server-02 test02.local test02
```

## SSH接続元の設定
今回はUbuntu24.04 Desktopになりますが、こちらでも設定ファイルを弄って、GSSAPIを使うようにしていきます。
```
root@target:~# cp -p /etc/ssh/ssh_config /etc/ssh/ssh_config.origin
root@target:~# nano /etc/ssh/ssh_config
root@target:~# diff /etc/ssh/ssh_config /etc/ssh/ssh_config.origin
54,57d53
< 
< Host multi-server-02.corp.local
<     GSSAPIAuthentication yes
<     GSSAPIDelegateCredentials yes
```

# 動作確認
Ubuntu DesktopにKDCで管理しているユーザでRDPを行います。
その後、SSH対象にSSH接続を試みると、パスワードの入力が求められないまま行けるようになるはずです。
```
testuser@client:~$ kinit testuser
Password for testuser@CORP.LOCAL: 
testuser@client:~$ klist
Ticket cache: FILE:/tmp/krb5cc_10000_qI3Jym
Default principal: testuser@CORP.LOCAL

Valid starting       Expires              Service principal
2026-10-03T11:22:31  2026-10-03T21:22:31  krbtgt/CORP.LOCAL@CORP.LOCAL
	renew until 2026-10-04T11:22:25

testuser@client:~$ ssh testuser@multi-server-02.corp.local
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.8.0-138-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Sat Oct  3 02:46:16 AM UTC 2026

  System load:            0.0
  Usage of /:             43.4% of 14.66GB
  Memory usage:           11%
  Swap usage:             0%
  Processes:              136
  Users logged in:        1
  IPv4 address for ens18: 192.168.0.74
  IPv6 address for ens18: 2407:c800:2f21:d7c::c
  IPv6 address for ens18: 2407:c800:2f21:d7c:be24:11ff:fe41:69b6

 * Canonical Workshop gives developers fast, composable, reproducible, and
   secure developer environments that are perfect for agentic workflows.

   https://ubuntu.com/workshop

Expanded Security Maintenance for Applications is not enabled.

58 updates can be applied immediately.
To see these additional updates run: apt list --upgradable

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status

New release '26.04.1 LTS' available.
Run 'do-release-upgrade' to upgrade to it.


*** System restart required ***

The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.


The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

Last login: Mon Sep 21 13:28:33 2026 from 127.0.0.1
Could not chdir to home directory /home/testuser: Permission denied
-bash: /home/testuser/.bash_profile: Permission denied
testuser@multi-server-02:/$ 
```

# ハマりどころ

今回、動作するまでに踏んだ代表的な落とし穴を2つ記録しておきます。

## 1. SSH先のAレコード登録漏れ ＋ キャッシュDNSのネガティブキャッシュ

**症状**：クライアントからSSHしようとすると名前解決で失敗する。
ssh: Could not resolve hostname multi-server-02.corp.local: Name or service not known


**原因**：権威DNSに `multi-server-02` のAレコードを登録し忘れていた。さらに、登録前に一度問い合わせて `NXDOMAIN` が返っていたため、キャッシュDNS（192.168.0.53）がその「存在しない」結果を**ネガティブキャッシュ**（このゾーンのSOA最小TTL＝86400秒＝1日）として保持。権威DNSにレコードを足して再起動しても、クライアントはキャッシュDNS経由なので古い結果を掴んだままだった。

**対応①：権威DNS（192.168.0.51）にAレコード追加＋SOAシリアル更新**
multi-server-02       IN  A   192.168.0.74
named-checkzone corp.local /etc/bind/db.corp.local
systemctl restart bind9


**対応②：キャッシュDNS（192.168.0.53）のネガティブキャッシュをフラッシュ**
root@cache-dns:~# rndc flush        # rndcが無ければ systemctl restart bind9
root@cache-dns:~# dig +short multi-server-02.corp.local @127.0.0.1
192.168.0.74

> レコードを足した**権威DNSだけでなく、古い“存在しない”を覚えているキャッシュDNS側を消す**のがポイント。

## 2. `hostname -f` がFQDNを返さず、GSSAPIが通らない

**症状**：DNSは直りSSH接続はできるが、GSSAPIが使われず**パスワード認証に落ちる**。
debug1: Authentications that can continue: publickey,gssapi-keyex,gssapi-with-mic,password
debug2: we sent a gssapi-with-mic packet, wait for reply
testuser@multi-server-02.corp.local's password:

クライアント側は正常（`kvno host/multi-server-02.corp.local` が `kvno = 2` を返す）、時刻ずれもなし、keytabのkvnoも一致。それでも受理されない。

**原因**：SSH先（multi-server-02）で `hostname -f` が**FQDNではなく短縮名 `multi-server-02`** を返していた。sshdはGSSAPI受理時に自分の正規名を確認する（`GSSAPIStrictAcceptorCheck`）が、チケットの宛先 `host/multi-server-02.corp.local` と自分の認識（`multi-server-02`）が一致せず弾いていた。元をたどると `/etc/hosts` で短縮名が先頭、FQDNが末尾の別名になっていたため。

NG：先頭が短縮名 → hostname -f は短縮名を返す
127.0.1.1 multi-server-02 test02.local test02 multi-server-02.corp.local


**対応**：`/etc/hosts` で**FQDNを先頭**に並べ替える（IP直後の最初の名前が正式名、2つ目以降は別名）。※手順の `/etc/hosts` 修正はこの対応を反映済み。

OK：FQDNが先頭
127.0.1.1 multi-server-02.corp.local multi-server-02 test02.local test02
root@multi-server-02:~# hostname -f
multi-server-02.corp.local

これで `ssh testuser@multi-server-02.corp.local` がパスワードなしで通る。

> GSSAPIは「**SSH先が自分のFQDNを正しく名乗れること**」が前提。DNSのAレコード（他者が見つけるため）とは別に、ローカルの `/etc/hosts`（自分が名乗るため）も要確認。

