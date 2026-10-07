---
title: "QRadarでSSH接続失敗やsudo失敗のログを監視する環境を作る"
date: 2026-04-26
tags: ["countermeasure", "Security", "ログ", "rsyslog", "SIEM", "QRadar"]
source: "https://qiita.com/ohtsuka-shota/items/bf66f324c74b25fb24e4"
---
前回はQRadarでとりあえずログ監視をする環境を作りました。
今回はそれを少し具体性を持たせて、整えていきたいと思います。
具体的には、ssh接続を失敗した際に出力されるログであったり、sudo失敗のログをQRadarで監視する環境を作っていきたいと思います。

[[qradar-log-activity-monitoring]]

# 環境構築
## QRadar監視対象の設定
前回作成したqradar.confの内容を以下のように書き換えます。
このように設定を書き換えることで、デーモンログやシステムログ、認証ログなどをQRadarに転送することが出来ます。
```
root@ohtsuka-qradar-target01:/etc/rsyslog.d# nano qradar.conf
root@ohtsuka-qradar-target01:/etc/rsyslog.d# cat qradar.conf
# Use traditional syslog format
$ActionFileDefaultTemplate RSYSLOG_TraditionalFileFormat

# Forward generic system logs
user.*      @172.18.250.163:514
daemon.*    @172.18.250.163:514
syslog.*    @172.18.250.163:514

# Forward authentication logs (includes SSH / sudo related logs)
auth.*      @172.18.250.163:514
authpriv.*  @172.18.250.163:514
```

confファイルを書き換えましたので、それをrsyslogに反映します。
restartを実行します。
```
root@ohtsuka-qradar-target01:/etc/rsyslog.d# systemctl restart rsyslog
```
## 動作確認
### SSH接続失敗監視
SSH接続を失敗してみます
みんな大好きTeratermを起動して監視対象のサーバのIPアドレスを指定します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/309b46a2-c638-47b7-b217-84d6e6a32b44.png)
ユーザは存在するもの、パスワードを間違ってログイン失敗をしてみます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1b7072c7-e265-471f-b6bc-663ffa45c100.png)
失敗した後、正しいパスワードを指定して/var/log/auth.logを確認します。
**"Failed password for root from 192.168.2.65 port 58626 ssh2"**
というログがあることから、ログにパスワードでログイン失敗していることが記載されていることがわかります。
```
root@ohtsuka-qradar-target01:~# cd /var/log
root@ohtsuka-qradar-target01:/var/log# ls
alternatives.log  dist-upgrade  journal   syslog
apt               dmesg         lastlog   ubuntu-advantage-timer.log
auth.log          dpkg.log      mail.log  ubuntu-advantage.log
btmp              faillog       private   wtmp
root@ohtsuka-qradar-target01:/var/log# cat auth.log

中略
Apr 24 12:52:16 ohtsuka-qradar-target01 sshd[12460]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=192.168.2.65  user=root
Apr 24 12:52:18 ohtsuka-qradar-target01 sshd[12460]: Failed password for root from 192.168.2.65 port 58626 ssh2
Apr 24 12:52:21 ohtsuka-qradar-target01 sshd[12460]: Received disconnect from 192.168.2.65 port 58626:11: authentication cancelled [preauth]
```

QRadarで上記のログが監視できているかを確認します。
ログ・アクティビティータブから前回と同じようにフィルダーをかけます。
パラメーター：ペイロード
識別子：次である
値：Failed
これでフィルターの追加を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bad8ce57-88e2-4dae-bc17-0349210215d7.png)

関係するログが出てきます。
IPアドレスを元に対象のイベントを見つけます。
今回は青地で目立たせているのがそれになります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a8b6c9d7-ecf9-487a-9f7f-a0b103ad5280.png)

結果をスクショしたものが以下となります。マグニチュードは5となっており、中程度少し高めという印象です。
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-04-24-22_06_31.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/429a35be-f755-4faa-9fd7-1eed8415e196.png)

これの注釈をAIに食わせてみます。その結果が以下となります。
「そういうことね・・・」と勉強になります。

---

- 「コンテキストがローカルからローカルであるため、関連性を 8 増加させました」

  - 意味: 「社内から社内への通信（Local to Local）なので、警戒レベルを大幅に上げました」ということです。
  - なぜ点数が上がるのか:
