---
title: "ネットワーク基礎・プロトコル用語集"
date: 2026-10-07
tags: ["glossary"]
---

## OSI参照モデル
通信機能を物理層・データリンク層・ネットワーク層・トランスポート層・セッション層・プレゼンテーション層・アプリケーション層の7階層に分けたモデル。各層が隣接する層とだけインターフェースを持つように設計されているため、ある層の実装を変更しても他の層に影響を与えにくく、プロトコルの設計やトラブルシューティングを体系的に行える。障害調査の際に「どの層で問題が起きているか」を切り分ける考え方の土台にもなる。実務ではTCP/IPの4階層モデルと対応付けて語られることが多く、例えばL2はデータリンク層、L3はネットワーク層の機器を指す略称として使われる。

<figure>
<svg viewBox="0 0 420 330" role="img" aria-label="OSI参照モデルの図解: 物理層からアプリケーション層までの7階層が積み重なった構造" style="max-width:100%;height:auto;">
  <g font-size="12" fill="currentColor">
    <rect x="10" y="10" width="400" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="30" y="35" font-size="13">7</text>
    <text x="215" y="35" text-anchor="middle">アプリケーション層</text>
    <rect x="10" y="50" width="400" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="30" y="75" font-size="13">6</text>
    <text x="215" y="75" text-anchor="middle">プレゼンテーション層</text>
    <rect x="10" y="90" width="400" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="30" y="115" font-size="13">5</text>
    <text x="215" y="115" text-anchor="middle">セッション層</text>
    <rect x="10" y="130" width="400" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="30" y="155" font-size="13">4</text>
    <text x="215" y="155" text-anchor="middle">トランスポート層(TCP/UDP)</text>
    <rect x="10" y="170" width="400" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="30" y="195" font-size="13">3</text>
    <text x="215" y="195" text-anchor="middle">ネットワーク層(IP)</text>
    <rect x="10" y="210" width="400" height="40" stroke-width="1.5" style="stroke:var(--secondary)" fill="none"/>
    <text x="30" y="235" font-size="13" style="fill:var(--secondary)">2</text>
    <text x="215" y="235" text-anchor="middle" style="fill:var(--secondary)">データリンク層(ARP/MAC) = L2</text>
    <rect x="10" y="250" width="400" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="30" y="275" font-size="13">1</text>
    <text x="215" y="275" text-anchor="middle">物理層</text>
  </g>
  <text x="215" y="305" text-anchor="middle" font-size="10" fill="currentColor">※L2=データリンク層、L3=ネットワーク層という略称がよく使われる</text>
</svg>
<figcaption>7階層は隣接する層とだけやり取りするため、ある層(例: データリンク層のARP)の問題は他の層に影響を与えずに切り分けられる。</figcaption>
</figure>

## TCP/IP
インターネットの基盤となるプロトコル群の総称。TCPはコネクション型で、送達確認や再送制御によって信頼性のあるデータ転送を実現し、IPはパケットに宛先情報を付与してネットワーク間のルーティングを担う。この2つに加えてUDP、ICMP、ARPなども含めて「TCP/IPプロトコルスイート」と呼ばれることが多い。OSI参照モデルが理論的な7階層モデルであるのに対し、TCP/IPは実際のインターネットで使われている実装寄りの階層モデルという位置付けになる。

## 3ウェイハンドシェイク
TCPで接続を確立する際に行う、SYN→SYN/ACK→ACKという3段階のやり取り。クライアントが接続要求(SYN)を送り、サーバがそれを確認して自身も接続要求を返し(SYN/ACK)、クライアントが最終的な確認(ACK)を返すことで、双方が送受信可能な状態であることを確認してから通信を開始する。このハンドシェイクを悪用した攻撃がSYNフラッド攻撃で、ACKを返さずにSYNだけを大量に送りサーバ側の接続待ちリソースを枯渇させる。ポートスキャンでもこの仕組みが使われ、SYNだけを送って応答を見ることでポートの状態を調べるSYNスキャン(ステルススキャン)が代表的な手法となっている。

