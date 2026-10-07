---
title: "SSH接続ユーザーのコマンド実行結果をAuditで記録する"
date: 2025-01-29
tags: ["countermeasure", "SSH", "Security", "ログ", "audit", "監査"]
source: "https://qiita.com/ohtsuka-shota/items/c1c2544e46d44006cc04"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

今回はauditを使ってユーザが実行したコマンドをロギングする環境の作り方を書いていこうと思います。

# 用語について（AIからの出力）
この辺りをイメージできていると、導入イメージが湧きやすいのかなと個人的には思いました。
とは言いつつ、これをカキカキしながら「難しい・・・」と思っています💦
## audit
Linuxの監査ログを管理するデーモンです。システムの重要な操作（ファイルアクセス、ユーザー認証、コマンド実行など）を記録し、不正アクセスや設定ミスの調査に役立ちます。

## PAM
### PAMフレームワークとは？
PAM（Pluggable Authentication Modules）フレームワークは、Linux/Unix の認証を柔軟に管理する仕組み です。
アプリケーション（例: sshd, login, sudo など）と認証方式（例: パスワード, 生体認証, 2FA）を 分離 し、設定を変更するだけで認証方法を簡単にカスタマイズできます。
### PAMフレームワークの仕組み
アプリケーション（sshd, login, sudo など）が認証を要求
PAMライブラリ（libpam.so） が適切な PAMモジュール を呼び出す
PAMモジュール（pam_unix.so, pam_tty_audit.so など）が認証を処理
📌 設定ファイル: /etc/pam.d/ ディレクトリ内の各アプリケーション用の設定ファイル（例: sshd, login, sudo）

### PAMの主な構成
- PAMライブラリ (libpam.so)
 アプリケーションからの認証リクエストを処理する基盤