通常、外部からの攻撃（インターネットから社内）はファイアウォールでブロックされることが前提ですが、「内部から内部」への攻撃試行は、すでに外壁を突破された後の「乗っ取り（ラテラルムーブメント）」や「内部不正」の可能性が高いため、QRadarはこれを非常に危険視し、点数を大きく（+8）加算します。

- 「送信元ネットワークの重みが低であるため、関連性を 2 減少させました」

  - 意味: 「攻撃元（192.168.2.65）がいる場所は、それほど重要なエリアではないので、少し点数を下げました」ということです。
  - 解説:
  QRadarの設定で、ネットワークごとに「重み（Weight）」を決められます。例えば「役員室のネットワーク」や「開発セグメント」などは重みを低く設定している場合があります。そこから発生したアラートなので、緊急性をわずかに（-2）下げたことを意味します。

- 「宛先ネットワークの重みが低であるため、関連性を 2 減少させました」

  - 意味: 「攻撃されているターゲット（172.18.250.105）は、機密情報が詰まった最重要サーバーではないので、少し点数を下げました」ということです。
  - 解説:
もし宛先が「顧客データベース」や「基幹システム」であれば、この重みは「高」になり、点数が加算されます。しかし、今回はターゲットが（QRadarの設定上）重要資産リストのトップではないため、優先順位をわずかに（-2）下げています。
---

### sudo失敗監視
今回監視しているサーバはLXCでこれはProxmoxだとrootユーザでSSHログインをするので、まずrootユーザ以外でSSH接続できる環境を整えます。

以下のコマンドでtestユーザを作成します。
```
root@ohtsuka-qradar-target01:~# adduser test
Adding user `test' ...
Adding new group `test' (1000) ...
Adding new user `test' (1000) with group `test' ...
Creating home directory `/home/test' ...
Copying files from `/etc/skel' ...
New password:
Retype new password:
passwd: password updated successfully
Changing the user information for test
Enter the new value, or press ENTER for the default
        Full Name []:
        Room Number []:
        Work Phone []:
        Home Phone []:
        Other []:
Is the information correct? [Y/n] Y
```

次のコマンドを実行して、sudoグループに追加します。
これでSSH接続後、sudoで意図的に失敗できる環境を作ることが出来ます。
```
root@ohtsuka-qradar-target01:~# usermod -aG sudo test
```

先程と同様にTeratermを使用して、監視対象のサーバのIPアドレスを指定します。
作成したユーザとパスワードを指定していきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/71d53e47-b752-4c86-817a-44813904168f.png)

ログイン後、sudo su -コマンドを実行して、適当にパスワードを失敗します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/22005b55-a3e0-423f-9371-fc3a21812d2a.png)

sudoでのパスワード失敗のログを確認してみます。
auth.logを確認してみると"Apr 25 15:29:28 ohtsuka-qradar-target01 sudo:     test : 3 incorrect password attempts ; TTY=pts/4 ; PWD=/home/test ; USER=root ;"とあり、しっかりパスワードミスが記録されていることがわかります。

```
test@ohtsuka-qradar-target01:~$ sudo su -
root@ohtsuka-qradar-target01:~# cat /var/log/auth.log

