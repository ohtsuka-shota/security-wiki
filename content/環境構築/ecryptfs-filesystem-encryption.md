---
title: "ecryptfsコマンドを使ってファイルシステムの暗号化"
date: 2025-01-26
tags: ["tool", "Linux", "Ubuntu", "filesystem", "ファイルシステム", "ecryptfs"]
source: "https://qiita.com/ohtsuka-shota/items/4dcea0eba371da137052"
---
こんにちは
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

この記事ではファイルシステムを暗号化して使用する方法をメモっていきたいと思います。

ファイルシステムではなくディスクデバイスをマルっと暗号化する手順は以下になります。
必要であればご覧ください。

[[cryptsetup-full-disk-encryption]]

# 環境イメージ
ubuntu22.04の仮想マシンをVirtualBoxに用意します。
testユーザーのホームディレクトリ（/home/test）に対して、暗号化されたファイルシステムをコマンドを使って設定します。
また、その後にホームディレクトリ自体をマルっと暗号化する手順も書いておきたいと思います。

![security-ページ10.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3a9710d2-d69a-f37d-7b46-3d5c09e08815.png)

# 手順
## /home/ユーザ配下に暗号化・復号化可能なファイルシステムを作成する
ファイルシステムの暗号化にはecryptfsコマンドを使用するのですが、デフォルトだと入っておりませんでしたのでインストールしていきます。
```
test@LPIC303:~$ sudo su -
[sudo] password for test:
root@LPIC303:~# apt update && apt upgrade -y
root@LPIC303:~# apt install -y ecryptfs-utils
```
rootユーザから検証するためのtestユーザにスイッチし、ecryptfs-setup-privateコマンドを実行します。
パスフレーズの登録が求められますので、任意のものを入力しましょう。
実行完了後、実行ユーザのホームディレクトリ（今回の例では/home/test）に暗号化ディレクトリ.PrivateとマウントポイントPrivate、ecryptfsの管理に使うファイルなどが格納されている.ecryptfsディレクトリが作成されていることがわかる。
```
test@LPIC303:~$ ls -a
.  ..  .bash_history  .bash_logout  .bashrc  .cache  .profile  .ssh  .sudo_as_admin_successful
test@LPIC303:~$ ecryptfs-setup-private
Enter your login passphrase [test]:（ログインパスワードを入力）
Enter your mount passphrase [leave blank to generate one]:（passwordと入力）
Enter your mount passphrase (again):（パスワードと入力）

************************************************************************
YOU SHOULD RECORD YOUR MOUNT PASSPHRASE AND STORE IT IN A SAFE LOCATION.
  ecryptfs-unwrap-passphrase ~/.ecryptfs/wrapped-passphrase
THIS WILL BE REQUIRED IF YOU NEED TO RECOVER YOUR DATA AT A LATER TIME.
************************************************************************


Done configuring.

Testing mount/write/umount/read...
Inserted auth tok with sig [633937dbcf1fef34] into the user session keyring
Inserted auth tok with sig [b5853153313b3160] into the user session keyring
Inserted auth tok with sig [633937dbcf1fef34] into the user session keyring
Inserted auth tok with sig [b5853153313b3160] into the user session keyring
Testing succeeded.

Logout, and log back in to begin using your encrypted directory.

test@LPIC303:~$ ls -a
.   .Private       .bash_logout  .cache     .profile  .sudo_as_admin_successful
..  .bash_history  .bashrc       .ecryptfs  .ssh      Private
```
.ecryptfs内にどのようなファイルが存在するかを確認します。
それぞれのファイルについては以下の意味です。
```
test@LPIC303:~$ cd .ecryptfs/
test@LPIC303:~/.ecryptfs$ ls
Private.mnt  Private.sig  auto-mount  auto-umount  wrapped-passphrase
```
- **`Private.mnt`**
    
    暗号化されたディレクトリをマウントする際の設定情報を保持。
    
    ```bash
    test@LPIC303:~/.ecryptfs$ cat Private.mnt
    /home/test/Private
    ```
    
- **`Private.sig`**

    暗号化に使用される鍵のシグネチャ（識別情報）が格納されており、適切な鍵を特定するために使用。
    
    ```bash
    test@LPIC303:~/.ecryptfs$ cat Private.sig
    633937dbcf1fef34
    b5853153313b3160
    ```
    
