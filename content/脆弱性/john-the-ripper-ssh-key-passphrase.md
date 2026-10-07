---
title: "John the Ripperを用いた秘密鍵パスフレーズの解析"
date: 2025-01-25
tags: ["vulnerability", "Security", "公開鍵認証", "JohntheRipper"]
source: "https://qiita.com/ohtsuka-shota/items/66264c5b762215fe53fe"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

John the Ripperというツールを使うとクラッキングを比較的容易に行うことが出来ます。
以前Kali Linux上のOSユーザのハッシュ化されたパスワードをJohnを使用してクラッキングしました。

[[john-the-ripper-os-password-cracking]]

今回はここから少し発展させて、公開鍵認証で使用している秘密鍵のパスフレーズを解析していきたいと思います。

:::note alert
悪用厳禁

自分のシステムや許可された環境でのみ実行する必要があります。他人のシステムやデータに対して行うと、不正アクセス禁止法などに抵触する可能性があります。
:::

# 検証環境
今回検証する環境はいになります。全部VirtualBox上のVMとして起動させています。
UbuntuのCUI環境を2台用意し、片方をPC役とし、もう一方をサーバ役とします。
PC役にはohtsukaというユーザがいて、そのユーザはサーバ役にログインする際、ohtsukaユーザ自身の秘密鍵を使っています。ログインが成功するとサーバ上のvagrantユーザとして操作が出来るようになります。（このvagrantユーザはvagrantで仮想マシンを立ち上げるときにデフォルトで用意されるユーザです。）

攻撃役にはKali Linuxを用意し、攻撃者にohtsukaの秘密鍵の情報が何らかの原因で漏れてしまった。
その後のKaliの攻撃手順について試してみて、まとめます。

![security.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1bb98586-b606-316d-c6a2-d36ac002ea2d.png)

# 環境構築
## Kali Linuxを用意する
以下Qiita記事を作っております。
参考下さい。

https://qiita.com/ohtsuka-shota/items/df6228ebf18cbc2add72

## Vagrantを使ってUbunutuを2台立ち上げる
普通に立ち上げるのも良いのですが、面倒だったのでサクッと構築できるVagrantで立ち上げます。
Vagrantを使用しないで、普通にVMを用意するならこの辺りは飛ばしてください。

PC役とサーバ役のVagrantfileをそれぞれvagrant initで用意します。
```
shota@shota-20f5a2v5jp:~/ドキュメント$ mkdir vagrant_mypc
shota@shota-20f5a2v5jp:~/ドキュメント$ mkdir vagrant_mysrv
shota@shota-20f5a2v5jp:~/ドキュメント$ cd vagrant_mypc
shota@shota-20f5a2v5jp:~/ドキュメント/vagrant_mypc$ vagrant init
A `Vagrantfile` has been placed in this directory. You are now
ready to `vagrant up` your first virtual environment! Please read
the comments in the Vagrantfile as well as documentation on
`vagrantup.com` for more information on using Vagrant.
shota@shota-20f5a2v5jp:~/ドキュメント/vagrant_mypc$ ls
Vagrantfile
shota@shota-20f5a2v5jp:~/ドキュメント/vagrant_mypc$ cp -p Vagrantfile Vagrantfile.bak
shota@shota-20f5a2v5jp:~/ドキュメント/vagrant_mypc$ cd ../vagrant_mysrv
shota@shota-20f5a2v5jp:~/ドキュメント/vagrant_mysrv$ vagrant init
A `Vagrantfile` has been placed in this directory. You are now
ready to `vagrant up` your first virtual environment! Please read
the comments in the Vagrantfile as well as documentation on
`vagrantup.com` for more information on using Vagrant.
shota@shota-20f5a2v5jp:~/ドキュメント/vagrant_mysrv$ ls
Vagrantfile
shota@shota-20f5a2v5jp:~/ドキュメント/vagrant_mysrv$ cp -p Vagrantfile Vagrantfile.bak
```
サーバ役のVagrantfileの中身は以下としました。
```
Vagrant.configure("2") do |config|
  # 使用するボックス（Ubuntu 22.04）
  config.vm.box = "ubuntu/jammy64"

  # 仮想マシンのリソース設定
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"  # メモリ設定
    vb.cpus = 2         # CPU設定
  end

  # ネットワーク設定（ブリッジ接続）とIPアドレスの固定化
  config.vm.network "public_network", bridge: "wlp4s0", ip: "192.168.0.115"

  # 仮想マシンのホスト名を設定
  config.vm.hostname = "mysrv"

  # 仮想マシン名の設定
  config.vm.define "mysrv" do |mysrv|
    # 仮想マシンを起動した際に実行するシェルスクリプト
    mysrv.vm.provision "shell", inline: <<-SHELL
      sudo apt-get update
      echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
      echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf
    SHELL
  end
end
```

