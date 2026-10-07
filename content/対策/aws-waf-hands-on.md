---
title: "AWS WAFの簡単なハンズオン"
date: 2025-11-03
tags: ["countermeasure", "AWS", "waf", "CloudFront", "Shield", "CloufFormation"]
source: "https://qiita.com/ohtsuka-shota/items/d49cbd58fcbf298a2ba1"
---
こんにちは
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

今回はAWSのWAFをハンズオンを通じて理解していきたいと思います。

:::note alert
Shieldの動作確認・試験をするときはAWSに依頼を出す必要があるようです。
個人でやるのはだめです。
本当は触ってみたかったですが・・・
:::

# AWS WAFとは
AWS WAFは、ウェブアプリケーションを保護するためのファイアウォールサービス

- 攻撃の防御: 
SQLインジェクションやクロスサイトスクリプティング（XSS）など、一般的なウェブ攻撃からアプリケーションを保護します。WAFは、アプリケーション層（Layer 7）で動作し、HTTP/Sトラフィックをフィルタリングおよび監視します

- カスタマイズ可能なルール:
ユーザーは、特定の条件に基づいてリクエストを許可、ブロック、または監視するためのルールを設定できます。これにより、特定のIPアドレスやHTTPヘッダーに基づいてトラフィックを制御できます。

- リアルタイムモニタリング:
AWS CloudWatchと統合されており、トラフィックの監視やセキュリティイベントの分析が可能です。

# AWS Shieldとは
AWS Shieldは、主にDDoS（Distributed Denial of Service）攻撃からの保護を提供するマネージドサービス。ネットワークトラフィックのパターンを分析し、特定の脅威を自動的に緩和することができる。ネットワーク層（Layer 3）およびトランスポート層（Layer 4）での攻撃を防ぐことを目的としている。

WAFと混同しそうだったので、ついでにこちらに記載しました。

# 今回構築する環境
CF＋S3のWebホスティング環境をCFnでデプロイします。
そこにWAFを追加で設定していき、
①日本からのアクセス
②SQLインジェクション攻撃
をブロックしてみたいと思います。

![aws03-ページ11.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8fae2d07-869a-4ea9-9543-44293ce491f0.png)


# ハンズオン
## CloudFront+S3環境のデプロイ
以下のyamlをCFnに噛ませて環境をデプロイします。
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Fixed CloudFront + S3 Template

Parameters:
  BucketName:
    Type: String
    Default: my-website-bucket-unique-name

Resources:
  WebBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketName
      AccessControl: Private
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256

  CloudFrontOAI:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: OAI for CloudFront

  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref WebBucket
      PolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              CanonicalUser: !GetAtt CloudFrontOAI.S3CanonicalUserId
            Action: 
              - s3:GetObject
              - s3:ListBucket  
            Resource: 
              - !Sub "arn:aws:s3:::${WebBucket}"       
              - !Sub "arn:aws:s3:::${WebBucket}/*"     

  WebDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Origins:
          - Id: S3Origin
            DomainName: !Sub "${WebBucket}.s3.${AWS::Region}.amazonaws.com"
            S3OriginConfig:
              OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${CloudFrontOAI}"
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: allow-all
          Compress: true
          CachedMethods: [GET, HEAD]
          AllowedMethods: [GET, HEAD]
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
        CustomErrorResponses:
          - ErrorCode: 403 
            ResponsePagePath: /error.html
            ResponseCode: 404
            ErrorCachingMinTTL: 10
          - ErrorCode: 404
            ResponsePagePath: /error.html
            ResponseCode: 404
            ErrorCachingMinTTL: 10
        PriceClass: PriceClass_100

Outputs:
  WebsiteURL:
    Value: !GetAtt WebDistribution.DomainName

```

CFnの管理画面に移動してスタックの作成を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9d3fe672-bba7-4776-a07c-16d39e2c930a.png)

既存のテンプレートを選択して、テンプレートファイルのアップロードを押下します。
ローカルに保存している上記yamlを選択して、次に進みます。
![screencapture-ap-northeast-1-console-aws-amazon-cloudformation-home-2025-11-02-20_23_58.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9bb0fe80-8a5f-49ab-9f81-cb84e4a42974.png)

スタック名はdeploy-cf-s3-webとしました。
パラメータは、このyamlで作成するs3バケットの名前になります。適当な文字列を入力してあげます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/40c8f332-10a5-4e5e-b8ac-8f58a44aaaf9.png)

オプションが設定できる画面は特に何も編集せずに次に進みます。
![screencapture-ap-northeast-1-console-aws-amazon-cloudformation-home-2025-11-02-20_25_08.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/069de083-0cfa-4d4a-a852-9e4b848887a5.png)

最終確認画面が表示されるので、確認して送信ボタンを押下します。
![screencapture-ap-northeast-1-console-aws-amazon-cloudformation-home-2025-11-02-20_26_16.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c746e4cc-cdc8-48ac-b4c8-6b895fd79241.png)

デプロイが開始されます。最終的にCREARE_COMPLETEステータスになれば問題ありません。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bf1e72a2-d1e7-467a-9e9f-cfff0bedcb5f.png)

S3バケットが作成されているはずです。
それに以下のようなHTMLをアップロードします。
- index.html
```html
Hello WAF+Shield
```
- error.html
```html
ERROR!
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d0f477e0-9ae7-41bf-a499-7a0c66be77ad.png)