- **`auto-mount`**
    
    自動マウントを有効にするフラグファイル（存在するとログイン時に自動マウントが実行される）。
    
    ```bash
    test@LPIC303:~/.ecryptfs$ cat auto-mount
    test@LPIC303:~/.ecryptfs$
    ```
    
- **`auto-umount`**
    
    自動アンマウントを有効にするフラグファイル（存在するとログアウト時に自動アンマウントが実行される）。
    
    ```bash
    test@LPIC303:~/.ecryptfs$ cat auto-umount
    test@LPIC303:~/.ecryptfs$
    ```
    
- **`wrapped-passphrase`**
    
    暗号化された形式で保存されたマウントパスフレーズ（ユーザーパスワードで復号される）。出力しようとすると表記がバグります。
    
    ```bash
    test@LPIC303:~/.ecryptfs$ cat wrapped-passphrase
    :C���7��8df8ea4e623fa236�^1��N������U�
    ```
    
ecryptfs-setup-privateコマンドを実行すると、自動でファイルシステムがマウントされています。
mountコマンドやdfコマンドでそれを確認することが出来ます。
/home/test/Private以下が暗号化・復号化出来るファイルシステムという事で、ここに作成したファイルとかが暗号化されますよという事になります。
```
test@LPIC303:~/.ecryptfs$ mount | grep -i test
/home/test/.Private on /home/test/Private type ecryptfs (rw,nosuid,nodev,relatime,ecryptfs_fnek_sig=b5853153313b3160,ecryptfs_sig=633937dbcf1fef34,ecryptfs_cipher=aes,ecryptfs_key_bytes=16,ecryptfs_unlink_sigs)

test@LPIC303:~$ df -h
Filesystem                       Size  Used Avail Use% Mounted on
tmpfs                            197M  1.1M  196M   1% /run
/dev/sda2                         25G  3.4G   20G  15% /
tmpfs                            983M  4.0K  982M   1% /dev/shm
tmpfs                            5.0M     0  5.0M   0% /run/lock
/home/test/.Private               25G  3.4G   20G  15% /home/test/Private
tmpfs                            197M  4.0K  197M   1% /run/user/1000
/dev/mapper/my_encrypted_volume  974M   24K  908M   1% /mnt/my_encrypted_volume
```
ファイルシステム全体を暗号化しているわけではなく、ファイルシステムの/home/test/Private以下が暗号化されるだけなので、lsblkをみても特段分かりません
```
test@LPIC303:~$ lsblk -f
NAME             FSTYPE      FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
loop0            squashfs    4.0                                                    0   100% /snap/snapd/21759
loop1            squashfs    4.0                                                    0   100% /snap/core20/2318
loop2            squashfs    4.0                                                    0   100% /snap/lxd/29351
loop3                                                                               0   100% /snap/snapd/23545
loop4                                                                               0   100% /snap/core20/2434
loop5                                                                               0   100% /snap/lxd/31333
sda
	sda1
	sda2           ext4        1.0         0e713afc-17be-4cea-ad81-f41c2fdbae01   19.8G    14% /
sdb              crypto_LUKS 2           ce6f2802-93cd-43ce-8723-bd1edabd2a8f
	my_encrypted_volume
                 ext4        1.0         b1bc55da-2ea4-4789-8325-65eebbd72ded  907.3M     0% /mnt/my_encrypted_volume
sdc
sr0
```
この時のイメージは以下となります。
マウントがされているので、復号化されている状態です。
![security-ページ9.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c52f0218-b4b4-d960-1a7f-ffb01c96f7b1.png)

このファイルシステムは、ユーザがログインすることで自動でマウントされるようになっています。
そこで、その設定の下となっているauto-mountファイルを削除したうえでexitして、改めてログインをしてみて本当に自動でマウントされないかを確認してみたいと思います。

