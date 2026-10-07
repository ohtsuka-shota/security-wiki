---
title: "暗号・認証用語集"
date: 2026-10-07
tags: ["glossary"]
---

## 共通鍵暗号方式
暗号化と復号に同じ鍵を使う方式。計算量が少なく処理が高速なため、大容量のデータを暗号化する用途に向いている一方、通信する相手ごとに同じ鍵を安全に共有する必要があり、相手の数が増えるほど鍵管理の負担が大きくなるという課題を持つ。この鍵配送の問題を解決する手段として、後述の公開鍵暗号方式を使って共通鍵そのものを安全に受け渡す「ハイブリッド暗号方式」が実際の通信(TLSなど)では広く使われている。代表例はAESやDES(現在は非推奨)。

## 公開鍵暗号方式
暗号化に公開鍵、復号に秘密鍵という異なる鍵を使う方式。公開鍵は誰に知られても問題ない一方、秘密鍵は所有者だけが厳重に保管するという非対称な関係を利用することで、事前に安全な経路で鍵を共有しなくても暗号通信を開始できる「鍵配送問題」の解決策になっている。処理は共通鍵方式より計算量が多く低速なため、実際の通信では公開鍵暗号で共通鍵を安全にやり取りし、本体のデータは共通鍵で暗号化するハイブリッド方式が一般的。代表例はRSAや楕円曲線暗号で、デジタル署名にも応用される。

<figure>
<svg viewBox="0 0 740 210" role="img" aria-label="公開鍵暗号方式の図解: 送信者は受信者の公開鍵で暗号化し、受信者は自分だけが持つ秘密鍵で復号する" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-pubkey" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="10" y="70" width="110" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="65" y="105" text-anchor="middle" font-size="13" fill="currentColor">送信者</text>
  <rect x="180" y="70" width="130" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="245" y="105" text-anchor="middle" font-size="13" fill="currentColor">暗号化</text>
  <rect x="390" y="70" width="130" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="455" y="105" text-anchor="middle" font-size="13" fill="currentColor">復号</text>
  <rect x="600" y="70" width="110" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="655" y="105" text-anchor="middle" font-size="13" fill="currentColor">受信者</text>
  <line x1="120" y1="100" x2="178" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-pubkey)"/>
  <text x="149" y="92" text-anchor="middle" font-size="11" fill="currentColor">平文</text>
  <line x1="310" y1="100" x2="388" y2="100" stroke-width="1.5" marker-end="url(#arrow-pubkey)" style="stroke:var(--secondary)"/>
  <text x="349" y="88" text-anchor="middle" font-size="11" style="fill:var(--secondary)">暗号文</text>
  <text x="349" y="124" text-anchor="middle" font-size="10" style="fill:var(--secondary)">(盗聴されても解読不可)</text>
  <line x1="520" y1="100" x2="598" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-pubkey)"/>
  <text x="559" y="92" text-anchor="middle" font-size="11" fill="currentColor">平文</text>
  <rect x="180" y="8" width="130" height="38" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="245" y="31" text-anchor="middle" font-size="11" fill="currentColor">受信者の公開鍵</text>
  <line x1="245" y1="46" x2="245" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-pubkey)"/>
  <rect x="390" y="162" width="130" height="38" stroke-dasharray="4 3" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="455" y="185" text-anchor="middle" font-size="11" fill="currentColor">受信者の秘密鍵(非公開)</text>
  <line x1="455" y1="162" x2="455" y2="132" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-pubkey)"/>
</svg>
<figcaption>暗号化には誰でも使える「受信者の公開鍵」を使い、復号には受信者だけが持つ「秘密鍵」を使う。この非対称性により、事前に鍵を安全に共有しなくても暗号通信を始められる。</figcaption>
</figure>

## AES
現在標準的に使われているブロック暗号。鍵長128/192/256ビットに対応し、安全性と処理速度のバランスが良いため、Wi-FiのWPA2/WPA3、HTTPS、ディスク暗号化など非常に広範囲で利用されている。前身であるDESが鍵長56ビットと短く総当たり攻撃に対して脆弱になったことを受けて、米国NIST(国立標準技術研究所)の公募で選定された暗号方式であり、現時点では実用上の計算資源で解読される見込みがない安全な暗号として広く信頼されている。

