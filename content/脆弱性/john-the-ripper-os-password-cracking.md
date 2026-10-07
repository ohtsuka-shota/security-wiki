---
title: "John the RipperでOSユーザのパスワードをクラッキングする"
date: 2025-01-25
tags: ["vulnerability", "hash", "KaliLinux", "password", "JohntheRipper"]
source: "https://qiita.com/ohtsuka-shota/items/377ffcc7a96a39e5ccf4"
---
こんにちは
株式会社クラスアクト　インフラストラクチャ事業部の大塚です。

今回はJohn the Ripperと呼ばれるツールを使ってLinux OSユーザのパスワードをクラッキングしていきたいと思います。

:::note alert
悪用厳禁

自分のシステムや許可された環境でのみ実行する必要があります。他人のシステムやデータに対して行うと、不正アクセス禁止法などに抵触する可能性があります。
:::

# 今回の試験環境
自分のPC上（Kubuntu24.04）にVirtualBoxを用意。
その上にKaliのVMを稼働させ、KaliにデフォルトでインストールされているJohn the Ripperを使用し、OSユーザのハッシュ化されているパスワード（/etc/shadow）をクラッキングしていきます。

最初にkaliにデフォルトで存在していたkaliユーザの情報をクラッキングし、その後に作成したユーザに対して同じくクラッキングをしていきます。

# 用語とかドキュメントとか
## Kaliが用意しているJohn the Ripperに関するドキュメント

https://www.kali.org/tools/john/

> John the Ripper is a tool designed to help systems administrators to find weak (easy to guess or crack through brute force) passwords, and even automatically mail users warning them about it, if it is desired.
Besides several crypt(3) password hash types most commonly found on various Unix flavors, supported out of the box are Kerberos AFS and Windows NT/2000/XP/2003 LM hashes, plus several more with contributed patches.

>日本語訳
John the Ripperは、システム管理者が弱い（推測やブルートフォースで簡単にクラックされる）パスワードを見つけるのを支援するためのツールです。必要に応じて、ユーザーに警告メールを自動的に送信することもできます。
Unixのさまざまなバージョンで一般的に使用される複数のcrypt(3)パスワードハッシュタイプに加えて、Kerberos AFSやWindows NT/2000/XP/2003のLMハッシュがサポートされています。また、寄稿されたパッチを使用すればさらに多くの形式にも対応しています。

John the Ripperではディクショナリ攻撃、ブルートフォース攻撃、ルールベース攻撃を実行することが可能なようです。
- ディクショナリ攻撃
    - 用意された単語リストを使って、ハッシュ値と一致するパスワードを探す方法
- ブルートフォース攻撃
    - すべての可能な文字列を試してパスワードを特定する方法
- ルールベース攻撃
    - 特定の単語（例: ユーザ名や既知の情報）を基に、文字の追加・削除・置換・組み合わせなどのルールを適用して生成されたパスワード候補を試す手法

## クラッキングとは

セキュリティやアクセス制限が施されたシステム、アプリケーション、データ、または暗号化された情報に対して、不正にアクセスしたりその制限を破ったりする行為を示します。

## ハッシュとは

データを固定長の値（ハッシュ値、ハッシュコード）に変換するための関数またはその結果を指します。元のデータの大きさや内容に関わらず、一定のルールでコンパクトな値に変換する仕組みです。
一方向性、衝突耐性、固定長出力、不可逆性、不可逆性の特性を持ちます。

# 手順
## Kaliにデフォルトで用意されているkaliユーザのパスワードをクラックする（ルールベース攻撃）
まず/etc/shadowの中身を見てみます。