## ARP
IPアドレスからMACアドレスを解決するプロトコル。同一LAN内でパケットを送る際、IPアドレス宛の通信を実際に届けるには宛先ホストの物理アドレス(MACアドレス)が必要になるため、ブロードキャストで「このIPアドレスを持つのは誰か」を問い合わせ、該当ホストが自分のMACアドレスを返答する。この結果はARPテーブル(ARPキャッシュ)に一定時間保存され、同じ宛先への通信を高速化する。ARPには送信元を認証する仕組みがなく、誰でも偽の応答を返せる点が、後述のARPスプーフィングの脆弱性につながっている。

## ARPスプーフィング
偽のARP応答を送ることで、通信相手に攻撃者自身のMACアドレスを本来の宛先であるかのように誤認させる攻撃。例えば攻撃者が「自分のMACアドレスがデフォルトゲートウェイのものだ」という偽のARP応答を周辺のホストに送り続けると、被害者のパケットはすべて攻撃者経由で転送されるようになる。これにより通信内容の盗聴・改ざんが可能になり、中間者攻撃(MITM)の典型的な足がかりとして使われる。Bettercapやettercapといったツールがこの攻撃の実行によく使われ、対策としてはARPテーブルの静的登録や、スイッチ側でのダイナミックARPインスペクションなどが挙げられる。
**前提条件**: ARPはブロードキャストドメイン内(同一LAN・同一セグメント)でのみ使われるプロトコルのため、攻撃者は被害者と同じL2セグメントに接続している必要がある。ルータを挟んだ別のネットワークから、インターネット経由で直接ARPスプーフィングを行うことはできない。

<figure>
<svg viewBox="0 0 640 260" role="img" aria-label="ARPスプーフィングの図解: 攻撃者が偽のARP応答でゲートウェイになりすまし、被害者の通信を自分経由に転送させる" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-arp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="20" y="20" width="140" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="90" y="50" text-anchor="middle" font-size="12" fill="currentColor">被害者PC</text>
  <rect x="470" y="20" width="150" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="545" y="50" text-anchor="middle" font-size="12" fill="currentColor">本来のゲートウェイ</text>
  <rect x="240" y="190" width="160" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="320" y="220" text-anchor="middle" font-size="12" fill="currentColor">攻撃者</text>
  <line x1="240" y1="200" x2="155" y2="70" stroke-width="1.5" marker-end="url(#arrow-arp)" style="stroke:var(--secondary)"/>
  <text x="130" y="140" text-anchor="middle" font-size="10" style="fill:var(--secondary)">① 偽ARP応答</text>
  <text x="130" y="154" text-anchor="middle" font-size="10" style="fill:var(--secondary)">「ゲートウェイのIPは自分のMAC」</text>
  <line x1="90" y1="70" x2="260" y2="195" stroke-width="1.5" marker-end="url(#arrow-arp)" style="stroke:var(--secondary)"/>
  <text x="210" y="105" text-anchor="middle" font-size="10" style="fill:var(--secondary)">② 気づかず全通信を送信</text>
  <line x1="380" y1="195" x2="530" y2="72" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-arp)"/>
  <text x="500" y="140" text-anchor="middle" font-size="10" fill="currentColor">③ そのまま中継</text>
  <text x="500" y="154" text-anchor="middle" font-size="10" fill="currentColor">(盗聴・改ざん可能)</text>
  <line x1="160" y1="35" x2="468" y2="35" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="320" y="25" text-anchor="middle" font-size="10" fill="currentColor">本来の直接通信(攻撃前)</text>
</svg>
<figcaption>攻撃者は偽のARP応答でゲートウェイになりすまし、被害者の通信を自分経由に迂回させる。被害者は本来のゲートウェイと直接話しているつもりのまま、実際には攻撃者が内容を見られる状態になる。</figcaption>
</figure>

