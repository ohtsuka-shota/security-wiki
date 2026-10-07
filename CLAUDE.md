# セキュリティWiki執筆ガイドライン

## 記事構成テンプレート

### 脆弱性記事
- CVE番号・発見日
- 影響範囲（対象バージョン、CVSS）
- 攻撃手法の概要
- 対策方法（パッチ、緩和策）
- 参考リンク（CVE Database、JPCERT/CC、IPA）

### インシデント記事
- 発生日時・発覚経緯
- 被害状況
- 攻撃者のTTP（Tactics, Techniques, Procedures）
- タイムライン
- 教訓と対策

## Frontmatter必須項目

---
title: 記事タイトル
date: YYYY-MM-DD
tags: [vulnerability, incident, countermeasure, tool]
---

## 情報源
- CVE Database: https://cve.mitre.org/
- JPCERT/CC: https://www.jpcert.or.jp/
- IPA: https://www.ipa.go.jp/security/

## 新規ページの作成方法

1. **Obsidianで新規ノートを作成**
   対象フォルダ(`対策`・`インシデント`・`環境構築`・`脆弱性`・`用語集`)を右クリック→「新規ノート」。ファイル名がそのままURLのスラッグになるので、英数字ハイフン推奨(日本語ファイル名だとURLが長いエンコード文字列になる)。

2. **frontmatterを付ける**
   上記「Frontmatter必須項目」の形式で先頭に追加する。

3. **本文を書く**
   `[[記事名]]`でObsidianのWikiリンクが使える。ファイル名が一致していればフォルダが違っても自動でリンクされる。

4. **GitHubにpushする**
   - Claude Codeに「pushして」と頼む
   - 自分で `git add -A && git commit -m "..." && git push`
   - Obsidian Gitプラグインを導入すれば自動コミット・push可能

pushすると、GitHub Actionsが自動でビルド・デプロイし、数分後に https://ohtsuka-shota.github.io/security-wiki に反映される。
