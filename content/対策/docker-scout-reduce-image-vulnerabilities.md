---
title: "docker scoutでimageの脆弱性を減らしていく手順"
date: 2024-03-24
tags: ["countermeasure", "Docker", "dockerfile", "DockerHub", "Scout"]
source: "https://qiita.com/ohtsuka-shota/items/8f22054d4e85174d3aa8"
---
こんにちは。
株式会社クラスアクト インフラストラクチャ事業部の大塚です。

前回、docker scoutを出来る環境をCUI上に用意しました。
手順は以下をご覧ください。

[[docker-scout-vulnerability-scan-dashboard]]

今回はこの続きを行います。docker imageの脆弱性をscoutで確認し、修正していきたいと思います。

# 構築イメージ
雑ですが、こんな感じでしょうか？
docker hubに前回の記事でpushしたv1があります。v1に対してscoutでimageの脆弱性診断を実施。脆弱性内容を確認しDockerfileを修正。Dockerfileから2つのimage（Refresh及びChangeというtag付けしたもの）を生成し再push。再pushしたRefresh/Changeの脆弱性がv1より減少しているかを確認していきます。

![docker-ページ26-1.drawio.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/1eada2f0-a886-6e15-3794-5db5d95da4b1.png)



# 手順
## 前回の復習（パッケージに関連する脆弱性の取得）
前回脆弱性診断をしたときのコマンドの実行結果を改めて示します。
What’s Next?というところを見てみると”docker scout recommendations shotaohtsuka/scout-demo:v1”というコマンドがあります。このコマンドを叩くことで指定したimageに対してどういう修正をしていけばいいかおすすめを表示してくれる流れの様です。ちなみにここで叩いた<font color=red>"docker scout cves --only-package express"はパッケージに関連する脆弱性のみ取得</font>しています。
```
root@ohtsuka-swarm01:~# docker scout cves --only-package express
    i New version 1.6.3 available (installed version is 1.6.0) at https://github.com/docker/scout-cli
    ✓ SBOM of image already cached, 79 packages indexed
    ✗ Detected 1 vulnerable package with 1 vulnerability


## Overview

                    x       Analyzed Image
qqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
  Target            x
    digest          x  a3eaeba5365f
    platform        x linux/amd64
    vulnerabilities x    0C     1H     0M     0L
    size            x 22 MB
    packages        x 1


## Packages and Vulnerabilities

   0C     1H     0M     0L  express 4.17.1
pkg:npm/express@4.17.1

    ✗ HIGH CVE-2022-24999 [OWASP Top Ten 2017 Category A9 - Using Components with Known Vulnerabilities]
      https://scout.docker.com/v/CVE-2022-24999?s=gitlab&n=express&t=npm&vr=%3C4.17.3
      Affected range : <4.17.3
      Fixed version  : 4.17.3
      CVSS Score     : 7.5
      CVSS Vector    : CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H



1 vulnerability found in 1 package
  LOW       0
  MEDIUM    0
  HIGH      1
  CRITICAL  0


What's Next?
  View base image update recommendations → docker scout recommendations shotaohtsuka/scout-demo:v1
```