- PAMモジュール（/lib/security/*.so）
具体的な認証方式を実装（例: pam_unix.so → パスワード認証, pam_google_authenticator.so → 2FA）
- PAM設定ファイル（/etc/pam.d/）
どのアプリケーションがどの認証モジュールを使うかを定義


# 構築環境
OS:ubuntu22.04
まず、以下のような環境を作っていき、/var/log/audit/audit.logに対してログイン認証のログを取れるようにしたいと思います。
![security-ページ15.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/10af0b3b-f5a2-12ad-e93e-aadd9b536590.png)


この環境が構築出来た後、追加でルールを定義してユーザが実行したコマンドもログに吐き出すようにしていきたいと思います。
![security-ページ16.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d7ddf64f-200f-52d2-3b13-1946cbe95948.png)


# 手順
ubuntu22.04はデフォルトでauditがインストールされていない状態であったため、インストールしていきます。
auditdをインストールすると、audit関係のツールであるauditctlやausearch,aureport等をまるっとインストールできます。
インストール後auditctl -s（audit システムにおける現在の監査設定を表示するコマンド）を実行して出力があることを確認します。
```
root@shota-20f5a2v5jp:~# apt update && apt upgrade -y
root@shota-20f5a2v5jp:~# apt install -y auditd
root@shota-20f5a2v5jp:~# auditctl -s
enabled 1
failure 1
pid 21885
rate_limit 0
backlog_limit 8192
lost 0
backlog 0
backlog_wait_time 60000
backlog_wait_time_actual 0
loginuid_immutable 0 unlocked
```
インストール確認後、startとenableを実行しておきます。
```
root@shota-20f5a2v5jp:~# systemctl start auditd
root@shota-20f5a2v5jp:~# systemctl enable auditd
Synchronizing state of auditd.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.
Executing: /usr/lib/systemd/systemd-sysv-install enable auditd
```
PAMの設定ファイルを編集していきます。
/etc/pam.d/配下にsshというファイルとloginというファイルがあるので、これを編集します。
ここに設定を追記することで、ssh接続およびコンソールログイン（普通のPCみたいなログインの仕方のこと）してきたユーザに対してpam_tty_audit.so（PAMフレームワークのモジュールの1つ）を有効化して、認証等のログを残すように設定します。
```
root@shota-20f5a2v5jp:~# cd /etc/pam.d/
root@shota-20f5a2v5jp:/etc/pam.d# ls
chfn                   common-auth                    cups      ppp        sddm-autologin  sudo
chpasswd               common-password                login     runuser    sddm-greeter    sudo-i
chrome-remote-desktop  common-session                 newusers  runuser-l  sshd            xrdp-sesman
chsh                   common-session-noninteractive  other     samba      su
common-account         cron                           passwd    sddm       su-l

root@shota-20f5a2v5jp:/etc/pam.d# cat sshd
～中略～
# 2025/1 sshでログインしたユーザの認証などをログに残す設定
session required pam_tty_audit.so enable=test,root log_passwd

root@shota-20f5a2v5jp:/etc/pam.d# cat login
～中略～
# 2025/1 コンソールログインしたユーザの認証などをログに残す設定
session required pam_tty_audit.so enable=test,root log_passwd
```

それぞれのファイルについては以下。
※タイトルのようにssh接続ユーザのコマンド実行ログだけほしいなら不要のはずです。
- SSHログインの監視: `/etc/pam.d/sshd`
- ローカルログインの監視: `/etc/pam.d/login`

設定内容については以下。
- session required pam_tty_audit.so
pam_tty_audit.so モジュールがセッション開始時に読み込まれ、ttyを使用したセッションの監視が開始されます。この設定により、ユーザーがログインした際のコマンド実行やセッションの開始が監視される（最もコマンド実行のログに関しては後述のaudit.rulesに記載しないと残らない様子。）

- enable=test,root
この設定により、監査対象としてtestとrootユーザーが指定されています。他のユーザーのセッションは監査対象になっていない。

- log_passwd
通常、パスワードはセキュリティのためにログに記録されませんが、このオプションを有効にすると、コマンドログにパスワードの入力内容も含めて記録されるようになる。

設定を反映するためにauditdとsshdを再起動していきます。
```
root@shota-20f5a2v5jp:/etc/pam.d# systemctl restart auditd
root@shota-20f5a2v5jp:/etc/pam.d# systemctl restart sshd
```
上記の設定を入れておくと、認証系のログが/var/log/audit/audit.logに記載されるようになる。
以下のログはshotaユーザがSSHでログインした際に出力されたものです。
```
root@shota-20f5a2v5jp:~# cat /var/log/audit/audit.log | grep -i shota
type=USER_AUTH msg=audit(1738140096.263:742): pid=73783 uid=0 auid=4294967295 ses=4294967295 subj=unconfined msg='op=PAM:authentication grantors=pam_permit,pam_cap acct="shota" exe="/usr/sbin/sshd" hostname=192.168.0.24 addr=192.168.0.24 terminal=ssh res=success'UID="root" AUID="unset"
type=USER_ACCT msg=audit(1738140096.334:743): pid=73783 uid=0 auid=4294967295 ses=4294967295 subj=unconfined msg='op=PAM:accounting grantors=pam_permit acct="shota" exe="/usr/sbin/sshd" hostname=192.168.0.24 addr=192.168.0.24 terminal=ssh res=success'UID="root" AUID="unset"
type=CRED_ACQ msg=audit(1738140096.337:744): pid=73783 uid=0 auid=4294967295 ses=4294967295 subj=unconfined msg='op=PAM:setcred grantors=pam_permit,pam_cap acct="shota" exe="/usr/sbin/sshd" hostname=192.168.0.24 addr=192.168.0.24 terminal=ssh res=success'UID="root" AUID="unset"
type=LOGIN msg=audit(1738140096.338:745): pid=73783 uid=0 subj=unconfined old-auid=4294967295 auid=1000 tty=(none) old-ses=4294967295 ses=330 res=1UID="root" OLD-AUID="unset" AUID="shota"
type=SYSCALL msg=audit(1738140096.338:745): arch=c000003e syscall=1 success=yes exit=4 a0=3 a1=7ffdeb9982d0 a2=4 a3=0 items=0 ppid=73718 pid=73783 auid=1000 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=330 comm="sshd" exe="/usr/sbin/sshd" subj=unconfined key=(null)ARCH=x86_64 SYSCALL=write AUID="shota" UID="root" GID="root" EUID="root" SUID="root" FSUID="root" EGID="root" SGID="root" FSGID="root"
type=USER_START msg=audit(1738140096.450:746): pid=73783 uid=0 auid=1000 ses=330 subj=unconfined msg='op=PAM:session_open grantors=pam_selinux,pam_loginuid,pam_keyinit,pam_permit,pam_umask,pam_unix,pam_systemd,pam_mail,pam_limits,pam_env,pam_env,pam_selinux,pam_tty_audit acct="shota" exe="/usr/sbin/sshd" hostname=192.168.0.24 addr=192.168.0.24 terminal=ssh res=success'UID="root" AUID="shota"
type=CRED_ACQ msg=audit(1738140096.454:747): pid=73858 uid=0 auid=1000 ses=330 subj=unconfined msg='op=PAM:setcred grantors=pam_permit,pam_cap acct="shota" exe="/usr/sbin/sshd" hostname=192.168.0.24 addr=192.168.0.24 terminal=ssh res=success'UID="root" AUID="shota"
type=USER_LOGIN msg=audit(1738140096.505:748): pid=73783 uid=0 auid=1000 ses=330 subj=unconfined msg='op=login id=1000 exe="/usr/sbin/sshd" hostname=192.168.0.24 addr=192.168.0.24 terminal=/dev/pts/3 res=success'UID="root" AUID="shot " ID="shota"
```
今回やりたいことはユーザが実行したコマンドをログのに残すことになるのでaudit.rulesに設定を追加していきます。
まず、auditctl -lを実行して何も出力がされなければ、ルールが何も定義されていないという事を示します。
```
root@shota-20f5a2v5jp:/etc/pam.d# auditctl -l
No rules
```
audit.rulesに設定を追加していきます。
登録にあたりユーザのUIDが必要になりますので、それを確認すために/etc/passwdを見て確認します。
今回はrootが0、shotaが1000であることがわかります。
```
root@shota-20f5a2v5jp:~# cat /etc/passwd | grep root
root:x:0:0:root:/root:/bin/bash
root@shota-20f5a2v5jp:~# cat /etc/passwd | grep shota
shota:x:1000:1000:shota:/home/shota:/bin/bash
```
audit.rulesに設定を追記していきます。
execveというのはシステムコール(プログラムの実行)を監視するものです。
```
root@shota-20f5a2v5jp:~# vi /etc/audit/rules.d/audit.rules
root@shota-20f5a2v5jp:~# cat /etc/audit/rules.d/audit.rules
～中略～
# 2025/1 rootとshotaがどのようなコマンドを実行したかをログに記載するために追記
-a always,exit -F arch=b64 -F euid=0 -S execve -k root_command
-a always,exit -F arch=b32 -F euid=0 -S execve -k root_command
-a always,exit -F arch=b64 -F euid=1000 -S execve -k shota_command
-a always,exit -F arch=b32 -F euid=1000 -S execve -k shota_command
```
auditctl -Rはauditdに対して、指定したルールファイルの内容を適用するためのコマンドです。
auditctl -lで定義したルールが出力されたことを確認して、auditdにリスタートをかけます。
```
root@shota-20f5a2v5jp:~# auditctl -R /etc/audit/rules.d/audit.rules
No rules
enabled 1
failure 1
pid 30306
rate_limit 0
backlog_limit 8192
lost 0
backlog 3
backlog_wait_time 60000
backlog_wait_time_actual 0
enabled 1
failure 1
pid 30306
rate_limit 0
backlog_limit 8192
lost 0
backlog 4
backlog_wait_time 60000
backlog_wait_time_actual 0
enabled 1
failure 1
pid 30306
rate_limit 0
backlog_limit 8192
lost 0
backlog 4
backlog_wait_time 60000
backlog_wait_time_actual 0
root@shota-20f5a2v5jp:/etc/audit/rules.d# auditctl -l
-a always,exit -F arch=b64 -S execve -F euid=0 -F key=root_command
-a always,exit -F arch=b32 -S execve -F euid=0 -F key=root_command
-a always,exit -F arch=b64 -S execve -F euid=1000 -F key=shota_command
-a always,exit -F arch=b32 -S execve -F euid=1000 -F key=shota_command
root@shota-20f5a2v5jp:~# systemctl restart auditd
```
ここまで実行するとユーザとそのユーザが実行したコマンドがログに記載されるようになります。
ausearchでよりわかりやすくどのようにコマンドを実行したかユーザごとに判断することが出来るます。
わかりづらいですがausearchをつかわずとｍ、/var/log/audit/audit.logにも類似のログが確認できます。
```
root@shota-20f5a2v5jp:~# ausearch -k root_command

----
time->Mon Jan 27 20:17:43 2025
type=PROCTITLE msg=audit(1737976663.594:810): proctitle=636174002F6574632F61756469742F72756C65732E642F61756469742E72756C6573
type=PATH msg=audit(1737976663.594:810): item=1 name="/lib64/ld-linux-x86-64.so.2" inode=2393191 dev=08:02 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_fp=0 cap_fi=0 cap_fe=0 cap_fver=0 cap_frootid=0
type=PATH msg=audit(1737976663.594:810): item=0 name="/usr/bin/cat" inode=2359760 dev=08:02 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_fp=0 cap_fi=0 cap_fe=0 cap_fver=0 cap_frootid=0
type=CWD msg=audit(1737976663.594:810): cwd="/"
type=EXECVE msg=audit(1737976663.594:810): argc=2 a0="cat" a1="/etc/audit/rules.d/audit.rules"
type=BPRM_FCAPS msg=audit(1737976663.594:810): fver=0 fp=0 fi=0 fe=0 old_pp=000001fffffeffff old_pi=0 old_pe=000001fffffeffff old_pa=0 pp=000001fffffeffff pi=0 pe=000001fffffeffff pa=0 frootid=0
type=SYSCALL msg=audit(1737976663.594:810): arch=c000003e syscall=59 success=yes exit=0 a0=5ad440126a40 a1=5ad440126980 a2=5ad440126998 a3=8 items=2 ppid=31777 pid=31782 auid=4294967295 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=4294967295 comm="cat" exe="/usr/bin/cat" subj=unconfined key="root_command"

～中略～
----
time->Mon Jan 27 20:19:49 2025
type=PROCTITLE msg=audit(1737976789.017:831): proctitle=6175736561726368002D6B00726F6F745F636F6D6D616E64
type=PATH msg=audit(1737976789.017:831): item=1 name="/lib64/ld-linux-x86-64.so.2" inode=2393191 dev=08:02 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_fp=0 cap_fi=0 cap_fe=0 cap_fver=0 cap_frootid=0
type=PATH msg=audit(1737976789.017:831): item=0 name="/usr/sbin/ausearch" inode=2366111 dev=08:02 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_fp=0 cap_fi=0 cap_fe=0 cap_fver=0 cap_frootid=0
type=CWD msg=audit(1737976789.017:831): cwd="/root"
type=EXECVE msg=audit(1737976789.017:831): argc=3 a0="ausearch" a1="-k" a2="root_command"
type=SYSCALL msg=audit(1737976789.017:831): arch=c000003e syscall=59 success=yes exit=0 a0=5c2f788ee7b0 a1=5c2f7888dae0 a2=5c2f788a7c30 a3=5c2f7888dae0 items=2 ppid=30566 pid=31817 auid=1000 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=pts2 ses=161 comm="ausearch" exe="/usr/sbin/ausearch" subj=unconfined key="root_command"
```


尚、pam_tty_audit.soのログは16進数エンコードされているため、audit.logをtailしてもそのまま目視確認できません。aureport --ttyするとデコードして入力コマンドを確認することができます。