## RSA
素因数分解の困難さ(大きな2つの素数の積から元の素数を求めることが非常に困難であること)を安全性の根拠とする公開鍵暗号。鍵交換やデジタル署名、証明書の署名など幅広い用途で使われてきた長い実績を持つが、鍵長を十分に長く(2048ビット以上)取る必要があり、同等の安全性を実現する楕円曲線暗号に比べて鍵長・計算コストが大きいという弱点もある。また将来的に量子コンピュータが実用化されると素因数分解が高速に解けてしまう可能性があるため、後述の耐量子計算機暗号への移行が課題となっている。

## 楕円曲線暗号(ECC)
楕円曲線上の離散対数問題の困難さを利用した公開鍵暗号。RSAより大幅に短い鍵長で同等の安全性を実現できるため、処理負荷やデータサイズを抑えたいモバイル端末やIoT機器、TLSの鍵交換などで広く採用が進んでいる。楕円曲線上の2点を結ぶ演算を繰り返す「スカラー倍算」の逆演算が極めて困難であることを安全性の根拠としており、具体的な曲線の種類(例: P-256、Curve25519)によって速度や安全性の特性が異なる。

## ブロック暗号の利用モード(ECB/CBC/CFB/CTR)
ブロック暗号(AESなど)を、ブロック長を超える長さのデータに繰り返し適用するための方式。最も単純なECBモードは各ブロックを独立に暗号化するため、同一の平文ブロックが常に同一の暗号文ブロックになってしまい、データのパターンが漏れるという弱点がある。CBCモードは直前の暗号文ブロックを次のブロックの暗号化に混ぜ込むことでこれを改善し、CFB・OFB・CTRモードはブロック暗号をストリーム暗号のように扱えるようにする方式で、特にCTRモードは並列処理がしやすく現在のTLSなどでも好まれている。

## ハッシュ関数
任意長のデータから固定長の値(ハッシュ値、メッセージダイジェスト)を生成する一方向関数。同じ入力からは必ず同じハッシュ値が得られるが、ハッシュ値から元のデータを逆算することは計算上不可能であり、わずかにデータが変わるだけでハッシュ値が大きく変化する性質を持つ。この性質を利用して、ファイルの改ざん検知(ダウンロードしたファイルのハッシュ値を公開値と比較する等)や、パスワードを平文のまま保存せずハッシュ値として保管する用途に使われる。代表例はSHA-256やSHA-3。

## MD5 / SHA-1
古くから使われたハッシュ関数だが、異なる入力から同じハッシュ値が生成されてしまう「衝突」が実際に発見されており、現在はセキュリティ用途(改ざん検知や署名)での利用は非推奨とされている。衝突が発見されたということは、悪意のある人物が「正規のファイルと同じハッシュ値を持つ改ざんされたファイル」を作成できる可能性があることを意味し、証明書の署名やファイルの整合性検証といった、衝突に対する耐性が重要な場面では特に危険視される。現在はSHA-256以上のハッシュ関数への移行が完了している。

## HMAC
ハッシュ関数と鍵を組み合わせて、メッセージの改ざん検知と送信者認証を同時に行う仕組み。通常のハッシュ関数だけでは誰でもハッシュ値を計算できてしまうため、第三者による改ざんの後に正しいハッシュ値を付け直されると検知できないが、HMACでは送信者と受信者だけが知る鍵を計算に混ぜ込むため、鍵を知らない第三者は正しいHMAC値を作れず、改ざんを検知できると同時に「鍵を知っている正規の送信者から送られたものである」ことも確認できる。APIの署名付きリクエストなどで広く使われている。

