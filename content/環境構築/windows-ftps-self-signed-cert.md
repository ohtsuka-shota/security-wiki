---
title: "Windowsサーバと自己証明書でFTPSサーバを構築する"
date: 2025-09-20
tags: ["tool", "Windows", "ftp", "自己証明書", "オレオレ証明書", "ftps"]
source: "https://qiita.com/ohtsuka-shota/items/6b98512fb845a646be13"
---
こんにちは
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

今回はWindowsサーバでFTPSサーバを構築していきたいと思います。
（Windows Server使いこなせると強いですよね。。。苦手意識払拭していきたいところではある。。。）

今回はExplicit FTPSでDataChannelはエファメラルポートを使用します。

# 環境構築
## FTPS用のユーザを用意する
Windowsサーバにログインした後、ServerManagerを起動して、Computer Managementを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9485e149-f476-4b1a-bf44-1c10f37754f2.png)

Local　Users and GroupsからUsersを選択。一覧が表示されますので適当なところを右クリックしてNew Userを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a88aa686-f77c-4bca-8b9c-d3587e6bc527.png)

今回はftp_adminというユーザを作成しました。
パスワード変更できない設定と、パスワード期限切れ無しはなんとなく入れてます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9bef6a8a-9c63-43f6-b649-2b5d366e397a.png)

ユーザが作成されたことを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5d9e4f4a-dfd8-4248-91ae-9a31420d9194.png)

作成したユーザを右クリックして、プロパティを表示。
Member ofで所属しているGroupを確認するとUsersグループのみ参加していることがわかります。
Addボタンを押下して、追加処理をしていきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2d488811-6b8b-4139-8afb-ca454d63a73a.png)

Remote Desktop Usersと、Administratorsグループを追加します。
Applyして、OKします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/aef96c6b-58f1-4a1e-a13e-e93f74a9a8b8.png)

## FTPSで使用するフォルダを用意する
今回はCドライブ直下にftp_folderを作成しました。これを使っていきたいと思います。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/141000e0-c06b-462e-ada1-b4269739a0fe.png)

作成したフォルダのプロパティを開き、SecurityでAdministratorsがあることを確認します。
※ftp_adminユーザが所属するグループがあり、そのグループの権限にReadやWrite権限があればOKです。
※個別でグループを作成して、そのグループを明示的に指定してあげたほうが良いっぽくはあります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6db2dc4d-b129-460d-a442-eeab72fa63ff.png)

## FTPSサーバインストール
構築していきます。とはいいつつ、最初はFTPで構築して、あとからFTPS化していこうと思います。
まずServer Managerを開き、ManageタブからAdd Roles and Featuresを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9bb7cfad-4a6a-47d5-90ad-c297c75e675a.png)

Nextを押下して次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/aca2555c-4e02-44a3-92ff-b5350879b9de.png)

Role-based or feature-based installationを選択している状態でNextを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9cf07e0a-4856-4a3e-a621-0b74b0c24070.png)

自分のサーバが選択されている状態で次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d53a3d2f-ca81-40b1-b725-790684c4b827.png)

Server Rolesの部分で、Web Server(IIS)を選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/73da81ad-a269-4540-80cd-857f363db3dc.png)

こんな感じのポップアップが表示されるので、Add Featuresを押して次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5ff78f5b-b140-422d-bc6e-460d993e9a49.png)

Web Server Role（IIS）というタブが追加されているので、これを押下します。
今回はFTPSサーバを作るだけでWebサーバは不要なのでチェックを外して、FTP ServiceとIIS Management Consoleだけチェックを入れて次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/28a5af11-20b8-40bd-8bcf-cd8a6fd1883c.png)

確認画面が出てきますので内容を確認してInstallを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2cb97a6d-e838-4703-83af-8b079f121cc9.png)

Installation succceededとなることを確認します。
Closeを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/13141ca6-b9dc-4699-be0f-f4f49936d88d.png)

Server ManagerのROLES AND SERVER GROUPSにFile and Storage ServicesとIISが表示されるようになっていることとを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bcf4abbb-4b16-404b-a3dc-8d97f0bdace2.png)

## FTPSサーバ構築
検索的でIISと検索すると、Internet Information Services(IIS) Managerが表示されるのでこれを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/dc760306-b08c-4acd-bc1e-962e345e71f9.png)

自分のコンピュータ名のSitesを右クリックするとAdd FTP Siteという項目があるのでこれを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b36eb2e2-b6d5-4c95-8ebe-2f29609ddf49.png)

サイト名とPhysical pathを求められます。以下のように入力して次に進みます。
サイト名：FTPS
Physical path：上記で作成したCドライブ配下のフォルダ
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d651f42a-7bf6-49e8-80dd-0a45e736a5b9.png)

BindingはAll Unassaingnedで21ポート、SSLは後から設定を入れるのでここではNo SSLで次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/08ba023a-9fb0-473e-ba41-9e0428693881.png)

AuthenticationはBasic、AuthorizationはSpecific usersでftp_admin、PermissionはRead,Write双方にチェックを入れました。
ここでこの設定を入れることで、例えばWinSCPでアクセスする時に指定のユーザでしかFTPサーバを使えなくなります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8d8e65a2-e19d-427e-a9a0-985b7fc3248a.png)