再ログイン後、dfコマンドを実行するとPrivateの記述が無くなってます。
またPrivateディレクトリを見てみるとreadme.txtがあり「あなたのデータを保護するためにアンマウントされているよ！」という記載がありますね。
```
test@LPIC303:~$ cd .ecryptfs/
test@LPIC303:~/.ecryptfs$ ls
Private.mnt  Private.sig  auto-mount  auto-umount  wrapped-passphrase
test@LPIC303:~/.ecryptfs$ rm auto-mount
test@LPIC303:~/.ecryptfs$ exit

再ログイン後

test@LPIC303:~$ df -h
Filesystem                       Size  Used Avail Use% Mounted on
tmpfs                            197M  1.1M  196M   1% /run
/dev/sda2                         25G  3.4G   20G  15% /
tmpfs                            983M  4.0K  982M   1% /dev/shm
tmpfs                            5.0M     0  5.0M   0% /run/lock
tmpfs                            197M  4.0K  197M   1% /run/user/1000
/dev/mapper/my_encrypted_volume  974M   24K  908M   1% /mnt/my_encrypted_volume
test@LPIC303:~$ ls
Private
test@LPIC303:~$ cd Private/
test@LPIC303:~/Private$ ls
Access-Your-Private-Data.desktop  README.txt
test@LPIC303:~/Private$ cat README.txt
THIS DIRECTORY HAS BEEN UNMOUNTED TO PROTECT YOUR DATA.

From the graphical desktop, click on:
 "Access Your Private Data"

or

From the command line, run:
 ecryptfs-mount-private
```
この時のイメージです。
![security-ページ10.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/dd398207-9cf8-208b-a45c-22d5eb4c5fa2.png)

手動でマウントを行うにはecryptfs-mount-privateコマンドを実行します。
マウント後、ファイルシステム内に作成したファイル等が閲覧できるようになっているはずです。
```
test@LPIC303:~/Private$ ecryptfs-mount-private
Enter your login passphrase:
Inserted auth tok with sig [633937dbcf1fef34] into the user session keyring

INFO: Your private directory has been mounted.
INFO: To see this change in your current shell:
  cd /home/test/Private

test@LPIC303:~/Private$ cd /home/test/Private
test@LPIC303:~/Private$ ls
test.txt
test@LPIC303:~/Private$ cat test.txt
this is test
```
この時のイメージは以下となります。（2つ前の図と同じです。）
再三ですが、マウントがされているので復号化されている状態です。
![security-ページ9.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c52f0218-b4b4-d960-1a7f-ffb01c96f7b1.png)
逆にアンマウントするためにはecryptfs-umount-privateコマンドを実行します。
```
test@LPIC303:~/Private$ ecryptfs-umount-private

INFO: Your private directory has been unmounted.
INFO: To see this change in your current shell:
  cd /home/test/Private
```

