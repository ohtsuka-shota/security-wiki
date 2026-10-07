---
title: "QRadarのオフェンスを意図的に発生させてみる"
date: 2026-05-04
tags: ["tool", "Ubuntu", "SIEM", "QRadar", "オフェンス"]
source: "https://qiita.com/ohtsuka-shota/items/86b6477cc50d97a44fe3"
---
これの続きを行っていきます。

[[qradar-ssh-sudo-failure-monitoring]]

# 用語
## オフェンス
オフェンスとは「バラバラに発生した怪しいイベントを、一つの『事件』としてまとめたもの」のことです。通常のログ管理ツールだと、100回ログイン失敗があれば100個のアラートが出てしまいますが、QRadarはそれらを分析して「これは同一人物による一つの攻撃（事件）だ」と判断し、1つの「オフェンス」として集約します。

https://www.ibm.com/docs/ja/qsip/7.4.0?topic=overview-offenses

# 手順
SSH接続を短期間で連続して失敗します。
サーバに存在しているtestユーザのパスワードをあえて間違えまくります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f3d285ee-35d4-4f9c-ac17-977c2fde2379.png)

2,3分の間で2,30回連続でtestユーザでパスワードを失敗しました。
その結果をQRadar側でも検知していることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/46a41984-808a-4e27-b989-d099312dc255.png)

オフェンスが出てきました。
円グラフなどの下にある1行をダブルクリックしてみます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/701d650c-b636-4f7e-b74a-883290f3ce6d.png)

詳細を確認することが出来ます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/cd5f389d-ff9c-46d5-a971-642dbcd161f5.png)

縦長のページであったので、PDFでエクスポートした後JPEG化したものを添付します。
確かに複数のログを1つの攻撃として集約していることがなんとなく見てわかります。
![QRadar - Offense Manager_page-0001.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2f3b87cf-0521-474a-bd99-30f9224615f9.jpeg)
![QRadar - Offense Manager_page-0002.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6508fc2e-1374-47ce-8f6f-18564ba7c99c.jpeg)

またPulseタブを開くことでオフェンスが発生しているかを確認することが出来ます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7c9ced1c-438f-46c8-92cd-958434aa5158.png)

ログイン直後のダッシュボードでもオフェンスの発生が確認できます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/064c196e-e00d-4065-8df1-2ff8f4a8eb3e.png)

