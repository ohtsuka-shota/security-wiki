---
title: "HTMLのformタグとCSRFについてのメモ"
date: 2025-12-07
tags: ["vulnerability", "HTML", "form", "Security", "Web", "csrf"]
source: "https://qiita.com/ohtsuka-shota/items/90a2bbc8efaffb2737b9"
---
※私はWebアプリを作るエンジニアではない為、具体的なコードは出せません。
※雰囲気で理解してます。細かい点は正直まだわかってません。

この書籍を読んでいて気になった部分があったのでAIとかと協力して自分なりに理解を深めていきます。
これはそのメモだとご理解いただければと思います。

https://www.amazon.co.jp/%E4%BD%93%E7%B3%BB%E7%9A%84%E3%81%AB%E5%AD%A6%E3%81%B6-%E5%AE%89%E5%85%A8%E3%81%AAWeb%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E4%BD%9C%E3%82%8A%E6%96%B9-%E7%AC%AC2%E7%89%88-%E8%84%86%E5%BC%B1%E6%80%A7%E3%81%8C%E7%94%9F%E3%81%BE%E3%82%8C%E3%82%8B%E5%8E%9F%E7%90%86%E3%81%A8%E5%AF%BE%E7%AD%96%E3%81%AE%E5%AE%9F%E8%B7%B5-%E5%BE%B3%E4%B8%B8/dp/4797393165

# formタグって異なるサイト（オリジン）に対してリクエストを無条件に送信できるって話

私はインフラエンジニアなので、Webアプリ系のエンジニアの領域とは恐らく一番遠い存在です。
そのような私ですので、HTML等をゴリゴリ書くことは無く、そもそも理解不足なところは否めませんが、イメージとしてこのformタグは、HTMLを提供している自分自身に対してユーザから受け取ったデータを送信するために使うイメージでした。しかし、以下のように記載することで他のサイトにデータを送信することが出来るみたいです。これが初耳でした。

以下のHTMLはdataをother-site.comに送信するhtmlになります。
```html
<form action="https://other-site.com/submit" method="POST">
  <input type="text" name="data">
  <button type="submit">送信</button>
</form>
```

このような仕様が許可されているのは、Web黎明期の「異なるサイト間でのデータ交換が前提（今もそうだけど）」というのが影響しているようです。昔は今と比べて、電子で重要な情報をやり取りをすることが少なかったため、セキュリティ的に許容されてきたのでしょう。

また、formタグの特性として以下のようなものがあげられるようで、そういった観点からもセキュリティ的なリスクが低く、オリジン制限を掛けていないものだと思います。
- リクエストを送ると、画面ごとそのページに遷移（移動）する。
- 元のページ（送信元のサイト）は、送信後に相手のサーバーから何が返ってきたか（成功したのか、どんな画面が表示されたのか）をプログラムで知ることはできない。
- 「データは投げつけられるけど、結果を盗み見ることはできない（一方通行）」という性質のため、ブラウザは「情報の漏洩リスクは低い」と判断し、送信自体は許可する。

# JSでもオリジンが異なっても許可されているものがある

JSでも以下のものはHTMLのformタグの内容を呼び出しているだけなので、オリジンの制限がないようです。
以下の例ではHTMLで定義されているmyFormを呼び出して実行しているだけになります。
```javascript
document.getElementById('myForm').submit()
```

この点についてざっくりイメージ図に落としてみたものが以下になります。

![security-ページ6.drawio (1).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bbf596cc-0357-4854-aabe-5f93207eeb16.png)


# オリジン制限（同一オリジンポリシー）があるもの
JavaScriptの例えば以下のようなものに関しては同一オリジンポリシーが適用され、ブラウザでブロックされます。
これは先ほどのformタグと異なり、レスポンスを読み取ることが可能ということで、より厳密なセキュリティが敷かれているようです。
```javascript
// fetch
fetch('https://other-site.com/api/data')
  .then(response => response.json())

// XMLHttpRequest
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://other-site.com/api/data');
xhr.send();
```

内容を読み取られないようにするために、ブラウザ側で異なるドメインの時は自動で見れないようにするようです。
具体的な流れのイメージは以下となります。

![security-ページ7.drawio (1).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/df46383f-0cb2-4834-a4e9-36beaf56de69.png)


# Access-Control-Allow-Origin設定がサーバ側にあるとどうなるか
送信されたデータを受け取る側（今回はSite B）でAccess-Control-Allow-OriginでSite Aからのデータ連携を許可されていると、ブラウザでそれを認識して中身を見ることが出来るようになるようです。

