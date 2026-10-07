---
title: "cryptsetupを使用してディスク全体を暗号化する手順"
date: 2025-01-26
tags: ["tool", "Security", "暗号化", "cryptsetup"]
source: "https://qiita.com/ohtsuka-shota/items/49b545efd8b4c66fe710"
---
こんにちは
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

今回はディスクデバイスぜんたいを暗号化して使用する方法を記載していきたいと思います。

# 環境イメージ
ubutnu22.04の仮想マシンをVirtualBox上に用意します。
その仮想マシンに対してディスクを1つ追加し、そのディスクを暗号化して使用していく方法を理解していきたいと思います。
![security-ページ2.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/dcc2801d-0771-a5ce-1129-ecfec47fbb9f.png)

# 手順
仮想マシン立ち上げ直後のディスク等の状態を確認しておきます。
```
root@LPIC303:~# lsblk -f
NAME   FSTYPE   FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
loop0  squashfs 4.0                                                    0   100% /snap/core20/2318
loop1  squashfs 4.0                                                    0   100% /snap/lxd/29351
loop2  squashfs 4.0                                                    0   100% /snap/snapd/21759
sda
	sda1
	sda2 ext4     1.0         0e713afc-17be-4cea-ad81-f41c2fdbae01     20G    13% /
sr0
```
VirtualBox上でのディスク追加手順は省略しますが、以下のように追加しています。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f43ea149-430a-3cd4-8741-36fa7f6ac1a1.png)
改めてlsblkコマンドを実行してみます。
sdbという出力がありますが、これが上記スクショのLPIC303_1.vhdとなります。
```
root@LPIC303:~# lsblk -f
NAME   FSTYPE   FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
loop0  squashfs 4.0                                                    0   100% /snap/snapd/21759
loop1  squashfs 4.0                                                    0   100% /snap/core20/2318
loop2  squashfs 4.0                                                    0   100% /snap/lxd/29351
sda
  sda1
  sda2 ext4     1.0         0e713afc-17be-4cea-ad81-f41c2fdbae01     20G    13% /
sdb
sr0
```
この時のイメージです。再三ですがsdbはVirtualBoxではLPIC303_1.vhdです。
![security-ページ3.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/63995fcb-c751-6193-1556-8c65da6b6a85.png)

このディスクデバイスに対してcryptsetup luksFormatコマンドで暗号化を行います。
暗号化を行う際、パスフレーズを求められるので任意のものを入力します。
今回はpasswordとしています。
```
root@LPIC303:~# cryptsetup luksFormat /dev/sdb

WARNING!
========
This will overwrite data on /dev/sdb irrevocably.

Are you sure? (Type 'yes' in capital letters): YES
Enter passphrase for /dev/sdb:（passwordと入力）
Verify passphrase:（passwordと入力）
root@LPIC303:~#
```
暗号化出来ているかを確認します。
cryptsetup luksDumpコマンドにおいて、LUKS ver2でデバイス自体が暗号化されていることがわかります。
或いはlsblk -fの出力結果を見てもsdbのところにcrypto_LUKSと記載されているところからも確認できます。
```
root@LPIC303:~# cryptsetup luksDump /dev/sdb
LUKS header information
Version:        2 
Epoch:          3
Metadata area:  16384 [bytes]
Keyslots area:  16744448 [bytes]
UUID:           ce6f2802-93cd-43ce-8723-bd1edabd2a8f
Label:          (no label)
Subsystem:      (no subsystem)
Flags:          (no flags)

Data segments:
  0: crypt
        offset: 16777216 [bytes]
        length: (whole device)
        cipher: aes-xts-plain64
        sector: 512 [bytes]

Keyslots:
  0: luks2
        Key:        512 bits
        Priority:   normal
        Cipher:     aes-xts-plain64
        Cipher key: 512 bits
        PBKDF:      argon2id
        Time cost:  4
        Memory:     313426
        Threads:    1
        Salt:       06 a5 4c 81 fb 33 b3 82 f7 39 78 08 d8 78 9d 9f
                    52 e8 90 e5 fe 7e 8f 8a 40 55 99 c3 15 3c 5f 37
        AF stripes: 4000
        AF hash:    sha256
        Area offset:32768 [bytes]
        Area length:258048 [bytes]
        Digest ID:  0
Tokens:
Digests:
  0: pbkdf2
        Hash:       sha256
        Iterations: 38641
        Salt:       ec eb 7e 9c 77 3a 09 fd a9 48 79 5a b4 40 d1 83
                    29 9b 0c f8 8e 7e 48 fd 85 39 b4 48 13 ad 1c 33
        Digest:     21 33 c3 0f 83 8c 3a 04 8f 3d 9d 2b e3 d2 52 9a
                    75 b8 97 59 af 45 8e c6 b3 15 e5 6d c1 b8 1a e6

root@LPIC303:~# lsblk -f
NAME   FSTYPE      FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
loop0  squashfs    4.0                                                    0   100% /snap/snapd/21759
loop1  squashfs    4.0                                                    0   100% /snap/core20/2318
loop2  squashfs    4.0                                                    0   100% /snap/lxd/29351
sda
	sda1
	sda2 ext4        1.0         0e713afc-17be-4cea-ad81-f41c2fdbae01     20G    13% /
sdb    crypto_LUKS 2           ce6f2802-93cd-43ce-8723-bd1edabd2a8f
sr0
```
この時のイメージです。デバイス自体が暗号化された状態です。
![security-ページ4.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ef787160-984b-17de-896f-5402dd307774.png)
暗号化したデバイスにデバイスマッパー名を付けていきます。
デバイスマッパー名とは、物理的なデバイス（例えばLUKSで暗号化されたディスク）を、仮想的なブロックデバイスとして操作できるようにすることになります。
cryptsetup luksOpenコマンドを実行することで暗号化しているディスクデバイスを復号化しつつ、デバイスマッパー名を付けているというイメージになります。復号化する際にパスフレーズを求められます。

