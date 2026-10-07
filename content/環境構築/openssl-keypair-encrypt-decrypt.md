---
title: "opensslで公開鍵/秘密鍵を作ったり暗号/復号したり"
date: 2023-10-29
tags: ["tool", "Linux", "Security", "OpenSSL", "lpic", "linuc"]
source: "https://qiita.com/ohtsuka-shota/items/89020a7184ecef3442d6"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

セキュリティ。難しいですよね。
暇潰し(と言う名の情報処理安全確保支援士の勉強)でLPIC303の書籍を読んでいたのですが、opensslで秘密鍵/公開鍵の作り方や公開鍵を使った暗号化と秘密鍵を使った復号化が記載されており「なぁなぁのままの理解じゃダメだよなぁ。そして面白そう！」と思い。手元にあったAndroidを使ってコマンド打ち込んでみたので備忘録で残しときます。
※この記事は全部スマホから書いてます。レイアウトとか記載内容おかしかったら御容赦下さいm(_ _)m

# 環境

UserLAndというアプリをインストールし、内部にubuntuでVMを建てました。
※正確にはVMじゃないみたいです。

https://play.google.com/store/apps/details?id=tech.ula

使用している画面は以下となります。
キーボードじゃないので使いにくいと言えばそうですが、tab補完等々出来るので申し分無しです。
sudo suでrootにもスイッチできます。コマンドはデフォルトではあんまり入ってませんが、apt installでインストール可能です。dockerコンテナがイメージとして近いかなと思います。
![Screenshot_20231029_205339_UserLAnd.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2fac4fd8-ba73-5d0a-5456-6ef5b84b4de9.jpeg)

ubuntu22.04なのでビックリしました
この手のアプリって少し古いイメージがあるので…汗
```
root@localhost:~# cat /etc/os-release
PRETTY_NAME="Ubuntu 22.04.3 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
VERSION_CODENAME=jammy
ID=ubuntu
ID_LIKE=debian
Fttstr56rrHOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=jammy
```

# 参考書籍

LPIC303の以下書籍です。
若干古いのは知ってます。故にここに雑に書いてるのも古いかもです。アップデートがあれば別の記事におこします。

https://amzn.asia/d/iZLB0eG

# 環境構築
## 秘密鍵/公開鍵を作成する

testディレクトリを作成し、そこでopenssl genrsaコマンドを実行し秘密鍵を作成します。方式としてDES,TripleDES,IDEAがあるみたいですが、どれも現代では役不足っぽい。この辺りは新しいのあるだろうなと…
phraseは何でも良いですが、passwordとしました。
```
root@localhost:~# mkdir test
root@localhost:~# cd test                            
root@localhost:~/test# ls -ltr
total 0
root@localhost:~/test# openssl genrsa -out private.key -des3 2048
Enter PEM pass phrase:
Verifying - Enter PEM pass phrase:
root@localhost:~/test# ls -ltr
total 4
-rw-------. 1 root root 1854 Oct 29 11:01 private.key
```

作成した秘密鍵から公開鍵を作成します
-inで秘密鍵を渡して、-puboutで「publicとして吐き出す」みたいなイメージだと覚えやすいかなと思いました。
```
root@localhost:~/test# openssl rsa -in private.key -pubout -out public.key
Enter pass phrase for private.key:
writing RSA key
root@localhost:~/test# ls -ltr
total 12
-rw-------. 1 root root 1854 Oct 29 11:01 private.key
-rw-------. 1 root root  451 Oct 29 11:21 public.key
```

## 公開鍵で暗号化、秘密鍵で復号化する
作成した鍵を使って暗号化/復号化します。テスト用のファイルを用意。
```
root@localhost:~/test# vi test.txt
root@localhost:~/test# cat test.txt
this is test message.
```

これを暗号化します。
openssl rsautlと言うコマンドで暗号化/復号化できるようです。作成した.encファイルを確認したところ、文字化けしているので暗号化出来ていそう。
```
root@localhost:~/test# openssl rsautl -encrypt -pubin -inkey public.key -in test.txt -out test.txt.enc
The command rsautl was deprecated in version 3.0. Use 'pkeyutl' instead.
root@localhost:~/test# ls -ltr
total 16
-rw-------. 1 root root 1854 Oct 29 11:01 private.key
-rw-r--r--. 1 root root   22 Oct 29 11:13 test.txt
-rw-------. 1 root root  451 Oct 29 11:21 public.key
-rw-r--r--. 1 root root  256 Oct 29 11:23 test.txt.enc
root@localhost:~/test# cat test.txt.enc
J1Icje)l[HXw攏[bE8`Uy}D4|&`Y7bdlam07.
                   3Z_!61"|gd4%f{s恫#X2\bHh\[;6!NI!P6o.}aDXjǅMzdKL0U9s˳^q#Xh=2(@
                     "8$qͽSYViLh5
```

暗号化したファイルを復号化します。
出来ていますね。
暗号化時、-pubkey -inkeyとあからさまに公開鍵を指定しているのに反し、復号化時は-inkeyしか記載していないですね。
publicのみ明確に指定する、と覚えとけば複雑なコマンドも少しは覚えやすいかも…？
```
root@localhost:~/test# openssl rsautl -decrypt -inkey private.key -in test.txt.enc -out test.txt.pub
The command rsautl was deprecated in version 3.0. Use 'pkeyutl' instead.
Enter pass phrase for private.key:
root@localhost:~/test# ls -ltr
total 20
-rw-------. 1 root root 1854 Oct 29 11:01 private.key
-rw-r--r--. 1 root root   22 Oct 29 11:13 test.txt
-rw-------. 1 root root  451 Oct 29 11:21 public.key
-rw-r--r--. 1 root root  256 Oct 29 11:23 test.txt.enc
-rw-r--r--. 1 root root   22 Oct 29 11:38 test.txt.pub
root@localhost:~/test# cat test.txt.pub
this is test message.
```