## CIDR
IPアドレスのネットワーク部とホスト部の境界を、プレフィックス長(例: 192.168.1.0/24)で表記する方式。従来のクラスA/B/Cのようにアドレス空間を固定長で区切る方式では無駄が多かったため、任意のビット長で区切れるCIDRによって、必要なホスト数に応じて柔軟にアドレスブロックを割り当てられるようになった。ルーティングテーブルにおいても、連続する複数のネットワークを1つの経路情報にまとめる「集約(サマリ化)」に使われ、経路情報の肥大化を抑える役割も持つ。

## NAT / IPマスカレード
プライベートIPアドレスとグローバルIPアドレスを変換する技術。企業や家庭のLAN内では限られたグローバルIPアドレスを節約するためプライベートアドレスを使うことが多く、インターネットに出る際にルータがNATで変換を行う。IPマスカレードはNATの拡張で、ポート番号も合わせて変換することにより、複数の内部ホストが1つのグローバルIPアドレスを同時に共有できるようにする仕組みで、一般的な家庭用ルータのほとんどがこの方式を採用している。NATは結果的に外部から内部ホストへ直接アクセスしにくくする効果もあり、簡易的なセキュリティ境界としても機能する。

## DHCP
IPアドレスなどのネットワーク設定をクライアントに動的に割り当てるプロトコル。クライアントがDISCOVER(発見)パケットをブロードキャストし、DHCPサーバがOFFER(提案)を返し、クライアントがREQUEST(要求)で正式に申請し、サーバがACK(確認)で割り当てを確定するという4ステップ(DORA)でやり取りが行われる。手動でIPアドレスを設定する手間を省けるため大規模なネットワークでは必須の仕組みだが、不正なDHCPサーバ(野良DHCP)が稀に問題になることがあり、これを悪用して偽のゲートウェイやDNS情報を配布する攻撃も存在する。

## DNS
ドメイン名とIPアドレスを相互に変換する名前解決システム。人間が覚えやすいドメイン名(例: example.com)を、コンピュータが通信に使うIPアドレスに変換する役割を持ち、インターネットの利便性を支える基盤技術の1つになっている。問い合わせを受けたキャッシュDNSサーバは、自身に情報がなければルートDNSサーバ、TLD(トップレベルドメイン)の権威DNSサーバ、該当ドメインの権威DNSサーバへと順にたどって最終的な回答を得る階層構造になっており、得られた結果は一定時間キャッシュして同じ問い合わせの負荷を減らす。

