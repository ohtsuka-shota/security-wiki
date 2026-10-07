---
title: "Wazuh Active Responseによるリアルタイム防御 -firewall-dropによるSSH攻撃ブロック-"
date: 2026-05-03
tags: ["countermeasure", "SSH", "Security", "初心者", "SIEM", "Wazuh"]
source: "https://qiita.com/ohtsuka-shota/items/52c35b89ad76be6224fb"
---
これの続きを行っていきます。
SSHログイン失敗を契機に、アクセスを試みようとしたIPアドレスからのアクセスを一時的にブロックする設定をWazuhに設定して動作確認をしていきたいと思います。

[[wazuh-mitre-attack-detection]]

# 用語
## Wazuh Active Response
「検知した脅威に対して、リアルタイムで自動反撃（防御）を行う機能」のこと。
**具体的には:**
- ファイアウォールルールの追加/削除
- プロセスの強制終了
- アカウントの無効化
- カスタムスクリプトの実行

などを、**人間の操作なし**で自動実行します。

>セキュリティチームが特定のトリガーに基づいて対応アクションを自動化することで、セキュリティインシデントを効果的に管理できるようになります。
>Wazuh Active Responseモジュールは、特定のルールID、レベル、またはルールグループのアラートがトリガーされたときに、監視対象のエンドポイントでこれらのスクリプトを実行します。

https://documentation.wazuh.com/current/user-manual/capabilities/active-response/index.html

# 手順
## Manager側設定
設定ファイル /var/ossec/etc/ossec.confを編集します。
IPを遮断するスクリプト（firewall-drop）を指定しつつ、「レベル5以上の認証失敗（SSH等）が起きた時、30分間（1800秒）遮断する」という設定を入れます。
- 5710: 存在しないユーザーでのログイン試行
- 5712: 認証失敗
- 5716: 複数回の認証失敗
```
root@wazuh:~# cd /var/ossec/etc/
root@wazuh:/var/ossec/etc# vi ossec.conf
root@wazuh:/var/ossec/etc# cat ossec.conf

中略

  <command>
    <name>firewall-drop</name>
    <executable>firewall-drop</executable>
    <timeout_allowed>yes</timeout_allowed>
  </command>

  <active-response>
    <command>firewall-drop</command>
    <location>local</location> <!-- 事前定義したcommandを指定 -->
    <rules_id>5712,5710,5716</rules_id> <!-- SSH失敗に関連するルールID -->
    <timeout>1800</timeout> <!-- 30分間遮断 -->
  </active-response>

</ossec_config>
```

設定を反映するためにwazuhを再起動します。
```
root@wazuh:/var/ossec/etc# systemctl restart wazuh-manager
root@wazuh:/var/ossec/etc# systemctl status wazuh-manager
● wazuh-manager.service - Wazuh manager
     Loaded: loaded (/usr/lib/systemd/system/wazuh-manager.service; enabled; pr>
     Active: active (running) since Sun 2026-05-03 05:17:22 UTC; 12s ago
    Process: 12965 ExecStart=/usr/bin/env /var/ossec/bin/wazuh-control start (c>
      Tasks: 229 (limit: 9431)
     Memory: 256.7M (peak: 258.9M)
        CPU: 42.576s
     CGroup: /system.slice/wazuh-manager.service
```

## 動作確認
Teratermを使ってアクセスを試行します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/6fd586d7-ad09-4aea-87b0-ed1c8a5a3d00.png)

何度か失敗してみると、相手から反応が無くなりタイムアウトするようになりました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/bd1bf143-e067-40a2-b5c6-2a831aaba569.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/c0648d30-0a1b-4372-ab4b-61e4ff357ee7.png)

Wazuh画面上でもアクセス試行を検知していることがわかります。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/aed563aa-bfe9-41e0-93a9-4d781cc9e49a.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/93f63a90-5413-4471-b1bf-57d52f37954e.png)

Explore > Discoverの順で遷移して、検索タブのところで"firewall-drop"と入力して検索をかけます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/9dc6f9a9-9c4c-4948-9aa5-85076dad8290.png)