## ソルト
パスワードをハッシュ化する際に加えるランダムな値。ソルトを使わずに単純にパスワードをハッシュ化すると、同じパスワードを使っている複数のユーザーのハッシュ値が一致してしまい、よく使われるパスワードのハッシュ値をあらかじめ計算しておく後述のレインボーテーブル攻撃が効率的に成立してしまう。パスワードごとに異なるランダムなソルトを付加してからハッシュ化することで、同一パスワードでも異なるハッシュ値になり、攻撃者は利用者ごとに個別に総当たりをやり直す必要が生じるため、攻撃コストが大幅に上がる。

## レインボーテーブル / レインボー攻撃
あらかじめ計算した平文とハッシュ値の対応表(レインボーテーブル)を使い、入手したハッシュ値から元のパスワードを高速に逆引きする攻撃手法。1つずつ総当たりで計算するブルートフォース攻撃に比べ、事前計算済みの表を参照するだけで済むため解析時間を大幅に短縮できる点が特徴だが、前述のソルトが適切に使われていれば、ユーザーごとに異なるソルトの分だけ事前にテーブルを用意し直す必要があり、この攻撃は実質的に無力化される。

## デジタル署名
秘密鍵でデータ(通常はそのハッシュ値)に署名し、対応する公開鍵で検証することで、データの作成者の真正性(なりすましでないこと)と非改ざん性(途中で書き換えられていないこと)を保証する仕組み。公開鍵暗号の「秘密鍵で暗号化したものは対応する公開鍵でしか正しく復号できない」という性質を逆方向に使ったもので、ソフトウェアの配布元の確認、電子契約、証明書の発行(認証局が証明書に対して行う署名)など幅広い場面で使われている。

<figure>
<svg viewBox="0 0 780 210" role="img" aria-label="デジタル署名の図解: 署名者は秘密鍵で署名を作成し、検証者は署名者の公開鍵でそれを検証する" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-sig" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="10" y="70" width="110" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="65" y="105" text-anchor="middle" font-size="13" fill="currentColor">署名者</text>
  <rect x="180" y="70" width="170" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="265" y="100" text-anchor="middle" font-size="12" fill="currentColor">ハッシュ化して</text>
  <text x="265" y="116" text-anchor="middle" font-size="12" fill="currentColor">秘密鍵で署名</text>
  <rect x="450" y="70" width="170" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="535" y="100" text-anchor="middle" font-size="12" fill="currentColor">公開鍵で</text>
  <text x="535" y="116" text-anchor="middle" font-size="12" fill="currentColor">署名を検証</text>
  <rect x="660" y="70" width="110" height="60" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="715" y="105" text-anchor="middle" font-size="13" fill="currentColor">検証者</text>
  <line x1="120" y1="100" x2="178" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-sig)"/>
  <text x="149" y="92" text-anchor="middle" font-size="10" fill="currentColor">メッセージ</text>
  <line x1="350" y1="100" x2="448" y2="100" stroke-width="1.5" marker-end="url(#arrow-sig)" style="stroke:var(--secondary)"/>
  <text x="399" y="88" text-anchor="middle" font-size="10" style="fill:var(--secondary)">メッセージ+署名</text>
  <line x1="620" y1="100" x2="658" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-sig)"/>
  <text x="639" y="88" text-anchor="middle" font-size="9" fill="currentColor">OK/NG</text>
  <rect x="180" y="8" width="170" height="38" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="265" y="31" text-anchor="middle" font-size="11" fill="currentColor">署名者の秘密鍵</text>
  <line x1="265" y1="46" x2="265" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-sig)"/>
  <rect x="450" y="8" width="170" height="38" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="535" y="31" text-anchor="middle" font-size="11" fill="currentColor">署名者の公開鍵</text>
  <line x1="535" y1="46" x2="535" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-sig)"/>
</svg>
<figcaption>暗号化とは鍵の使い方が逆になる点がポイント: 署名には署名者だけが持つ秘密鍵を使い、検証には誰でも使える署名者の公開鍵を使う。検証に成功すれば「本人が作成し、改ざんされていない」ことが確認できる。</figcaption>
</figure>

