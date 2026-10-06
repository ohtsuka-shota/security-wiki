---
title: "そのサーバ、勝手に覗かれてませんか？MaltegoとShodanで偵察フェーズをちょっと深掘りしてみた"
date: 2026-09-17
tags: ["vulnerability", "Maltego", "Shodan", "KaliLinux", "エシカルハッキング", "Security"]
source: "[[recon-maltego-shodan]]"
---
# 初めに
前回、Sherlock/theHarvesterで偵察フェーズの一端（SNSアカウントの洗い出し、ドメイン起点の情報収集）を試しました。今回はその続編として、同じ「偵察」フェーズをもう一段深掘りします。

[[recon-sherlock-theharvester]]

具体的には、前回手作業で行った情報収集をMaltegoで自動化・可視化し、さらにShodanでインフラ側（サーバやデバイス）の情報収集手法を紹介します。

:::note warn
警告
本記事の内容は自宅ラボ内の隔離環境、および自分が所有・管理するドメイン・アカウントに対してのみ実施しています。Shodanで検索した結果に対して実際にアクセスやログインを試みる行為は、対象が自分の所有物でない限り不正アクセス禁止法などの法律に違反する可能性があります。本記事は検索・観察の範囲に留めており、悪用を推奨するものではありません。
:::

## サイバーキルチェーンで見る本記事の位置づけ
前回はSherlock/theHarvesterという個別ツールで手作業で情報を集めましたが、今回はそれを「グラフで俯瞰する」「インフラ側まで視野を広げる」という形で偵察フェーズを深掘りします。

| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ①偵察 | 標的の情報収集 | Maltegoによる前回収集情報の自動化・可視化、Shodanによるインターネット公開デバイスの検索（いずれも公開情報の受動的収集の延長） |

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)
# 用語
## Maltego

OSINT情報を自動収集し、エンティティ（ドメイン・メールアドレス・人物・IPアドレスなど）同士の関係性をグラフで可視化するツールです。ドメインやユーザー名を起点（シードエンティティ）として投入すると、「Transform」と呼ばれる情報収集モジュールが自動実行され、関連する情報を芋づる式に展開してくれます。Community Edition（CE）は無料で利用でき、実務のペネトレーションテストや脅威インテリジェンス調査でもよく使われます。

## Shodan

インターネットに接続されたデバイス（サーバ、ルーター、カメラ、産業制御機器など）を対象にした検索エンジンです。Googleがウェブページの内容を検索対象にするのに対し、Shodanはポートスキャンやバナー情報を対象にしており、country:（国）、port:（ポート番号）、product:（製品名）などのフィルタ構文で絞り込み検索ができます。自組織の意図しない公開資産の棚卸し（アタックサーフェス管理）にも使われます。

# 環境構築
## Maltego CEのインストールとアカウント登録
KaliにはMaltegoのインストーラが最初から入っているので、これを使ってインストールしていきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/51c9a5a3-d23f-48e3-b0b2-6263d38f51c9.png)

インストーラを起動するとシェルが起動してインストールが開始されます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/e508afa4-fea4-4e66-9d76-317a298222b1.png)

インストール後、maltegoを実行が選択できるようになるので、これを起動していきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ac57f7b1-8fd0-48bc-893e-7e7676329af8.png)

Activationの選択画面が表示されます。
MALTEGO IDを選択してNextを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0ac694cd-1bd7-41be-9a49-24aff2a68504.png)

オンラインアクティベーションを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8fb627dc-35b8-427b-b81f-08e50a1d56a7.png)

Acceptを選択して次へを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8eaf2d4f-86b7-48d7-8938-671beb6f8b85.png)

Browser Loginを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/551ef5f1-89ed-483d-bfc5-b1b029c514db.png)

Webブラウザが自動で起動して、Maltegoの登録画面が開きます。
アカウントは持っていないので、CREATE IDを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6feb527d-73af-417f-88c9-88da62c0b306.png)

メールアドレスと名前を登録していきます。
![maltego01.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1ffae13e-565f-43cb-bb3e-cf7b6a8e8997.png)

パスワードを指定します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a657c63c-8582-44bf-835d-701ac8241562.png)

登録したメールアドレス宛に認証メールが飛んでくるので、確認して対応します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f72c5bbe-d380-4f57-9490-e03ec5973013.png)