<figure>
<svg viewBox="0 0 640 300" role="img" aria-label="DNS解決の流れの図解: キャッシュDNSサーバがルート、TLD、権威DNSサーバへ順に問い合わせて最終的な回答を得る" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-dns" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="10" y="220" width="110" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="65" y="250" text-anchor="middle" font-size="12" fill="currentColor">クライアント</text>
  <rect x="190" y="220" width="140" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="260" y="250" text-anchor="middle" font-size="12" fill="currentColor">キャッシュDNS</text>
  <rect x="440" y="10" width="170" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="525" y="35" text-anchor="middle" font-size="12" fill="currentColor">ルートDNSサーバ</text>
  <rect x="440" y="90" width="170" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="525" y="115" text-anchor="middle" font-size="12" fill="currentColor">TLD権威DNSサーバ</text>
  <rect x="440" y="170" width="170" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="525" y="195" text-anchor="middle" font-size="12" fill="currentColor">権威DNSサーバ</text>
  <line x1="120" y1="245" x2="188" y2="245" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-dns)" marker-start="url(#arrow-dns)"/>
  <text x="154" y="265" text-anchor="middle" font-size="9" fill="currentColor">①質問 / ⑧回答</text>
  <line x1="330" y1="235" x2="438" y2="30" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-dns)" marker-start="url(#arrow-dns)"/>
  <text x="400" y="130" text-anchor="middle" font-size="9" fill="currentColor" transform="rotate(0)"></text>
  <text x="345" y="170" text-anchor="start" font-size="9" fill="currentColor">②問合せ/③「.comはTLDへ」</text>
  <line x1="330" y1="245" x2="438" y2="110" stroke-width="1.5" marker-end="url(#arrow-dns)" marker-start="url(#arrow-dns)" style="stroke:var(--secondary)"/>
  <text x="345" y="200" text-anchor="start" font-size="9" style="fill:var(--secondary)">④問合せ/⑤「権威DNSへ」</text>
  <line x1="330" y1="252" x2="438" y2="192" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-dns)" marker-start="url(#arrow-dns)"/>
  <text x="345" y="228" text-anchor="start" font-size="9" fill="currentColor">⑥問合せ/⑦IPアドレスを回答</text>
</svg>
<figcaption>キャッシュDNSサーバは自分に答えがなければ、ルート→TLD→権威DNSサーバの順に「どこに聞けばいいか」をたどり、最後に得た回答をクライアントに返しつつ一定時間キャッシュする。</figcaption>
</figure>

## DNSキャッシュポイズニング
DNSキャッシュサーバに偽の名前解決情報を注入し、利用者を偽サイトへ誘導する攻撃。キャッシュDNSサーバが権威DNSサーバに問い合わせている間のわずかな時間に、攻撃者が偽の応答を正規の応答より先に送り込むことで、本来とは異なるIPアドレスをキャッシュさせてしまう。これに成功すると、そのDNSサーバを利用する多数のユーザーが、正しいドメイン名を入力したにもかかわらず攻撃者の用意した偽サイト(フィッシングサイトなど)に誘導されてしまう。対策としてトランザクションIDのランダム化や、後述のDNSSECによる応答の署名検証が行われる。
**前提条件**: 攻撃者は標的のキャッシュDNSサーバが権威DNSサーバへ問い合わせを行うタイミングを把握し、その応答が届く前に偽の応答を送り込む必要がある。標的のDNSサーバへ何らかの形で問い合わせを発生させられる経路(同一LAN内、あるいは問い合わせを誘発できる手段)があることが前提になる。

## DNSSEC
DNS応答に電子署名を付与し、応答の正当性を検証できるようにする拡張仕様。通常のDNSには応答が本当に権威あるサーバから送られたものかを検証する仕組みがなく、前述のキャッシュポイズニングのような攻撃が成立する余地があったため、公開鍵暗号を用いた電子署名をDNSの応答に付加することで、改ざんされていないことを検証できるようにした。親ゾーンから子ゾーンへ署名の信頼が連鎖する「信頼の連鎖(Chain of Trust)」という仕組みで、ルートゾーンを頂点とした階層的な検証が行われる。

## ICMP
ネットワークの状態確認やエラー通知に使われるプロトコル。TCPやUDPのようにアプリケーションデータを運ぶためのプロトコルではなく、「宛先に到達できない」「TTLが0になった」といった制御・診断用のメッセージをやり取りするために使われる。身近な例ではpingコマンドがICMPのEchoリクエスト/リプライを利用して到達性を確認し、tracerouteはTTLを1から徐々に増やしてICMPの「時間超過」応答を集めることで経路上のルータを特定する。ICMPを悪用したping of deathやスマーフ攻撃のようなDoS手法も古くから知られている。

## ポートスキャン
対象ホストの開いているポート(稼働しているサービス)を調査する手法。攻撃者にとっては、侵入可能な脆弱なサービスを見つけるための偵察(フットプリンティング)の重要なステップであり、一方でシステム管理者にとっても自組織の公開範囲を把握するための脆弱性診断の基本手法となる。代表的なツールであるnmapでは、TCPの3ウェイハンドシェイクを完了させないSYNスキャンや、UDPポートへの応答有無を見るUDPスキャンなど、目的や隠密性に応じた複数の手法が使い分けられる。無許可の対象へのポートスキャンは、不正アクセス禁止法に抵触する可能性がある点にも注意が必要。

## ファイアウォール
通信をルールに基づいて許可・拒否するセキュリティ機器・機能。初期のパケットフィルタ型は送信元/宛先IPアドレスやポート番号だけを見て通信を許可・拒否していたが、現在主流のステートフルインスペクション型は、通信の状態(セッション)を記憶し、「外から来た応答パケットは、内部から開始した通信に対応するものか」を判定できるため、より柔軟かつ安全な制御が可能になっている。さらに通信内容(アプリケーション層)まで検査するWAF(Web Application Firewall)や次世代ファイアウォール(NGFW)など、防御対象やレイヤーに応じた様々な種類がある。

## DMZ(非武装地帯)
社内ネットワークと外部インターネットの間に設ける中間的なネットワーク領域。Webサーバやメールサーバなど外部に公開する必要のあるサーバをこの領域に置くことで、万が一それらのサーバが攻撃を受けて乗っ取られても、内部ネットワーク(社内の業務システムなど)へ直接侵入されるリスクを下げられる。一般的にはファイアウォールを2台使い、「インターネット—DMZ—内部ネットワーク」という3層構成にして、それぞれの境界での通信を個別に制御する設計が広く使われている。

<figure>
<svg viewBox="0 0 640 160" role="img" aria-label="DMZの図解: インターネットと内部ネットワークの間にDMZを挟み、2台のファイアウォールで通信を制限する" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-dmz" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="10" y="50" width="120" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="70" y="80" text-anchor="middle" font-size="12" fill="currentColor">インターネット</text>
  <line x1="130" y1="75" x2="260" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-dmz)"/>
  <rect x="165" y="55" width="30" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="180" y="110" text-anchor="middle" font-size="10" fill="currentColor">FW1</text>
  <text x="180" y="40" text-anchor="middle" font-size="9" fill="currentColor">80/443のみ許可</text>
  <rect x="260" y="50" width="130" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="325" y="72" text-anchor="middle" font-size="11" fill="currentColor">DMZ</text>
  <text x="325" y="88" text-anchor="middle" font-size="10" fill="currentColor">Web/メールサーバ</text>
  <line x1="390" y1="75" x2="520" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-dmz)"/>
  <rect x="440" y="55" width="30" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="455" y="110" text-anchor="middle" font-size="10" fill="currentColor">FW2</text>
  <text x="455" y="40" text-anchor="middle" font-size="9" fill="currentColor">必要最小限のみ許可</text>
  <rect x="510" y="50" width="120" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="570" y="80" text-anchor="middle" font-size="12" fill="currentColor">内部ネットワーク</text>
  <path d="M70,50 Q320,-30 570,50" fill="none" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-dmz)" style="stroke:var(--secondary)"/>
  <text x="320" y="12" text-anchor="middle" font-size="10" style="fill:var(--secondary)">✕ 内部への直接到達は許可しない</text>
