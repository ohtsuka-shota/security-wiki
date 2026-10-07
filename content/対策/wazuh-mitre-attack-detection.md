---
title: "Wazuhでサーバ監視：UbuntuへAgent導入とMITRE ATT&CKによる検知確認"
date: 2026-05-03
tags: ["countermeasure", "Ubuntu", "Security", "SIEM", "Wazuh", "MITRE-ATT&CK"]
source: "https://qiita.com/ohtsuka-shota/items/6ac01f5fbe3fbc010bad"
---
以前作成したWazuhを使ってサーバの監視を行ってみたいと思います。

[[wazuh-deploy-proxmox]]

Ubuntu22.04のLXCにAgentを導入して監視できるか確認してみます。
導入するLXCのOS情報
```
root@ohtsuka-qradar-target01:~# cat /etc/os-release
PRETTY_NAME="Ubuntu 22.04.5 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.5 LTS (Jammy Jellyfish)"
VERSION_CODENAME=jammy
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=jammy
```

# 公式サイト

https://documentation.wazuh.com/current/installation-guide/wazuh-agent/index.html

# 用語
## MITRE ATT&CK（マイター・アタック）
実際のサイバー攻撃で使われる「攻撃の手口」を、誰でも共通の言葉で話せるように体系化した世界標準のデータベース（百科事典）です。「初期侵入」から「データの持ち出し」まで、攻撃の各段階で使われる具体的な手法にID（T1110など）を振って整理しており、これを使うことで「今、攻撃がどの段階まで進んでいるか」を客観的に把握できるようになります。

https://attack.mitre.org/

# 手順
## Agent導入
必要なパッケージをインストールします。
```
root@ohtsuka-qradar-target01:~# apt-get install gnupg apt-transport-https 
root@ohtsuka-qradar-target01:~#apt-get install curl
```

リポジトリの安全性を確認するためのキーを登録します。
```
root@ohtsuka-qradar-target01:~# curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
gpg: directory '/root/.gnupg' created
gpg: /root/.gnupg/trustdb.gpg: trustdb created
gpg: key 96B3EE5F29111145: public key "Wazuh.com (Wazuh Signing Key) <support@wazuh.com>" imported
gpg: Total number processed: 1
gpg:               imported: 1
```

リポジトリを追加して、反映します。
```
root@ohtsuka-qradar-target01:~# echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee -a /etc/apt/sources.list.d/wazuh.list
deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main
root@ohtsuka-qradar-target01:~# apt-get update
```

この後にWazuh Agentをインストールします。
IPアドレスはWazuhを稼働させているServerのIPアドレスを指定します。
```
root@ohtsuka-qradar-target01:~# WAZUH_MANAGER="172.18.251.124" apt-get install wazuh-agent
```

Wazuh Agentを起動します。
```
root@ohtsuka-qradar-target01:~# systemctl daemon-reload
root@ohtsuka-qradar-target01:~# systemctl enable wazuh-agent
root@ohtsuka-qradar-target01:~# systemctl start wazuh-agent
root@ohtsuka-qradar-target01:~# systemctl status wazuh-agent
* wazuh-agent.service - Wazuh agent
     Loaded: loaded (/lib/systemd/system/wazuh-agent.service; enabled; vendor preset: enabled)
     Active: active (running) since Sat 2026-05-02 14:41:15 UTC; 9s ago
    Process: 2395 ExecStart=/usr/bin/env /var/ossec/bin/wazuh-control start (code=exited, status=0/SUCCESS)
      Tasks: 29 (limit: 288785)
     Memory: 28.5M
        CPU: 1.927s
     CGroup: /system.slice/wazuh-agent.service
             |-2417 /var/ossec/bin/wazuh-execd
             |-2425 /var/ossec/bin/wazuh-agentd
             |-2438 /var/ossec/bin/wazuh-syscheckd
             |-2448 /var/ossec/bin/wazuh-logcollector
             `-2465 /var/ossec/bin/wazuh-modulesd

May 02 14:41:10 ohtsuka-qradar-target01 systemd[1]: Starting Wazuh agent...
May 02 14:41:10 ohtsuka-qradar-target01 env[2395]: Starting Wazuh v4.14.5...
May 02 14:41:10 ohtsuka-qradar-target01 env[2395]: Started wazuh-execd...
May 02 14:41:11 ohtsuka-qradar-target01 env[2395]: Started wazuh-agentd...
May 02 14:41:11 ohtsuka-qradar-target01 env[2395]: Started wazuh-syscheckd...
May 02 14:41:12 ohtsuka-qradar-target01 env[2395]: Started wazuh-logcollector...
May 02 14:41:13 ohtsuka-qradar-target01 env[2395]: Started wazuh-modulesd...
May 02 14:41:15 ohtsuka-qradar-target01 env[2395]: Completed.
May 02 14:41:15 ohtsuka-qradar-target01 systemd[1]: Started Wazuh agent.
````

Wazuhにアクセスします。
Agent Summaryの部分でActiveが1になっていることを確認します。
この部分は押下可能になっているので、押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c65e8ad9-f57e-4219-95ec-3edab022c222.png)

先程Wazuh Agentをインストール＆起動したLXCが表示されていることを確認します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/07fccbfe-b995-454a-89ea-f1a411752939.png)

