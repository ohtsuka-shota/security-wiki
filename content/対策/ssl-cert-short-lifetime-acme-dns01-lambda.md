---
title: "【SSL証明書短命化対策】LambdaとRoute53でACME(DNS-01)自動更新システムを構築する"
date: 2026-05-23
tags: ["countermeasure", "Security", "route53", "acme", "dns-01", "Let’sEncrypt"]
source: "https://qiita.com/ohtsuka-shota/items/233b43b935bd9d86e024"
---
# 用語解説
## ACME (Automated Certificate Management Environment)
SSL/TLS証明書の発行・更新・失効を自動化するためのプロトコル。Let's Encryptが採用しており、Certbotなどのクライアントソフトウェアがこのプロトコルを使って認証局と通信し、証明書を自動取得する。RFC 8555として標準化されている。

## Certbot
Let's EncryptがACMEプロトコルを使って証明書を自動取得・更新・失効するために開発したオープンソースのクライアントソフトウェア。Electronic Frontier Foundation (EFF) がメンテナンスしており、Apache・Nginxなどの主要なWebサーバーに対応したプラグインを持つ。certbot certonly で証明書の取得のみ、certbot renew で期限切れ前の自動更新が行える。

※Felo AIで生成。シャギー発生してますが気にしないで頂けると・・・
![](https://private-user-images.githubusercontent.com/127835743/597177742-3b631437-fdbc-4b7f-a44c-665a6f455016.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1NDc5NjksIm5iZiI6MTc3OTU0NzY2OSwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MTc3NzQyLTNiNjMxNDM3LWZkYmMtNGI3Zi1hNDRjLTY2NWE2ZjQ1NTAxNi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QxNDQ3NDlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02OTRmN2Y2NzRlMmIxMWZlNTkxOTcwMzU5ZTE1NThmODc2ZmJhZjc3YzE4YjM0NGEzYmQwMjI0NWU3OTFlNjg0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.FZkg4Jxpc5nI2G111tJ_qcMoiuTFWE-hNXdyzCmrgE0)

https://certbot.eff.org/

## Let's Encrypt
無料でSSL/TLS証明書を発行する非営利の認証局（CA）。2016年から運用開始され、ACMEプロトコルを使った自動化により、誰でも簡単にHTTPS化が可能になった。証明書の有効期限は90日で、自動更新を前提とした設計になっている。

## DNS-01チャレンジ
ドメインの所有権を証明するための認証方式の一つ。DNSのTXTレコードに特定の値を設定することで認証を行う。HTTP-01チャレンジと異なり、Webサーバーが不要で、ワイルドカード証明書（*.example.com）の取得が可能なのが特徴。Route53などのDNSサービスと連携して自動化できる。

※Felo AIにより生成
![](https://private-user-images.githubusercontent.com/127835743/597085116-a3637523-2f82-44ff-a5af-6d88d8658af2.jpeg?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MTAwNDUsIm5iZiI6MTc3OTUwOTc0NSwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDg1MTE2LWEzNjM3NTIzLTJmODItNDRmZi1hNWFmLTZkODhkODY1OGFmMi5qcGVnP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI2MDUyMyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjA1MjNUMDQxNTQ1WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9YzA0YmExMDUyMTY5MWI4YmRiYzUxNWRjYWE5YTRmM2RmM2Y3MDZiMTUzMDk3ZmI4MTk5MTg2MmY5ODhlNjU1NCZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmcmVzcG9uc2UtY29udGVudC10eXBlPWltYWdlJTJGanBlZyJ9.vHKQqyR2l9mCNJlmu3yLRnlswYUmbfZDMf_KgXLVrIQ)

## サーバ証明書（SSL/TLS証明書）
Webサイトが正規のものであることを証明し、通信を暗号化するためのデジタル証明書。
HTTPSでの通信に必須。Let's Encryptでは90日間有効な証明書が無料で発行される。

### 証明書の有効期限短縮化（確定スケジュール）

CA/Browser Forumにより、証明書の有効期限は段階的に短縮されることが**正式に決定**されています：

| 日付 | 最大有効期間 | DCV再利用期間 |
|------|------------|--------------|
| 2026年3月14日まで | 398日 | 398日 |
| 2026年3月15日以降 | **200日** | 200日 |
| 2027年3月15日以降 | **100日** | 100日 |
| 2029年3月15日以降 | **47日** | 10日 |

※ DCV (Domain Control Validation) = ドメイン所有確認

#### なぜ短縮化されるのか？

1. **セキュリティ向上**
   - 秘密鍵が漏洩した場合の影響期間を最小化
   - 暗号化アルゴリズムの脆弱性への対応を迅速化

2. **自動化の促進**
   - 手動更新の負担を増やすことで、自動化への移行を促進
   - 人的ミスによる証明書期限切れを防止

3. **証明書管理の改善**
   - 古い証明書の放置を防止
   - より頻繁な検証により、不正な証明書発行を早期発見

**2029年以降は47日ごとに更新が必要**になるため、今のうちから自動更新の仕組みを構築しておくことが非常に重要になっている。

https://www.cybertrust.co.jp/blog/ssl/validity-period-shortening.html

※Felo AIにより生成
![](https://private-user-images.githubusercontent.com/127835743/597083582-e1d4ffc7-62f3-4cb9-9b54-25627f4461ec.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDk4MzAsIm5iZiI6MTc3OTUwOTUzMCwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDgzNTgyLWUxZDRmZmM3LTYyZjMtNGNiOS05YjU0LTI1NjI3ZjQ0NjFlYy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwNDEyMTBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1jYzM1ZTQ5MDAzNDBhYjJmMTQ1MmI5NjdiZWVkZTNmNWYwY2NkYTFhYzAzNGJkZTIwMzYzMDhhYjc1YThlYjVhJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.bptLGv1Q7q_vNbqxQRRK1KpvP_X0Dww_EBm1uJZoszM)

# 今回の環境イメージ

![](https://private-user-images.githubusercontent.com/127835743/597088446-3b81e14f-c5f8-44ca-8841-0b715bfd2e2e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MTEwMTksIm5iZiI6MTc3OTUxMDcxOSwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDg4NDQ2LTNiODFlMTRmLWM1ZjgtNDRjYS04ODQxLTBiNzE1YmZkMmUyZS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwNDMxNTlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hMzdmMGJlNzQzY2VkMzc5OGQ1NGMwZjFhNTc1NzNiMjZiOWIyNDc2ODViMmYxODhkZWNkODIxYjEyYzNhODY2JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.dWE0ePjD7c0SF7ma8c_udlt360_A5C3WgSAwLSdtBNE)

# 手順　
## 独自ドメインを購入する
お名前.comやIIJ、Route53等のドメインレジストラから独自ドメインを購入します。
トップレベルドメイン等の種類やドメインの人気度・価値によって値段が変わっていくので、各自確認ください。
この記事ではohtsuka-aws.xyzというドメインを使用したいと思います。

## Route53にサブドメイン用のパブリックホストゾーンを作成する
Route53の管理画面にアクセスして、ホストゾーンの作成を押下します。

![](https://private-user-images.githubusercontent.com/127835743/597053303-fd002fa0-dd0a-43ef-914f-27d6bbb52ba0.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk0OTkxNDksIm5iZiI6MTc3OTQ5ODg0OSwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDUzMzAzLWZkMDAyZmEwLWRkMGEtNDNlZi05MTRmLTI3ZDZiYmI1MmJhMC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTE0MDlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02ZjBiMGE5ODBiZDlhYWFlYzAxNGZkNzUzMjEzZmI3YmFjY2E3YzMzMGYyODRmMDJiMjcyYWE0OWE4OGVlMDMwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.vqmci_C2dP12gdLbkeyKBZFIdwrh1ix7Q8xEAKkXw2M)

今回はdev.ohtsuka-aws.xyzというサブドメインをRoute53で管理したいと思います。
ドメイン名にに入力し、パブリックホストゾーンを選択して作成を押下します。
![](https://private-user-images.githubusercontent.com/127835743/597053485-c94f0007-03d8-409f-8ea6-57d47693703a.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk0OTkyNzksIm5iZiI6MTc3OTQ5ODk3OSwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDUzNDg1LWM5NGYwMDA3LTAzZDgtNDA5Zi04ZWE2LTU3ZDQ3NjkzNzAzYS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTE2MTlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mNjRiNGZkMzA5ZmQ2NGEyZDc3OGJiOGE2MGI0Y2M4MTk4ZDIzZThmMjczOGQ5ZDQ1ZTcwMmUyOGI1NjE5MTdmJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.sn1zMi1rxG1xZa1rBp6mFI9PIdnRFPv4WQAkdqCqeL4)

ホストゾーンが作成出来ました。
レコードが2件生成されていますが、この中のNSレコードの4つの値を使用します。
![](https://private-user-images.githubusercontent.com/127835743/597053718-6db0d4ad-a92b-464e-aaa6-8d9d66a05030.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk0OTk1MDMsIm5iZiI6MTc3OTQ5OTIwMywicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDUzNzE4LTZkYjBkNGFkLWE5MmItNDY0ZS1hYWE2LThkOWQ2NmEwNTAzMC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTIwMDNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT01NzJkNzVjY2Q5ODE2YTUxMGJhM2FkMWY5YjkyZTlkNWRmZTQ4NzNmNTUyNjgwZmY1YWUzNTFlYWU1YTg1NGZlJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.bIj3R9C5rayUD7yWttj710GnlC3FCkW8UCDX7bfO-5M)

## ドメインレジストラにNSレコードを登録する
Route53で表示されていたNSレコードの4つの値を登録してください。
このようにすることでサブドメインのレコード管理をRoute53に移管することが出来ます。
![](https://private-user-images.githubusercontent.com/127835743/597053903-cb44841c-dd80-4610-8021-7ff7d24fca96.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDAxMDIsIm5iZiI6MTc3OTQ5OTgwMiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDUzOTAzLWNiNDQ4NDFjLWRkODAtNDYxMC04MDIxLTdmZjdkMjRmY2E5Ni5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTMwMDJaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05YjExNjI2ZGU1MDc4YWJkNDMwNzA5MGUxNzMxMDAzMTMzZGQ1M2M3N2IyOGE3YTQyMDhhNTY4N2ZmNDg2NzA5JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.aCJacQ22bL-gBVO4ajqfapKQrq6ohj1jU3FQ9ehnQpE)

## IAMロールの準備
今回はLambdaを使用して、証明書の取得を行います。
DNS-01方式ではDNSのTXTレコードを操作する必要があります。そのためLambdaにRoute53への権限を与える必要があります。また、Lambdaで取得した証明書はS3へ保管しますのでS3への権限を与える必要があります。CloudWatchLogsにLambdaのログを吐き出させるための権限も与えましょう。

AWSのサービスを選択し、ユースケースはLambdaを選択します。
![](https://private-user-images.githubusercontent.com/127835743/597054941-907a5d9d-6204-4513-b98b-73d471f472a3.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDA0NzYsIm5iZiI6MTc3OTUwMDE3NiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU0OTQxLTkwN2E1ZDlkLTYyMDQtNDUxMy1iOThiLTczZDQ3MWY0NzJhMy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTM2MTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT03OWNlMWMwNmMxZDM2N2VkN2I0OWVkMmU5NzI5YTc1NjJiOTU4OTZlZmE1ZThiMmM2MjUwMDU0OTAzN2RhYTUwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.EldZESAt5oj7zHPQnnh-JG4xpEZU9YOT0jhLnf87wvM)

IAMポリシはS3FullAccessとRoute53FullAccess、CloudWatchLogsFullAccessをアタッチします。
Roleの名前はacme-lambda-roleとします。
※検証環境用なので、これで大丈夫ですが実環境では最小権限にするようにしましょう。
![](https://private-user-images.githubusercontent.com/127835743/597055081-3bda5852-4a81-4e78-a830-c78c9e52f358.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDA1OTYsIm5iZiI6MTc3OTUwMDI5NiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU1MDgxLTNiZGE1ODUyLTRhODEtNGU3OC1hODMwLWM3OGM5ZTUyZjM1OC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTM4MTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hNTY4M2IxYzkxNDFjNWY2NTVhNzI3NjE2ZDIyZmIyYmU1ZTNkMzY3MDM2OGMzYjI3YzUyOWQ4YmY1NmNmMGI2JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.0JjihMujOhabsythJLiKQFEXV5GPO6K9GelAaM9tYI4)

作成出来ました。
![](https://private-user-images.githubusercontent.com/127835743/597055919-369e3330-4fa3-4a5a-9777-f6c972601ec0.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDEyMDcsIm5iZiI6MTc3OTUwMDkwNywicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU1OTE5LTM2OWUzMzMwLTRmYTMtNGE1YS05Nzc3LWY2Yzk3MjYwMWVjMC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTQ4MjdaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wMDU5MWQwNzBjNDFlZWQ5ZTZmY2Q5MWUyNDIxMTgzYzNlYmVjN2Y2YzgyNjE4NDI1ZjBmNDFlYTQ4Mjg4ZTA1JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.OdOU1PAtCnHsxp_DuHLmQE9qEz4G47LrZtIpaU_7mJA)

## S3作成
証明書格納用のS3バケットの名前をacme-s3-dev-ohtsuka-aws-xyzとして作成します。
作成時、S3の名前以外は弄ってません。
![](https://private-user-images.githubusercontent.com/127835743/597056681-37b2b0c5-47cf-4dee-807b-cfd5f0c1d64d.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDE1ODgsIm5iZiI6MTc3OTUwMTI4OCwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU2NjgxLTM3YjJiMGM1LTQ3Y2YtNGRlZS04MDdiLWNmZDVmMGMxZDY0ZC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTU0NDhaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1jNTNlOGE4Y2FhNGM2ODg5OTNlOTU2YjI3ZjA4MjZlNjI3NzUxYjdkZWM5Y2MzOTc0MDllMTUyOGQzZjEyMWU1JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.gpAgRAc2CtfrIQzjgNLlgLagjOmYeX0e1sWPyxQqpGM)

## Lambda作成
### デプロイ
acme-lambda-dev-ohtsuka-aws-xyzという名前で作成します。ランタイムはPython3.13とします。
カスタム実行ロールには先ほど作成したRoleを指定します。
![](https://private-user-images.githubusercontent.com/127835743/597057062-7affc41e-f5ce-4b5d-b030-dd68234e8700.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDE4OTAsIm5iZiI6MTc3OTUwMTU5MCwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU3MDYyLTdhZmZjNDFlLWY1Y2UtNGI1ZC1iMDMwLWRkNjgyMzRlODcwMC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMTU5NTBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT04NDYwODRiYWEwY2NjZTBmNjg5YzQ4OGVmNDIxODMzNzMxNjVhMGQ3ODM5NDc2ZTYyMzEzNmYzZDA5YmY1ZWY1JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.AyO7rwyKqMeRO0hWwuYNf2j1XW5H3GB06McjSxSodeI)

作成出来ました。
![](https://private-user-images.githubusercontent.com/127835743/597057380-dc46ab11-2916-4b8b-ad91-ca99a4c7b140.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDE5NjMsIm5iZiI6MTc3OTUwMTY2MywicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU3MzgwLWRjNDZhYjExLTI5MTYtNGI4Yi1hZDkxLWNhOTlhNGM3YjE0MC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMjAxMDNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mNDU4MDY3OGU1ZTk5YzBkMzk3YWY0NTVlZTI1YjFhNDEwNWFmNTdiOGQwMDExOTI1ZmMyZGNiMmVjZTQ4Mzc0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.ORo8baBaI4ivWtaQk_ttDpH7MaIfuEedylGDIxZlb0Y)

### Lambdaのコード
コードの中身を以下とします。
```python
import os
import boto3
import subprocess
import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend

# --- 設定エリア ---
# 環境変数が設定されていない場合はエラーを出して停止させる
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
if not S3_BUCKET_NAME:
    raise ValueError("環境変数 'S3_BUCKET_NAME' が設定されていません。")

LE_EMAIL = os.environ.get('LE_EMAIL')
if not LE_EMAIL:
    raise ValueError("環境変数 'LE_EMAIL' が設定されていません。")

DOMAINS = os.environ.get('DOMAINS')
if not DOMAINS:
    raise ValueError("環境変数 'DOMAINS' が設定されていません。")

IS_DRY_RUN = os.environ.get('DRY_RUN', 'false').lower() == 'true'

s3_client = boto3.client('s3')

def needs_renewal():
    """
    S3から既存の証明書を取得し、有効期限が30日以内かチェックする。
    証明書が存在しない、またはエラーの場合は更新が必要とみなす。
    """
    domain = DOMAINS.split(',')[0].strip()
    s3_key = f"certificates/{domain}/cert.pem"
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        cert_data = response['Body'].read()
        cert = x509.load_pem_x509_certificate(cert_data, default_backend())
        
        # 有効期限の取得
        not_after = cert.not_valid_after
        remaining_days = (not_after - datetime.datetime.utcnow()).days
        
        print(f"証明書の有効期限: {not_after} (残り {remaining_days} 日)")
        
        # 残り30日以下なら更新が必要
        return remaining_days <= 30
        
    except s3_client.exceptions.NoSuchKey:
        print("既存の証明書がS3にありません（新規取得します）。")
        return True
    except Exception as e:
        print(f"既存の証明書がS3にないか、解析に失敗しました（新規取得します）: {e}")
        return True

def run_certbot():
    """
    Certbotコマンドを実行して証明書を取得・更新する。
    """
    print("Certbot を実行します...")
    
    # Lambdaの/tmpディレクトリを作業領域として使用
    config_dir = "/tmp/certbot/config"
    work_dir = "/tmp/certbot/work"
    logs_dir = "/tmp/certbot/logs"
    
    os.makedirs(config_dir, exist_ok=True)
    os.makedirs(work_dir, exist_ok=True)
    os.makedirs(logs_dir, exist_ok=True)
    
    # Certbotのコマンドライン引数を組み立て
    certbot_args = [
        "/opt/python/bin/certbot", "certonly",
        "--dns-route53",
        "--email", LE_EMAIL,
        "--domains", DOMAINS,
        "--agree-tos",
        "--non-interactive",
        "--config-dir", config_dir,
        "--work-dir", work_dir,
        "--logs-dir", logs_dir,
    ]
    
    if IS_DRY_RUN:
        certbot_args.append("--dry-run")
        
    # 環境変数の設定（Lambdaレイヤー内のPythonモジュールを認識させるため）
    env = os.environ.copy()
    env['PYTHONPATH'] = f"/opt/python:{env.get('PYTHONPATH', '')}"
    env['PATH'] = f"/opt/python/bin:{env.get('PATH', '')}"
    
    try:
        result = subprocess.run(
            certbot_args,
            env=env,
            capture_output=True,
            text=True,
            check=True
        )
        print("Certbot 標準出力:\n", result.stdout)
    except subprocess.CalledProcessError as e:
        print("Certbot 実行エラー!")
        print("標準出力:\n", e.stdout)
        print("標準エラー出力:\n", e.stderr)
        raise e

def upload_certificates():
    """
    Certbotが生成した証明書ファイルをS3にアップロードする。
    """
    domain = DOMAINS.split(',')[0].strip()
    live_dir = f"/tmp/certbot/config/live/{domain}"
    
    files_to_upload = ['cert.pem', 'privkey.pem', 'chain.pem', 'fullchain.pem']
    
    for filename in files_to_upload:
        local_path = os.path.join(live_dir, filename)
        s3_key = f"certificates/{domain}/{filename}"
        
        if os.path.exists(local_path):
            print(f"Uploading {filename} to s3://{S3_BUCKET_NAME}/{s3_key}")
            s3_client.upload_file(local_path, S3_BUCKET_NAME, s3_key)
        else:
            print(f"Warning: {local_path} が見つかりません。")

def lambda_handler(event, context):
    print(f"対象ドメイン: {DOMAINS}")
    print(f"Dry Run モード: {IS_DRY_RUN}")
    
    # 1. 更新が必要かチェック
    # Dry Runモードの時は、有効期限に関わらず強制的にCertbotのテストを実行する
    if not IS_DRY_RUN and not needs_renewal():
        print("証明書はまだ有効です。更新をスキップします。")
        return {"statusCode": 200, "body": "Renewal not needed"}
    elif IS_DRY_RUN:
        print("Dry Runモードのため、有効期限に関わらずCertbotのテスト実行を行います。")
        
    # 2. Certbotの実行
    run_certbot()
    
    # 3. 取得した証明書をS3へアップロード (Dry Run時はファイルが生成されないためスキップ)
    if not IS_DRY_RUN:
        upload_certificates()
        print("証明書の更新とS3へのアップロードが完了しました。")
    else:
        print("Dry Runモードのため、S3へのアップロードはスキップしました。")
        
    return {
        "statusCode": 200,
        "body": "Certificate renewal process completed successfully."
    }
```

### Lambdaコード用の環境変数
この関数は環境変数を使いますので、その設定を行います。
設定タブの環境変数を押下します。
![](https://private-user-images.githubusercontent.com/127835743/597058067-1604ebe9-5313-48c3-8ec2-31005a03742b.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDI0ODYsIm5iZiI6MTc3OTUwMjE4NiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU4MDY3LTE2MDRlYmU5LTUzMTMtNDhjMy04ZWMyLTMxMDA1YTAzNzQyYi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMjA5NDZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hYTQ4Y2E2NTg4MjBhZDk0ODY4NGFhY2Q2YzdlY2EyMzVhNGE5NDVmYWEwOGU5MjcxMDQzYjQyZTZiNDdiNTQ4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.xWuYMe1Y_RH7NfB5ssbWRfwRkKCPxw3ATzftsFJtTj0)

DOMAINS,S3_BUCKET_NAME,LE_EMAIL,DRY_RUNの設定を行います。
それぞれの値に余計なスペースが入っていないことを確認してください（1敗）
LE_EMAILには自身のメールアドレスを入力ください。
![](https://private-user-images.githubusercontent.com/127835743/597058262-aa35a2c2-94a0-4af9-94d4-3cff0605796a.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDI2ODYsIm5iZiI6MTc3OTUwMjM4NiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU4MjYyLWFhMzVhMmMyLTk0YTAtNGFmOS05NGQ0LTNjZmYwNjA1Nzk2YS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMjEzMDZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0yMWU2MjNhMzZlY2Y0ODU3NWY5ZjQzODNlN2QyNTE0MzQ1YzNlNmMzOTU3ZGJhMDY1M2QxOWM3YjBhNjk3YTgwJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.ExEmNgJ26LeZVwMuVUz1tXBsEprzoNlJw6UUx0Evc0Y)

### Lambdaのメモリとタイムアウト値の調整
また、一般設定においてメモリを256MBにして、タイムアウトを10分に設定します。
デフォルト値だと処理が間に合いません。
![](https://private-user-images.githubusercontent.com/127835743/597058479-17336047-3ed1-4409-8753-a5ea49610de2.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDI5MTYsIm5iZiI6MTc3OTUwMjYxNiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDU4NDc5LTE3MzM2MDQ3LTNlZDEtNDQwOS04NzUzLWE1ZWE0OTYxMGRlMi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMjE2NTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1kM2M5MGI1NGI4NmZkYjA3MjI3ZDIwZTE4M2M4YTlmNTZkZTYzZmY3NWE4OTEzYjkwYTdhYmNjZTJhYTUyNjJkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.Y6etFDm-X17hHcAeNDhMq9CeewbFTOvFv_-qSXBkJFQ)

### Lambdaレイヤの作成
このLambdaはCertbot等の外部ライブラリを使用します。
そのためレイヤを作成して、それをLambdaに紐づける必要があります。そのレイヤを作成するための資材を作成します。
Dockerを動かせる環境を用意します。この記事ではホームラボのUbuntu24.04環境を使用します。
Dockerが動いていることを確認したらpythonというフォルダを作成します。このフォルダ名は必ずpythonにします。
```
test@ubuntu-cui:~$ sudo su -
[sudo] password for test:
root@ubuntu-cui:~# systemctl status docker
● docker.service - Docker Application Container Engine
     Loaded: loaded (/usr/lib/systemd/system/docker.service; enabled; preset: e>
     Active: active (running) since Tue 2026-05-19 12:03:07 UTC; 3 days ago
TriggeredBy: ● docker.socket
root@ubuntu-cui:~# mkdir -p python
root@ubuntu-cui:~# ls
genai-ai-api  genai-web  ndlocr-lite-app  python
```

public.ecr.aws/lambda/python:3.13というコンテナイメージを使ってレイヤの資材を準備します。
これはAWSが用意しているLambdaを模倣するようなコンテナイメージになります。
コンテナ内には入れたら、pipコマンドでcertbot,certbot-dns-route53,cryptographyライブラリをインストールします。それぞれのライブラリの意味は以下です。

| ライブラリ | 説明 |
|---|---|
| certbot | SSL/TLS証明書を自動取得・更新するツール |
| certbot-dns-route53 | Route53を使ったDNS認証用のCertbotプラグイン |
| cryptography | 暗号化処理を行うPythonライブラリ |

```
root@ubuntu-cui:~# docker run --rm -it -v "$PWD":/var/task --entrypoint /bin/bash public.ecr.aws/lambda/python:3.13
Unable to find image 'public.ecr.aws/lambda/python:3.13' locally
3.13: Pulling from lambda/python
ced28d7376b1: Pull complete
cabee8b913b6: Pull complete
64eed166f1f3: Pull complete
18919a7d675d: Pull complete
dda1d2d82b43: Pull complete
43cdd0cd53bd: Pull complete
Digest: sha256:55be4d8261ca560bbd114fa54df20fa68421c56956a485ae30f31a7c2651887d
Status: Downloaded newer image for public.ecr.aws/lambda/python:3.13
bash-5.2#

# 指定したディレクトリ（/var/task/python）にライブラリをインストール
bash-5.2# pip install certbot certbot-dns-route53 cryptography -t python/
bash-5.2# exit
exit
root@ubuntu-cui:~# ls python/
81d243bd2c585b0f4821__mypyc.cpython-313-x86_64-linux-gnu.so  charset_normalizer-3.4.7.dist-info  parsedatetime-2.6.dist-info
acme                                                         configargparse-1.7.5.dist-info      __pycache__
acme-5.6.0.dist-info                                         configargparse.py                   pycparser
bin                                                          configobj                           pycparser-3.0.dist-info
boto3                                                        configobj-5.0.9.dist-info           pyopenssl-26.2.0.dist-info
boto3-1.43.14.dist-info                                      cryptography                        pyrfc3339
botocore                                                     cryptography-48.0.0.dist-info       pyrfc3339-2.1.0.dist-info
botocore-1.43.14.dist-info                                   dateutil                            python_dateutil-2.9.0.post0.dist-info
certbot                                                      distro                              requests
certbot-5.6.0.dist-info                                      distro-1.9.0.dist-info              requests-2.34.2.dist-info
certbot_dns_route53                                          idna                                s3transfer
certbot_dns_route53-5.6.0.dist-info                          idna-3.16.dist-info                 s3transfer-0.17.0.dist-info
certifi                                                      jmespath                            six-1.17.0.dist-info
certifi-2026.5.20.dist-info                                  jmespath-1.1.0.dist-info            six.py
cffi                                                         josepy                              urllib3
cffi-2.0.0.dist-info                                         josepy-2.2.0.dist-info              urllib3-2.7.0.dist-info
_cffi_backend.cpython-313-x86_64-linux-gnu.so                OpenSSL                             validate
charset_normalizer                                           parsedatetime
```

このpyhonフォルダ配下をzip化して持ち出します。
```
root@ubuntu-cui:~# apt install -y zip
root@ubuntu-cui:~# ls
certbot-layer.zip  genai-ai-api  genai-web  ndlocr-lite-app  python
root@ubuntu-cui:~# zip -r certbot-layer.zip python/
root@ubuntu-cui:~# cp -p certbot-layer.zip /tmp/
```

![](https://private-user-images.githubusercontent.com/127835743/597062607-c71ba0fa-0870-441d-baec-1606b56d2d29.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDUwMjgsIm5iZiI6MTc3OTUwNDcyOCwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDYyNjA3LWM3MWJhMGZhLTA4NzAtNDQxZC1iYWVjLTE2MDZiNTZkMmQyOS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMjUyMDhaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wZGVmNjZkOTIzMGUzMTlmN2Y3MDE5Njk4NDM1ZTFiMWM0Nzk2YjE2NmJiZTUxZTMyZDRmYjQ1ZGFlYzYyNDMxJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ._czXDWaYGW_6xPv8CsP1DOMvU3rfCybuHIX-J_tDEh0)

レイヤ名はcertbot-layerとし、.zipファイルをアップロード。
互換性は指定しなくても大丈夫ですが、指定しておきます。
![](https://private-user-images.githubusercontent.com/127835743/597062808-59bcaa7a-e0bb-487b-9252-08ebda05ff99.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDUwODMsIm5iZiI6MTc3OTUwNDc4MywicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDYyODA4LTU5YmNhYTdhLWUwYmItNDg3Yi05MjUyLTA4ZWJkYTA1ZmY5OS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMjUzMDNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05MTU0NDNmNTA4ZWQ2YWNkZDM0YmVkZGI2ZmE3MzZhYzVlNDA2YzFkMDI1NGU3ZTMxOTZlZGVkMGY0MDZlNGQ4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.snJeaYfKNoQqHSFFtddxmLzY1y9HDZL_2IiVfK2Xuxg)

作成出来ました。このARNを控えます。
![](https://private-user-images.githubusercontent.com/127835743/597065075-a9449a7e-a7ea-4cce-a904-bcbd5ed3ae82.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDU2NDYsIm5iZiI6MTc3OTUwNTM0NiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDY1MDc1LWE5NDQ5YTdlLWE3ZWEtNGNjZS1hOTA0LWJjYmQ1ZWQzYWU4Mi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMzAyMjZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0yNGRkN2MwOWQ3Mzc3MmY5ZDQ0ZDM0YzI5ODM5NTFiMmYzMDZmM2JiNThiZWY4MTkyZTdkNzdmZTViNWM4YTJkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.P5jNj2P6bXP66QbBNnWR_F61TfvC6IfvuB4PzW54maM)

### レイヤの紐づけ
以下の設定を行い、レイヤを検証の上紐づけていきます。
![](https://private-user-images.githubusercontent.com/127835743/597065965-91290cb0-483c-4370-8abb-8b8ef27bb65a.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDU4MjYsIm5iZiI6MTc3OTUwNTUyNiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDY1OTY1LTkxMjkwY2IwLTQ4M2MtNDM3MC04YWJiLThiOGVmMjdiYjY1YS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMzA1MjZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT03OGE1MDUwODgzMzEzMDIyMTFjNmM3ODQ1YzBhZmFlZGI1MzNiMDUyNTE1OGI4NjhhNjhkOTY4MzE3ODAyZmRkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.NvwgsUylxL5ExMVkdAn2Dhn679h3BbF8YbWs159ZZWk)

以下のように、コード・レイヤが設定されていれば大丈夫です。
![](https://private-user-images.githubusercontent.com/127835743/597066419-7f5122de-f674-4b27-8f6e-b60989f5a90f.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDU5MzMsIm5iZiI6MTc3OTUwNTYzMywicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDY2NDE5LTdmNTEyMmRlLWY2NzQtNGIyNy04ZjZlLWI2MDk4OWY1YTkwZi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMzA3MTNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zYjQwZWEyNTBiZDZlYjY1ZDBhYzg3YmNkMDFmOWQzYzMyNDljNDk5MTgzNDA5OTFhNjIyOGNjYTdiODY1ZTQ4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.NzV4Zylh26XnK0dJAeK-bzD8lYtLdMA0VTExY4eYS5M)

# 動作確認
## 証明書取得1回目
実際に試してみます。Testボタンを押下して動作確認を行います。
StatusがSucceededとなっていれば大丈夫です。
```
Status: Succeeded
Test Event Name: test

Response:
{
  "statusCode": 200,
  "body": "Certificates updated and uploaded to S3"
}

The area below shows the last 4 KB of the execution log.

Function Logs:
START RequestId: 0f8e2db4-a7e0-4877-a327-a5c4a74904da Version: $LATEST
対象ドメイン: dev.ohtsuka-aws.xyz
Dry Run モード: False
既存の証明書がS3にないか、解析に失敗しました（新規取得します）: An error occurred (NoSuchKey) when calling the GetObject operation: The specified key does not exist.
Certbot を実行します...
Certbot 標準出力:
Account registered.
Requesting a certificate for dev.ohtsuka-aws.xyz
Successfully received certificate.
Certificate is saved at: /tmp/certbot/config/live/dev.ohtsuka-aws.xyz/fullchain.pem
Key is saved at:         /tmp/certbot/config/live/dev.ohtsuka-aws.xyz/privkey.pem
This certificate expires on 2026-08-21.
These files will be updated when the certificate renews.
NEXT STEPS:
- The certificate will need to be renewed before it expires. Certbot can automatically renew the certificate in the background, but you may need to take steps to enable that functionality. See https://certbot.org/renewal-setup for instructions.
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
* Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
* Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Uploading cert.pem to s3://acme-s3-dev-ohtsuka-aws-xyz/certificates/dev.ohtsuka-aws.xyz/cert.pem
Uploading privkey.pem to s3://acme-s3-dev-ohtsuka-aws-xyz/certificates/dev.ohtsuka-aws.xyz/privkey.pem
Uploading chain.pem to s3://acme-s3-dev-ohtsuka-aws-xyz/certificates/dev.ohtsuka-aws.xyz/chain.pem
Uploading fullchain.pem to s3://acme-s3-dev-ohtsuka-aws-xyz/certificates/dev.ohtsuka-aws.xyz/fullchain.pem
END RequestId: 0f8e2db4-a7e0-4877-a327-a5c4a74904da
REPORT RequestId: 0f8e2db4-a7e0-4877-a327-a5c4a74904da	Duration: 38020.68 ms	Billed Duration: 38703 ms	Memory Size: 256 MB	Max Memory Used: 157 MB	Init Duration: 681.96 ms

Request ID: 0f8e2db4-a7e0-4877-a327-a5c4a74904da
```
![](https://private-user-images.githubusercontent.com/127835743/597071480-ab4c4bf0-6ba1-42dd-a264-b1ec5f3c524f.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDczMzksIm5iZiI6MTc3OTUwNzAzOSwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDcxNDgwLWFiNGM0YmYwLTZiYTEtNDJkZC1hMjY0LWIxZWM1ZjNjNTI0Zi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMzMwMzlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1jYzgzNzhkZmE1ZTQ3NTZkYmNmNjBkYTA0ODhlY2U3YTM0YjZlZWRmMDY0NTZiM2IyMjg5ZjkzYzhjMGEzYzQzJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.BSnBqtFO9ltC_VvwWKbrxi6P0Z-bAI8G3-ybDdtntLA)

S3バケットに証明書があることを確認します。
取得できてますね。
![](https://private-user-images.githubusercontent.com/127835743/597072557-78b836aa-5210-467d-b5ff-e160e5f618f7.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDc0NTgsIm5iZiI6MTc3OTUwNzE1OCwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDcyNTU3LTc4YjgzNmFhLTUyMTAtNDY3ZC1iNWZmLWUxNjBlNWY2MThmNy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMzMyMzhaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1lZGNlOWMzMzcyOTQ4NTg5NTRiZDViNGRhMzVkZWUzODcwZjIzZWRhMTBmODNlYjIwZWMxMzRmMDU1ZDVhYzA1JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.pf6rNB45bnAXxTzssXul_83NrmDMJASKC8ku-Fq5BxA)

## 証明書取得（有効期限的に大丈夫だった場合）
証明書の有効期限がある場合、このように処理をスキップします。
EventBridgeで2回/日という感じで実行間隔を設定しておくことで、証明書の自動取得が出来ると思います。
```
Status: Succeeded
Test Event Name: test

Response:
{
  "statusCode": 200,
  "body": "Renewal not needed"
}

The area below shows the last 4 KB of the execution log.

Function Logs:
START RequestId: 1d67074c-d457-4fc0-8454-1ebb03a32224 Version: $LATEST
対象ドメイン: dev.ohtsuka-aws.xyz
Dry Run モード: False
証明書の残り有効期間: 89 日
証明書はまだ有効です。更新をスキップします。
END RequestId: 1d67074c-d457-4fc0-8454-1ebb03a32224
REPORT RequestId: 1d67074c-d457-4fc0-8454-1ebb03a32224	Duration: 358.36 ms	Billed Duration: 1056 ms	Memory Size: 256 MB	Max Memory Used: 101 MB	Init Duration: 697.04 ms

Request ID: 1d67074c-d457-4fc0-8454-1ebb03a32224
```
![](https://private-user-images.githubusercontent.com/127835743/597074420-abdea590-1996-4d6a-9e1e-d40178a5db5f.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDc2OTYsIm5iZiI6MTc3OTUwNzM5NiwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDc0NDIwLWFiZGVhNTkwLTE5OTYtNGQ2YS05ZTFlLWQ0MDE3OGE1ZGI1Zi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMzM2MzZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT00ZTU2ZjhhZGQ4NDcxNDY3MjI2NTBkNDQyY2EwNDhiMzlmZGNkOWQ4YTg3MGNlMjkzNTNkNTU0ZTg2MDQzMjYxJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.tr3hKlBktB6Vy7o6LFXrniL7GuHo1nzwGSxOLMrrIQ0)

**EventBridge Scheduler の設定例（今後実装記事を上げるかも？）**
名前: acme-certificate-renewal
スケジュール式: cron(0 2,14 * * ? *)  # 毎日2時と14時(UTC)
ターゲット: Lambda関数 (acme-lambda-dev-ohtsuka-aws-xyz)
入力: {}
タイムゾーン: UTC


## Dry-Run
環境変数のDRY_RUNをtrueにします。
その後Lambdaを実行すると以下のように出力されます。
```
Status: Succeeded
Test Event Name: test

Response:
{
  "statusCode": 200,
  "body": "Certificate renewal process completed successfully."
}

The area below shows the last 4 KB of the execution log.

Function Logs:
START RequestId: f3dad80a-8299-4b40-9200-131b39c0d630 Version: $LATEST
対象ドメイン: dev.ohtsuka-aws.xyz
Dry Run モード: True
Dry Runモードのため、有効期限に関わらずCertbotのテスト実行を行います。
Certbot を実行します...
Certbot 標準出力:
Account registered.
Simulating a certificate request for dev.ohtsuka-aws.xyz
The dry run was successful.
Dry Runモードのため、S3へのアップロードはスキップしました。
END RequestId: f3dad80a-8299-4b40-9200-131b39c0d630
REPORT RequestId: f3dad80a-8299-4b40-9200-131b39c0d630	Duration: 35716.71 ms	Billed Duration: 36415 ms	Memory Size: 256 MB	Max Memory Used: 157 MB	Init Duration: 697.41 ms

Request ID: f3dad80a-8299-4b40-9200-131b39c0d630
```
![](https://private-user-images.githubusercontent.com/127835743/597076671-ee94b353-d41c-4050-b25d-1bc3f8321eac.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Nzk1MDgyODksIm5iZiI6MTc3OTUwNzk4OSwicGF0aCI6Ii8xMjc4MzU3NDMvNTk3MDc2NjcxLWVlOTRiMzUzLWQ0MWMtNDA1MC1iMjVkLTFiYzNmODMyMWVhYy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNTIzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDUyM1QwMzQ2MjlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0wMGNkMWUyN2I0ZDJkNTdiMmQxZGYxODgzM2NiNjBkNGFlYzYzNTViNjRlNTI1NzdiODVjZWVkM2Y3MjRmNDU4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.z-9EBL0GjrulFfKaQQVFWzQ-5cfUPX5k-QWzOZW0dfM)

# 続き
## EC2のApache/Nginxに証明書を自動適用する

[[ssl-cert-auto-apply-ec2]]

# HTTP-01チャレンジ

[[ssl-cert-short-lifetime-acme-http01]]

## チャレンジ方式の比較

| 項目 | DNS-01 | HTTP-01 |
|------|--------|---------|
| 所有権の証明方法 | DNSのTXTレコードにトークンを登録 | `/.well-known/acme-challenge/` にトークンを公開 |
| ポート80の開放 | 不要 | 必要 |
| ワイルドカード証明書 | 対応（`*.example.com`） | 非対応 |
| DNSプロバイダーのAPI連携 | 必要 | 不要 |
| 自動化の難易度 | DNSプロバイダー次第 | 比較的容易 |
| セキュリティリスク | DNSのAPI認証情報の管理が必要 | 証明書取得時にポート80を外部公開する必要がある |
| サーバーへの直接アクセス | 不要（サーバーが非公開でも可） | 必要（外部からHTTPアクセスできる必要がある） |
| 対応ドメイン数 | 複数・ワイルドカード含め柔軟 | 1ドメインずつ個別に対応 |
| DNS伝播待ちの影響 | あり（TTLによっては数分〜数十分） | 基本的になし（※新規ドメイン設定直後を除く） |
| 他サーバの代理取得（証明書の集中管理） | 容易（対象サーバに依存せず、別サーバで取得可能） | 困難（対象ドメインの80番ポート宛の通信をプロキシ等で転送する設定が必要） |


