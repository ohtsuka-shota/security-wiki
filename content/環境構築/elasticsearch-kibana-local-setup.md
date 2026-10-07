---
title: "Elasticsearch・Kibanaのローカル環境構築個人的備忘録"
date: 2025-10-04
tags: ["tool", "Security", "Elasticsearch", "Kibana"]
source: "https://qiita.com/ohtsuka-shota/items/2e6ca8251a52917eb28b"
---
タイトルの通りです。

参考：

https://www.elastic.co/docs/deploy-manage/deploy/self-managed/local-development-installation-quickstart

https://github.com/elastic/start-local

Windowsで構築する時はDocker DesktopとWSLを準備しないといけないようです。
面倒であればVirtualBoxなりProxmoxなりでLinuxサーバを作った方が良いかもしれません。


# 構築
WSLを開いてdockerがインストールされていることを確認します。
```
root@DAIV-SHOLAND:~# docker --version
Docker version 28.3.2, build 578ccf6
```

この状態で以下のコマンドを実行します。
```
curl -fsSL https://elastic.co/start-local | sh
```

以下のようにタスクが実行されます。
出力のされ方的にリモートに用意されているdocker-composeのyamlを叩いているんでしょうね。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5464552d-8275-4d01-8b6f-1d543be0d974.png)


コンテナが2個起動します。
```
root@DAIV-SHOLAND:~# docker ps
CONTAINER ID   IMAGE                                                 COMMAND                  CREATED              STATUS                        PORTS                      NAMES
4908f79ec9df   docker.elastic.co/kibana/kibana:9.1.4                 "/bin/tini -- /usr/l…"   About a minute ago   Up About a minute (healthy)   127.0.0.1:5601->5601/tcp   kibana-local-dev
d93a05cf20c5   docker.elastic.co/elasticsearch/elasticsearch:9.1.4   "/bin/tini -- /usr/l…"   About a minute ago   Up About a minute (healthy)   127.0.0.1:9200->9200/tcp   es-local-dev
```

http\://localhost:5601にアクセスすると、ユーザ名とパスワードが求められます。
パスワードがコンテナを作成した最後に出力されているので控えておきましょう
```
🎉 Congrats, Elasticsearch and Kibana are installed and running in Docker!

🌐 Open your browser at http://localhost:5601

   Username: elastic
   Password: BOer43Sg

🔌 Elasticsearch API endpoint: http://localhost:9200
🔑 API key: SEVNbnJwa0JEZjNMZE54UG92cko6UzBtQmlaSG1sQjY3LTB6cjMxYzJVdw==


Learn more at https://github.com/elastic/start-local
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/07039ac0-fd52-4095-bcff-9e09ba95f5fa.png)

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f8b9738e-b261-4de7-aa9b-7d77fd42b8d5.png)

アクセスすることが出来ました。
どんなことをローカル環境で出来るのかは今後。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b67d699e-448d-4788-95e0-b1e8c20f9eaa.png)


# ElasicSearchとkibanaとは(AI出力)
## Elasticsearchとは
Elasticsearchは、オープンソースの分散型検索・分析エンジンです。主な特徴は以下の通りです。

*   **高速な検索と分析**: 大量のデータを高速に検索・分析するために設計されています。全文検索に特化しており、テキストデータだけでなく、数値や地理空間データなど、さまざまな種類のデータを効率的に扱うことができます。
*   **NoSQLデータベース**: ドキュメント指向のNoSQLデータベースとして機能し、データをJSON形式で格納します。
*   **リアルタイム性**: データのインデックス作成から検索、分析までをほぼリアルタイムで実行できます。
*   **分散処理**: データを複数のサーバーに分散して処理する能力を持ち、高いスケーラビリティと可用性を実現します。

https://www.elastic.co/jp/elasticsearch

## Kibanaとは
Kibana（キバナ）は、Elasticsearchに保存されたデータを探索、可視化、分析するためのオープンソースのツールです。Elasticsearchのフロントエンドとして機能し、専門家でなくても直感的にデータを扱うことを可能にします。
Kibanaは、データからインサイトを引き出すための豊富な機能を備えています。

*   **データの可視化**: 折れ線グラフ、棒グラフ、円グラフ、ヒートマップ、ワッフルチャートなど、多彩なチャートやグラフを作成できます。これにより、データの傾向や異常を視覚的に把握できます。
*   **インタラクティブなダッシュボード**: 作成した複数の可視化を一つのダッシュボードにまとめて表示できます。ダッシュボードは動的で、フィルタを適用したり、時間範囲を調整したりすることで、リアルタイムに表示内容を変化させることが可能です。
*   **データ探索**: クエリやフィルタを使い、Elasticsearch内のデータをインタラクティブに探索できます
*   **地理空間分析**: 地図上にデータをプロットし、地理的な情報を可視化するマッピング機能が強力です。
*   **時系列分析 (Timelion)**: 時系列データに特化した分析と可視化を行うための専用ツールです。
*   **Canvas**: ライブデータを活用して、ロゴやテキストなどを自由に配置したプレゼンテーション品質の資料を作成できる機能です。
*   **レポートとアラート**: ダッシュボードや可視化の結果をレポートとして生成・共有したり、特定の条件（しきい値）に基づいてアラートを送信したりできます。

https://www.elastic.co/jp/kibana