</svg>
<figcaption>DMZにあるサーバが乗っ取られても、FW2が内部ネットワークへの直接アクセスを遮断しているため、社内システムまでは侵入されにくい。</figcaption>
</figure>

## プロキシ / リバースプロキシ
プロキシ(フォワードプロキシ)はクライアントの代理として外部と通信する仕組みで、組織内の端末がインターネットに直接出ず、プロキシサーバを経由することでアクセスログの一元管理やコンテンツフィルタリング、キャッシュによる高速化などを実現する。リバースプロキシはこれと逆に、サーバ側に立って外部からの要求を受け取り、内部の複数のサーバへ振り分ける役割を持ち、負荷分散(ロードバランシング)やSSL/TLS処理の集約、内部サーバ構成の秘匿といった目的で使われる。Nginxなどがリバースプロキシの実装としてよく利用される。

## VPN
インターネットなどの共有ネットワーク上に、暗号化などで保護された仮想的な専用通信路(トンネル)を構築する技術。拠点間を専用線で結ぶと高コストになるため、既存のインターネット回線上に暗号化されたトンネルを張ることで、専用線に近い安全性を低コストで実現できる。リモートワークにおいて社員が自宅から社内ネットワークに安全に接続する用途や、拠点間のネットワークを結ぶ用途で広く使われ、実装方式としてIPsecを使うものやSSL/TLSを使うもの(SSL-VPN)などがある。

