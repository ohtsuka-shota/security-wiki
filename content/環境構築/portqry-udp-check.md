---
title: "【PortQry】Windows ServerでUDPの疎通確認をする手順と気づき"
date: 2025-10-25
tags: ["tool", "Windows", "Network", "AWS", "Firewall", "PortQry"]
source: "[[portqry-udp-check]]"
---
タイトルの通りです。UDPのポートが空いていることを確認したいと思っても、Windowsの標準機能だとなかなか難しいようで。。。
それを解消するためにMicrosoftがexeを用意しているらしいので、それを使ってみたいと思います。

:::note warn
今回使っていくPortQryもTCP側でよく使うTest-NetConnectionもそうですが、ただ単純にポートが開いているかを確認するだけというのは少し難しそうというか面倒くさそうです。

認識が違っていれば恐縮ですが、ポートに着目した疎通確認って以下が揃っている状態で行うのが前提条件な気がしてます。
①相手のポートが開いていて通信経路があること
②ポートの先にリッスンしている相手が動いていること
③リッスンしている相手が返答を返すこと

疎通相手にそれらが用意されていない状態でとりあえず経路開いているよね確認でこれらのコマンドを叩いても想定通りにならない気がしています。
【誤った期待】
Firewallでポート開けた → Test-NetConnection成功するはず

【現実】
Firewallでポート開けた → でもアプリが起動してない
                      → Test-NetConnection: False
                      → PortQry: FILTERED or LISTENING or NOT LISTENING

もし確認したいなら、PortQryを投げて、その後にVPCフローログで通信が飛んでいる、来ていることを確認するという感じでしょうか・・・
:::

# 検証
AWSでWindows Serverを2台用意して、片方のServerのUDP-21と80を開けている状態で検証を進めていきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/d753c8e2-91de-47b4-ba8b-0aed9daeb093.png)

Microsoftが用意しているexeは以下。
PortQryちゃんです。

https://www.microsoft.com/en-us/download/details.aspx?id=17148

画面中央にDownloadボタンがあるのでこれを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/85a2bef1-c6d1-4135-b883-3df9e17b348d.png)

PortQryV2.exeがダウンロードされます。これをもう一方のWindows Serverに持ち込みます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/58937c51-3a32-407d-9864-fd7648708797.png)

とりあえずデスクトップに持ち込みました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b82f1266-902f-47f2-8caf-161eb69ee4b6.png)

PortQryをダブルクリックして、起動します。Yesを押下します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/048484d6-5f21-4a73-b4d3-6033adcefb0a.png)

Cドライブ配下に作成されるようです。Unzipを押下して展開します。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/a62e3b90-ebbd-4f66-9545-9aed9cd5d508.png)

展開されたファイルを見てみます。以下のように3つのファイルが作成されていました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b6d9f3eb-f00f-4932-ab96-32298086abe3.png)

CMDを起動し、以下のコマンドを実行し、PortQry.exeがあるディレクトリに移動します。
```
C:\Users\Administrator>cd C:\PortQryV2
```

その後、このexeを実行します。
今回は先方サーバのUDP21が空いているかを確認します。
実行結果としては以下です。LISTENING or FILTEREDと出力されていますが、これは先方のUDP21の先にリッスンしているプロセスが無い可能性を示しているようです。
```
C:\PortQryV2>PortQry.exe -n 192.168.10.221 -e 21 -p UDP

Querying target system called:

 192.168.10.221

Attempting to resolve IP address to a name...

Failed to resolve IP address to name

querying...

UDP port 21 (unknown service): LISTENING or FILTERED
```

先方のサーバで疑似的にUDP21と80をリッスンをさせます。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/57c4c3ac-9486-4609-b131-79031670aa7c.png)

PSコマンドはこちら。PSを管理者権限で起動してこれを叩きます。
```
$u=New-Object System.Net.Sockets.UdpClient(80);Write-Host 'UDP Listening on port 80...';$e=New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any,0);while($true){$d=$u.Receive([ref]$e);Write-Host ('Received: '+[System.Text.Encoding]::UTF8.GetString($d)+' from '+$e.ToString())}

$u=New-Object System.Net.Sockets.UdpClient(21);Write-Host 'UDP Listening on port 21...';$e=New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any,0);while($true){$d=$u.Receive([ref]$e);Write-Host ('Received: '+[System.Text.Encoding]::UTF8.GetString($d)+' from '+$e.ToString())}
```