PC役のVagrantfileの中身は以下としました。
```
Vagrant.configure("2") do |config|
  # 使用するボックス（Ubuntu 22.04）
  config.vm.box = "ubuntu/jammy64"

  # 仮想マシンのリソース設定
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"  # メモリ設定
    vb.cpus = 2         # CPU設定
  end

  # ネットワーク設定（ブリッジ接続）とIPアドレスの固定化
  config.vm.network "public_network", bridge: "wlp4s0", ip: "192.168.0.114"

  # 仮想マシンのホスト名を設定
  config.vm.hostname = "mypc"

  # 仮想マシン名の設定
  config.vm.define "mypc" do |mypc|
    # 仮想マシンを起動した際に実行するシェルスクリプト
    mypc.vm.provision "shell", inline: <<-SHELL
      sudo apt-get update
      echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
      echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf
    SHELL
  end
end
```
vagrant upを実行して起動していきます。
結果は以下となります。
```
shota@shota-20f5a2v5jp:~/ドキュメント$ vagrant global-status
id       name   provider   state   directory
-----------------------------------------------------------------------
61ff572  mypc   virtualbox running /home/shota/ドキュメント/vagrant_mypc
91c9000  mysrv  virtualbox running /home/shota/ドキュメント/vagrant_mysrv

The above shows information about all known Vagrant environments
on this machine. This data is cached and may not be completely
up-to-date (use "vagrant global-status --prune" to prune invalid
entries). To interact with any of the machines, you can go to that
directory and run Vagrant, or you can use the ID directly with
Vagrant commands from any directory. For example:
"vagrant destroy 1a2b3c4d"
```
GUIでも作成出来ていることを確認します。
※スクショは電源オフとなっており、上記コマンドと出力結果に矛盾がありますがスクショを取ったタイミングの問題です。気にしないで頂ければと思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5f4b15ae-1a36-1690-6e3e-c58422e800b2.png)

## 公開鍵認証環境の用意
PC役からサーバ役に対して公開鍵認証を使ってSSH出来る環境を準備していきます。
以下私が過去に挙げた記事を参考にしつつ準備をしていきます。

https://qiita.com/ohtsuka-shota/items/cf4591e5a5c6427bf1bf