## PKI(公開鍵基盤)
公開鍵証明書の発行・管理・検証の仕組み全体を指す概念。「この公開鍵は本当にこの組織・人物のものである」という結び付けを保証するために、後述の認証局(CA)が身元確認を行って証明書を発行し、証明書失効リスト(CRL)やOCSPで失効状況を確認できるようにする、という一連の仕組みを総合してPKIと呼ぶ。HTTPSの通信先が正しいサーバであることを確認する仕組みも、このPKIの上に成り立っている。

<figure>
<svg viewBox="0 0 640 260" role="img" aria-label="PKI証明書チェーンの図解: ルートCAから中間CA、サーバ証明書へと署名が連鎖し、検証はその逆順にルートまでたどる" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-pki" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="20" y="20" width="220" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="130" y="50" text-anchor="middle" font-size="12" fill="currentColor">ブラウザ/OSの信頼ストア</text>
  <line x1="80" y1="70" x2="80" y2="108" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-pki)"/>
  <text x="130" y="95" text-anchor="start" font-size="10" fill="currentColor">事前に信頼(組み込み)</text>
  <rect x="20" y="110" width="160" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="100" y="140" text-anchor="middle" font-size="12" fill="currentColor">ルートCA</text>
  <line x1="180" y1="135" x2="238" y2="135" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-pki)"/>
  <text x="209" y="127" text-anchor="middle" font-size="10" fill="currentColor">署名</text>
  <rect x="240" y="110" width="160" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="320" y="140" text-anchor="middle" font-size="12" fill="currentColor">中間CA</text>
  <line x1="400" y1="135" x2="458" y2="135" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-pki)"/>
  <text x="429" y="127" text-anchor="middle" font-size="10" fill="currentColor">署名</text>
  <rect x="460" y="110" width="160" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="540" y="140" text-anchor="middle" font-size="12" fill="currentColor">サーバ証明書</text>
  <line x1="460" y1="185" x2="402" y2="185" stroke-width="1.5" marker-end="url(#arrow-pki)" style="stroke:var(--secondary)"/>
  <line x1="240" y1="185" x2="182" y2="185" stroke-width="1.5" marker-end="url(#arrow-pki)" style="stroke:var(--secondary)"/>
  <text x="320" y="202" text-anchor="middle" font-size="10" style="fill:var(--secondary)">検証はこの順でルートまでたどる</text>
</svg>
<figcaption>証明書は「ルートCA→中間CA→サーバ証明書」の順に署名で連鎖する。ブラウザは逆方向に、サーバ証明書から署名をたどってあらかじめ信頼しているルートCAに到達できるかを検証する。</figcaption>
</figure>

## 認証局(CA)
公開鍵証明書を発行し、申請者(ドメインや組織)の身元を保証する機関。ブラウザやOSにはあらかじめ主要な認証局のルート証明書が組み込まれており、この「信頼の起点」から発行された証明書の鎖(証明書チェーン)をたどって検証できる証明書は、ブラウザから「信頼できる」と判断される。認証局自体が不正に証明書を発行したり侵害されたりすると、PKI全体の信頼性が揺らぐため、認証局の運用には厳格な審査・監査基準が設けられている。

## 証明書失効リスト(CRL)/ OCSP
失効した証明書の一覧(CRL)、またはオンラインで証明書の有効性をリアルタイムに照会する仕組み(OCSP)。秘密鍵の漏えいや組織の廃業などで証明書を無効化したい場合、有効期限が来る前に失効させる必要があるが、CRLは失効した証明書のシリアル番号を定期的にまとめたリストを配布する方式のため、リストが更新されるまでの間は失効が反映されないタイムラグがある。OCSPは認証局に都度問い合わせてリアルタイムに有効性を確認できるため、より即時性が高い反面、問い合わせ先サーバの可用性に依存する欠点もある。

## SSL/TLS
通信を暗号化し、改ざん検知とサーバ認証(場合によってはクライアント認証も)を提供するプロトコル。SSLはTLSの前身で、脆弱性が多数発見されたため現在は使用が推奨されておらず、実質的にはTLS(TLS 1.2やTLS 1.3)が使われているが、慣習的に「SSL」という呼び方が今も広く残っている。HTTPをこのTLSで保護したものがHTTPSで、ブラウザのアドレスバーの鍵アイコンは、通信が暗号化され、かつ証明書によって接続先サーバの身元が確認できていることを示している。