メール認証が成功するとログイン画面に戻るので、設定したメールアドレスとパスワードでログインします。
![maltego02.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b4259ba6-d9d3-4301-90a0-f42e29fce579.png)

国と電話番号を登録します。
![maltego03.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/88ca2903-3220-4303-a3b4-8574bd4889dc.png)

プロファイルを作成します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ef581b9c-692e-41da-8422-ef52734b6118.png)

Maltego ONEというコンソール？が表示されるはずです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/55a115f5-bbee-4a2c-8a55-94cf8c7cfc40.png)

ここまで出来ていると、Kali側のMaltegoでログイン成功の表示がされていると思います。
次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7a4d67a0-c1b0-4ea6-a44b-af1c94f80ec2.png)

この後は基本的にデフォルトの設定のまま進んでいきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7fc20993-438a-4ef7-a97f-e73a3bf613dc.png)

一点、BrowserはFirefoxを選択しておきます。
Kaliにデフォルトで入っているのがこれの為です。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/81272b33-7474-49c7-9f00-7656fe60fe81.png)

## Maltegoの試行
チュートリアルを確認していると、以下のようなデモグラフを確認できました。
このようにドメインやIPアドレス、国などをグラフィカルに紐づけしてくれるようです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bd99a883-d349-46d5-a191-fc544c8af935.png)

Github Pagesで生成したドメインで試してみます。
Investigateタブを押下し、Entity Paletteの検索でdomainと検索をすると、DomainというEntityが確認できると思うので、これをD&Dで右側のグラフに持っていきます。デフォルトだとmaltego.comと記載がされていますが、ここを調査したいドメインに変更していきます。今回はohtsuka-shota.github.ioになります。
![maltego04.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/578cb369-5b6b-4238-8153-eed97c85635a.png)

右クリックして検索するところにQuickと入力して、Quick lookupをクリックします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/851e7240-726b-46b3-a1a6-cb1bddd64025.png)

そうすると関連するドメインが表示されます。
同じような感じでDNSやサブドメインやEmailアドレスなど、色々調査をすることが可能です。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8a5c0b47-31ec-4c29-8afa-fd966407697d.png)

## shodanのアカウント登録
以下にアクセスしてSign Upしていきます。

https://www.shodan.io/

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/e8fa927e-53a5-40c8-835d-6e1614e04284.png)

以下のようなページが開きます。Registerタブを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a28345dd-c9d6-4001-b920-71cda74ee8bf.png)

ユーザ名・パスワード・メールアドレスを設定して登録していきます。
この後、登録したメールアドレスに作成したアカウントのアクティベーションのURLが記載されたものが届くので、これをクリックして有効化します。
![shodan01.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a01fe182-2720-456a-ae32-7ce8fefb68c9.png)

アクティベーション実行後、ログイン処理を行います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/823a11bc-734c-4c8f-aaeb-0846fede6435.png)

ログインが出来ると、Tourやアカウント情報などを確認できるページを表示できるようになります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c347377e-8215-4df3-a7eb-4414753a814e.png)

## shodanの試行（Search）

Searchで例えば以下のように検索をかけてみます。
そうするとHTTPでかつ東京で公開されているWebサーバが一覧として確認できます。
```
country:jp product:apache city:"Tokyo" port:80
```

ORGANIZATIONSを見ると、Amazon Data Servicesというのがあるので、これは恐らくAWSのEC2で80ポートを公開しているものが表示されているのかなと思います。
![shodan02.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ebc4d592-ea18-4c96-b006-4ad3a4d939f9.png)

試しに1つサーバを見てみます。
HostnameやCloudProvider、Regionなどから、どこにこのWebサーバがあるかが確認できます。
Apacheのバージョン、脆弱性（CVE）を確認することも出来、もしクリティカルな脆弱性がある場合、それを使って侵入・権限昇格・データ窃盗等を実行される可能性が出てきます。
![shodan03.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5d140be8-d984-4ab8-a22b-8e040f482a33.png)

## この先の危険性

例えば、こうして見つけたApacheの脆弱性を悪用すれば、nmapでのポートスキャン結果をもとにMetasploitで該当モジュールを選択し、遠隔からログインされてしまう可能性があります。侵入後は/etc/passwdやshadowからハッシュ化されたパスワードを窃取され、John the Ripperやhashcatでクラックされることでroot権限まで奪取される、といった危険性があります。

[[metasploit-intro]]

[[linux-privilege-escalation-basics-hydra-suid-dirtycow]]