```
# cat /etc/shadow

～中略～
kali:$y$j9T$ufXTBpN1QpgwlgqRFmb/B0$/.y0ybAF4iNQXniErsDWf9QSl2HZH7LnBeRHB4ZiQa9:20057:0:99999:7:::

```
/etc/shadowの各業について、以下のように内容を読み解くことが可能です。
赤い部分がJohn the Ripperを使う上で大切な部分です。
/etc/shadowだけでハッシュの方式やハッシュ化されたパスワードなど色々見れますね。
- **ユーザー名**: `kali`
    - これはユーザーアカウントの名前を示す。今回のユーザー名は `kali` 
- **パスワードハッシュ**: `$y$j9T$ufXTBpN1QpgwlgqRFmb/B0$/.y0ybAF4iNQXniErsDWf9QSl2HZH7LnBeRHB4ZiQa9`
    - この部分がハッシュ化されたパスワード部分。<font color=red>`$y$` で始まっていることから、このハッシュは **SHA-512** ベースのハッシュで、`crypt` 関数を用いた暗号化方式の一部</font>です。次の部分を分解すると：
        - **\\$y\\$**: 使用しているハッシュ方式。ここでは SHA-512（`sha512crypt`）を使っているとのこと。
        - **\\$j9T\\$**: ソルト（salt）。ソルトはランダムな文字列で、同じパスワードでも異なるハッシュを生成するために使われます。
        - **ufXTBpN1QpgwlgqRFmb/B0**: 追加のソルト。実際のパスワードをハッシュ化する際に使われます。
        - **$/.y0ybAF4iNQXniErsDWf9QSl2HZH7LnBeRHB4ZiQa9**: <font color=red>最後に生成されたハッシュ部分。これが最終的なパスワードのハッシュ。</font>
- **残りの部分**:
    - `20057`: パスワードの変更時刻を示すUNIXタイムスタンプです。これはパスワードが最後に変更された日時を記録している
    - `0`: パスワード変更後にユーザーが再設定を強制されるまでの日数
    - `99999`: ユーザーがパスワードを変更しなければならないまでの日数の最大値です（今回の例では実質的に変更なし）
    - `7`: パスワードの有効期限が切れる前に警告が表示される日数


クラッキングしたいユーザの情報のみを記載しているファイルを用意します。
今回は/root/password_hashes.txtを用意し、中身をkaliのみとしています。
※面倒であれば全部/etc/shadowから引っこ抜いても良いですが、クラッキングに時間かかりすぎると思うのでおススメはしません。
```
# pwd
/root

# cat password_hashes.txt
kali:$y$j9T$ufXTBpN1QpgwlgqRFmb/B0$/.y0ybAF4iNQXniErsDWf9QSl2HZH7LnBeRHB4ZiQa9:20057:0:99999:7:::
```
このファイルに対して以下のコマンドを実行します。

>john --format=クラッキングしたいハッシュ方式 クラッキングしたいファイル

コマンドの実行結果です。
kali (kali)という記載からkaliユーザのパスワードはkaliであることがばれてしまいました。
"Proceeding with single, rules:Single"という出力からルールベース、特にSingleルールによってクラッキングされたという事になります。
--format=cryptと記載することで「今回のハッシュ方式はsha256crypt, sha512crypt, md5cryptですよ～」という事をJohn the Ripperに明示しているようなイメージです。
```
# john --format=crypt password_hashes.txt

Using default input encoding: UTF-8
Loaded 1 password hash (crypt, generic crypt(3) [?/64])
Cost 1 (algorithm [1:descrypt 2:md5crypt 3:sunmd5 4:bcrypt 5:sha256crypt 6:sha512crypt]) is 0 for all loaded hashes
Cost 2 (algorithm specific iterations) is 1 for all loaded hashes
Will run 2 OpenMP threads
Proceeding with single, rules:Single
Press 'q' or Ctrl-C to abort, almost any other key for status
kali             (kali)
1g 0:00:00:01 DONE 1/3 (2025-01-24 06:29) 0.9523g/s 91.42p/s 91.42c/s 91.42C/s kali..kali999994
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```
上記コマンドでクラッキングした後であれば、--showオプションを使って出力をよりわかりやすくすることも可能です。
```
# john --show password_hashes.txt
kali:kali:20057:0:99999:7:::
```