PC側で検証用のohtsukaユーザと、そのユーザの秘密鍵・公開鍵を作成します。
vagrantで立ち上げた仮想マシンに対してvagrant sshコマンドでログインして、ユーザ作成→カギ作成をしています。
カギ作成時に聞かれたパスフレーズはザ・脆弱性の"password"としました。
（クラッキングをするまでも無いですが・・・）
```
shota@shota-20f5a2v5jp:~$ vagrant ssh 61ff572
Welcome to Ubuntu 22.04.5 LTS (GNU/Linux 5.15.0-130-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Sat Jan 25 03:20:35 UTC 2025

  System load:             0.11
  Usage of /:              4.3% of 38.70GB
  Memory usage:            9%
  Swap usage:              0%
  Processes:               102
  Users logged in:         0
  IPv4 address for enp0s3: 10.0.2.15
  IPv6 address for enp0s3: fd00::e5:4ff:fe58:6a0c


Expanded Security Maintenance for Applications is not enabled.

12 updates can be applied immediately.
11 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status

New release '24.04.1 LTS' available.
Run 'do-release-upgrade' to upgrade to it.


Last login: Sat Jan 25 03:10:03 2025 from 10.0.2.2

vagrant@mypc:~$ sudo su -
root@mypc:~# adduser ohtsuka
Adding user `ohtsuka' ...
Adding new group `ohtsuka' (1002) ...
Adding new user `ohtsuka' (1002) with group `ohtsuka' ...
Creating home directory `/home/ohtsuka' ...
Copying files from `/etc/skel' ...
New password:
Retype new password:
passwd: password updated successfully
Changing the user information for ohtsuka
Enter the new value, or press ENTER for the default
        Full Name []:
        Room Number []:
        Work Phone []:
        Home Phone []:
        Other []:
Is the information correct? [Y/n] Y
root@mypc:~# gpasswd -a ohtsuka sudo
Adding user ohtsuka to group sudo


root@mypc:~# sudo su ohtsuka
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

ohtsuka@mypc:/root$ cd
ohtsuka@mypc:~$ pwd
/home/ohtsuka
ohtsuka@mypc:~$ ssh-keygen -t rsa -b 2048
Generating public/private rsa key pair.
Created directory '/home/ohtsuka/.ssh'.
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/ohtsuka/.ssh/id_rsa
Your public key has been saved in /home/ohtsuka/.ssh/id_rsa.pub
The key fingerprint is:
SHA256:Ea8A3lr+YXYYNRDvCvPgqREgc2hrik0/J23Hw3QkATw ohtsuka@mypc
The key's randomart image is:
+---[RSA 2048]----+
|    ....=oo      |
| . . oE  * .     |
|+.o . +.+ +      |
|.+.. + . O       |
| o. o = S +      |
|+o . + & =       |
|o . = * O        |
|     B . .       |
|    .            |
+----[SHA256]-----+
ohtsuka@mypc:~$ ls -a /home/ohtsuka/.ssh/
.  ..  id_rsa  id_rsa.pub

