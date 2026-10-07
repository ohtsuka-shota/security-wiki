---
title: "QRadarでログ・アクティビティを監視できる環境を作る"
date: 2026-04-24
tags: ["countermeasure", "Security", "初心者", "rsyslog", "SIEM", "QRadar"]
source: "https://qiita.com/ohtsuka-shota/items/50b3f62f6df60821317e"
---
# 用語
## rsyslog
>「rsyslog」はシステムログを記録するためのソフトウェアです。以前広く利用されていた「syslog」の機能強化版でいくつかの機能が強化されていますが、基本的な使い方はほぼ同じです。特徴としては、「複数のマシンのログを１台のマシンに集約する」などといったことが可能である、ログのフィルタリングや主要なデータベースとの連携が可能であるといったことが挙げられます。

https://linuc.org/study/column/3587/#rsyslog

QRadarでログを収集する時はこれを使うっぽいです。
他のSIEMもこれを使っているものもあるようです。

# 構築
## 監視対象Linuxのセットアップ
ProxmoxのLXCを使ってデプロイしていきました。
スペックは以下としましてます。Ubuntu22.04のテンプレートを使用しています。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2fce9347-f63a-43e8-903c-2fd1c903974e.png)

LXCコンテナを用意したら以下の設定でSSH接続できるようにして、Teratermで操作するようにします。

[[proxmox-ve-container-ssh]]


rsyslogのデフォルトのconfファイルを確認します。
```
root@ohtsuka-qradar-target01:~# apt update && apt upgrade -y
root@ohtsuka-qradar-target01:~# cd /etc/rsyslog.d/
root@ohtsuka-qradar-target01:/etc/rsyslog.d# ls
20-ufw.conf  50-default.conf  postfix.conf
```

qradar.confというファイルを作成します。
172.18.250.163:514の部分を立ち上げているQRadarのIPアドレスにします。514はポート番号です。
```
root@ohtsuka-qradar-target01:/etc/rsyslog.d# nano qradar.conf
root@ohtsuka-qradar-target01:/etc/rsyslog.d# cat qradar.conf
# Define the log template (Standard format for better parsing by QRadar)
$ActionFileDefaultTemplate RSYSLOG_TraditionalFileFormat

# Forward all logs to QRadar (UDP port 514)
*.* @172.18.250.163:514
```

confをrsyslogに反映するためにrestartをかけます。
```
root@ohtsuka-qradar-target01:/etc/rsyslog.d# systemctl restart rsyslog
root@ohtsuka-qradar-target01:/etc/rsyslog.d# systemctl enable rsyslog
```

## 動作確認（rsyslogの再起動）
rsyslogを何度かrestartしてみます。
```
root@ohtsuka-qradar-target01:/etc/rsyslog.d# systemctl restart rsyslog
```

QRadarでrsyslogの再起動を検知していることを確認してみます。
ログイン後、ログ・アクティビティータブを開いて、画面上部のフィルターの追加を押下します。

以下の値を入力します。
パラメータ：送信元IP または 宛先IP
演算子：次と等しい
値：rsyslogを再起動したサーバのIP

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/434eb0b1-7248-4e48-b663-8bb5ca60ed40.png)


画面中央にある
ビュー：過去15分間
を選びます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bca705d6-8935-44f3-817b-411f8946cbcb.png)

指定したIPアドレスを含むログ・アクティビティ情報を表示させることができます。
イベントをダブルクリックしてみます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f96ba57f-93d7-4d95-854f-daf4a3a432a1.png)

「いつ・どこで・何が起きたか・QRadarがどう評価したか」を見ることができます。
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-04-24-16_29_03.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/84109c2a-48be-45d9-91ac-53e7f74bc0f2.png)

このあたりを見るといいっぽいですね。
| 指標 | 意味 | 高いとどう見るか |
|---|---|---|
| 重大度（Severity） | その事象自体の危険さ・深刻さ | 高いほど、起きた内容が危険 |
| 信頼度（Credibility） | そのイベントが本当に怪しい / 正しいと判断できる度合い | 高いほど、誤検知の可能性が低い |
| 関連性（Relevance） | 自組織にとってどれだけ重要な対象か | 高いほど、重要資産に関係している可能性が高い |
| マグニチュード（Magnitude） | 上記を総合した重要度 | 高いほど、優先して確認すべき |

## 動作確認（syslogにログを吐いてみる）
以下のコマンドを打ってみます。
何度か打ってみてください。
```
root@ohtsuka-qradar-target01:/etc/rsyslog.d# logger "HELLO_QRADAR"
```

このあと/var/log/syslogをcatしてログがファイルに書き込まれていることを確認します。
```
root@ohtsuka-qradar-target01:/etc/rsyslog.d# cat /var/log/syslog
中略
Apr 24 08:04:16 ohtsuka-qradar-target01 root: HELLO_QRADAR
```

改めてQRadarのログ・アクティビティー上でログを確認できるかを確認してみます。先ほどと同様に以下のようにフィルタを設定します。イベントが出てくると思います。
パラメータ：ペイロード
演算子：に含まれる
値：HELLO
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1017cce0-c8cd-4bac-a9fe-22f68dc14507.png)

ダブルクリックをして、内容を見てみます。
ペイロード情報を見てみると、syslogに書かれているログが表示されていることがわかりますね。
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-04-24-17_28_10.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/dae92cb4-5f3a-4184-ab43-edbc6afa303a.png)