## imageの脆弱性取得
実際にreccomendationsと打ちこみ、docker imageの脆弱性を取得してみます。
結構長々と出力されます。以下で少し細かく確認していきます。
```
root@ohtsuka-swarm01:~# docker scout recommendations shotaohtsuka/scout-demo:v1
    i New version 1.6.3 available (installed version is 1.6.0) at https://github.com/docker/scout-cli
    ✓ SBOM of image already cached, 79 packages indexed

  Target   x  shotaohtsuka/scout-demo:v1
    digest x  a3eaeba5365f

## Recommended fixes

  Base image is  alpine:3

  Name            x  3
  Digest          x  sha256:be9bdc0ef8e96dbc428dc189b31e2e3b05523d96d12ed627c37aa2936653258c
  Vulnerabilities x    2C    16H     7M     0L     1?
  Pushed          x 2 years ago
  Size            x 2.8 MB
  Packages        x 18
  OS              x 3.14.1


  x The base image is also available under the supported tag(s) `latest`. If you want to display
  x recommendations specifically for a different tag, please re-run the command using the `--tag` flag.



Refresh base image
  Rebuild the image using a newer base image version. Updating this may result in breaking changes.


            Tag            x                        Details                         x   Pushed    x          Vulnerabilities
qqqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
   3                       x Benefits:                                              x 1 month ago x    0C     0H     0M     0L
  Newer image for same tag x ~ Newer image for same tag                             x             x    -2    -16     -7            -1
  Also known as:           x ~ Minor OS version update                              x             x                  
  ~ 3.19.1                 x ~ Tag is preferred tag                                 x             x                  
  ~ 3.19                   x ~ Tag was pushed more recently                         x             x                  
  ~ latest                 x ~ Tag is latest                                        x             x                  
                           x ~ Image introduces no new vulnerability but removes 25 x             x                  
                           x ~ Image contains similar number of packages            x             x                  
                           x ~ 3 was pulled 251K times last month                   x             x                  
                           x                                                        x             x                  
                           x Image details:                                         x             x                  
                           x ~ Size: 3.4 MB                                         x             x                  
                           x ~ OS: 3.19.1                                           x             x                  
                           x                                                        x             x                  
                           x                                                        x             x                  
                           x                                                        x             x                  


Change base image
  The list displays new recommended tags in descending order, where the top results are rated as most suitable.


            Tag           x                             Details                             x   Pushed    x          Vulnerabilities
qqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
   3.16                   x Benefits:                                                       x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Image is smaller by 5.0 KB                                    x             x    -2    -16     -7            -1
  Also known as:          x ~ Minor OS version update                                       x             x          
  ~ 3.16.9                x ~ Tag was pushed more recently                                  x             x          
                          x ~ Image introduces no new vulnerability but removes 25          x             x          
                          x ~ Image contains equal number of packages                       x             x          
                          x ~ 3.16 is the second most popular tag with 307K pulls per month x             x          
                          x                                                                 x             x          
                          x Image details:                                                  x             x          
                          x ~ Size: 2.8 MB                                                  x             x          
                          x ~ OS: 3.16.9                                                    x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
   3.18                   x Benefits:                                                       x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Minor OS version update                                       x             x    -2    -16     -7            -1
  Also known as:          x ~ Tag was pushed more recently                                  x             x          
  ~ 3.18.6                x ~ Image introduces no new vulnerability but removes 25          x             x          
                          x ~ Image contains similar number of packages                     x             x          
                          x                                                                 x             x          
                          x Image details:                                                  x             x          
                          x ~ Size: 3.4 MB                                                  x             x          
                          x ~ OS: 3.18.6                                                    x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
   3.17                   x Benefits:                                                       x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Minor OS version update                                       x             x    -2    -16     -7            -1
  Also known as:          x ~ Tag was pushed more recently                                  x             x          
  ~ 3.17.7                x ~ Image introduces no new vulnerability but removes 25          x             x          
                          x ~ Image contains similar number of packages                     x             x          
                          x ~ 3.17 was pulled 152K times last month                         x             x          
                          x                                                                 x             x          
                          x Image details:                                                  x             x          
                          x ~ Size: 3.4 MB                                                  x             x          
                          x ~ OS: 3.17.7                                                    x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
```
まずは以下の部分です。脆弱性取得をしたimageのベースが何なのかを表示してくれている様子です。hubにpushされたのが2年前という事やバージョンなどが確認出来そうです。また、<font color=red><b>"Vulnerabilities x    2C(Critical)    16H(High)     7M(Medium)     0L(Low)     1?"</b></font>との記載があり、これが今回でいうと、docker image alpine:3.14.1の脆弱性を示すようです。CriticalやHighがあるのはいただけないですね・・・
```
  Base image is  alpine:3

  Name            x  3
  Digest          x  sha256:be9bdc0ef8e96dbc428dc189b31e2e3b05523d96d12ed627c37aa2936653258c
  Vulnerabilities x    2C    16H     7M     0L     1?
  Pushed          x 2 years ago
  Size            x 2.8 MB
  Packages        x 18
  OS              x 3.14.1
```
このimageはdocker hubでいうと以下になるかと思います。

https://hub.docker.com/layers/library/alpine/3.14.1/images/sha256-be9bdc0ef8e96dbc428dc189b31e2e3b05523d96d12ed627c37aa2936653258c?context=explore