## TLSハンドシェイク
クライアントとサーバが暗号方式(暗号スイート)を決定し、鍵交換と相互認証(通常はサーバ認証のみ)を行う一連の手続き。おおまかには、クライアントが対応可能な暗号方式一覧を提示し、サーバが使用する方式と自身の証明書を返し、証明書の検証後にDiffie-Hellman鍵交換などで共通鍵(セッション鍵)を安全に生成する、という流れで進む。TLS 1.3ではこのやり取りに必要な往復回数が削減され、TLS 1.2までと比べて接続開始までの時間が短縮されている。

<figure>
<svg viewBox="0 0 700 270" role="img" aria-label="TLSハンドシェイクの図解: クライアントとサーバがClientHello、ServerHello+証明書、鍵交換、Finishedの順にやり取りする" style="max-width:100%;height:auto;">
  <defs>
    <marker id="arrow-tls" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="90" y="10" width="120" height="36" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="150" y="33" text-anchor="middle" font-size="12" fill="currentColor">クライアント</text>
  <line x1="150" y1="46" x2="150" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
  <rect x="490" y="10" width="120" height="36" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="550" y="33" text-anchor="middle" font-size="12" fill="currentColor">サーバ</text>
  <line x1="550" y1="46" x2="550" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
  <line x1="150" y1="80" x2="548" y2="80" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-tls)"/>
  <text x="350" y="72" text-anchor="middle" font-size="11" fill="currentColor">① ClientHello(対応可能な暗号方式一覧)</text>
  <line x1="550" y1="120" x2="152" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-tls)"/>
  <text x="350" y="112" text-anchor="middle" font-size="11" fill="currentColor">② ServerHello + サーバ証明書</text>
  <line x1="150" y1="160" x2="548" y2="160" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow-tls)"/>
  <text x="350" y="152" text-anchor="middle" font-size="11" fill="currentColor">③ 証明書を検証 → 鍵交換用の情報を送付</text>
  <line x1="150" y1="200" x2="548" y2="200" stroke-width="1.5" marker-end="url(#arrow-tls)" style="stroke:var(--secondary)"/>
  <line x1="550" y1="215" x2="152" y2="215" stroke-width="1.5" marker-end="url(#arrow-tls)" style="stroke:var(--secondary)"/>
  <text x="350" y="238" text-anchor="middle" font-size="11" style="fill:var(--secondary)">④ Finished(以降は生成した共通鍵で暗号化通信)</text>
</svg>
<figcaption>証明書の検証後にDiffie-Hellman鍵交換などで共通鍵(セッション鍵)を安全に生成し、④以降はその共通鍵による暗号化通信に切り替わる。TLS 1.3ではこの往復回数がさらに削減されている。</figcaption>
</figure>

## Diffie-Hellman鍵交換
事前に秘密情報を共有せずに、公開情報のやり取りだけで通信する両者が共通の鍵を安全に生成できるアルゴリズム。双方が秘密に保持する値と公開して交換する値を使った計算によって、第三者が通信を傍受しても同じ鍵を計算することが困難(離散対数問題の困難性に基づく)という性質を利用しており、TLSなどのセッション鍵生成の基盤技術になっている。楕円曲線を使った改良版はECDH(楕円曲線Diffie-Hellman)と呼ばれる。

## PFS(前方秘匿性)
長期的に使われる秘密鍵(サーバ証明書の秘密鍵など)が将来漏えいしたとしても、過去にやり取りしたセッション(通信)の内容は解読できないようにする性質。鍵交換のたびに一時的な鍵(エフェメラル鍵)を新たに生成して使い捨てることで実現し、仮に攻撃者が過去の暗号化通信を記録しておいて後から長期鍵を手に入れても、その一時鍵は既に破棄されているため復号できない。TLS 1.3ではこの性質を持つ鍵交換方式が標準で必須とされている。