<figure>
<svg viewBox="0 0 640 160" role="img" aria-label="VPNの図解: クライアントとVPNゲートウェイの間だけがインターネット上で暗号化トンネルで保護され、ゲートウェイから先の社内ネットワークは平文のまま" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-vpn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="10" y="55" width="100" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="60" y="85" text-anchor="middle" font-size="12" fill="currentColor">クライアント</text>
  <rect x="190" y="10" width="200" height="140" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="290" y="28" text-anchor="middle" font-size="10" fill="currentColor">インターネット(公衆網)</text>
  <line x1="110" y1="80" x2="470" y2="80" stroke-width="4" marker-end="url(#arrow-vpn)" style="stroke:var(--secondary)"/>
  <text x="290" y="68" text-anchor="middle" font-size="11" style="fill:var(--secondary)">暗号化トンネル</text>
  <rect x="470" y="55" width="130" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="535" y="78" text-anchor="middle" font-size="11" fill="currentColor">VPN</text>
  <text x="535" y="94" text-anchor="middle" font-size="11" fill="currentColor">ゲートウェイ</text>
  <line x1="600" y1="80" x2="630" y2="80" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-vpn)"/>
  <text x="615" y="130" text-anchor="middle" font-size="9" fill="currentColor">社内</text>
  <text x="615" y="142" text-anchor="middle" font-size="9" fill="currentColor">(平文で到達)</text>
</svg>
<figcaption>暗号化で保護されるのはクライアントからVPNゲートウェイまでの区間だけで、そこから先の社内ネットワーク内部は通常、信頼された平文の通信になる。</figcaption>
</figure>

## IPsec
IPパケット単位で認証・暗号化を行うプロトコル群。VPNの実装によく使われ、改ざん検知と送信元認証を行うAH(Authentication Header)と、ペイロードの暗号化までを行うESP(Encapsulating Security Payload)という2つの主要プロトコルを持つ。実際の通信前には、鍵交換や認証方式を取り決めるIKE(Internet Key Exchange)というプロトコルでセキュリティアソシエーション(SA)を確立する必要があり、この一連の仕組み全体を指してIPsecと呼ぶ。

## VLAN
物理的な配線構成に関わらず、論理的にネットワークを分割する技術。同じスイッチに接続されている端末でも、VLAN IDによってグループを分けることで、あたかも別々のスイッチに接続されているかのようにブロードキャストドメインを分離できる。部署ごと・用途ごとにネットワークを分けたいが、フロアをまたいで配線を分けるのは現実的でないという場合に有効で、複数のVLANの通信をまとめて1本の配線で伝送するトランク(タグVLAN、IEEE 802.1Q)という仕組みも併せて使われる。

## L2/L3スイッチ
L2スイッチはMACアドレスに基づいてフレームを転送する、いわゆる「スイッチングハブ」で、同一ネットワーク(セグメント)内での通信を高速に中継する役割を持つ。L3スイッチはこれにルーティング機能を併せ持たせたもので、IPアドレスに基づいて異なるネットワーク(VLAN間など)の間でパケットを転送できるため、従来ルータが担っていた役割の一部を高速なハードウェアで処理できるようにしたものと理解すると分かりやすい。