## 新規ユーザを作成し、それに対してクラッキングする（ディクショナリ攻撃）
次にOSユーザを新規作成、そのユーザのパスワードをクラッキングしていきたいと思います。
今回は以下2つのユーザとパスワードを作成しました。test1に関しては日本においては聞くようなワードを選定しています。test2に関してはまず推測は無理だろうという完全ランダムな文字列を選定しています。
| ユーザ名 | パスワード |
|:-:|:-:|
| test1  | hogehoge  |
| test2  | 4M46KR5C-9_p  |

test2のパスワードに関しては、以下パスワード作成ツールで【最強】を選択して作っています。

https://www.luft.co.jp/cgi/randam.php

```
# useradd test1

# passwd test1
New password:
Retype new password:
passwd: password updated successfully

# useradd test2

# passwd test2
New password:
Retype new password:
passwd: password updated successfully
```
/etc/shadowを見てみます。
```
# cat /etc/shadow

～中略～
test1:$y$j9T$cZvlizwPWJRddlawk6FUX0$3T3/jSKDcsRJVq.SGtQMHdtULLXs2NWJh2YxJ7jMh98:20112:0:99999:7:::
test2:$y$j9T$jH.A96LJqObTGcfYw5MUC.$KBKsDZcn3SAr.xFNwaRVXYNGWUEVYsegjq/GATrr/PA:20112:0:99999:7:::
```
kaliユーザにクラックした時と同様に、この2つだけ抽出したファイルを作成します。
今回はtest_password_hashes.txtとしました。
```
# cat test_password_hashes.txt
test1:$y$j9T$cZvlizwPWJRddlawk6FUX0$3T3/jSKDcsRJVq.SGtQMHdtULLXs2NWJh2YxJ7jMh98:20112:0:99999:7:::
test2:$y$j9T$jH.A96LJqObTGcfYw5MUC.$KBKsDZcn3SAr.xFNwaRVXYNGWUEVYsegjq/GATrr/PA:20112:0:99999:7:::
```
クラッキングを掛けてみます。
結果としては、時間がかなりかかったので今回はクラッキングが難しかったのだろうと判断し、途中で処理を止めました。
出力結果の”rules:Single”と”Proceeding with wordlist:/usr/share/john/password.lst”からSingleルールとワードリストからの総攻撃に失敗したことを示しています。
※Singleルール：ユーザ名等から推測できる単純なパスワード候補を試す方法の事らしい

