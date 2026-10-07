---
title: "Cookie(セッション)と関連攻撃についてざっくり理解したい"
date: 2025-12-07
tags: ["vulnerability", "Security", "Web", "cookie", "session"]
source: "https://qiita.com/ohtsuka-shota/items/f998f57b6ca2e80319f8"
---
※私はWebアプリを作るエンジニアではない為、具体的なコードは出せません。
※雰囲気で理解してます。細かい点は正直まだわかってません。

# Cookieの流れ
## ログイン前

ユーザーが初めてWebサイトにアクセスすると、以下の流れでログイン画面が表示されます。

① **ブラウザ → Webサーバ**: ユーザーがURLにアクセス
② **Webサーバ → ブラウザ**: ログイン画面を返す

この時点では、まだユーザーの認証は行われていません。

![security-ページ2.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6757bc29-6662-4430-b53d-6a02e282631e.png)


## ログインとログイン後の処理

③**ブラウザ → サーバ**
- 登録済みのユーザー名とパスワードをサーバーに送信(通常はPOSTメソッド)
- **重要**: HTTPS通信で暗号化して送信することが必須

④**サーバ**
1. 受信したユーザー名とパスワードをデータベースと照合
2. 認証が成功したら、**セッション**を作成
3. セッションストレージ(メモリ/ファイル/DB)にユーザー情報を保存
4. ランダムで推測困難な**セッションID**を生成

⑤ **サーバー → ブラウザ**

ログイン後のページを返す。
Set-CookieヘッダーでセッションIDをブラウザに保存するよう指示

![security-ページ3.drawio (2).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/154ae9da-1246-47d2-8cf6-d9a391105b48.png)


## ログイン後

⑥**ブラウザ → サーバ**: 自動的にCookie(セッションID)を送信
⑦**サーバ**: セッションIDからユーザー情報を取得
⑥**サーバ → ブラウザ**: 認証済みユーザー向けのコンテンツを返す

![security-ページ4.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a949e45f-c745-4dd6-a6d0-dd29a2416604.png)


# 【攻撃】セッションハイジャック
## 大まかなイメージ図
④の部分で推測可能なID（今回の様な11111）のようなものを使うと、悪意ある第三者にIDを盗まれてuserAとしてWebサイトを閲覧されてしまう可能性がある。

![security-ページ5.drawio (2).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a51cab96-d5ef-4eee-885a-89b046cb1118.png)

# 【攻撃】セッションフィクセーション（及びクッキーインジェクション）
## 大まかなイメージ図
攻撃者はまず、自身でクッキーを作成する。
その後、攻撃対象にクッキーを仕込んで（＝クッキーインジェクション）ログインをさせる。攻撃対象者がそのクッキーを使って例えばクレジットカード情報や住所などの機密情報をサーバ側に入力してしまったとする。
攻撃者は自身のクッキーで再度サーバにログイン。攻撃対象者が入力した機密情報を盗み見ることが出来る。

![security-ページ5.drawio (4).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/664a9b5e-b253-48bb-85dd-0def6d406b05.png)