## ルーティング
パケットの宛先までの経路を決定する処理。ルータは自身が持つルーティングテーブル(どの宛先ネットワークへはどの経路で送ればよいかを記したリスト)を参照して、受け取ったパケットの次の転送先(ネクストホップ)を決める。経路情報は手動で設定するスタティックルーティングと、RIPやOSPF、BGPといったルーティングプロトコルによって自動的に交換・更新されるダイナミックルーティングに大きく分けられ、インターネット全体はBGPによる大規模なダイナミックルーティングで成り立っている。

## ブロードキャスト / マルチキャスト / ユニキャスト
ユニキャストは1対1の通信、ブロードキャストはネットワーク内の全ホスト宛への一斉送信、マルチキャストは特定のグループに参加しているホストのみに送る通信方式。前述のARPによる問い合わせはブロードキャストの代表例であり、動画配信や会議システムなど、同じデータを複数の受信者に効率よく届けたい場合にはマルチキャストが使われる。ブロードキャストはネットワーク全体に負荷をかけるため、VLANなどでブロードキャストドメインを適切に分割することが設計上重要になる。

## 無線LAN(Wi-Fi)とセキュリティ
電波を使ってLAN接続を行う技術。ケーブル配線が不要という利便性の裏で、電波の届く範囲にいれば誰でも通信を傍受しうるという特有のリスクがあるため、暗号化による保護が特に重要になる。初期のWEPは暗号アルゴリズムの設計上の弱点により短時間で鍵が解析できてしまうため現在は非推奨とされ、WPA2、さらに安全性を高めたWPA3への移行が進んでいる。企業利用では後述のIEEE 802.1Xと組み合わせ、利用者ごとに異なる鍵・認証情報を割り当てる構成が推奨される。

## IEEE 802.1X
ポートベースの認証規格。有線LANのスイッチポートや無線LANのアクセスポイントへの接続時に、クライアント(サプリカント)・認証装置(オーセンティケータ)・認証サーバ(多くはRADIUSサーバ)の3者で構成される仕組みにより、正しい認証情報を持つ端末だけを通信可能にする。認証が完了するまでは通信用のポートが実質的に閉じられているため、未認証の端末がネットワークに自由に接続することを防げる。企業の無線LANでID・パスワードや証明書による個別認証を行う際の標準的な仕組みとして使われている。

## CSMA/CD・CSMA/CA
CSMA/CDは有線LAN(初期のイーサネット)で使われた方式で、複数の端末が同時に送信してデータの衝突(コリジョン)が発生したことを検出してから、ランダムな時間待って再送する。CSMA/CAは無線LANで使われる方式で、電波の衝突を検出することが技術的に難しいため、送信前に一定時間待機して回線が空いているかを確認し、衝突そのものを事前に回避しようとする点がCDとの大きな違いになる。現在の有線LANはスイッチによる全二重通信が主流になったため、CSMA/CDが実際に機能する場面は少なくなっている。

## DDoS攻撃
多数の送信元から大量の通信を集中させ、対象サービスを利用不能にする攻撃。単一の攻撃元から行うDoS(Denial of Service)攻撃を、ボットネットなどを使って多数の端末から分散的(Distributed)に行う形態がDDoS攻撃で、1台あたりの通信量は小さくても合計すると対象の処理能力や回線帯域を超える量になるため、防御側は正規の通信と攻撃通信を見分けることが難しくなる。帯域を飽和させるタイプ、サーバのリソース(CPU・メモリ・コネクション数)を枯渇させるタイプ、アプリケーション層の処理を狙うタイプなど複数の種類があり、対策にはCDNや専用のDDoS緩和サービスの活用が一般的になっている。
**前提条件**: 攻撃者は事前に多数の送信元(ボットネットなど侵害済みの端末群、またはオープンリゾルバのような増幅に使える踏み台)を確保している必要があり、単独の端末だけでは大規模なDDoS攻撃は成立しにくい。

