---
title: "【SSO連携設定】Proxmox VE×Azure Entra ID"
date: 2026-03-15
tags: ["tool", "Azure", "Security", "proxmox", "SSO", "EntraID"]
source: "https://qiita.com/ohtsuka-shota/items/71f41600a97afe834b2e"
---
rootで入るのなんとなく気持ちが悪いな(~~あと面倒くさい~~)と思い、AzureのEntraIDの勉強がてらハンズオンをしてみます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d24da474-a8dd-44ef-a2b0-f66dad3cdd2b.png)

# 環境イメージ
個人でサブスクリプションしているAzureのEntraIDを使います。
Azureにログインしているアカウントで、ホームラボとして使っているProxmoxの管理画面にSSOでアクセスできるようにしていきます。
![自宅ラボ01-ページ3.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0036bd7b-71e3-42c1-a827-967ec8b2db97.png)


# 構築
## EntraID
Azure PortalにログインしてEntra IDの管理画面を開きます。
管理からアプリの登録を押下すると以下のような画面になります。
新規登録を押下します。
![azure01.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/844aa30d-57d1-4712-96b3-d01783dbfc2b.png)

名前：ProxmoxVE
サポートされるアカウントの種類：シングルテナントのみ
リダイレクトURI
Web：https:\//＜ProxmoxVEのIPアドレス＞:8006/
このように設定を入れて、登録を押下します。
![azure02.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9cd20c7a-d314-4eb5-af46-1301b5b4d843.png)

登録出来たことを確認します。
![azure03.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/248256eb-1c79-4ad1-8377-8da578e668c9.png)

画面左の管理から証明書とシークレットを押下します。
クライアントシークレットタブから新しいクライアントシークレットを押下します。
![azure04.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/28cd00ee-9534-4c96-a648-1fc0122cefc9.png)

説明：ProxmoxVESSO
有効期限：180日
これで追加します。
![azure05.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/85a93001-8853-4335-b8ac-eeeec2ed8d22.png)

作成出来たことを確認します。
値は使用するため控えておきましょう。（シークレットIDはAzure側が管理する用の識別子）
![azure06.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4e5bc93d-7bdc-46ca-ba9f-13f92b9413f3.png)

概容に戻ります。
アプリケーションIDをコピーしてメモ帳か何かに控えます。
画面上のエンドポイントを押下します。
![azure07.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/90ff218b-5a0a-446e-b4c6-35646d76e759.png)

OpenID Connectメタデータ ドキュメントをコピーします。
**https:\//login.microsoftonline.com/＜テナントID＞/v2.0/.well-known/openid-configuration**
というURLを
**https:\//login.microsoftonline.com/＜テナントID＞/v2.0**
としてメモ帳か何かに控えます。
![azure08.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/95677673-bdc0-42dd-8190-ced91fc3b5c8.png)

## Proxmoxでの設定
ログインして、データセンターからアクセス権限 > レルムと下ります。
追加ボタンからOpenID Connectサーバを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/cf1453c8-3b05-4c59-b90d-16b987f69126.png)

以下の内容を設定します。

| PVEの設定項目 | 入力する内容 | 注意点 |
| :--- | :--- | :--- |
| **Issuer URL** | `https://login.microsoftonline.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/v2.0` | 末尾に `/.well-known/...` を含めないこと。 |
| **Client ID** | `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` | Entra IDの「アプリケーション (クライアント) ID」を入力。 |
| **Client Key** | `****************************************` | Entra IDで発行したシークレットの「値」を入力。 |
| **Realm ID** | `EntraID` (任意) | ログイン画面のドロップダウンに表示される識別子です。 |
| **自動作成ユーザ** | `チェックを入れる` |初回ログイン時に、Proxmox上にユーザーアカウントを自動生成します。 |

![azure09.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9a539a60-e5b6-4648-8f06-d8d5989445bd.png)

登録されたことを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c8dd5c89-2df6-4094-a3c6-60e267fc10ce.png)

## 動作確認と環境微修正
ユーザを作成します。
EntraIDの画面からユーザの管理画面に移動して、新しいユーザーを押下します。
![azure10.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1314a87d-71a3-4ce9-9532-254d85457742.png)

任意の設定で作成していきます。
![azure11.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9f4b0397-240f-4b14-bd5a-531d40c5e16c.png)

作成出来たことを確認します。
![azure12.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4df3fd70-5603-404a-8320-9241db3bd52e.png)