FTPサーバが用意できました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/286d5cf4-0c46-4b4a-894a-88197c2487f6.png)

Windows Defender Firewallは無効化しておきます。
AWSのSGでコントロールしているので、ここでは不要としています。これが有効化されていると、FTP接続できません。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/48a731e7-ccb5-49fe-99be-4ba7235b3d08.png)

試しにアクセスしてみます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4b40f7d3-02c3-4b56-a547-fded42c61a1a.png)

アクセスできました。フォルダ、ファイルも作成出来ていそうです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/870dd256-ba8a-4067-a90f-285ecf87cab1.png)

サーバ側でも確認できました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5a66a6cf-b020-4ed2-80c2-9ea19307bf06.png)

## FTPS化をするための自己証明書を作成する
IIS Managerを開き、自分のサーバ名をクリック。
IISのところにServer Certificatesがあるのでこれをクリックします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3ae7600e-7dfe-479d-9866-b050584de4bb.png)

証明書が一覧で表示されます。画面右にあるCreate Self-Signed Certificateをクリックします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/269e15fd-c3f3-4bc4-b468-2383945c9873.png)

フレンドリ名を任意のものとして、Personalを設定しOKをクリックします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/e5d2986c-ff91-4fc0-b2f1-c5e462e15ca5.png)

作成出来ました。これだと1年間の有効期限がついてしまい、変更できないようです。
これを使うでも良いのですが、有効期限が邪魔なのでPowerShellを使って作り直します。
※PowerShellを使わない場合はこれをFTPに噛ませればOKです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/e09e631a-5fea-46b6-9478-0ab6b83388d0.png)

PowerShellを管理者で起動します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/3998a8de-2d70-42e0-93c8-a32670cc55be.png)

以下のコマンドを実行します。
-DnsNameのところはホスト名かIPアドレスだけでもいいのですが、一応どっちも付けておきます。
有効期限は100年としてます。
```ps
New-SelfSignedCertificate -DnsName "ftps-server", "57.181.41.99" -FriendlyName "ftps-server" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(100)
```

実行結果は以下となりました。
```ps
Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows

PS C:\Users\Administrator> New-SelfSignedCertificate -DnsName "ftps-server", "57.181.41.99" -FriendlyName "ftps-server" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(100)


   PSParentPath: Microsoft.PowerShell.Security\Certificate::LocalMachine\My

Thumbprint                                Subject
----------                                -------
39D973BBC86E6497B72C6D83BBD42AACAC92F987  CN=ftps-server
```

certlm.mscを実行します。
PersonalからCertificatesを押下すると、2つ表示されています。1つはIIS Managerで作成したもの、もう一つはPowerShellで作成したものです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7b8ee481-c7e7-4611-8d16-1f2729be4491.png)

## FTPサーバに自己証明書を紐づける
IIS ManagerからFTPSのサイトを選択します。
FTP SSL Settingsを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/77daf3e7-bdb7-4a18-a46d-8d4d23f77d41.png)

自己証明書は100年指定したほうを、SSL PolicyはRequire SSL connectionsとします。
設定を反映するために画面右にあるApplyを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/95cef330-8d99-427e-9dd1-40e278b4a67b.png)

FTPサービスを再起動しておきます。
右クリックして、refreshを実行します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/64ac7597-220f-4a21-9bb4-362fa00fdf7e.png)


接続テストをします。
その前に、名前解決をさせるためにWinSCPを起動しているPCの以下ファイルに追記をしていきます。
```
C:\Windows\System32\drivers\etc\hosts
```

以下を追記しました
```
# 20250920 FTPS検証用
57.181.41.99 ftps-server
```

cmdでping疎通を確認します。
```
Microsoft Windows [Version 10.0.26100.6584]
(c) Microsoft Corporation. All rights reserved.

C:\Users\ohtsu>ping ftps-server

ftps-server [57.181.41.99]に ping を送信しています 32 バイトのデータ:
57.181.41.99 からの応答: バイト数 =32 時間 =16ms TTL=117
57.181.41.99 からの応答: バイト数 =32 時間 =17ms TTL=117
57.181.41.99 からの応答: バイト数 =32 時間 =15ms TTL=117
57.181.41.99 からの応答: バイト数 =32 時間 =14ms TTL=117

57.181.41.99 の ping 統計:
    パケット数: 送信 = 4、受信 = 4、損失 = 0 (0% の損失)、
ラウンド トリップの概算時間 (ミリ秒):
    最小 = 14ms、最大 = 17ms、平均 = 15ms
```

Windows Server側もホスト名を変えておきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/10eadf04-d465-44d9-9fd9-b5e8b77aa5ce.png)

今度こそ接続テストです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7643684a-3f9f-4373-a44c-d087e70c1c99.png)


自己証明書の為以下の警告が出ますが、はいを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1c3dcfe4-abf6-4424-9e03-cb56f212127c.png)

接続出来ました！
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5e5c8a98-5aef-46b5-bd27-bb0ec1853849.png)