中略
sion opened for user test(uid=1000) by (uid=0)
Apr 25 15:29:10 ohtsuka-qradar-target01 systemd-logind[119]: New session 5942 of user test.
Apr 25 15:29:10 ohtsuka-qradar-target01 systemd: pam_unix(systemd-user:session): session opened for user test(uid=1000) by (uid=0)
Apr 25 15:29:19 ohtsuka-qradar-target01 sudo: pam_unix(sudo:auth): authentication failure; logname=test uid=1000 euid=0 tty=/dev/pts/4 ruser=test rhost=  user=test
Apr 25 15:29:28 ohtsuka-qradar-target01 sudo:     test : 3 incorrect password attempts ; TTY=pts/4 ; PWD=/home/test ; USER=root ; COMMAND=/usr/bin/su -
Apr 25 15:30:10 ohtsuka-qradar-target01 sudo:     test : TTY=pts/4 ; PWD=/home/test ; USER=root ; COMMAND=/usr/bin/su -
Apr 25 15:30:10 ohtsuka-qradar-target01 sudo: pam_limits(sudo:session): Could not set limit for 'core' to soft=0, hard=-1: Operation not permitted; uid=1000,euid=0
Apr 25 15:30:10 ohtsuka-qradar-target01 sudo: pam_unix(sudo:session): session opened for user root(uid=0) by test(uid=1000)
Apr 25 15:30:10 ohtsuka-qradar-target01 su: (to root) root on pts/5
Apr 25 15:30:10 ohtsuka-qradar-target01 su: pam_limits(su-l:session): Could not set limit for 'core' to soft=0, hard=-1: Operation not permitted; uid=0,euid=0
Apr 25 15:30:10 ohtsuka-qradar-target01 su: pam_unix(su-l:session): session opened for user root(uid=0) by test(uid=0)
```

いつも通りQRadarのログ・アクティビティーからフィルターを追加していきます。
パラメーター：ペイロード
識別子：次である
値：incorrect password
これでフィルターの追加を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/310e5126-4e24-43ed-ae9e-46ed514f4688.png)

一覧を出すと1件ヒットしていることがわかります
特権（root）のエスカレーションに失敗と出ており、正しく検知しているように見えます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/46fdad17-ba40-440d-a2a9-00cf57d93250.png)

中身を見てみます。マグニチュードが先ほどより高い7になっていることがわかります。
![screencapture-172-18-250-163-console-qradar-jsp-QRadar-jsp-2026-04-26-00_37_37.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9efca785-79a1-45d7-96ef-43c2e33cfbad.png)

AIにこの結果をかませたところ、以下のような回答を示しました。
セキュリティの勉強になる素晴らしい回答だと感心してます（）

---
| 項目 | スコア | 意味と今回の評価 |
| :--- | :---: | :--- |
| **関連性 (Relevance)** | **10 / 10** | **【極めて高い】** 攻撃対象がネットワーク上の重要な資産（アセット）であることを示します。ログに「宛先アセットが存在するためスコアを8増加」とあり、守るべき重要なサーバーが狙われたため、評価が最大値になっています。 |
| **信頼性 (Credibility)** | **10 / 10** | **【極めて高い】** ログの正確性です。LinuxサーバーのOS標準ログからの報告であるため、誤検知（誤報）の可能性がほぼゼロであると判断されています。 |
| **重大度 (Severity)** | **3 / 10** | **【低い】** イベント自体の危険度です。今回は「権限昇格の失敗（Privilege Escalation Failed）」であるため、現時点で実害（乗っ取り成功）は発生していないことから、低めに設定されています。 |


**どのように対応すべきか？**
マグニチュード7は、SOC（セキュリティ運用センター）などの基準では「当日中に調査を完了させるべきレベル」に相当することが多いです。

- **管理者のうっかりミスの場合:**
担当者が test ユーザーでログインし、rootパスワードを度忘れして何度か試しただけであれば、セキュリティ上の問題はありません。
- **警戒すべきケース:**
もし test ユーザーが root 権限を持つべきでない人物であったり、外部から乗っ取られたアカウントである場合、これは「権限昇格（Privilege Escalation）」を狙った攻撃の予兆です。攻撃者が次のステップ（システム全体の掌握）に進もうとしている段階と言えます。
- **推奨されるアクション:**
  - 本人確認: test ユーザーの利用者に、この時間に操作を行ったか確認する。
  - 継続監視: 同じユーザーから、他のサーバーに対しても同様の試行が行われていないか確認する。
  - 設定確認: 本来 root になる必要のないユーザーであれば、su や sudo の実行権限を制限することを検討してください。
---

## 今回確認した監視項目とマグニチュードまとめ

| 監視項目 | 検知イベント名 | マグニチュード | QRadarの判断理由（ポイント） |
| :--- | :--- | :---: | :--- |
| **SSH失敗** | Login Failed | 5 | 内部通信(L2L)のため警戒。ただし実害なし。 |
| **sudo失敗** | Privilege Escalation Failed | 7 | **重要資産**への権限昇格試行。信頼性が高く、攻撃の予兆として危険視。 |


# 感想
セキュリティの話で、攻撃者がログを消すなどの改竄について話が上がることがありますが、SIEMなどでリアルタイムでログ連携をしていると改竄する前に連携されるので難易度が跳ね上がりそうだなと思いました。SIEMを導入せずにローカルだけで管理していると改竄等はどうしてもされやすくなるだろうなと感じました。