エンタープライズアプリケーションの管理画面を開きます。
先ほど作成したProxmoxVEがあることを確認し押下します。
![azure13.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7aaffbaf-2fd5-4ae7-997d-3a346d4c524d.png)

ユーザとグループの割り当てを押下します。
![azure14.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/fb1f8a4c-87a1-40aa-9491-4da6fabd9255.png)

Add user/groupを押下します
※なぜか英語
![azure15.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b99f74fe-0d6f-4bb9-b5bc-6b374b1b8da1.png)

先ほど作成したユーザにチェックボタンを押下して、割り当てます。
![azure16.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/187d8a4b-a391-4479-a1d7-a9c92f9f35ad.png)

割り当たっていることを確認します。
![azure17.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/38bebc44-2261-4f9a-a17a-1df92239c320.png)

セキュリティのアクセス許可タブを押下します。
Grant admin consent for Default Directoryを押下します。
![azure24.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/26107131-8044-4ce1-897b-cec8856fc948.png)

承認します。
![azure25.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/683f71d4-68a9-4f25-a30a-5596bf10d1ca.png)

承認されていることを確認します。
![azure26.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/502c43b0-e6a4-4398-a0e4-482a3f3ec907.png)

Proxmoxでログインしてみます。
レルムをEntraIDにしてログインボタンを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1dd3c596-895b-4621-9fa9-243639f29477.png)

MSのURLにリダイレクトされます。
承諾を押下します。
![azure18.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c982fbf0-a605-4be2-a163-6229be6f2cef.png)

ログインが出来ました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/df74d57e-97cc-4591-98c1-87c6247d7a61.png)

どのユーザでログインしたのか少し気になったので確認してみたところ先ほど作成したユーザではなく、AzureのRootユーザでした。ブラウザでキャッシュしている情報を元にProxmoxにログインしたようです。アプリケーションに割り当てていないユーザなのに・・・
![azure19.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f3a02639-376e-4fd1-bc03-ad308b26f449.png)

先ほど登録してなかったのですが、Proxmoxでログインした後に自動で登録されてました。
![azure20.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/51abb69d-4d70-4532-a898-f80562131fd3.png)

エンタープライズアプリケーションからProxmoxVEを押下して、プロパティを開きます。
割り当てが必要ですか？がいいえになっているので、Entra IDにログイン可能な組織内のユーザーであれば、誰でも認証を通過してProxmoxへ戻されてしまうようです。今回割り当ててないユーザでログインできてしまったのはこの設定が原因でした。
気になるので、はいに変更しました。
![azure21.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/037bd35a-5aed-4791-852c-c110c9ad29da.png)

割り当てをはいにして、割り当ててないユーザでログインをしようとしたらはじかれました。
セキュリティ的にはこちらの方が良いでしょう。
![azure22.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b20dcc08-3e07-4834-b2d5-f82a994b70e7.png)

先ほど手動で紐づけたユーザでProxmoxVEにログイン出来るか確認します。
シークレットウィンドウでProxmoxのURLにアクセスします。
※Azure PortalにログインしていないWebブラウザであればシークレットでなくても良いです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/48e825e4-cc83-4ff8-b66d-bc8530249153.png)

ログインが求められますので、先ほど作成したユーザ名を入力します。
次へボタンを押下します。
![azure23.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a2e11345-82ca-4eca-8792-9aa7195176a4.png)

Azureで設定したパスワードを入力します。
サインインを押下します。サインインが出来ると2要素認証の設定を求められるので、設定をします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b3a8cb22-8727-4858-8e03-e4f4f5404989.png)

設定後、Proxmoxにログインが出来るようになると思います。
ログイン直後ではProxmoxでの権限が何もあたっておりませんので、割り当てていきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/aa775bd3-4def-4408-a009-ab97ead193a3.png)

rootユーザでログインしなおして、
データセンター > アクセス権限を押下します。追加ボタンを押下します。
ユーザのアクセス権限を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/63113105-cceb-4f3d-aff6-86fb5a087f83.png)

パス：/
ユーザ：SSOでログインしたユーザ
ロール：PVEAdmin
これで追加します。ユーザ分追加します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/cf5729ed-13fc-4031-8f26-dd2e5abfda07.png)

追加しました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/65fbfd73-3195-42da-8883-ee75a7d82f23.png)

EntraIDでProxmoxにログインして、Proxmoxの操作が出来る環境を構築できました。
疲れた。。。
これでAzureにログインしているブラウザでProxmoxホームラボにアクセスしたら、パスワードなどを入力せずにログインできます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7e81cbea-91a8-470f-b2bc-6c4700652912.png)

