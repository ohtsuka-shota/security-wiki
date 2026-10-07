---
title: "ubuntu22.04にFreeRADIUSをインストールする"
date: 2025-02-17
tags: ["tool", "Ubuntu", "Security", "RADIUS", "freeradius"]
source: "https://qiita.com/ohtsuka-shota/items/14088ac25b4e5abe92fe"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

この記事ではFreeRADIUSをubuntu22.04上に構築する手順を記載していきたいと思います。

# 手順
まず、MySQLをインストールしていきます。
MySQLをインストールした後に実行する`mysql_secure_installation`は、MySQLデータベースのセキュリティを強化するためのスクリプトです。このコマンドを実行することで、以下のようなセキュリティ設定を行うことができます。

この`mysql_secure_installation`スクリプトで行っていることは以下のようなことになります。
- rootパスワードの設定: MySQLのrootユーザーにパスワードを設定するか、既存のパスワードを変更します。
- 匿名ユーザーの削除: デフォルトで存在する匿名ユーザーアカウントを削除することで、セキュリティを向上させます。
- リモートアクセスの制限: rootユーザーがリモートからアクセスできるのを防ぎ、ローカルホストからのみアクセスできるようにします。
- テストデータベースの削除: デフォルトで存在するテスト用のデータベースを削除し、不要なアクセスを防ぎます。
- 権限の再読み込み: 設定変更を反映させるために、権限テーブルを再読み込みします。
このコマンドは、MySQLを新たにインストールした後やセキュリティを強化したい場合に実行することが推奨されます。実行することで、データベースのセキュリティが向上し、悪意のある攻撃から保護される可能性が高まります。

```
root@radius:~# apt -y install mysql-server
root@radius:~# mysql_secure_installation

Securing the MySQL server deployment.

Connecting to MySQL using a blank password.

VALIDATE PASSWORD COMPONENT can be used to test passwords
and improve security. It checks the strength of password
and allows the users to set only those passwords which are
secure enough. Would you like to setup VALIDATE PASSWORD component?

Press y|Y for Yes, any other key for No: Y

There are three levels of password validation policy:

LOW    Length >= 8
MEDIUM Length >= 8, numeric, mixed case, and special characters
STRONG Length >= 8, numeric, mixed case, special characters and dictionary                  file

Please enter 0 = LOW, 1 = MEDIUM and 2 = STRONG: 0

Skipping password set for root as authentication with auth_socket is used by default.
If you would like to use password authentication instead, this can be done with the "ALTER_USER" command.
See https://dev.mysql.com/doc/refman/8.0/en/alter-user.html#alter-user-password-management for more information.

By default, a MySQL installation has an anonymous user,
allowing anyone to log into MySQL without having to have
a user account created for them. This is intended only for
testing, and to make the installation go a bit smoother.
You should remove them before moving into a production
environment.

Remove anonymous users? (Press y|Y for Yes, any other key for No) : No

 ... skipping.


Normally, root should only be allowed to connect from
'localhost'. This ensures that someone cannot guess at
the root password from the network.

Disallow root login remotely? (Press y|Y for Yes, any other key for No) : Yes
Success.

By default, MySQL comes with a database named 'test' that
anyone can access. This is also intended only for testing,
and should be removed before moving into a production
environment.


Remove test database and access to it? (Press y|Y for Yes, any other key for No) : No

 ... skipping.
Reloading the privilege tables will ensure that all changes
made so far will take effect immediately.

Reload privilege tables now? (Press y|Y for Yes, any other key for No) : Yes
Success.

All done!
```
次にFreeRADIUSをインストールしていきます。
インストール後、freeradius -Xを実行し"Ready to process requests"と出力されていればここではいったん大丈夫です。
このコマンドとオプションはFreeRADIUSをデバックモードで起動するものになります。
```
root@radius:~# apt -y install freeradius freeradius-mysql freeradius-utils
root@radius:~# systemctl stop freeradius
root@radius:~# freeradius -X
FreeRADIUS Version 3.0.26
Copyright (C) 1999-2021 The FreeRADIUS server project and contributors
～中略～
Ready to process requests
```
次に、MySQLにFreeRADIUS用のデータベースとかDB操作用のユーザ等を作成していきます。
```
root@radius:~# mysql -u root -p
Enter password:
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 10
Server version: 8.0.41-0ubuntu0.22.04.1 (Ubuntu)

Copyright (c) 2000, 2025, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> CREATE DATABASE radius;
Query OK, 1 row affected (0.01 sec)

mysql> CREATE USER 'radius'@'localhost' IDENTIFIED BY 'password';
Query OK, 0 rows affected (0.05 sec)

mysql> GRANT ALL PRIVILEGES ON radius.* TO 'radius'@'localhost';
Query OK, 0 rows affected (0.01 sec)

mysql> FLUSH PRIVILEGES;
Query OK, 0 rows affected (0.02 sec)

mysql> quit;
Bye
```
上記で設定したものとFreeRADIUSが用意してくれたスキーマを使ってDBにテーブルを作成していきます。`/etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql`を使うのですが、これをcatで見てみるとSQL文でテーブルを作成していることが見て取れます。