## 耐量子計算機暗号(PQC)
量子コンピュータによる解読に耐性を持つよう設計された新しい暗号方式。RSAや楕円曲線暗号の安全性は素因数分解や離散対数問題の困難さに依存しているが、将来十分な性能の量子コンピュータが実用化されると、これらの問題を高速に解くアルゴリズム(ショアのアルゴリズム)によって解読されてしまう可能性があるため、量子コンピュータでも解きにくい異なる数学的問題(格子問題など)に基づく新しい暗号への移行が各国で進められている。米国NISTが標準化を主導し、日本でも政府機関での移行方針が示されている。

## ハーベスト攻撃(HNDL攻撃)
現在は解読できない暗号化通信を盗聴・保存しておき、将来量子計算機などで解読することを狙う攻撃手法(Harvest Now, Decrypt Laterの略)。今すぐ解読できなくても、長期間保存しておく価値のある機密情報(国家機密や長期間有効な個人情報など)であれば、数年後に量子コンピュータが実用化された時点で解読するという時間差の攻撃が成立しうる。この脅威が、前述の耐量子計算機暗号への移行を急ぐ大きな理由の一つになっている。

## プライベートCA / 自己署名証明書
組織内など限定された範囲で利用するため、パブリックな認証局を介さずに自分たちで発行する証明書。社内システムや検証環境など、不特定多数の外部ユーザーがアクセスしない用途であれば、費用のかかるパブリック認証局に証明書を発行してもらう必要がなく、OpenSSLなどを使って自前の認証局(プライベートCA)を立てて証明書を発行できる。ただし、ブラウザやOSにはこのプライベートCAのルート証明書が最初から組み込まれていないため、各端末に手動でルート証明書をインストールして信頼させる作業が必要になる。

## EV証明書 / DV証明書
EV証明書(Extended Validation)は申請organizationの法的な実在性や事業の正当性を認証局が厳格に審査して発行される証明書で、以前はブラウザのアドレスバーに組織名が表示されるなど視覚的な差別化がされていた。DV証明書(Domain Validation)はドメインの管理権限があることの確認のみで発行される審査の簡易な証明書で、無料で自動発行できるLet's Encryptなどに代表され、現在のHTTPS普及の大部分を支えている。審査が簡易な分、DV証明書は「暗号化されている」ことは保証するが「運営組織が信頼できる」ことまでは保証しない点に注意が必要。

## 多要素認証(MFA)
「知識情報(本人だけが知っているパスワードなど)」「所持情報(本人だけが持っているスマートフォンやハードウェアトークンなど)」「生体情報(指紋や顔など本人の身体的特徴)」という異なる種類の認証要素のうち、2つ以上を組み合わせて行う認証。パスワードが漏えいしただけでは認証を突破できなくなるため、フィッシングや情報漏えいによる不正ログインへの対策として広く推奨されており、特に重要なシステムへのアクセスでは必須とされることが多い。

## 2要素認証
多要素認証のうち、特に2種類の認証要素を組み合わせるもの。パスワード(知識情報)に加えてスマートフォンのアプリが生成するワンタイムパスワード(所持情報)を入力させる、といった構成が代表的で、個人向けのオンラインサービスでも広く普及している「二段階認証」という呼び方は、厳密には同じ要素(知識情報を2回)を使うケースも含むため、2要素認証とは完全に同義ではない点に注意したい。

## ワンタイムパスワード(OTP)
一度しか使えない、または短時間しか有効でないパスワード。現在時刻に基づいて一定時間ごとに新しい値を生成するTOTP(Time-based OTP)と、ボタン操作などのカウンタに基づいて生成するHOTP(HMAC-based OTP)に大きく分けられ、Google AuthenticatorなどのスマートフォンアプリはTOTPを利用していることが多い。仮に過去に使われたOTPを盗聴されても、既に無効になっているため再利用による不正ログインを防げる点が、固定のパスワードと比べた大きな利点となる。

