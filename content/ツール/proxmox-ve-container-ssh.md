---
title: "Proxmox VE上のコンテナにSSH接続する"
date: 2023-10-03
tags: ["tool", "Ubuntu", "SSH", "lxc", "proxmox", "container"]
source: "[[proxmox-ve-container-ssh]]"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

前回、PVE上にubuntu22.04のtemplateを使ったコンテナをデプロイしました。

[[proxmox-ve-container-deploy]]

今回はこのコンテナに対してssh接続していきます。
※やっていることはかなり簡単ですが、接続出来ずに焦ったので備忘録です。

# 手順
まず、PVE上のコンソールを使ってコンテナに接続します。
systemctl status sshを実行するとinactiveとなっております。
![image (43).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/490c15bc-022d-c69c-3741-fe279b50e6e7.png)
systemctl start sshを実行してactiveにします。
![image (44).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3bbb1e3d-8584-7c2a-a954-0cf6370bed3b.png)
ubuntuはrootでssh接続するのを拒否する設定になっているので、これを無効化してrootユーザでssh出来るようにします。
以下のコマンドを入力し、sshをrestartします。
※PVEのコンソールでコピペできます。
```
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
systemctl restart ssh
```
![image (45).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5bd65f37-1de0-f3c4-35a8-eb51f07b3cd7.png)

これでssh接続出来るようになります。
コンテナのIPアドレス、rootユーザ、設定したパスワードでログイン可能です。
外部との接続もできます。
![image (46).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4b1b98a2-25de-1a70-1c66-9cec7854115e.png)

# 余談的なもの
今回はPVEのコンソールから操作しましたが、lxcコマンドを使って操作することも可能です。
PVEにssh接続した後以下の様なlxcコマンドを使うことで接続可能です。
lxc-lsでLXCコンテナ一覧を取得。今回のコンテナは101という名前で認識されていることが分かります。
lxc-console -nでコンテナを指定して、後はユーザ名・パスワードでログイン出来ます。
```
root@pve03:~# lxc-ls
101
root@pve03:~# lxc-info -n 101
Name:           101
State:          RUNNING
PID:            2206
IP:             192.168.2.101
Link:           veth101i0
 TX bytes:      10.89 KiB
 RX bytes:      4.57 MiB
 Total bytes:   4.58 MiB
root@pve03:~# lxc-console -n 101

Connected to tty 2
Type <Ctrl+a q> to exit the console, <Ctrl+a Ctrl+a> to enter Ctrl+a itself

Ubuntu 22.04 LTS firstLXC tty2

firstLXC login: root
Password:
Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.102-1-pve x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage
Last login: Tue Oct  3 12:55:21 UTC 2023 from 192.168.2.65 on pts/3
root@firstLXC:~#
```