## /home/ユーザーのホームディレクトリ自体を暗号化する
上記の方法でファイルシステムを暗号化して使えるようになりましたが、それぞれのユーザのホームディレクトリの一部が暗号化出来るだけにとどまります。
ホームディレクトリ自体を暗号化することも可能で、こちらの方がセキュリティ的により強度になります。
検証用にtest2ユーザを作成して、そちらでいじってみたいと思います。
```
root@LPIC303:~# useradd -m test2
root@LPIC303:~# passwd test2
New password:
Retype new password:
passwd: password updated successfully
```
test2でログインして、自身のホームディレクトリ（/home/test2）に適当にファイルやディレクトリを作成してみます。
```
$ whoami
test2
$ pwd
/home/test2
$ touch test2.txt
$ mkdir test2-dir
$ ls -a
.  ..  .bash_logout  .bashrc  .cache  .profile  test2-dir  test2.txt
```
/home/test2自体を暗号化していきたいと思います。
これを実行するためにはroot権限が必要でしたので、rootにスイッチしてecryptfs-migrate-homeコマンドを実行していきます。
どのユーザのホームディレクトリを暗号化するかを指定するために-uオプションを付けましょう。
```
root@LPIC303:~# ecryptfs-migrate-home -u test2
INFO:  Checking disk space, this may take a few moments.  Please be patient.
INFO:  Checking for open files in /home/test2
Enter your login passphrase [test2]:

************************************************************************
YOU SHOULD RECORD YOUR MOUNT PASSPHRASE AND STORE IT IN A SAFE LOCATION.
  ecryptfs-unwrap-passphrase ~/.ecryptfs/wrapped-passphrase
THIS WILL BE REQUIRED IF YOU NEED TO RECOVER YOUR DATA AT A LATER TIME.
************************************************************************


Done configuring.

chown: cannot access '/dev/shm/.ecryptfs-test2': No such file or directory
INFO:  Encrypted home has been set up, encrypting files now...this may take a while.
sending incremental file list
./
.bash_logout
            220 100%    0.00kB/s    0:00:00 (xfr#1, to-chk=6/8)
.bashrc
          3,771 100%    3.60MB/s    0:00:00 (xfr#2, to-chk=5/8)
.profile
            807 100%  788.09kB/s    0:00:00 (xfr#3, to-chk=4/8)
test2.txt
              0 100%    0.00kB/s    0:00:00 (xfr#4, to-chk=3/8)
.cache/
.cache/motd.legal-displayed
              0 100%    0.00kB/s    0:00:00 (xfr#5, to-chk=0/8)
test2-dir/
Could not unlink the key(s) from your keying. Please use `keyctl unlink` if you wish to remove the key(s). Proceeding with umount.

========================================================================
Some Important Notes!

 1. The file encryption appears to have completed successfully, however,
    test2 MUST LOGIN IMMEDIATELY, _BEFORE_THE_NEXT_REBOOT_,
    TO COMPLETE THE MIGRATION!!!

 2. If test2 can log in and read and write their files, then the migration is complete,
    and you should remove /home/test2.pLmuxh4z.
    Otherwise, restore /home/test2.pLmuxh4z back to /home/test2.

 3. test2 should also run 'ecryptfs-unwrap-passphrase' and record
    their randomly generated mount passphrase as soon as possible.

 4. To ensure the integrity of all encrypted data on this system, you
    should also encrypt swap space with 'ecryptfs-setup-swap'.
========================================================================
```
改めてtest2ユーザで暗号化されていることを確認します。
マウントされておらず暗号化されており、/home/test2配下に作ったtest2-dirやtest2.txtが確認できません。
```
$ whoami
test2
$ pwd
/home
$ ls -a
.  ..  .ecryptfs  test  test2  test2.pLmuxh4z
$ cd test2
$ ls -a
.  ..  .Private  .ecryptfs  Access-Your-Private-Data.desktop  README.txt
$ cat README.txt
THIS DIRECTORY HAS BEEN UNMOUNTED TO PROTECT YOUR DATA.

From the graphical desktop, click on:
 "Access Your Private Data"

or

From the command line, run:
 ecryptfs-mount-private

$ df -h
Filesystem                       Size  Used Avail Use% Mounted on
tmpfs                            197M  1.1M  196M   1% /run
/dev/sda2                         25G  3.4G   20G  15% /
tmpfs                            983M  4.0K  982M   1% /dev/shm
tmpfs                            5.0M     0  5.0M   0% /run/lock
/dev/mapper/my_encrypted_volume  974M   24K  908M   1% /mnt/my_encrypted_volume
tmpfs                            197M  4.0K  197M   1% /run/user/1000
tmpfs                            197M  4.0K  197M   1% /run/user/1001
```
マウントしてみます。マウントするためのコマンドはecryptfs-mount-privateです。
マウント直後、適当に作成したファイル・ディレクトリが表示されていることを確認します。
```
$ pwd
/home/test2
$ ecryptfs-mount-private
Enter your login passphrase:
Inserted auth tok with sig [5730262fd4403b64] into the user session keyring

INFO: Your private directory has been mounted.
INFO: To see this change in your current shell:
  cd /home/test2

$ ls
Access-Your-Private-Data.desktop  README.txt
$ cd ..
$ cd test2
$ ls
test2-dir  test2.txt
$ df -h
Filesystem                       Size  Used Avail Use% Mounted on
tmpfs                            197M  1.1M  196M   1% /run
/dev/sda2                         25G  3.4G   20G  15% /
tmpfs                            983M  4.0K  982M   1% /dev/shm
tmpfs                            5.0M     0  5.0M   0% /run/lock
/dev/mapper/my_encrypted_volume  974M   24K  908M   1% /mnt/my_encrypted_volume
tmpfs                            197M  4.0K  197M   1% /run/user/1000
tmpfs                            197M  4.0K  197M   1% /run/user/1001
/home/test2/.Private              25G  3.4G   20G  15% /home/test2

```