## FIDO2 / パスキー
公開鍵暗号を用いて、パスワードを使わずに生体認証やデバイスの所持(PINロック解除など)で認証を行う規格。端末内で生成された秘密鍵は端末の外に出ることがなく、サービス側には公開鍵だけが登録されるため、サーバ側のデータベースが漏えいしてもパスワードのように悪用される情報が流出しない。ユーザーが入力する「パスワード」そのものが存在しないため、偽サイトに誘導して入力させるフィッシング攻撃が原理的に成立しにくく、フィッシング耐性の高い認証方式として「パスキー」という名称で急速に普及が進んでいる。

## チャレンジレスポンス認証 / CHAP
サーバが毎回ランダムに異なる値(チャレンジ)を送り、クライアントがその値と自身が持つ秘密情報(パスワードなど)を組み合わせて計算した応答(レスポンス)を返すことで、パスワード自体を通信路に平文のまま流さずに認証を行う方式。通信を盗聴されても、使われたチャレンジは毎回異なるため、盗聴した応答を再利用(リプレイ)しても次回の認証には使えない。PPP接続などで使われたCHAP(Challenge Handshake Authentication Protocol)がこの方式の代表例として知られている。

## シングルサインオン(SSO)
一度の認証で複数のシステム・サービスを利用できるようにする仕組み。利用者はサービスごとに別々のID・パスワードを覚えて何度もログインする必要がなくなり、利便性が向上するとともに、管理者側もID管理を一元化しやすくなる。実現方式には、後述のKerberosのようにチケットを発行する方式や、SAML・OpenID Connectのように外部のID提供者(IdP)が認証を代行し、各サービス(SP)がその結果を信頼する方式などがある。

## Kerberos
チケットベースの認証プロトコル。鍵配布センター(KDC)に一度だけ認証を行うと、サービスごとに使い回せる「チケット」が発行され、以降は各サービスへアクセスする際にそのチケットを提示するだけでよく、パスワードを都度送信する必要がない。認証を担当するAS(認証サーバ)と、チケットの発行を担当するTGS(チケット発行サーバ)がKDCの中で役割分担しており、ActiveDirectoryをはじめ多くのSSO実装の基盤技術として使われている。

## SAML / OAuth / OpenID Connect
SAMLはXMLベースのシングルサインオン規格で、企業の社内システム間連携などで古くから使われている。OAuthは「第三者アプリへのリソースアクセス権限の委譲」を目的とした規格で、例えば外部サービスに自分のGoogleアカウントの連絡先へのアクセスだけを許可する、といった用途に使われ、本来は「認証」ではなく「認可」のための仕組みである点に注意が必要。OpenID ConnectはこのOAuthの仕組みを土台にして、本人確認(認証)の機能を追加した規格で、現在の「Googleでログイン」のような外部IDログインの多くはこの仕組みを使っている。

## リスクベース認証
ログイン時の端末情報・IPアドレスや位置情報・時間帯・行動パターンなどのリスク要因を評価し、リスクが高いと判断された場合にのみ追加の認証(多要素認証など)を要求する動的な認証方式。普段使っている端末・場所からのログインであれば利便性を優先してパスワードのみで通過させ、普段と異なる国からのアクセスなど不自然な要素があれば追加確認を求めることで、セキュリティと利便性のバランスを取る狙いがある。

## 本人認証 / 本人拒否率(FRR) / 他人受入率(FAR)
本人認証とは、アクセスしてきた人物が本当に登録された本人であることを確認する行為全般を指す。特に生体認証の精度を評価する指標として、本人であるにもかかわらず誤って認証を拒否してしまう割合を本人拒否率(FRR: False Rejection Rate)、本人でない他人を誤って本人として認証してしまう割合を他人受入率(FAR: False Acceptance Rate)と呼び、この2つはトレードオフの関係にあるため、用途のリスクに応じて適切なバランス(閾値)を設定する必要がある。

## 離散対数問題
ある数(底)を何度も累乗した結果が分かっているときに、元の指数を求める計算が非常に困難であるという数学的性質。例えば小さな数であれば総当たりで解けても、十分に大きな数を扱う有限体や楕円曲線上ではこの計算が現実的な時間では解けないほど困難になるため、前述のDiffie-Hellman鍵交換や楕円曲線暗号など、多くの公開鍵暗号の安全性の根拠として利用されている。