出てきているログをJSON形式で開くと以下の用なデータがあることがわかります。
```
{
  "_index": "wazuh-alerts-4.x-2026.05.03",
  "_id": "AMpL7J0BLHKiejJYKzLm",
  "_version": 1,
  "_score": null,
  "_source": {
    "input": {
      "type": "log"
    },
    "agent": {
      "ip": "172.18.250.105",
      "name": "ohtsuka-qradar-target01",
      "id": "001"
    },
    "manager": {
      "name": "wazuh"
    },
    "data": {
      "srcip": "192.168.2.65",
      "origin": {
        "module": "wazuh-execd",
        "name": "node01"
      },
      "version": "1",
      "parameters": {
        "alert": {
          "predecoder": {
            "hostname": "ohtsuka-qradar-target01",
            "program_name": "sshd",
            "timestamp": "May 03 05:23:56"
          },
          "agent": {
            "ip": "172.18.250.105",
            "name": "ohtsuka-qradar-target01",
            "id": "001"
          },
          "manager": {
            "name": "wazuh"
          },
          "data": {
            "srcuser": "ke",
            "srcip": "192.168.2.65",
            "srcport": "10013"
          },
          "rule": {
            "mail": "false",
            "level": "5",
            "hipaa": [
              "164.312.b"
            ],
            "pci_dss": [
              "10.2.4",
              "10.2.5",
              "10.6.1"
            ],
            "tsc": [
              "CC6.1",
              "CC6.8",
              "CC7.2",
              "CC7.3"
            ],
            "description": "sshd: Attempt to login using a non-existent user",
            "groups": [
              "syslog",
              "sshd",
              "authentication_failed",
              "invalid_login"
            ],
            "nist_800_53": [
              "AU.14",
              "AC.7",
              "AU.6"
            ],
            "gdpr": [
              "IV_35.7.d",
              "IV_32.2"
            ],
            "firedtimes": "4",
            "mitre": {
              "technique": [
                "Password Guessing",
                "SSH"
              ],
              "id": [
                "T1110.001",
                "T1021.004"
              ],
              "tactic": [
                "Credential Access",
                "Lateral Movement"
              ]
            },
            "id": "5710",
            "gpg13": [
              "7.1"
            ]
          },
          "location": "journald",
          "id": "1777785836.81536",
          "decoder": {
            "parent": "sshd",
            "name": "sshd"
          },
          "timestamp": "2026-05-03T05:23:56.662+0000",
          "full_log": "May 03 05:23:56 ohtsuka-qradar-target01 sshd[6854]: Invalid user ke from 192.168.2.65 port 10013"
        },
        "extra_args": [],
        "program": "active-response/bin/firewall-drop"
      },
      "command": "add"
    },
    "rule": {
      "firedtimes": 3,
      "mail": false,
      "level": 3,
      "pci_dss": [
        "11.4"
      ],
      "tsc": [
        "CC6.1",
        "CC6.8",
        "CC7.2",
        "CC7.3",
        "CC7.4"
      ],
      "description": "Host Blocked by firewall-drop Active Response",
      "groups": [
        "ossec",
        "active_response"
      ],
      "id": "651",
      "nist_800_53": [
        "SI.4"
      ],
      "gpg13": [
        "4.13"
      ],
      "gdpr": [
        "IV_35.7.d"
      ]
    },
    "location": "/var/ossec/logs/active-responses.log",
    "decoder": {
      "parent": "ar_log_json",
      "name": "ar_log_json"
    },
    "id": "1777785838.82076",
    "full_log": "2026/05/03 05:23:56 active-response/bin/firewall-drop: {\"version\":1,\"origin\":{\"name\":\"node01\",\"module\":\"wazuh-execd\"},\"command\":\"add\",\"parameters\":{\"extra_args\":[],\"alert\":{\"timestamp\":\"2026-05-03T05:23:56.662+0000\",\"rule\":{\"level\":5,\"description\":\"sshd: Attempt to login using a non-existent user\",\"id\":\"5710\",\"mitre\":{\"id\":[\"T1110.001\",\"T1021.004\"],\"tactic\":[\"Credential Access\",\"Lateral Movement\"],\"technique\":[\"Password Guessing\",\"SSH\"]},\"firedtimes\":4,\"mail\":false,\"groups\":[\"syslog\",\"sshd\",\"authentication_failed\",\"invalid_login\"],\"gdpr\":[\"IV_35.7.d\",\"IV_32.2\"],\"gpg13\":[\"7.1\"],\"hipaa\":[\"164.312.b\"],\"nist_800_53\":[\"AU.14\",\"AC.7\",\"AU.6\"],\"pci_dss\":[\"10.2.4\",\"10.2.5\",\"10.6.1\"],\"tsc\":[\"CC6.1\",\"CC6.8\",\"CC7.2\",\"CC7.3\"]},\"agent\":{\"id\":\"001\",\"name\":\"ohtsuka-qradar-target01\",\"ip\":\"172.18.250.105\"},\"manager\":{\"name\":\"wazuh\"},\"id\":\"1777785836.81536\",\"full_log\":\"May 03 05:23:56 ohtsuka-qradar-target01 sshd[6854]: Invalid user ke from 192.168.2.65 port 10013\",\"predecoder\":{\"program_name\":\"sshd\",\"timestamp\":\"May 03 05:23:56\",\"hostname\":\"ohtsuka-qradar-target01\"},\"decoder\":{\"parent\":\"sshd\",\"name\":\"sshd\"},\"data\":{\"srcip\":\"192.168.2.65\",\"srcport\":\"10013\",\"srcuser\":\"ke\"},\"location\":\"journald\"},\"program\":\"active-response/bin/firewall-drop\"}}",
    "timestamp": "2026-05-03T05:23:58.577+0000"
  },
  "fields": {
    "timestamp": [
      "2026-05-03T05:23:58.577Z"
    ]
  },
  "highlight": {
    "full_log": [
      "2026/05/03 05:23:56 active-response/bin/@opensearch-dashboards-highlighted-field@firewall@/opensearch-dashboards-highlighted-field@-@opensearch-dashboards-highlighted-field@drop@/opensearch-dashboards-highlighted-field@: {\"version\":1,\"origin\":{\"name\":\"node01\",\"module\":\"wazuh-execd\"},\"command\":\"add\",\"parameters\":{\"extra_args\":[],\"alert\":{\"timestamp\":\"2026-05-03T05:23:56.662+0000\",\"rule\":{\"level\":5,\"description\":\"sshd: Attempt to login using a non-existent user\",\"id\":\"5710\",\"mitre\":{\"id\":[\"T1110.001\",\"T1021.004\"],\"tactic\":[\"Credential Access\",\"Lateral Movement\"],\"technique\":[\"Password Guessing\",\"SSH\"]},\"firedtimes\":4,\"mail\":false,\"groups\":[\"syslog\",\"sshd\",\"authentication_failed\",\"invalid_login\"],\"gdpr\":[\"IV_35.7.d\",\"IV_32.2\"],\"gpg13\":[\"7.1\"],\"hipaa\":[\"164.312.b\"],\"nist_800_53\":[\"AU.14\",\"AC.7\",\"AU.6\"],\"pci_dss\":[\"10.2.4\",\"10.2.5\",\"10.6.1\"],\"tsc\":[\"CC6.1\",\"CC6.8\",\"CC7.2\",\"CC7.3\"]},\"agent\":{\"id\":\"001\",\"name\":\"ohtsuka-qradar-target01\",\"ip\":\"172.18.250.105\"},\"manager\":{\"name\":\"wazuh\"},\"id\":\"1777785836.81536\",\"full_log\":\"May 03 05:23:56 ohtsuka-qradar-target01 sshd[6854]: Invalid user ke from 192.168.2.65 port 10013\",\"predecoder\":{\"program_name\":\"sshd\",\"timestamp\":\"May 03 05:23:56\",\"hostname\":\"ohtsuka-qradar-target01\"},\"decoder\":{\"parent\":\"sshd\",\"name\":\"sshd\"},\"data\":{\"srcip\":\"192.168.2.65\",\"srcport\":\"10013\",\"srcuser\":\"ke\"},\"location\":\"journald\"},\"program\":\"active-response/bin/@opensearch-dashboards-highlighted-field@firewall@/opensearch-dashboards-highlighted-field@-@opensearch-dashboards-highlighted-field@drop@/opensearch-dashboards-highlighted-field@\"}}"
    ]
  },
  "sort": [
    1777785838577
  ]
}
```