実行した`mysql -u root -p radius < /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql`コマンドの意味は以下のようになります。

1. **`mysql`**: MySQLのコマンドラインクライアントを呼び出しています。
2. **`u root`**: `u` オプションはユーザー名を指定します。この場合、`root` ユーザーとして MySQL に接続しようとしています。
3. **`p`**: このオプションはパスワードを指定するためのもので、コマンドを実行するとパスワードの入力を求められます。
4. **`radius`**: 接続先のデータベース名です。この場合、`radius` という名前のデータベースに接続します。
5. **`< /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql`**: これはリダイレクトの構文です。`schema.sql` というファイルの内容を MySQL に入力（実行）することを意味します。

作成後、改めradiusというデータベースに様々なテーブルが作成されていることを確認します。
```
root@radius:~# mysql -u root -p radius < /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql
Enter password:
root@radius:~# mysql -u root -p
Enter password:
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 13
Server version: 8.0.41-0ubuntu0.22.04.1 (Ubuntu)

Copyright (c) 2000, 2025, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| radius             |
| sys                |
+--------------------+
5 rows in set (0.00 sec)

mysql> use radius;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed

mysql> show tables;
+------------------+
| Tables_in_radius |
+------------------+
| nas              |
| radacct          |
| radcheck         |
| radgroupcheck    |
| radgroupreply    |
| radpostauth      |
| radreply         |
| radusergroup     |
+------------------+
8 rows in set (0.01 sec)
```

FreeRADIUSの設定ファイルを編集していきます。
```
root@radius:~# ln -s /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/
root@radius:~# vi /etc/freeradius/3.0/mods-enabled/sql
```

以下のように設定を行いました。
- `dialect = "mysql"`
- `driver = "rlm_sql_${dialect}"`
- `server = "localhost"`
- `port = 3306`
- `login = "radius"`
- `password = "password"`
- `read_clients = yes`
- TLSに関しては検証環境では気にしないため、コメントアウトを行いました。
- 
        mysql {
                # If any of the files below are set, TLS encryption is enabled
                tls {
                #       ca_file = "ca-certificates.crt"
                #       ca_path = "/etc/ssl/certs/"
                #       #certificate_file = "/etc/ssl/certs/private/client.crt"
                #       private_key_file = "/etc/ssl/certs/private/client.key"
                #       cipher = "DHE-RSA-AES256-SHA:AES128-SHA"

                #       tls_required = yes
                #       tls_check_cert = no
                #       tls_check_cert_cn = no
                }

                # If yes, (or auto and libmysqlclient reports warnings are
                # available), will retrieve and log additional warnings from
                # the server if an error has occured. Defaults to 'auto'
                warnings = auto
        }