今回はデバイスマッパー名をmy_encrypted_volumeとしています。
デバイスマッパー名を付けた後、lsblkコマンドの出力が変わっており、また/dev/mapper/配下に名付けたマッパー名が存在することを確認します。
```
root@LPIC303:~# cryptsetup luksOpen /dev/sdb my_encrypted_volume
Enter passphrase for /dev/sdb:（passwordと入力）

root@LPIC303:~# lsblk -f
NAME                  FSTYPE      FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
loop0                 squashfs    4.0                                                    0   100% /snap/snapd/21759
loop1                 squashfs    4.0                                                    0   100% /snap/core20/2318
loop2                 squashfs    4.0                                                    0   100% /snap/lxd/29351
sda
	sda1
	sda2                ext4        1.0         0e713afc-17be-4cea-ad81-f41c2fdbae01     20G    13% /
sdb                   crypto_LUKS 2           ce6f2802-93cd-43ce-8723-bd1edabd2a8f
	my_encrypted_volume
sr0

root@LPIC303:~# ls -l /dev/mapper/
total 0
crw------- 1 root root 10, 236  1月 25 22:43 control
lrwxrwxrwx 1 root root       7  1月 25 23:04 my_encrypted_volume -> ../dm-0
```
この時のイメージです。
![security-ページ5.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0de684ae-9fc2-6d9d-328f-8c44ce38c5bd.png)

この次に、このデバイスマッパーを引数にファイルシステムを作成していきます。
ファイルシステム作成後、lsblkコマンドを実行しFSTYPEのところにファイルシステムを作成した際に指定したext4が出力されていることを確認します。
```
root@LPIC303:~# mkfs -t ext4 /dev/mapper/my_encrypted_volume
mke2fs 1.46.5 (30-Dec-2021)
Creating filesystem with 258048 4k blocks and 64512 inodes
Filesystem UUID: b1bc55da-2ea4-4789-8325-65eebbd72ded
Superblock backups stored on blocks:
        32768, 98304, 163840, 229376

Allocating group tables: done
Writing inode tables: done
Creating journal (4096 blocks): done
Writing superblocks and filesystem accounting information: done

root@LPIC303:~# lsblk -f
NAME                  FSTYPE      FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
loop0                 squashfs    4.0                                                    0   100% /snap/snapd/21759
loop1                 squashfs    4.0                                                    0   100% /snap/core20/2318
loop2                 squashfs    4.0                                                    0   100% /snap/lxd/29351
sda
	sda1
	sda2                ext4        1.0         0e713afc-17be-4cea-ad81-f41c2fdbae01     20G    13% /
sdb                   crypto_LUKS 2           ce6f2802-93cd-43ce-8723-bd1edabd2a8f
	my_encrypted_volume ext4        1.0         b1bc55da-2ea4-4789-8325-65eebbd72ded
sr0
```
この時のイメージです。
![security-ページ6.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/26adaa78-e91d-5951-d5aa-989067dc5003.png)

最後に、このファイルシステムをマウントして使用できるようにしていきます。　
mount デバイスマッパー名 マウントポイントです。
```
root@LPIC303:~# mkdir /mnt/my_encrypted_volume
root@LPIC303:~# mount /dev/mapper/my_encrypted_volume /mnt/my_encrypted_volume/
```

アンマウントする際は以下のように行います。
アンマウント後、cryptsetup luksCloseを実行して、ディスクデバイスを暗号化することを忘れないようにしましょう。これをしていないと閲覧されてしまいます。
```
root@LPIC303:~# umount /mnt/my_encrypted_volume
root@LPIC303:~# cryptsetup luksClose my_encrypted_volume
root@LPIC303:~# ls /dev/mapper/
control
```
この時のイメージです。
ディスクデバイスを暗号化していることで、その中に存在するファイルシステム（ないしそこに存在するファイル等）が暗号化されているという事ですね。
ディスクデバイスを暗号化せずに、ファイルシステムを暗号化する方法もありますが、それはそのうち。
![security-ページ7.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/42e9d50d-bb6b-e7d7-577e-a6c8b7eee8b3.png)