![2024032401.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3219385/f91a54c9-f4ef-4fc0-d7ee-0ce5e5ddc78c.png)

続いて以下の部分
”Refresh base image”と”Change base image”という項目があります。Refresh base imageとChange base imageそれぞれの方法でおすすめのdocker imageを提示してくれているのかなと思っています。ChatGPTに聞いてみた感じ、マイナーアップデートとメジャーアップデートみたいなイメージらしいですが、そうなんでしょうか・・・？
公式サイトでは以下に記載がありそうです。

https://docs.docker.com/scout/image-details-view/#recommendations-for-base-image

---
<b>Refresh base image：基本イメージの更新。恐らくマイナーアップデートに相当？</b>
- 既存の基本イメージを更新することで、新しいセキュリティパッチや最新の機能を利用できます。
- 既存のコードや構成に変更を加えずに更新できる場合、簡単で安全な方法です。
- ただし、新しいバージョンには互換性の問題がある可能性があります。このため、更新によってアプリケーションが壊れる可能性があります。

<b>Change base image：基本イメージを変更。恐らくメジャーアップデートに相当？</b>
- 新しい基本イメージに切り替えることで、より最新のOSや機能を利用できます。
- 他のOSや構成に移行する場合、互換性の問題がより大きくなる可能性があります。
- アプリケーションに影響を与えるリスクが高いため、慎重に計画する必要があります。
---
```
Refresh base image
  Rebuild the image using a newer base image version. Updating this may result in breaking changes.


            Tag            x                        Details                         x   Pushed    x          Vulnerabilities
qqqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
   3                       x Benefits:                                              x 1 month ago x    0C     0H     0M     0L
  Newer image for same tag x ~ Newer image for same tag                             x             x    -2    -16     -7            -1
  Also known as:           x ~ Minor OS version update                              x             x                  
  ~ 3.19.1                 x ~ Tag is preferred tag                                 x             x                  
  ~ 3.19                   x ~ Tag was pushed more recently                         x             x                  
  ~ latest                 x ~ Tag is latest                                        x             x                  
                           x ~ Image introduces no new vulnerability but removes 25 x             x                  
                           x ~ Image contains similar number of packages            x             x                  
                           x ~ 3 was pulled 251K times last month                   x             x                  
                           x                                                        x             x                  
                           x Image details:                                         x             x                  
                           x ~ Size: 3.4 MB                                         x             x                  
                           x ~ OS: 3.19.1                                           x             x                  
                           x                                                        x             x                  
                           x                                                        x             x                  
                           x                                                        x             x                  

★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

Change base image
  The list displays new recommended tags in descending order, where the top results are rated as most suitable.


            Tag           x                             Details                             x   Pushed    x          Vulnerabilities
qqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
   3.16                   x Benefits:                                                       x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Image is smaller by 5.0 KB                                    x             x    -2    -16     -7            -1
  Also known as:          x ~ Minor OS version update                                       x             x          
  ~ 3.16.9                x ~ Tag was pushed more recently                                  x             x          
                          x ~ Image introduces no new vulnerability but removes 25          x             x          
                          x ~ Image contains equal number of packages                       x             x          
                          x ~ 3.16 is the second most popular tag with 307K pulls per month x             x          
                          x                                                                 x             x          
                          x Image details:                                                  x             x          
                          x ~ Size: 2.8 MB                                                  x             x          
                          x ~ OS: 3.16.9                                                    x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
   3.18                   x Benefits:                                                       x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Minor OS version update                                       x             x    -2    -16     -7            -1
  Also known as:          x ~ Tag was pushed more recently                                  x             x          
  ~ 3.18.6                x ~ Image introduces no new vulnerability but removes 25          x             x          
                          x ~ Image contains similar number of packages                     x             x          
                          x                                                                 x             x          
                          x Image details:                                                  x             x          
                          x ~ Size: 3.4 MB                                                  x             x          
                          x ~ OS: 3.18.6                                                    x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
   3.17                   x Benefits:                                                       x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Minor OS version update                                       x             x    -2    -16     -7            -1
  Also known as:          x ~ Tag was pushed more recently                                  x             x          
  ~ 3.17.7                x ~ Image introduces no new vulnerability but removes 25          x             x          
                          x ~ Image contains similar number of packages                     x             x          
                          x ~ 3.17 was pulled 152K times last month                         x             x          
                          x                                                                 x             x          
                          x Image details:                                                  x             x          
                          x ~ Size: 3.4 MB                                                  x             x          
                          x ~ OS: 3.17.7                                                    x             x          
                          x                                                                 x             x          
                          x                                                                 x             x          
                          x      
```