test1のパスワード、hogehogeくらいはクラック出来るかと思ったのですがデフォルトで用意されているものでは難しかったようです。
```
# john --format=crypt test_password_hashes.txt
Using default input encoding: UTF-8
Loaded 2 password hashes with 2 different salts (crypt, generic crypt(3) [?/64])
Cost 1 (algorithm [1:descrypt 2:md5crypt 3:sunmd5 4:bcrypt 5:sha256crypt 6:sha512crypt]) is 0 for all loaded hashes
Cost 2 (algorithm specific iterations) is 1 for all loaded hashes
Will run 2 OpenMP threads
Proceeding with single, rules:Single
Press 'q' or Ctrl-C to abort, almost any other key for status
Almost done: Processing the remaining buffered candidate passwords, if any.
Warning: Only 14 candidates buffered for the current salt, minimum 96 needed for performance.
Warning: Only 15 candidates buffered for the current salt, minimum 96 needed for performance.
Proceeding with wordlist:/usr/share/john/password.lst
0g 0:00:10:03 14.65% 2/3 (ETA: 08:01:21) 0g/s 46.49p/s 83.24c/s 83.24C/s 1sapphire..1nicholas
```
John the Ripperで用意されているワードリスト（/usr/share/john/password.lst）の中身を見てみると、以下のようなコメントとその後にパスワードで使われがちなパスワードが羅列されていることがわかります。
"This list is based on passwords most commonly seen on a set of Unix systems in mid-1990's"との記載から（恐らく英語圏で）1990年中期によく使用されていたパスワードがリスト化されているもののようです。
```
#!comment: This list has been compiled by Solar Designer of Openwall Project
#!comment: in 1996 through 2011.  It is assumed to be in the public domain.
#!comment:
#!comment: This list is based on passwords most commonly seen on a set of Unix
#!comment: systems in mid-1990's, sorted for decreasing number of occurrences
#!comment: (that is, more common passwords are listed first).  It has been
#!comment: revised to also include common website passwords from public lists
#!comment: of "top N passwords" from major community website compromises that
#!comment: occurred in 2006 through 2010.
#!comment:
#!comment: Last update: 2011/11/20 (3546 entries)
#!comment:
#!comment: For more wordlists, see https://www.openwall.com/wordlists/
123456
12345
password
password1
123456789
12345678
1234567890
abc123
computer
～～～以下省略～～～

# cat /usr/share/john/password.lst | grep -i hoge
出力無し
```
デフォルトではクラッキングが難しそうであったため、リストを作成したうえでクラッキングをしてみようと思います。
折角なので、雑なストーリー性を持たせてみます。例えば"攻撃者が漏洩パスワードセットをダークウェブ的なサムプレイスで購入して持っていたとして、それをベースにクラッキングする"というストーリーとしてみます。
test1は様々なサイトに対して同一のパスワードを使いまわしてる人でパスワードがあるサイトから漏洩してしまっている人。test2はパスワード管理ツールを使って各サイトのパスワードを全てバラバラで使っている人としましょう。

今回は以下のような漏洩リストを攻撃者が用意したとします。
```
# cat /usr/share/john/rouei.lst
arigato
nihon
japan
samurai
sushi
omotenasshi
ra-men
admin
root
hoge
hogehoge
qwert
asdfg
zxcvb
```

このワードリストを使って改めてクラッキングをしてみます。--wordlistオプションを使う事で指定のリストを元にクラッキングをすることが出来ます。
hogehoge(test1)という出力結果から、test1がばれたことがわかりますね。
パスワードの使いまわし、ダメ、絶対！
```
# john --format=crypt --wordlist=/usr/share/john/rouei.lst test_password_hashes.txt
Using default input encoding: UTF-8
Loaded 2 password hashes with 2 different salts (crypt, generic crypt(3) [?/64])
Cost 1 (algorithm [1:descrypt 2:md5crypt 3:sunmd5 4:bcrypt 5:sha256crypt 6:sha512crypt]) is 0 for all loaded hashes
Cost 2 (algorithm specific iterations) is 1 for all loaded hashes
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Warning: Only 14 candidates left, minimum 96 needed for performance.
hogehoge         (test1)
1g 0:00:00:00 DONE (2025-01-24 07:17) 2.941g/s 41.17p/s 82.35c/s 82.35C/s arigato..zxcvb
Use the "--show" option to display all of the cracked passwords reliably
Session completed.

# john --show test_password_hashes.txt
test1:hogehoge:20112:0:99999:7:::

1 password hash cracked, 1 left
```

## John the Ripperに過去のクラッキングの結果を忘れさせる
.johnという名前の隠しディレクトリの中にjohn.potというファイルがあります。
これを消してあげることで、忘れさせることが可能です。
```
# pwd
/root
# ls -a | grep -i john
.john

# cd .john
# ls
john.log  john.pot

# cat john.pot
$y$j9T$ufXTBpN1QpgwlgqRFmb/B0$/.y0ybAF4iNQXniErsDWf9QSl2HZH7LnBeRHB4ZiQa9:kali
$y$j9T$cZvlizwPWJRddlawk6FUX0$3T3/jSKDcsRJVq.SGtQMHdtULLXs2NWJh2YxJ7jMh98:hogehoge
# rm john.pot
```