## confを修正してログ監視する
ossec.confを修正してログ監視の設定を入れます。
ossec.confのバックアップを取得します。
```
root@ohtsuka-qradar-target01:~# cd /var/ossec/etc
root@ohtsuka-qradar-target01:/var/ossec/etc# ls -ltr
total 228
-rw-r----- 1 root  wazuh   114 Mar 19 14:04 localtime
-rw-r----- 1 root  wazuh  1367 Apr 16 12:49 wpk_root.pem
-rw-r----- 1 root  wazuh   320 Apr 16 12:49 local_internal_options.conf
-rw-r----- 1 root  wazuh 14961 Apr 16 12:49 internal_options.conf
-rw-rw---- 1 root  wazuh  5604 May  2 14:39 ossec.conf
-rw-r----- 1 wazuh wazuh    97 May  2 14:41 client.keys
drwxrwx--- 2 root  wazuh    26 May  2 14:41 shared
root@ohtsuka-qradar-target01:/var/ossec/etc# cp -p ossec.conf ossec.conf.org
```

設定を修正します。
下の方に追加すればいいと思います。設定を追加した後wazuh-agentを再起動して、設定ファイルを反映します。
※後からわかったのですが、これ修正しなくても今回の内容はServer側で検知できそうです。Wazuh Agentのデフォルト設定では、主要なOS（Ubuntu等）において /var/log/auth.logや/var/log/syslog は最初から監視対象に含まれていることが多いためです。
```
root@ohtsuka-qradar-target01:/var/ossec/etc# nano ossec.conf
root@ohtsuka-qradar-target01:/var/ossec/etc# sdiff ossec.conf ossec.conf.org
中略
  <localfile>                                                     <localfile>
    <log_format>syslog</log_format>                                 <log_format>syslog</log_format>
    <location>/var/log/dpkg.log</location>                          <location>/var/log/dpkg.log</location>
  </localfile>                                                    </localfile>

  <localfile>                                                 <
    <log_format>syslog</log_format>                           <
    <location>/var/log/auth.log</location>                    <
  </localfile>                                                <
                                                              <
</ossec_config>                                                 </ossec_config>

root@ohtsuka-qradar-target01:/var/ossec/etc#
root@ohtsuka-qradar-target01:/var/ossec/etc# systemctl restart wazuh-agent
```

## 動作確認テスト
sudoコマンドの失敗とSSH接続の失敗をテストしてみます。
テストの仕方は以下と同様に行います。

[[qradar-ssh-sudo-failure-monitoring]]

まずはSSHの接続失敗
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/420bb209-019e-44fc-93f8-8f537f784263.png)

次にsudo su -の失敗
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/5e86bfca-657f-4cde-9930-95a5c10a5884.png)

Wazuhで確認します。Medium Severityの数字の部分を押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1a305179-58eb-4b20-bbb7-bb219aef0d07.png)

このような画面が開きます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a2109412-cfc6-4d5a-84ab-236724c1af99.png)

sudoという文字列を検索スペースのところに入力してEnterを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/4f84945f-a172-49d5-9bb6-07972b2ca4e8.png)

sudoのところがハイライトされて、sudo失敗に関連する情報をWazuhサーバが検知していることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b362c010-6210-4cbc-ac81-8289b0c7a5d5.png)

SSHの方は今回はLow Severityの数字の部分を押下して確認できました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1a305179-58eb-4b20-bbb7-bb219aef0d07.png)

sshと検索をかけると"PAM: User login failed. rule.groups:pam, syslog, authentication_failed"と認証システムがエラーを吐いていることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0530806b-caa3-425c-8c4a-bef0334c01b0.png)

## 動作確認テスト（MITRE ATT&CK）
ちなみに、このタイミングでThreat intelligenceのMITRE ATT&CK（マイター・アタック）をクリックします。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0fd84d54-54c4-46ef-8891-d6e6f84fe576.png)

Password Guessing（sudo su -でのパスワード失敗をこれと理解している）やSSH失敗などを攻撃と判断しているように見えます。
左下のAttacks by Techniqueでは攻撃者がどういう手口（≒テクニック）を使って攻撃しているかというのが視覚的にわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/47f3a323-9e84-4073-a9e9-40368fd9c817.png)

Eventsタブを見ても、sudo失敗やSSH失敗などを検知していることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1a033c36-f880-4fe2-b137-54e76a41416d.png)

## 何がわかるのか

AIに噛ませてみたところ、rule.mitre.idの部分で以下のストーリーがわかるようです。勉強しないとダメですね。。。

**攻撃のストーリーが見える:**
- T1110.001 (Credential Access): ログインを試みて失敗している（パスワード推測）。
- T1548.003 (Privilege Escalation): ログイン後に sudo を使って管理者権限を得ようとして失敗している。
- T1078 (Valid Accounts): ログインに成功した記録（正規のログイン、または攻撃が成功した可能性）。

| 検知した事象 | MITRE ID | テクニック名 | 攻撃者の意図 |
| :--- | :--- | :--- | :--- |
| SSHログイン失敗 | T1110.001 | Brute Force: Password Guessing | 外部からの侵入試行 |
| sudo 失敗 | T1548.003 | Abuse Elevation Control Mechanism | 侵入後の権限昇格試行 |
| 成功したログイン | T1078 | Valid Accounts | 正規アカウントの悪用確認 |


MITRE ATT&CKの公式サイトを探すと番号で引っ掛かるので、調べ方は覚えておいて損は無さそう。。。

https://attack.mitre.org/techniques/T1548/003/

Wazuhでブロッキングとかの処理ができるっぽいので今後勉強してみたい。