CFにディストリビューションがあると思いますので、それのドメイン名に対してhttpで通信をかけてみます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9082ac9f-6e1e-4c0f-bf0a-7d117dd66dd3.png)

index.htmlの内容が表示されることを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b7601f6e-7551-4c49-aed0-880e8a52b6b3.png)

存在しないURLを踏むと、error.htmlが表示されることを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5a0e2175-14d4-487c-b558-f17f1f22409a.png)

## WAFを使って日本からのアクセスを拒否してみる
CFnでデプロイしたあとの状態だとWAFが設定されておりませんので、まずは有効化していきたいと思います。
ディストリビューションのセキュリティタブを開き、Managed security protectionsを押下します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/62162cdc-d82e-4603-87e1-4e71df7c836b.png)

セキュリティ保護を有効にするを押下します。
monitor modeは実際にブロックはせずにどのような通信がどれくらいあるのかを測るためのもののようです。
この状態でsave changesを押下します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/e7d7a853-56f0-482d-b6a5-107f45fecd68.png)

Manage rulesを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6ef57bf7-5a9a-4f4d-a4ab-856599a4aa35.png)

Add ruleを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/09b0492d-90fb-4413-8311-5e6215fad124.png)

日本からのアクセスを拒否したいので、Geo-based ruleを選択し次に進みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/99ce2874-7118-4845-bd3d-8c66a652602f.png)

以下の設定でルールを作成します。
Action：Block
Rule name：japan-block
Statement：Japan
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/53b56fc1-40fb-4d81-a832-6203a3a757bd.png)

ルールの一覧に表示されていることを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/46c46b1b-8683-4a8a-abe3-7cd9918da552.png)

これはWAFの管理画面からも確認することができます。
Web ACLsでGlobalとすることで確認することができます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a03f280c-1587-4b51-a9e9-98d230d54851.png)

こちらからも確認できます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7d3befab-3bfb-4335-aa11-6ad82d63af5a.png)

CFに戻ります。Edit rule orderを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/27cfdd79-a425-4a53-8733-aa94e5d73f14.png)

D&Dでプライオリティを変更することができます。
先程のjapan-blockを最優先にします。
Save rule orderを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/550f75c8-b219-4919-aced-ea899067b34e.png)

並び順が変わったことを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/06f9ee2d-8400-49c7-92e0-73e68603ad1a.png)

先程Hello WAF+Shieldと出力されたURLにアクセスしてみると、ERROR!と表示が変わっていることがわかります。
これはjapan-blockというWAFのルールが適用されているためになります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/176193e7-37a3-4ac9-a95b-c4d2e8d3f41a.png)

CFのセキュリティタブを見てみるとブロックをしていることがわかると思います。
![screencapture-us-east-1-console-aws-amazon-cloudfront-v4-home-2025-11-03-00_09_00.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d438ce4b-9906-4df9-98a8-df6cdf95ee59.png)

確認できましたらruleを削除します。

## SQLインジェクション検知・ブロック
WAFの管理画面からAdd my own rules and rule groupsを選択します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/30c5e6d0-3763-460d-9af9-9bede99f2f47.png)

以下の設定で作成していきます。
![screencapture-us-east-1-console-aws-amazon-wafv2-homev2-web-acl-CreatedByCloudFront-4c630cb1-e59e2cc6-5635-412e-91c1-c95b4470e976-add-rule-2025-11-03-00_36_28.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4f956f28-fe6a-4f88-bfa7-f347e84bcc89.png)

JSON形式で表現すると以下となります。
```json
{
    "Action": {
        "Block": {}
    },
    "Name": "Block-SQL-Injection",
    "Priority": 3,
    "Statement": {
        "SqliMatchStatement": {
            "FieldToMatch": {
                "QueryString": {}
            },
            "SensitivityLevel": "HIGH",
            "TextTransformations": [
                {
                    "Priority": 0,
                    "Type": "URL_DECODE"
                }
            ]
        }
    },
    "VisibilityConfig": {
        "CloudWatchMetricsEnabled": true,
        "MetricName": "Block-SQL-Injection",
        "SampledRequestsEnabled": true
    }
}
```

正常に作成されたことを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/50f4e3a5-843d-40f8-ad56-4ea93417256a.png)

プライオリティを上げてSaveします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/fd0aa324-b2e0-4c48-92a7-114ea8bf702b.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8a1567da-9ba3-41b2-b8be-848b1c031999.png)

次のようなURLでアクセスを試みます。
```
http://example.com/search?q=' OR 1=1 --
```

エラーが出力されました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/26a90465-f2f0-4c19-b092-1d1e0df267a1.png)

CFのセキュリティタブを見てみます。
![screencapture-us-east-1-console-aws-amazon-cloudfront-v4-home-2025-11-03-00_43_31.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a5c9d916-77aa-4f2d-92c2-8c8b005c179b.png)


SQLインジェクションを検知してブロックしていることがわかりますね。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/17b9998e-6ec1-42ba-ae84-17c8b60c4e9d.png)

検証後はWAFとCFは必ず削除しましょう。
S3の中身→CFnのstack→WAFの順で削除すればエラーもでないと思います。