## DNSリフレクタ攻撃 / DNSアンプ攻撃
送信元を偽装した小さな問い合わせで、DNSサーバから大きな応答を標的に送らせ、帯域を圧迫するDDoS攻撃の一種。攻撃者は標的のIPアドレスを送信元として偽装したDNS問い合わせ(IPスプーフィング)を多数のオープンリゾルバ(誰でも問い合わせ可能なDNSサーバ)に送り、DNSサーバはその偽装された送信元(つまり標的)へ応答を送り返す。問い合わせ自体は小さくても応答のサイズが何倍にも増幅されるため、攻撃者の送信量以上の通信を標的に送り込める点が特徴で、この仕組みはDNS以外のプロトコル(NTP、Memcachedなど)でも同様に悪用される。
**前提条件**: 送信元IPアドレスを検証せずに応答してしまう「オープンリゾルバ」がインターネット上に多数存在していることが前提となる。ISP側でBCP38のような送信元アドレス検証フィルタリングが徹底されていれば、この攻撃の踏み台として使われにくくなる。

## IPスプーフィング
パケットの送信元IPアドレスを偽装する手法。攻撃者が自分の本来のIPアドレスではなく、別のIPアドレス(存在しないアドレスや第三者のアドレス)を送信元として詐称してパケットを送ることで、攻撃元の特定を困難にしたり、前述のDNSリフレクタ攻撃のような増幅攻撃に利用したりする。インターネットの基本設計上、ルータは送信元アドレスが本当に正しいかを検証しないため成立してしまう手法であり、対策としてはISPなどがネットワークの境界で送信元アドレスの妥当性を検証するBCP38のようなフィルタリングを導入することが推奨されている。

## ポートフォワーディング
外部からの特定ポートへの通信を、内部の別ホスト・ポートへ転送する設定。ルータのポートフォワーディング機能を使えば、インターネット側からのアクセスをプライベートIPアドレスを持つ内部サーバに届けられるため、自宅サーバの公開などに利用される。一方でSSHのポートフォワーディング(ローカル・リモート・ダイナミックの3種類がある)は、暗号化されたSSHトンネルを使って別のサービスへの通信を中継する機能で、ペネトレーションテストにおいて侵入した踏み台経由で内部ネットワークへアクセスする手法としても使われる。

## ホスト型IDS / ネットワーク型IDS
IDS(侵入検知システム)のうち、個々の端末(ホスト)にインストールされ、そのホスト上のログやファイルの変化、プロセスの動作を監視するものがホスト型IDS(HIDS)、ネットワークの経路上に設置され、流れる通信パケットそのものを監視するものがネットワーク型IDS(NIDS)。HIDSは暗号化された通信の内容や端末内部の異常まで検知できる一方、監視対象の端末ごとに導入する手間がかかり、NIDSはネットワーク全体を一括で監視できる一方、暗号化された通信の内容までは見えないという一長一短がある。検知のみを行うIDSに対し、検知した通信を実際に遮断するところまで行うものはIPS(侵入防止システム)と呼ばれる。

## IPv6
IPv4の枯渇問題に対応するために設計された次世代IPプロトコル。IPv4の32ビットに対しIPv6は128ビットのアドレス空間を持ち、理論上ほぼ無尽蔵にアドレスを割り当てられるようになったため、NATを介さずに端末同士がグローバルアドレスで直接通信することも想定されている。ヘッダ構造が簡略化されて処理が高速化された点や、アドレスの自動設定機能(SLAAC)を標準で持つ点もIPv4との大きな違いで、普及は徐々に進んでいるものの、既存のIPv4インフラとの共存(デュアルスタックなど)が長期的な課題として残っている。

## フレームリレー / ATM
WAN回線で使われていたパケット交換技術。拠点間を結ぶ広域回線を効率的に共有するための技術として1990年代から2000年代にかけて広く使われたが、固定長セル(ATM)や可変長フレーム(フレームリレー)による交換処理のコストや、IP技術の高速化・低価格化により、現在ではMPLSやIP-VPN、インターネットVPNといったIPベースの技術に置き換わっている。歴史的な背景知識として、過去のWAN技術の文脈で名前が登場することがある。