## Dockerfileを編集してimageを更新する
scoutにおすすめされたimageを使うように更新をかけていきます。具体的には、Dockerfileを使ってapline:3.19.1（Refreshでおすすめされたバージョン）とapline:3.16.9（Changeでおすすめされたバージョン）でそれぞれimageを作り直していきます。

まずはRefreshの方を作ります。
Refresh用のDockerfileは以下。FROMで指定しているdocker imageのみ変更しています
```
root@ohtsuka-swarm01:~/scout-demo-service# ls
app.js  Dockerfile  dummy.sh  install.sh  package.json  README.md
root@ohtsuka-swarm01:~/scout-demo-service# cp -p Dockerfile Dockerfile.origin
root@ohtsuka-swarm01:~/scout-demo-service# vi Dockerfile
root@ohtsuka-swarm01:~/scout-demo-service# diff Dockerfile Dockerfile.origin
1c1
< FROM alpine:3.19.1
---
> FROM alpine:3.14@sha256:eb3e4e175ba6d212ba1d6e04fc0782916c08e1c9d7b45892e9796141b1d379ae
```
imageをbuildしてそのままpushします。imageのtagはRefreshとしました。
```
root@ohtsuka-swarm01:~/scout-demo-service# docker build --push -t shotaohtsuka/scout-demo:Refresh .
[+] Building 49.5s (12/12) FINISHED                            docker:default
 => [internal] load build definition from Dockerfile                     0.0s
 => => transferring dockerfile: 410B                                     0.0s
 => [internal] load metadata for docker.io/library/alpine:3.19.1         2.4s
 => [auth] library/alpine:pull token for registry-1.docker.io            0.0s
 => [internal] load .dockerignore                                        0.0s
 => => transferring context: 52B                                         0.0s
 => [1/5] FROM docker.io/library/alpine:3.19.1@sha256:c5b1261d6d3e43071  0.9s
 => => resolve docker.io/library/alpine:3.19.1@sha256:c5b1261d6d3e43071  0.2s
 => => sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532 528B / 528B  0.0s
 => => sha256:05455a08881ea9cf0e752bc48e61bbd71a34c029b 1.47kB / 1.47kB  0.0s
 => => sha256:4abcf20661432fb2d719aaf90656f55c287f8ca91 3.41MB / 3.41MB  0.3s
 => => sha256:c5b1261d6d3e43071626931fc004f70149baeba2c 1.64kB / 1.64kB  0.0s
 => => extracting sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c  0.1s
 => [internal] load build context                                        0.1s
 => => transferring context: 20.51kB                                     0.0s
 => [2/5] RUN apk add --no-cache   nodejs                                2.7s
 => [3/5] COPY package.json ./                                           0.2s
 => [4/5] RUN  apk add --no-cache npm  && npm i --no-optional  && npm   19.5s
 => [5/5] COPY . /app                                                    0.3s
 => exporting to image                                                   0.9s
 => => exporting layers                                                  0.9s
 => => writing image sha256:85cf978733350eea007a159bcf2862879a0a9a88b4f  0.0s
 => => naming to docker.io/shotaohtsuka/scout-demo:Refresh               0.0s
 => pushing shotaohtsuka/scout-demo:Refresh with docker                 18.9s
 => => pushing layer 1a12f631fd89                                        4.9s
 => => pushing layer 1781d15e1db8                                        5.5s
 => => pushing layer cf318f9ae883                                       18.4s
 => => pushing layer 44587f0f3d17                                       13.5s
 => => pushing layer d4fc045c9e3a                                       18.4s
```
Changeもやってみます。
Dockerfileは以下です。そのままpushします。
```
oot@ohtsuka-swarm01:~/scout-demo-service# ls
app.js      Dockerfile.origin  install.sh    README.md
Dockerfile  dummy.sh           package.json
root@ohtsuka-swarm01:~/scout-demo-service# cp -p Dockerfile Dockerfile.Refresh
root@ohtsuka-swarm01:~/scout-demo-service# vi Dockerfile
root@ohtsuka-swarm01:~/scout-demo-service# diff Dockerfile Dockerfile.Refresh
1c1
< FROM alpine:3.16.9
---
> FROM alpine:3.19.1

root@ohtsuka-swarm01:~/scout-demo-service# docker build --push -t shotaohtsuka/scout-demo:Change .
[+] Building 46.8s (11/11) FINISHED                            docker:default
 => [internal] load build definition from Dockerfile                     0.0s
 => => transferring dockerfile: 410B                                     0.0s
 => [internal] load metadata for docker.io/library/alpine:3.16.9         1.5s
 => [internal] load .dockerignore                                        0.0s
 => => transferring context: 52B                                         0.0s
 => [internal] load build context                                        0.1s
 => => transferring context: 3.11kB                                      0.0s
 => [1/5] FROM docker.io/library/alpine:3.16.9@sha256:452e7292acee0ee16  0.9s
 => => resolve docker.io/library/alpine:3.16.9@sha256:452e7292acee0ee16  0.1s
 => => sha256:452e7292acee0ee16c332324d7de05fa2c99f9994 1.64kB / 1.64kB  0.0s
 => => sha256:0db9d004361b106932f8c7632ae54d56e92c18281e2dd 528B / 528B  0.0s
 => => sha256:d49a5025be10344cce77d178103a225cb5d731686 1.47kB / 1.47kB  0.0s
 => => sha256:a88dc8b54e91eb6b19695ef7e04865926d4df2300 2.81MB / 2.81MB  0.4s
 => => extracting sha256:a88dc8b54e91eb6b19695ef7e04865926d4df23004f414  0.1s
 => [2/5] RUN apk add --no-cache   nodejs                                2.1s
 => [3/5] COPY package.json ./                                           0.3s
 => [4/5] RUN  apk add --no-cache npm  && npm i --no-optional  && npm   18.0s
 => [5/5] COPY . /app                                                    0.2s
 => exporting to image                                                   0.7s
 => => exporting layers                                                  0.7s
 => => writing image sha256:c4ce48e4806f46bc43607528bf8b0f5a5994a953cdc  0.0s
 => => naming to docker.io/shotaohtsuka/scout-demo:Change                0.0s
 => pushing shotaohtsuka/scout-demo:Change with docker                  19.7s
 => => pushing layer 23977f4eea09                                        5.2s
 => => pushing layer dd2016af8145                                        6.2s
 => => pushing layer cf318f9ae883                                       19.1s
 => => pushing layer b7599914177a                                       14.5s
 => => pushing layer 5535fda0356b                                       19.1s
```