![security-ページ8.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/adff1707-8005-4984-8b73-7c87a51d8b36.png)

# CSRF(シーサーフ)攻撃について
少し前に戻りますが、formタグって異なるサイト（オリジン）に対してリクエストを無条件に送信できるところでセキュリティリスク（特に情報漏洩リスク）が低いという事を書きましたが、これを悪用した攻撃としてCSRF攻撃というものがあるようです。

悪意のあるHTMLの例：
これを実行すると、登録されているデータを削除する処理が正規のクッキー(セッション)で実施されてしまい、サーバーから見ると、「正しいセッションIDを持ったユーザーからの、正規の削除リクエスト」と、攻撃者が仕組んだリクエストの区別がつかなくなります。
```html
<!-- ユーザーには見えない隠しフォーム -->
<form action="https://admin.example.com/user/delete" method="POST">
  <input type="hidden" name="target_id" value="123">
</form>
<script>
  // ページを開いた瞬間に勝手に送信ボタンを押す
  document.forms[0].submit(); 
</script>
```

![security-ページ9.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/45e76458-cba9-4d25-8766-6f2abf6c96d6.png)


これを回避する方法として、Cookieを発行する際（Set-Cookieヘッダ）、SameSite 属性を設定することがあげられるようです。今回の場合はSite Aでこれを実装しておくという事ですね。

**Set-Cookie: session_id=...; SameSite=Lax**
これを設定すると、**「他サイト（site B）から発火したPOSTリクエストには、Cookieを添付しない」という動作をブラウザに強制できます。現在、主要ブラウザ（Chrome等）はデフォルトでこの挙動になりつつありますが、明示的に設定することが推奨されるらしい。

# ログインCSRF

**攻撃のシナリオ**
- 攻撃者は、自分のWordPressアカウント（例: attacker / pass123）を用意します。
- 攻撃者は罠サイトを作成し、そこに「WordPressのログインURLへ、attacker / pass123 でログインするPOSTリクエスト」を仕込みます。
- 被害者が罠サイトを閲覧すると、被害者のブラウザ上で勝手に攻撃者のアカウントでログイン処理が行われます。
-自分のアカウント」だと思ってサイトを利用し続けますが、実際には「攻撃者のアカウント」にログインしている状態。これで機密情報を入力してしまうと・・・

![security-ページ11.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bdb0b588-e0d9-4b00-888f-01cf774d8a41.png)



# プリフライトリクエスト
シンプルなリクエストの他に複雑なリクエストもあるみたいで、その場合はプリフライトリクエストというのが、ブラウザ側で勝手に実行されるようです。


![security-ページ10.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/debba22c-be2e-4c2d-ab8f-b32d0e532599.png)

```
 ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
 │    Site A       │        │   ブラウザ       │        │    Site B       │
 └─────┬─────────┘        └──────┬────────┘        └──────────┬──────┘
       │                           │                                │
 ① ユーザーが Site A にアクセス     │                                │
       │──────────────────────────>│                                │
       │                           │                                │
 ② JavaScript がクロスオリジンの    │                                │
    リクエストを発行しようとする     │                                │
       │──────────────────────────>│                                │
       │                           │                                │
 ③ ブラウザが判定：                 │                                │
    ・これはクロスオリジン  
    ・メソッドが PUT または独自ヘッダあり  
    → プリフライト（OPTIONS）が必要  
       │                           │                                │
       │                           │───────────────OPTIONS─────────>│
       │                           │  (プリフライト要求)             │
       │                           │                                │
 ④ Site B はプリフライトに対し      │                                │
    CORS 許可ヘッダを返す            │                                │
       │                           │<───200 OK──────────────────────│
       │                           │   Access-Control-Allow-Origin: https://siteA
       │                           │   Access-Control-Allow-Methods: PUT
       │                           │   Access-Control-Allow-Headers: X-Custom-Header
       │                           │                                │
 ⑤ ブラウザ「許可されたので本リクエスト送る」                      │
       │                           │──────────────PUT──────────────>│
       │                           │  (実際のデータ送信)              │
       │                           │                                │
 ⑥ Site B がレスポンスを返す        │                                │
       │                           │<───200 OK──────────────────────│
       │                           │   Access-Control-Allow-Origin: https://siteA
       │                           │                                │
 ⑦ ブラウザ：SOP に従ってレスポンスを JS へ開放  
    （許可オリジンなので読み取り可能）  
       │                           │                                │
       │<──────────────────────────│                                │
 ⑧ JavaScript がレスポンス内容を利用できる  

```

