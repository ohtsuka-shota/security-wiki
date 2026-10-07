---
title: "iptablesを使った簡単なファイアウォール設定方法"
date: 2025-02-16
tags: ["tool", "Ubuntu", "iptables", "Firewall", "LPIC303"]
source: "https://qiita.com/ohtsuka-shota/items/7e168e7507d60ff6fd0f"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

この記事では、Linuxのファイアウォールツールである**iptables**を使って、簡単なファイアウォール設定を行う方法を解説します。特に、HTTP通信を拒否する設定を例に取り上げ、設定の保存や永続化の方法についても触れます。
OSはubuntuの22.04を使っています。
iptablesは色々コマンドが複雑かなぁと思うので、簡単な例でもいいので、設定をしてみるとイメージしやすくなるような気がします。

### **1. iptablesの基本操作**

まず、現在のiptablesの設定状況を確認します。以下のコマンドを実行すると、現在のルールセットが表示されます。

```bash
iptables -L -v
```

出力例：

```
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
```

この例では、特にルールが設定されていないことが分かります。

### **2. HTTP通信を拒否するルールを追加**

次に、HTTP通信（ポート80）を拒否するルールを追加します。以下のコマンドを実行してください。

```bash
iptables -A INPUT -p tcp --dport 80 -j REJECT
```

再度ルールを確認すると、追加されたことが分かります。

```bash
iptables -L INPUT
```

出力例：

```
Chain INPUT (policy ACCEPT)
target     prot opt source               destination
REJECT     tcp  --  anywhere             anywhere             tcp dpt:http reject-with icmp-port-unreachable
```

この状態でWebブラウジングを試みると、HTTP通信が拒否されていることを確認できます。

### **3. 設定の永続化**

iptablesの設定は、デフォルトでは再起動後に消えてしまいます。そのため、設定を保存して永続化する必要があります。

#### **3.1 iptables-saveを使用**

以下のコマンドで現在の設定を保存します。

```bash
iptables-save -c > /etc/iptables.rules
```

保存した設定を復元するには、以下のコマンドを使用します。

```bash
iptables-restore < /etc/iptables.rules
```

#### **3.2 iptables-persistentを使用**

`iptables-persistent`をインストールすることで、再起動後も設定を自動的に復元できます。

```bash
apt install -y iptables-persistent
netfilter-persistent save
```

再起動後に設定が残っているか確認します。

```bash
iptables -L INPUT
```

### **4. ルールの削除**

ルールを削除する場合、以下の手順を実行します。

#### **4.1 全ルールを削除**

すべてのルールを削除するには、以下のコマンドを使用します。

```bash
iptables -F INPUT
```

#### **4.2 特定のルールを削除**

特定のルールだけを削除する場合、まずルール番号を確認します。

```bash
iptables -L INPUT -n --line-numbers
```

出力例：

```
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
1    REJECT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:80 reject-with icmp-port-unreachable
```

ルール番号を指定して削除します。

```bash
iptables -D INPUT 1
```

### **まとめ**

iptablesを使えば、簡単にファイアウォールの設定が可能です。本記事では、HTTP通信を拒否する設定を例に、基本的な操作から設定の永続化、ルールの削除方法までを解説しました。セキュリティを強化するために、iptablesを活用してみてください！

