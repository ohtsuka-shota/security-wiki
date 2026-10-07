---
title: "そのユーザー名、使い回してませんか？Sherlock/theHarvesterで偵察フェーズを試してみた"
date: 2026-09-17
tags: ["vulnerability", "sherlock", "theharvester", "KaliLinux", "Security", "エシカルハッキング"]
source: "https://qiita.com/ohtsuka-shota/items/6ff4c7866deb31fdf6f9"
---
# はじめに
:::note warn
警告
本記事は学習・検証目的の共有であり、悪用を推奨するものではありません。
:::

## サイバーキルチェーンで見る本記事の位置づけ

今回の内容をサイバーキルチェーンの7段階に当てはめると、以下のように整理できます。

| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ①偵察 | 標的の情報収集 | Sherlockによる対象ユーザー名のSNS/サービス登録状況の調査、theHarvesterによるドメイン起点のメールアドレス・サブドメイン等の収集（いずれも公開情報の受動的収集） |

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)


# 用語
## Sherlock
ユーザー名(ハンドルネーム)が主要SNS・サービス(Twitter/X、Instagram、GitHub、Redditなど数百サイト)上に存在するかを一括で調べるツールです。ターゲットのユーザー名を1つ入力すると、そのユーザー名が登録されているプラットフォームの一覧が返ってきます。ソーシャルエンジニアリングの下調べや、ターゲットが他にどんなアカウントを持っているかの洗い出しに使われます。

## theHarvester
ドメインや組織名を起点に、メールアドレス・サブドメイン・関連するホスト名・従業員名などを検索エンジンやPGPキーサーバー、Shodan、Censysなどの公開ソースから収集するツールです。企業を対象にしたペンテストの最初のステップ(攻撃対象領域の把握、フィッシング用メールアドレスリストの作成など)でよく使われます。

# 環境構築
## theHarvesterを試す用のドメインを発行
theHarvesterをお試しするためにドメインが必要となります。
今回はGithub Pagesでお手軽に用意してみたいと思います。
自分自身のGithubにgithub.ioのリポジトリを作成してそこにhtmlファイルをpush。Github Pagesを稼働させます。
```
PS C:\Users\ohtsu\Documents\security> git clone https://github.com/ohtsuka-shota/ohtsuka-shota.github.io
Cloning into 'ohtsuka-shota.github.io'...
warning: You appear to have cloned an empty repository.
PS C:\Users\ohtsu\Documents\security> cd .\ohtsuka-shota.github.io\
PS C:\Users\ohtsu\Documents\security\ohtsuka-shota.github.io> Set-Content -Path index.html -Value "<h1>ohtsuka-shota</h1>" -Encoding UTF8
PS C:\Users\ohtsu\Documents\security\ohtsuka-shota.github.io> git add index.html
PS C:\Users\ohtsu\Documents\security\ohtsuka-shota.github.io> git commit -m "init" 
[main (root-commit) 8a8699b] init
 1 file changed, 1 insertion(+)
 create mode 100644 index.html
PS C:\Users\ohtsu\Documents\security\ohtsuka-shota.github.io> git push origin main
```

実際に作成しているリポジトリは以下。

https://github.com/ohtsuka-shota/ohtsuka-shota.github.io

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0a40bf05-ae9c-42b5-8807-a83af6f4b560.png)



用意したリポジトリのSettingsのPagesタブを開きます。
Your site is live at ~というところにurlがあり、アクセスできることを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2563c122-5af4-4dc6-82d3-72f7204a49d9.png)


## Sherlockのインストールと試行

githubに手順があるので、これを参考にします。
今回はpipxで導入していきます。

https://github.com/sherlock-project/sherlock

```
# apt install -y pipx  
# pipx ensurepath            
Success! Added /root/.local/bin to the PATH environment variable.

Consider adding shell completions for pipx. Run 'pipx completions' for instructions.

You will need to open a new terminal or re-login for the PATH changes to take effect. Alternatively, you can source your shell's config file with e.g. 'source
~/.bashrc'.

Otherwise pipx is ready to go! ✨ 🌟 ✨

# source ~/.zshrc

# pipx install sherlock-project
WARNING: Skipping setuptools as it is not installed.
  installed package sherlock-project 0.16.2, installed using Python 3.13.15
  These apps are now available
    - sherlock
done! ✨ 🌟 ✨
```


Sherlockを実行してみます。
今回はGithubに登録している私のユーザ（ohtsuka-shota）でサーチしてみます。
※システムに侵入しているわけではない（公開情報の範疇）とはいえ、自分のユーザか承認をもらっているユーザ以外ではしない方が無難でしょう。
--csvオプションを付けた上で実行することでサーチ結果をcsvとしても出力することが出来るので、良さそうな気がします。

