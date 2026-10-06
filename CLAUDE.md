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