## 変更したimageに対して脆弱性を取得する
RefreshとChangeについてそれぞれのimageの脆弱性を取得してみます。
まずはRefreshを見てみます。  <font color=red><b>“Vulnerabilities x    0C     0H     0M     0L”となっており最初の “Vulnerabilities x    2C    16H     7M     0L     1?”の状態から数値が減少している（≒脆弱性が改善）されている</b></font>ことがわかりますね。
scoutで推奨されたimageを使用することで少なくともdocker imageにおいては脆弱性が排除されたと考えることが出来そうです。パッケージの脆弱性（この記事の最初で記載したコマンド"docker scout cves --only-package express"の出力結果）はまだ改善していない認識です。それは今後…
```
root@ohtsuka-swarm01:~/scout-demo-service# docker scout recommendations shotaohtsuka/scout-demo:Refresh
    i New version 1.6.3 available (installed version is 1.6.0) at https://github.com/docker/scout-cli
    ...Storing image for indexing
    ✓ Image stored for indexing
    ...Indexing
    ✓ Indexed 87 packages

  Target   x  shotaohtsuka/scout-demo:Refresh
    digest x  85cf97873335

## Recommended fixes

  Base image is  alpine:3

  Name            x  3                                                        
  Digest          x  sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0
  Vulnerabilities x    0C     0H     0M     0L                                
  Pushed          x 1 month ago                                               
  Size            x 3.4 MB                                                    
  Packages        x 19                                                        
  OS              x 3.19.1                                                    


  x The base image is also available under the supported tag(s)
  x `3.19`, `3.19.1`, `latest`. If you want to display
  x recommendations specifically for a different tag, please re-run
  x the command using the `--tag` flag.



Refresh base image
  Rebuild the image using a newer base image version. Updating this may result in breaking changes.

  ✓ This image version is up to date.


Change base image
  The list displays new recommended tags in descending order, where the top results are rated as most suitable.

  ✓ There are no tag recommendations at this time.
```
一方でChange側も確認してみます。<font color=red><b>imageの脆弱性は”Vulnerabilities x    0C     0H     0M     0L ”という出力からRefresh同様無くなったと考えてよさそうです。ただ、Changeのところで「3.19.1に変えたほうがいいよ！」という出力が見受けられます。</b></font>
今回はRefresh側のtag:3.19.1のイメージを使った方がよさそうだという事がなんとなくわかりました。
```
root@ohtsuka-swarm01:~/scout-demo-service# docker scout recommendations shotaohtsuka/scout-demo:Change
    i New version 1.6.3 available (installed version is 1.6.0) at https://github.com/docker/scout-cli
    ✓ SBOM of image already cached, 82 packages indexed

  Target   x  shotaohtsuka/scout-demo:Change
    digest x  c4ce48e4806f

## Recommended fixes

  Base image is  alpine:3.16

  Name            x  3.16                                                     
  Digest          x  sha256:0db9d004361b106932f8c7632ae54d56e92c18281e2dd203127d77405020abf6
  Vulnerabilities x    0C     0H     0M     0L                                
  Pushed          x 1 month ago                                               
  Size            x 2.8 MB                                                    
  Packages        x 18                                                        
  OS              x 3.16.9                                                    


  x The base image is also available under the supported tag(s)
  x `3.16.9`. If you want to display recommendations specifically
  x for a different tag, please re-run the command using the `--tag`
  x flag.



Refresh base image
  Rebuild the image using a newer base image version. Updating this may result in breaking changes.

  ✓ This image version is up to date.


Change base image
  The list displays new recommended tags in descending order, where the top results are rated as most suitable.


            Tag           x                   Details                   x   Pushed    x       Vulnerabilities
qqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnqqqqqqqqqqqqqnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
   3.19                   x Benefits:                                   x 1 month ago x    0C     0H     0M     0L
  Tag is preferred tag    x ~ Minor OS version update                   x             x
  Also known as:          x ~ Tag is preferred tag                      x             x
  ~ 3.19.1                x ~ Tag is latest                             x             x
  ~ 3                     x ~ Image has same number of vulnerabilities  x             x
  ~ latest                x ~ Image contains similar number of packages x             x
                          x                                             x             x
                          x Image details:                              x             x
                          x ~ Size: 3.4 MB                              x             x
                          x ~ OS: 3.19.1                                x             x
                          x                                             x             x
                          x                                             x             x
                          x                                             x             x
   3.18                   x Benefits:                                   x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Minor OS version update                   x             x
  Also known as:          x ~ Image has same number of vulnerabilities  x             x
  ~ 3.18.6                x ~ Image contains similar number of packages x             x
                          x                                             x             x
                          x Image details:                              x             x
                          x ~ Size: 3.4 MB                              x             x
                          x ~ OS: 3.18.6                                x             x
                          x                                             x             x
                          x                                             x             x
                          x                                             x             x
   3.17                   x Benefits:                                   x 1 month ago x    0C     0H     0M     0L
  Minor OS version update x ~ Minor OS version update                   x             x
  Also known as:          x ~ Image has same number of vulnerabilities  x             x
  ~ 3.17.7                x ~ Image contains similar number of packages x             x
                          x ~ 3.17 was pulled 152K times last month     x             x
                          x                                             x             x
                          x Image details:                              x             x
                          x ~ Size: 3.4 MB                              x             x
                          x ~ OS: 3.17.7                                x             x
                          x                                             x             x
                          x                                             x             x
                          x                                             x             x

```

