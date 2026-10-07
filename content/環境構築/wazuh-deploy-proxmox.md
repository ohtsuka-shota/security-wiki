---
title: "WazuhをProxmoxVE/Ubuntu24.04のVMにデプロイする"
date: 2026-05-01
tags: ["tool", "server", "Ubuntu", "Security", "proxmox", "Wazuh"]
source: "https://qiita.com/ohtsuka-shota/items/f9ae40fd21418228d61c"
---
ＱRadar（SIEM）とかBunkerWebとかでセキュリティ系のツールに興味をもつようになり。
興味の赴くまに構築してみます。

# 用語
## Wazuhとは
ワズーと呼ぶようです。
オープンソースのセキュリティプラットフォームであり、SIEM（Security Information and Event Management）とXDR（Extended Detection and Response）の機能を統合したツールです。このプラットフォームは、オンプレミス、仮想化環境、コンテナ、クラウド環境など、さまざまな環境での脅威の検出、インシデント対応、規制遵守を支援するためのツールとのこと。。。

### 機能説明

よりどりみどりだなぁ・・・

| **機能**           | **説明**                                                                 |
|--------------------|-------------------------------------------------------------------------|
| **侵入検知**        | マルウェアや不正アクセスの検出。隠しファイルや不審なプロセスも特定可能。         |
| **ログデータ分析**   | エンドポイントやネットワークデバイスから収集したログを分析し、異常を検出。       |
| **ファイル改ざん検知**| ファイルの不正な変更を監視し、改ざんを検出。                                   |
| **脆弱性検出**      | システムやアプリケーションの脆弱性を特定し、対策を支援。                         |
| **規制遵守**        | PCI DSSやGDPRなどの規制に対応するためのレポートやダッシュボードを提供。         |
| **クラウドセキュリティ**| AWS、Azure、Google Cloudなどのクラウド環境を監視し、脅威や脆弱性を検出。         |
| **リアルタイムイベント相関**| セキュリティイベントをリアルタイムで監視し、異常を検出。                         |


## SIEM（Security Information and Event Management）
ネットワークやIT環境内のさまざまな機器やツールから生成されるログ情報を一元的に収集・分析し、サイバー攻撃や内部不正の兆候を早期に検知することを目的としているツール。
QRadarがそれ。

## XDR（Extended Detection and Response）
複数のセキュリティレイヤー（エンドポイント、ネットワーク、クラウド、メールなど）にわたって脅威を検知し、分析・対応する統合型セキュリティソリューションです。従来のセキュリティツールでは対応が難しかった複雑な攻撃や広範囲にわたる脅威を、効率的かつ迅速に検知・対処することを目的としている。

EDR（Endpoint Detection and Response）はエンドポイント（PCやサーバーなど）に特化したセキュリティソリューションで、エンドポイント上の脅威を検知・対応しているが、それを拡張したのがXDR。


# インストール参考サイト
公式のサイトを参考にしてます。
基本的にここに全て書いてます。

https://documentation.wazuh.com/current/quickstart.html

# 構築
VMのスペックは参考サイトから、以下のようにしてます。　
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/8b01ea2b-9556-413c-af1c-55402cf76690.png)

VMが立ち上がったら以下のコマンドを実行して
パッケージやアプリ等を最新化しておきます。
```
root@wazuh:~# apt update && apt upgrade -y
```

以下のコマンドを実行してWazuhをインストールします。
最後の方にユーザパスの情報が出力されるので控えておきます。
```
root@wazuh:~# curl -sO https://packages.wazuh.com/4.14/wazuh-install.sh && sudo bash ./wazuh-install.sh -a

中略
01/05/2026 04:08:08 INFO: Wazuh dashboard web application initialized.
01/05/2026 04:08:08 INFO: --- Summary ---
01/05/2026 04:08:08 INFO: You can access the web interface https://<wazuh-dashboard-ip>:443
    User: admin
    Password: jj2y86oLBN.BevXe2h6vNtnSY..YaD6H
01/05/2026 04:08:08 INFO: Installation finished.
```

https:\//wazuhをいれたサーバのIPアドレスでダッシュボードにアクセスできます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d0e4eaf0-f904-4af6-aacc-8a92fd459b5a.png)

インストール時に出力されたユーザパスの情報を入力します。
![image (1).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5b0dbea2-8841-4bb9-bcdc-d84e77ba5acf.png)
![image (2).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/fddcd998-9ddd-49e8-a6fd-b48270acddfe.png)

正常にアクセス出来ると以下のように管理画面が表示されます。
監視対象にはAgentを入れるっぽい？ですね。
それは近いうちに。。。
![image (3).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f3d2cc20-ba4c-4868-b3b2-583060a3265a.png)