このログをAIに噛ませてみると以下の事が書かれているようです。
| 項目 | 内容 | JSON内の場所 |
| :--- | :--- | :--- |
| **防御アクション** | Host Blocked (遮断完了) | `rule.description` |
| **攻撃者のIP** | 192.168.2.65 | `data.srcip` |
| **攻撃対象サーバー** | ohtsuka-qradar-target01 | `agent.name` |
| **ブロックの理由** | 存在しないユーザー(ke)でのログイン試行 | `data.parameters.alert.rule.description` |
| **実行コマンド** | firewall-drop (ファイアウォール遮断) | `data.parameters.program` |

慣れが必要だと思いますが、JSONでわざわざ出力せずともWazuhの画面上から確認できます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d793edd9-d32d-44d7-b7fb-b22d07a871ff.png)

## iptablesでのブロック確認

攻撃を受けたサーバ上で`iptables -L -n`を実行すると、DROPのルールが追加されていることがわかります。

```
root@ohtsuka-qradar-target01:~# iptables -L -n
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         
DROP       all  --  192.168.2.65         0.0.0.0/0
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/042d0d2a-aa39-470c-a83c-1d55dd3c38b4.png)

firewall-dropというスクリプトがキックされてiptablesにIPアドレスが自動で入力されてブロックする環境が作られる、という事なんですね。
1. Wazuh Agentがログを検知
1. Wazuh Managerがルール（5710/5712/5716）にマッチ
1. Active Responseがfirewall-dropスクリプトを実行
1. スクリプトがiptablesにDROPルールを追加
1. 30分後、自動的にルールを削除（timeout設定による）