csvの出力結果でstatusが200となっているのと、400とか403になっているものがありますが、200が比較的本当にアカウントがある可能性が高いもの、400系が要確認系らしいです。
Githubは間違いなく私ですが、他のは私と同姓同名の方が登録されているもののような気がします。~~TikTokのような若者向けのSNSはマジで登録してませんね。~~

今回のSherlockの結果からもわかる通り、複数のSNSで同じユーザ名を使い回していると、このように一括でガバッと調査されてしまう可能性があります。パスワードだけでなく、ユーザー名についても使い回しを避けるのがOSINT対策として有効です。
```
# sherlock ohtsuka-shota --csv
[*] Checking username ohtsuka-shota on:

[+] AniWorld: https://aniworld.to/user/profil/ohtsuka-shota
[+] BoardGameGeek: https://boardgamegeek.com/user/ohtsuka-shota
[+] Discord: https://discord.com
[+] F3.cool: https://f3.cool/ohtsuka-shota/
[+] GitHub: https://www.github.com/ohtsuka-shota
[+] Scratch: https://scratch.mit.edu/users/ohtsuka-shota
[+] TikTok: https://www.tiktok.com/@ohtsuka-shota
[+] BabyRu: https://www.baby.ru/u/ohtsuka-shota

[*] Search completed with 8 results

Go deeper than a username. Explore public profiles and export your findings.
Try OSINTSearch: https://osintsearch.org

# cat ohtsuka-shota.csv  
username,name,url_main,url_user,exists,http_status,response_time_s
ohtsuka-shota,AniWorld,https://aniworld.to/,https://aniworld.to/user/profil/ohtsuka-shota,Claimed,403,0.1912357380060712
ohtsuka-shota,BoardGameGeek,https://boardgamegeek.com/,https://boardgamegeek.com/user/ohtsuka-shota,Claimed,200,1.3523256979970029
ohtsuka-shota,Discord,https://discord.com/,https://discord.com,Claimed,400,4.341168195998762
ohtsuka-shota,F3.cool,https://f3.cool/,https://f3.cool/ohtsuka-shota/,Claimed,200,5.633627313000034
ohtsuka-shota,GitHub,https://www.github.com/,https://www.github.com/ohtsuka-shota,Claimed,200,7.0109487129957415
ohtsuka-shota,Scratch,https://scratch.mit.edu/,https://scratch.mit.edu/users/ohtsuka-shota,Claimed,200,16.872236249997513
ohtsuka-shota,TikTok,https://www.tiktok.com,https://www.tiktok.com/@ohtsuka-shota,Claimed,200,18.997066905008978
ohtsuka-shota,BabyRu,https://www.baby.ru/,https://www.baby.ru/u/ohtsuka-shota,Claimed,403,35.3003981019865
```

## theHarvesterの試行
-d オプションの後にターゲットのドメイン指定
-b オプションの後に情報源（≒ブラウザの事）を指定します。

今回の試行結果としては、諸々の情報が出力されていない状態になっています。（No ~）
これはGithubにpushしたindex.htmlにその情報が無かったり、共有ドメイン周りの影響が出ているようです。
もしここでメールアドレスやIPが取得できれば、インフラ調査としてwhoisコマンドやmxlookupコマンドなどを使ったり、フィッシングとしてマルウェア配布という流れになります。
```
# theHarvester -d ohtsuka-shota.github.io -b crtsh,duckduckgo,otx
Read proxies.yaml from /etc/theHarvester/proxies.yaml
*******************************************************************
*  _   _                                            _             *
* | |_| |__   ___    /\  /\__ _ _ ____   _____  ___| |_ ___ _ __  *
* | __|  _ \ / _ \  / /_/ / _` | '__\ \ / / _ \/ __| __/ _ \ '__| *
* | |_| | | |  __/ / __  / (_| | |   \ V /  __/\__ \ ||  __/ |    *
*  \__|_| |_|\___| \/ /_/ \__,_|_|    \_/ \___||___/\__\___|_|    *
*                                                                 *
* theHarvester 4.11.1                                             *
* Coded by Christian Martorella                                   *
* Edge-Security Research                                          *
* cmartorella@edge-security.com                                   *
*                                                                 *
*******************************************************************

[*] Target: ohtsuka-shota.github.io 

[*] Searching Duckduckgo. 
[*] Searching Otx. 
[*] Searching CRTsh. 

[*] No IPs found.

[*] No emails found.

[*] No people found.

[*] No hosts found.
```


