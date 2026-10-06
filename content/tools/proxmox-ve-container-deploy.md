---
title: "Proxmox VE上にコンテナをデプロイする"
date: 2023-10-01
tags: ["tool", "lxc", "proxmox", "container"]
source: "[[proxmox-ve-container-deploy]]"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。
今回はProxmox VE上にコンテナをデプロイしていきたいと思います。

# Proxmoxにおけるコンテナとは？
以下の公式ドキュメントに書かれている通り、LXCを使用しているようですね。LinuX Container、略してLXCだと思っています。

https://pve.proxmox.com/pve-docs/chapter-pct.html

LXCについても公式サイトより引用します。
難しく書いていますが、一旦はDockerと同じイメージで良いかと思います。

>LXC は Linux カーネルが持つコンテナ機能のためのユーザスペースのインターフェースです。
Linux ユーザがシステムコンテナやアプリケーションコンテナを簡単に作成したり管理したりするためのパワフルな API とシンプルなツールを提供しています。

https://linuxcontainers.org/ja/lxc/introduction/

ただそうは言っても若干違う様で、Dockerが「アプリケーション隔離環境」を作成することを目的としている一方で、LXCは「軽量仮想マシン」を作成することを目的としているようです
Proxmox VE上で考えると、普通のVMよりも軽いVMを作ることを目的としているって解釈…？

https://www.ossnews.jp/compare/Docker/LXC

イメージとしては以下でしょうか？
dockerのような「アプリケーション隔離環境」のコンテナはWordpress環境を作る時にWordpressコンテナとDBコンテナを別々で立ち上げる。同じコンテナ内にその両方をデプロイするのは設計思想に反する。
![proxmox-ページ4.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/21649d09-6e64-559c-dade-bf8372d65c45.png)
LXCのような「軽量仮想マシン」のコンテナは同じコンテナ内でデプロイしようが違うコンテナ内にだろうが、設計思想には反しない。
![proxmox-ページ5.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f14bbeae-1e48-9c0d-4119-3000eea54da2.png)

# 構築
## コンテナデプロイ準備
まずはコンテナの為のTemplateを準備します。
適当なノードを選択し、CephFSを選択します（CephFSで無くても問題ありません）
CT TemplatesのTemplatesを押下します。
![image (6).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d6a6292e-86c3-a14a-b708-042a96da2c2e.png)
色んなOS名が表示されているTemplateを選択できそうな画面が表示されます。
今回は（私が）大好きなubuntu22.04を選択し、Downloadを押下します。
![image (7).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0e5abefe-b04c-6a11-5633-32b7110d32ee.png)
Downloadが実行されます。TASK OKとなることを確認します。一覧にも表示がされるようになります。
![image (8).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/44b19784-11a8-35f1-3445-137e0f260de2.png)
![image (9).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/ac33c8b7-083a-e342-82b6-a5fcdef0115d.png)
さらに、コンテナデプロイにはPoolが必要っぽいので、作成します。
DatacenterのPoolsを選択。Createを押下します。
![image (10).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6210ed44-fd51-d44d-e630-4005580a94f4.png)
今回はLXC_POOLという名前のpoolを作成しました。一覧にも表示されます。
![image (11).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b5f6f191-963d-b5f3-cc66-a6336b16e2c0.png)
![image (12).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9cfcfba9-9618-12e3-9c56-51df4e87e387.png)

## コンテナデプロイ
コンテナをデプロイしていきます。
今回はpve03ノード上にデプロイしていきます。
画面右上にあるCreate CTを押下します。
![image (14).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d168ec20-fe57-5e4e-91a5-fbbbeb03f429.png)
Resource Poolは作成したものを選択します。Passwordはこのコンテナにログインする際に必要になります。
※SSH Keyを入力していますが無くてもデプロイは出来そうでした。作成する場合はssh-keygenコマンドか何かで作ればいいと思います。
![image (16).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6445e675-6587-0092-2600-56db440bcdb7.png)
インストールしたubuntu22.04のテンプレートを選択します。
![image (17).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/58082d5b-8bfe-3611-49f2-623c0a8c58fe.png)
Diskは構築していたCephRBDのものを選択しました。
![image (18).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9a90c6d2-2e9b-2b0e-1f2b-9b677f54e8d4.png)
後の設定は以下の様にしています。
VM立ち上げと変わっているなと感じたのは、Proxmox上でコンテナのIPアドレスやデフォゲなどを設定するところになるでしょうか。今回はProxmoxと同じネットワーク帯のIPアドレスを指定して、デフォゲやDNSなどはProxmoxと同じ設定をしております。
![image (19).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/da315045-4a44-010b-633f-de6e48a8e65c.png)
![image (20).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c3f8a691-6f7f-b271-8e08-4514be9d5beb.png)
![image (21).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/12f6bc43-9023-a294-0ff6-585c414971db.png)
![image (22).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7d97a394-23bc-19c5-2386-25ca31113326.png)
コンテナをデプロイする画面は以下になります。
TASK OKとなっていることを確認します。
![image (23).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7b47d7c1-8b6f-90e0-c080-1eed1f07720d.png)
デプロイが完了するとVMのように表示がされます。
![image (24).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4313a40a-3df5-15c2-5584-5ad01e1420f1.png)
VMと同様にProxmox上からも操作が出来ます。
ユーザはroot、パスワードはコンテナデプロイ時に入力したパスワードを入力します。
コンテナなので、VMを立ち上げるよりもかなり早くデプロイ出来ました。用途によってはコンテナを選択するのもありかもしれないと思いました。
![image (26).png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f04b2268-373c-dd23-9e42-f2b1de99d5c7.png)