```
サーバ役での設定もしていきます。
PC役と同様にvagrant sshでログインし、rootユーザにスイッチ。sshd_configを編集し、パスワードでのsshログインを無効化しています。無効化後sshdに設定を読み込ませるためにリスタートをかけています。
しなくても良いとは思いますが念のため。。。
```
shota@shota-20f5a2v5jp:~$ vagrant ssh 91c9000
Welcome to Ubuntu 22.04.5 LTS (GNU/Linux 5.15.0-130-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Sat Jan 25 03:37:46 UTC 2025

  System load:             1.99
  Usage of /:              4.3% of 38.70GB
  Memory usage:            9%
  Swap usage:              0%
  Processes:               122
  Users logged in:         0
  IPv4 address for enp0s3: 10.0.2.15
  IPv6 address for enp0s3: fd00::e5:4ff:fe58:6a0c

  => There is 1 zombie process.


Expanded Security Maintenance for Applications is not enabled.

16 updates can be applied immediately.
11 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status

New release '24.04.1 LTS' available.
Run 'do-release-upgrade' to upgrade to it.

vagrant@mysrv:~$ sudo su -
root@mysrv:~# cd /etc/ssh
root@mysrv:/etc/ssh# cp -p sshd_config sshd_config.bak
root@mysrv:/etc/ssh# vi sshd_config

～中略。一番最後に以下を追記～
# 2025/1/25 パスワードでのsshログインを無効化
PasswordAuthentication no
ChallengeResponseAuthentication no

root@mysrv:/etc/ssh# systemctl restart sshd
```
PC役の公開鍵の内容を、サーバ役のvagrantユーザのauthorized_keysに追記します。
まず、PC役で公開鍵の内容を確認します。
```
ohtsuka@mypc:~/.ssh$ cat id_rsa.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDDlMx5IvKlp/sMRQ9TdI1cAsIiJs7iYhpdPa1nBZ4bnvuH2+5GLuzz8TDp6HVmo7I2Ym6RgyUfJvBaMAOwiSNoAna9Z0HEvD/6320Kz3KwhctPQPsHYyg7VY+SMglkzNTz1psHIWeDchLn8aSPUe31+NAbQ8tBwrKvL53G9sFkWFEh/3i8RYrS/jXo/91MaAcvVs5VK+TodW7dqdSplq6Eqk7ujH7hi393v+sv4giKC9wQVuhSsr4iSHeDnS0hPP9FUyJBld9j1uHPm6Wx1hrt+6enOPfo+ufaOVMb4JVWsz4e95PgMab4s+aJW5aKmlJZ3JwypmIAgS4qxYqdHEdp ohtsuka@mypc
```
確認した内容をauthorized_keysに追記した結果は以下です。
```
vagrant@mysrv:~$ cd .ssh/
vagrant@mysrv:~/.ssh$ cat authorized_keys
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFbS7A3AR8l29Bnr8LkJi+vWhibRyzN1MqJ6UpPc8TnU vagrant
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDDlMx5IvKlp/sMRQ9TdI1cAsIiJs7iYhpdPa1nBZ4bnvuH2+5GLuzz8TDp6HVmo7I2Ym6RgyUfJvBaMAOwiSNoAna9Z0HEvD/6320Kz3KwhctPQPsHYyg7VY+SMglkzNTz1psHIWeDchLn8aSPUe31+NAbQ8tBwrKvL53G9sFkWFEh/3i8RYrS/jXo/91MaAcvVs5VK+TodW7dqdSplq6Eqk7ujH7hi393v+sv4giKC9wQVuhSsr4iSHeDnS0hPP9FUyJBld9j1uHPm6Wx1hrt+6enOPfo+ufaOVMb4JVWsz4e95PgMab4s+aJW5aKmlJZ3JwypmIAgS4qxYqdHEdp ohtsuka@mypc
```
この状態でPC役のohtsukaユーザからサーバ役のvagrantユーザに対して秘密鍵とパスフレーズを使って、サーバにSSH出来るかを確認します。
設定が上手くいっていれば接続できるはずです。
```
ohtsuka@mypc:~$ ssh -i id_rsa vagrant@192.168.0.115
Warning: Identity file id_rsa not accessible: No such file or directory.
Enter passphrase for key '/home/ohtsuka/.ssh/id_rsa':（passwordと入力）
Welcome to Ubuntu 22.04.5 LTS (GNU/Linux 5.15.0-130-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Sat Jan 25 04:46:09 UTC 2025

  System load:             0.0
  Usage of /:              4.3% of 38.70GB
  Memory usage:            10%
  Swap usage:              0%
  Processes:               103
  Users logged in:         1
  IPv4 address for enp0s3: 10.0.2.15
  IPv6 address for enp0s3: fd00::e5:4ff:fe58:6a0c


Expanded Security Maintenance for Applications is not enabled.

16 updates can be applied immediately.
11 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status

New release '24.04.1 LTS' available.
Run 'do-release-upgrade' to upgrade to it.


Last login: Sat Jan 25 04:36:19 2025 from 10.0.2.2

vagrant@mysrv:~$
```
## 漏洩した秘密鍵からパスフレーズを解析し、不正アクセスを行う
攻撃者（Kali Linux）に秘密鍵が漏れたとします。
もし漏れたとしても、以下のようにパスフレーズがわからないことには、SSH接続は出来ません。
漏れた秘密鍵の情報はrouei_id_rsaというファイルに保存しています。この情報はPC役のohtsukaユーザのid_rsaと同じ中身です。
```
# ls -l
total 16
-rw-r--r-- 1 root root   98 Jan 24 06:28 password_hashes.txt
-rw------- 1 root root  394 Jan 24 23:54 rouei_id_rsa
-rw-r--r-- 1 root root  198 Jan 24 19:28 test_password_hashes.txt
-rw-r--r-- 1 root root 1675 Jan 24 17:25 test.txt

# cat rouei_id_rsa
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABDVLXHbm+
UJZoQO2Z0XMQZ+AAAAEAAAAAEAAAEXAAAAB3NzaC1yc2EAAAADAQABAAABAQChVbD6UwO+
PxKAFazYmEjUoG5IgaFyBmVAx0umA602j/PR+NRR2g1FNX7U0ehErd5Bu/FLOLhc/y1HKk
4PXwcc/ml21L60bLW8bE++HBpY9n94R5CN9AXtzjlosFV9BHDeIjlw4bLUs6RpzAik2tdS
ceWFSi6DTdihWD9HOXjgYbS6gdHks7Uita0+ZpJc+pUZHbU999GQTEEmLBnDoAupGces9B
6E94slAnTP54YR2umnH5M+BZ0R9F+rP+mrkQdShqUnjJE3UD26qQgfSdt0dFB+oUUmxk/o
hBPu9mupljMXSHsnIQ6KIECAR6seO967mGg8lqq/feJ0KwXN6i51AAAD0Nf5xB2ZFDWq+9
iCYrbzbbqolkOOLsS1basRiu2ait52bLFtWQ8gFYDBcgQouT3C7iYezQ3eXVXkWQhksIAr
RuliIkrECA7jEILZRLB6AC0Ov24D/MPZPPQH9xcMHx7/2pyGNHndd4IQZme1j6rA9qOm0S
nQHBZGSYDOFY4IijywUQ3QtYayXsFdCKd90yvV93D9CyDluT5tBFMsmWi9y/oilMV2b856
n/XxWa+6QLcZoCCjKu9EKenDGy8Tup83VpikoNlZWbWoquG3OSfwKB/8GNxolHcM5cFzPf
MNZ83PKMPQpcT+PZiU2C9crL0j+U7/Bq2/oEHerQIq4b3siEU+1JnDehS5eas8vL8YVdFI
dmfGd+nvqedl3XEYbN7PxKJ89/L1gCLonvVT5h4m3RsNtUldvxSL2u33kJXOZcWO3IbsNj
g3yOnNexP/avMX4Fptmbdtb/XE/LDvGF7xdR7MmLYKjPVUDo0JUKyh19AB47P7t7GWt9/O
zmy/7pnfJnllYjNgl5AZq0Y/Zxoerna31UFzuEDmzPpK79dasXo83moVyffvh8enNcfBmi
2tXh4y/gXi0H4bLIwfzc5uE7PkrGaj7fPDLeEkEwp2EXSKN3zHfOEiR27BNayroQMnqB9o
jmYLDuP+dcX3SL2F/GSENXB3ZQcBstO51I6+SAMZuKQj2j4YGjB5vsWI/lu6Rp2pXL8lkN
IE+ZsXmZ1L1AXDB/7RbBbN7jTZ+Nb35bcjcAkiPS1Sj5dL5rnCLoYPSW6da1LBrLClKYed
grl+BvaHbWFm0qImj9NzI1GSwNw5PGbulxuj/5lS4S3JOuE3ERAOsmAch19kX9l35e0czd
k7/4deyaDQc8fcHJVcRZv/BpfxtSrObRCJabWJftsEfnmATHTN9V7OOT1xKQ5l/mySEnvm
dl9I9W/GI5KJKDdkCHxldJI60g5eokkVqe++x5NAq0uy0cETSSsbbsv/P/RLmo6qAjJeKg
nYSwL+ftDZoLVlUG8FlPLGTmzWD+ce9ovd/3Yy/OLpbRoS8U14KDJcxWMK44dhOHTeXiRJ
m9Fs/eniCyb+5YMfykc8+YCnxSYTmnqIdJ21PEPn0q9b2RSClkyWdUdnJCDz4+4dAegRAn
y19os+F5pbMxjOI0dxOClvDQiWBsJrC8KgpDcGg8cA0qI4Mn8pQ21YFdKKeGts5fdk0X9R
MqGVsluMbAU+kzk40mNALTkPwhqb1PWGujJaf4cqxJxVWkXroYAZSHTifiqAH3BQd/9ICi
/Rtd3DBnI4TqXPE04JB934NFJZb74=
-----END OPENSSH PRIVATE KEY-----

# ssh -i rouei_id_rsa vagrant@192.168.0.115
Enter passphrase for key 'rouei_id_rsa':
Enter passphrase for key 'rouei_id_rsa':
Enter passphrase for key 'rouei_id_rsa':
vagrant@192.168.0.115: Permission denied (publickey).
```
この秘密鍵からJohn the Ripperを使ってパスフレーズクラッキングを行ってみたいと思います。
まず、ssh2johnというコマンドを使って中身を整形します。秘密鍵からクラックするための準備だと思って頂ければと思います。今回はrouei_id_rsa_hashというファイルに整形しました。
```
# ssh2john rouei_id_rsa > rouei_id_rsa_hash

# cat rouei_id_rsa_hash
rouei_id_rsa:$sshng$6$16$d52d71db9be50966840ed99d1731067e$1334$6f70656e7373682d6b65792d7631000000000a6165733235362d637472000000066263727970740000001800000010d52d71db9be50966840ed99d1731067e000000100000000100000117000000077373682d727361000000030100010000010100a155b0fa5303be3f128015acd89848d4a06e4881a172066540c74ba603ad368ff3d1f8d451da0d45357ed4d1e844adde41bbf14b38b85cff2d472a4e0f5f071cfe6976d4beb46cb5bc6c4fbe1c1a58f67f7847908df405edce3968b0557d0470de223970e1b2d4b3a469cc08a4dad75271e5854a2e834dd8a1583f473978e061b4ba81d1e4b3b522b5ad3e66925cfa95191db53df7d1904c41262c19c3a00ba919c7acf41e84f78b250274cfe78611dae9a71f933e059d11f45fab3fe9ab91075286a5278c9137503dbaa9081f49db7474507ea14526c64fe88413eef66ba9963317487b27210e8a20408047ab1e3bdebb98683c96aabf7de2742b05cdea2e75000003d0d7f9c41d991435aafbd88262b6f36dbaa896438e2ec4b56dab118aed9a8ade766cb16d590f201580c1720428b93dc2ee261ecd0dde5d55e4590864b0802b46e962224ac4080ee31082d944b07a002d0ebf6e03fcc3d93cf407f7170c1f1effda9c863479dd7782106667b58faac0f6a3a6d129d01c16464980ce158e088a3cb0510dd0b586b25ec15d08a77dd32bd5f770fd0b20e5b93e6d04532c9968bdcbfa2294c5766fce7a9ff5f159afba40b719a020a32aef4429e9c31b2f13ba9f375698a4a0d95959b5a8aae1b73927f0281ffc18dc6894770ce5c1733df30d67cdcf28c3d0a5c4fe3d9894d82f5cacbd23f94eff06adbfa041dead022ae1bdec88453ed499c37a14b979ab3cbcbf1855d1487667c677e9efa9e765dd71186cdecfc4a27cf7f2f58022e89ef553e61e26dd1b0db5495dbf148bdaedf79095ce65c58edc86ec363837c8e9cd7b13ff6af317e05a6d99b76d6ff5c4fcb0ef185ef1751ecc98b60a8cf5540e8d0950aca1d7d001e3b3fbb7b196b7dfcece6cbfee99df267965623360979019ab463f671a1eae76b7d54173b840e6ccfa4aefd75ab17a3cde6a15c9f7ef87c7a735c7c19a2dad5e1e32fe05e2d07e1b2c8c1fcdce6e13b3e4ac66a3edf3c32de124130a7611748a377cc77ce122476ec135acaba10327a81f688e660b0ee3fe75c5f748bd85fc6484357077650701b2d3b9d48ebe480319b8a423da3e181a3079bec588fe5bba469da95cbf2590d204f99b17999d4bd405c307fed16c16cdee34d9f8d6f7e5b7237009223d2d528f974be6b9c22e860f496e9d6b52c1acb0a529879d82b97e06f6876d6166d2a2268fd373235192c0dc393c66ee971ba3ff9952e12dc93ae13711100eb2601c875f645fd977e5ed1ccdd93bff875ec9a0d073c7dc1c955c459bff0697f1b52ace6d108969b5897edb047e79804c74cdf55ece393d71290e65fe6c92127be6765f48f56fc6239289283764087c6574923ad20e5ea24915a9efbec79340ab4bb2d1c113492b1b6ecbff3ff44b9a8eaa02325e2a09d84b02fe7ed0d9a0b565506f0594f2c64e6cd60fe71ef68bddff7632fce2e96d1a12f14d7828325cc5630ae387613874de5e24499bd16cfde9e20b26fee5831fca473cf980a7c526139a7a88749db53c43e7d2af5bd91482964c967547672420f3e3ee1d01e811027cb5f68b3e179a5b3318ce23477138296f0d089606c26b0bc2a0a4370683c700d2a238327f29436d5815d28a786b6ce5f764d17f5132a195b25b8c6c053e933938d263402d390fc21a9bd4f586ba325a7f872ac49c555a45eba180194874e27e2a801f705077ff480a2fd1b5ddc30672384ea5cf134e0907ddf83452596fbe$16$358
```
このファイルを使ってパスフレーズを特定していきます。
今回はクラッキングで使用するワードリストにJohn the Ripperがデフォルトで用意している/usr/share/john/password.lstを使用しました。
password (rouei_id_rsa)という出力結果からばれてしまっていることがわかりますね。
```
# john --wordlist=/usr/share/john/password.lst rouei_id_rsa_hash
Using default input encoding: UTF-8
Loaded 1 password hash (SSH, SSH private key [RSA/DSA/EC/OPENSSH 32/64])
Cost 1 (KDF/cipher [0=MD5/AES 1=MD5/3DES 2=Bcrypt/AES]) is 2 for all loaded hashes
Cost 2 (iteration count) is 16 for all loaded hashes
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
password         (rouei_id_rsa)
1g 0:00:00:01 DONE (2025-01-25 00:14) 0.5102g/s 8.163p/s 8.163c/s 8.163C/s 123456..secret
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```
パスフレーズが特定されてしまったことにより、Kali（攻撃者）がサーバに対してSSH接続が出来るようになってしまいました。
これも難しいフレーズであれば特定はかなり難しくなりますので、ありきたりなワードや使いまわしは避けるべきでしょう。
```
# ssh -i rouei_id_rsa vagrant@192.168.0.115
Enter passphrase for key 'rouei_id_rsa':
Welcome to Ubuntu 22.04.5 LTS (GNU/Linux 5.15.0-130-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Sat Jan 25 05:15:44 UTC 2025

  System load:             0.08
  Usage of /:              4.3% of 38.70GB
  Memory usage:            10%
  Swap usage:              0%
  Processes:               102
  Users logged in:         1
  IPv4 address for enp0s3: 10.0.2.15
  IPv6 address for enp0s3: fd00::e5:4ff:fe58:6a0c


Expanded Security Maintenance for Applications is not enabled.

16 updates can be applied immediately.
11 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status

New release '24.04.1 LTS' available.
Run 'do-release-upgrade' to upgrade to it.


Last login: Sat Jan 25 04:46:10 2025 from 192.168.0.114
vagrant@mysrv:~$
```