設定完了後、オーナー等の編集を行います。
```
root@radius:~# ls -la /etc/freeradius/3.0/mods-enabled/sql
lrwxrwxrwx 1 root root 38 Feb 16 00:13 /etc/freeradius/3.0/mods-enabled/sql -> /etc/freeradius/3.0/mods-available/sql
root@radius:~# chgrp -h freerad /etc/freeradius/3.0/mods-enabled/sql
root@radius:~# chown -R freerad:freerad /etc/freeradius/3.0/mods-enabled/sql
root@radius:~# ls -la /etc/freeradius/3.0/mods-enabled/sql
lrwxrwxrwx 1 freerad freerad 38 Feb 16 00:13 /etc/freeradius/3.0/mods-enabled/sql -> /etc/freeradius/3.0/mods-available/sql
```
設定を反映するためにFreeRADIUSを再起動していきます。
```
root@radius:/etc/ssl/certs# systemctl restart freeradius
root@radius:/etc/ssl/certs# systemctl status freeradius
● freeradius.service - FreeRADIUS multi-protocol policy server
     Loaded: loaded (/lib/systemd/system/freeradius.service; enabled; vendor preset: enabled)
     Active: active (running) since Sun 2025-02-16 00:41:10 UTC; 7s ago
       Docs: man:radiusd(8)
             man:radiusd.conf(5)
             http://wiki.freeradius.org/
             http://networkradius.com/doc/
    Process: 16661 ExecStartPre=/usr/sbin/freeradius $FREERADIUS_OPTIONS -Cx -lstdout (code=exited, status=0/SUCCESS)
   Main PID: 16662 (freeradius)
     Status: "Processing requests"
      Tasks: 6 (limit: 2309)
     Memory: 79.3M (limit: 2.0G)
        CPU: 880ms
     CGroup: /system.slice/freeradius.service
             mq16662 /usr/sbin/freeradius -f

Feb 16 00:41:09 radius freeradius[16661]: Compiling Post-Auth-Type REJECT for attr Post-Auth-Type
Feb 16 00:41:09 radius freeradius[16661]: radiusd: #### Skipping IP addresses and Ports ####
Feb 16 00:41:09 radius freeradius[16661]: Configuration appears to be OK
Feb 16 00:41:09 radius freeradius[16662]: WARNING: MYSQL_OPT_RECONNECT is deprecated and will be removed in a future>
Feb 16 00:41:09 radius freeradius[16662]: WARNING: MYSQL_OPT_RECONNECT is deprecated and will be removed in a future>
Feb 16 00:41:09 radius freeradius[16662]: WARNING: MYSQL_OPT_RECONNECT is deprecated and will be removed in a future>
Feb 16 00:41:09 radius freeradius[16662]: WARNING: MYSQL_OPT_RECONNECT is deprecated and will be removed in a future>
Feb 16 00:41:09 radius freeradius[16662]: WARNING: MYSQL_OPT_RECONNECT is deprecated and will be removed in a future>
Feb 16 00:41:09 radius freeradius[16662]: WARNING: MYSQL_OPT_RECONNECT is deprecated and will be removed in a future>
Feb 16 00:41:10 radius systemd[1]: Started FreeRADIUS multi-protocol policy server.
```

# 簡単な動作確認
テストユーザを作成して簡単な試験を行う。
/etc/freeradius/3.0/usersにユーザとパスワードを記載します。
```
root@radius:~# vi /etc/freeradius/3.0/users
最終行に以下を追加
testuser   Cleartext-Password := "password"

root@radius:~# systemctl restart freeradius
```
以下コマンドを実行Access-Acceptの表示が出ればOKです。
testuserは先ほど追加したユーザー名、passwordはそのパスワードです。localhostは今回構築したRADIUSサーバー自身のこと、0は識別子、testing123は秘密鍵です（デフォルトの設定ではこの値が使用されるようです）。
```
root@radius:~# radtest testuser password localhost 0 testing123
Sent Access-Request Id 143 from 0.0.0.0:59650 to 127.0.0.1:1812 length 78
        User-Name = "testuser"
        User-Password = "password"
        NAS-IP-Address = 127.0.2.1
        NAS-Port = 0
        Cleartext-Password = "password"
Received Access-Accept Id 143 from 127.0.0.1:1812 to 127.0.0.1:59650 length 38
        Message-Authenticator = 0x6d5523d91918da39e91016dadd9fb260
```