そして送信元も送信先もWindows Defender Firewallを切っておきます。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/04aa42fe-661b-4cf2-855a-03ee988cff9b.png)

改めてcmdでPortQryを叩きます。
LISTENING or FILTEREDと出力され、反応に変わりはありませんが、、、
```
C:\PortQryV2>PortQry.exe -n 192.168.10.221 -e 21 -p UDP

Querying target system called:

 192.168.10.221

Attempting to resolve IP address to a name...

Failed to resolve IP address to name

querying...

UDP port 21 (unknown service): LISTENING or FILTERED

C:\PortQryV2>PortQry.exe -n 192.168.10.221 -e 80 -p UDP

Querying target system called:

 192.168.10.221

Attempting to resolve IP address to a name...

Failed to resolve IP address to name

querying...

UDP port 80 (unknown service): LISTENING or FILTERED
```

相手側には通信が来ていることが確認できました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/b8716b31-631d-448d-a1e2-2fe0bff235c7.png)

# 改良

LISTENING or FILTEREDというのを解消し、確実にLISTENINGと出力されるようにしたいです。
以下のようなスクリプトを受信側で作って起動して、、、
```powershell1
# 複数ポートをリッスンするスクリプト
$ports = @(21, 80)  # リッスンするポート番号の配列

$scriptBlock = {
    param($port)
    
    $u = New-Object System.Net.Sockets.UdpClient($port)
    Write-Host "UDP Server started on port $port (PID: $PID)"
    $e = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
    
    try {
        while($true) {
            $d = $u.Receive([ref]$e)
            $receivedText = [System.Text.Encoding]::UTF8.GetString($d)
            
            Write-Host "[Port $port] Received: $receivedText from $($e.Address):$($e.Port)"
            
            # 応答メッセージを作成
            $response = switch -Wildcard ($receivedText) {
                "PING*" { "PONG from UDP Server (Port $port)" }
                "STATUS*" { "Server is running OK on port $port" }
                "TIME*" { "Current time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }
                default { "Echo from port ${port}: $receivedText" }
            }
            
            $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($response)
            $u.Send($responseBytes, $responseBytes.Length, $e) | Out-Null
            
            Write-Host "[Port $port] Response sent: $response" -ForegroundColor Cyan
        }
    }
    finally {
        $u.Close()
    }
}

# 各ポートに対してジョブを起動
$jobs = foreach ($port in $ports) {
    Start-Job -Name "UDPListener_$port" -ScriptBlock $scriptBlock -ArgumentList $port
}

Write-Host "Started UDP listeners on ports: $($ports -join ', ')" -ForegroundColor Green
Write-Host "Job IDs: $($jobs.Id -join ', ')"
Write-Host "`nTo view output: Receive-Job -Id <JobId> -Keep"
Write-Host "To stop all: Get-Job | Where-Object {`$_.Name -like 'UDPListener_*'} | Stop-Job; Get-Job | Where-Object {`$_.Name -like 'UDPListener_*'} | Remove-Job"

# ジョブの出力を監視（オプション）
while ($true) {
    Start-Sleep -Seconds 2
    foreach ($job in $jobs) {
        $output = Receive-Job -Id $job.Id
        if ($output) {
            $output | ForEach-Object { Write-Host $_ }
        }
    }
}
```

そして起動。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2a44327d-92d0-41dc-a7c7-fb4bbed366a1.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/7fa3336e-a77b-4208-84ce-437563a0576b.png)

PortQryを実行すると以下のようにListeningになりました。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/2624fa50-838f-4e22-809b-74e4309aeaa6.png)

受信側でも検知していますね。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/70ab8126-1c75-46f1-9a6d-4d22d25131d9.png)

確認が終わったらリッスンを停止して、以下のコマンドをpowershellで実行しPIDからJobをキルします。
```
PS C:\Users\test> netstat -ano | findstr ":21"
  UDP    0.0.0.0:21             *:*                                    3832
PS C:\Users\test> netstat -ano | findstr ":80"
  UDP    0.0.0.0:80             *:*                                    6924
PS C:\Users\test>
PS C:\Users\test> Stop-Process -Id 3832 -Force
PS C:\Users\test> Stop-Process -Id 6924 -Force
```
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/0d56ea33-b454-424f-bb23-fb5be1a34deb.png)

