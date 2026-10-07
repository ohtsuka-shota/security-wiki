---
title: Windows環境へのランサムウェア（動作検証用）のホームラボ構築計画
date: 2026-10-07
tags:
  - tool
  - vulnerability
  - Windows
  - ransomware
---

> この記事は検証予定の計画メモです。実際にホームラボで実施した後、結果や詰まった点を追記していきます。


---

```markdown
# Windows ランサムウェア動作シミュレータ（教育用）

## 概要
Windows 環境を対象としたランサムウェアの動作を**安全にシミュレート**する教育用ツール。  
実際の暗号化・システム変更は行わない。

---

## 目的
- ランサムウェアの攻撃手法を理解する
- 防御策・検知方法を学ぶ
- セキュリティ教育・研修用

---

## ソースコード

### ファイル名
`windows_ransomware_simulator.py`

### 完全コード
\`\`\`python
#!/usr/bin/env python3
"""
windows_ransomware_simulator.py
Windows 環境を対象としたランサムウェア動作シミュレータ（教育用）
実際の暗号化は行わない
"""

import os
import sys
import json
import hashlib
import platform
from datetime import datetime
from pathlib import Path

class WindowsRansomwareSimulator:
    def __init__(self):
        self.is_windows = platform.system() == "Windows"
        self.target_extensions = [
            '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.pdf', '.txt', '.jpg', '.jpeg', '.png', '.mp3', '.mp4',
            '.zip', '.rar', '.sql', '.mdb', '.db'
        ]
        self.simulated_encrypted = []
        self.log_file = "windows_ransomware_simulation_log.json"
        
    def get_windows_directories(self):
        """Windows の標準ディレクトリを取得"""
        if self.is_windows:
            try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                    r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders") as key:
                    desktop = winreg.QueryValueEx(key, "Desktop")[0]
                    documents = winreg.QueryValueEx(key, "Personal")[0]
                    pictures = winreg.QueryValueEx(key, "My Pictures")[0]
                    return {
                        "Desktop": Path(desktop),
                        "Documents": Path(documents),
                        "Pictures": Path(pictures)
                    }
            except:
                pass
        
        base = Path.home() / "Windows_Simulation"
        return {
            "Desktop": base / "Desktop",
            "Documents": base / "Documents", 
            "Pictures": base / "Pictures"
        }
    
    def create_test_environment(self):
        """テスト環境作成"""
        print("[*] Windows テスト環境を作成中...")
        
        dirs = self.get_windows_directories()
        for name, path in dirs.items():
            path.mkdir(parents=True, exist_ok=True)
            
            test_files = [
                f"仕様書_{name}.docx",
                f"給与計算_{name}.xlsx", 
                f"家族写真_{name}.jpg",
                f"顧客データ_{name}.txt"
            ]
            
            for filename in test_files:
                filepath = path / filename
                filepath.write_text(f"Windows テストファイル: {filename}\n" * 20)
                
        print(f"[+] テストディレクトリを作成:")
        for name, path in dirs.items():
            print(f"    {name}: {path}")
            
        return dirs
    
    def simulate_registry_persistence(self):
        """レジストリ永続化のシミュレーション"""
        print("\n[*] レジストリ永続化シミュレーション:")
        
        registry_entries = [
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce",
            r"HKLM\Software\Microsoft\Windows\CurrentVersion\Run"
        ]
        
        for entry in registry_entries:
            print(f"    [SIMULATED] レジストリキーに書き込み: {entry}")
            print(f"                値: malware_persistence.exe")
            
        return {
            "registry_keys": registry_entries,
            "timestamp": datetime.now().isoformat(),
            "simulated": True
        }
    
    def simulate_shadow_copy_deletion(self):
        """シャドウコピー削除のシミュレーション"""
        print("\n[*] シャドウコピー削除シミュレーション:")
        
        vssadmin_commands = [
            "vssadmin delete shadows /all /quiet",
            "vssadmin resize shadowstorage /for=C: /on=C: /maxsize=401MB",
            "wmic shadowcopy delete",
            "bcdedit /set {default} recoveryenabled No",
            "bcdedit /set {default} bootstatuspolicy ignoreallfailures"
        ]
        
        for cmd in vssadmin_commands:
            print(f"    [SIMULATED] 実行: {cmd}")
            
        print("    [!] 警告: 実際のランサムウェアはこれらを実行し、")
        print("              システム復元を不可能にします")
            
        return vssadmin_commands
    
    def simulate_defender_bypass(self):
        """Windows Defender 無効化シミュレーション"""
        print("\n[*] Defender 無効化シミュレーション:")
        
        defender_commands = [
            "powershell Set-MpPreference -DisableRealtimeMonitoring $true",
            "powershell Set-MpPreference -DisableBehaviorMonitoring $true",
            "reg add HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender /v DisableAntiSpyware /t REG_DWORD /d 1 /f",
            "schtasks /Change /TN \"Microsoft\\Windows\\Windows Defender\\Windows Defender Scheduled Scan\" /Disable"
        ]
        
        for cmd in defender_commands:
            print(f"    [SIMULATED] {cmd}")
            
        return defender_commands
    
    def scan_targets(self, directories):
        """暗号化対象ファイルをスキャン"""
        targets = []
        print(f"\n[*] Windows ディレクトリをスキャン中:")
        
        for dir_name, dir_path in directories.items():
            if not dir_path.exists():
                continue
                
            print(f"\n    スキャン: {dir_name}")
            for ext in self.target_extensions:
                found = list(dir_path.rglob(f"*{ext}"))
                targets.extend(found)
                if found:
                    print(f"        {ext}: {len(found)} ファイル")
                    
        return targets
    
    def simulate_encryption(self, filepath):
        """暗号化シミュレーション（実際には暗号化しない）"""
        file_stat = filepath.stat()
        content_hash = hashlib.sha256(filepath.read_bytes()).hexdigest()
        
        encrypted_ext = ".locked"
        encrypted_name = f"{filepath.name}{encrypted_ext}"
        
        metadata = {
            "original_path": str(filepath),
            "filename": filepath.name,
            "simulated_encrypted": encrypted_name,
            "size_bytes": file_stat.st_size,
            "created": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
            "modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
            "hash_sha256": content_hash[:32],
            "timestamp": datetime.now().isoformat()
        }
        
        self.simulated_encrypted.append(metadata)
        print(f"    [SIMULATED] {filepath.name}")
        print(f"                -> {encrypted_name}")
        print(f"                サイズ: {file_stat.st_size:,} bytes")
        
        return metadata
    
    def generate_ransom_note_windows(self):
        """Windows 用身代金要求メモ"""
        note = f"""
================================================================================
                        ⚠️  SIMULATED RANSOMWARE ⚠️
================================================================================

これは教育用シミュレーションです。実際のファイルは暗号化されていません。

YOUR FILES HAVE BEEN ENCRYPTED
あなたのファイルは暗号化されました

被害ファイル数: {len(self.simulated_encrypted)}
暗号化時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

================================================================================
[実際のランサムウェアでは以下が記載される]
================================================================================

1. 身代金の支払い方法（Bitcoin/Monero）
2. 復号キーの取得手順
3. 支払い期限（通常 72時間）
4. 脅迫（期限超過でファイル公開・削除）

================================================================================
復旧方法（実際の対応）
================================================================================

1. バックアップからの復元
   - ファイル履歴
   - システムイメージバックアップ
   - 外部ドライブのバックアップ

2. シャドウコピーの確認
   - ファイルのプロパティ → 以前のバージョン
   - vssadmin list shadows

3. 復号ツールの使用
   - No More Ransom Project
   - 各社セキュリティベンダーの復号ツール

4. 専門家への相談
   - 警察への通報
   - サイバーセキュリティ専門家

================================================================================
"""
        
        note_names = [
            "SIMULATED_README.txt",
            "SIMULATED_HOW_TO_DECRYPT.html", 
            "SIMULATED_RECOVERY_INSTRUCTIONS.txt"
        ]
        
        dirs = self.get_windows_directories()
        placed_locations = []
        
        for note_name in note_names:
            for dir_path in dirs.values():
                note_path = dir_path / note_name
                try:
                    note_path.write_text(note, encoding='utf-8')
                    placed_locations.append(str(note_path))
                except:
                    pass
                    
        print(f"\n[+] 身代金要求メモを生成:")
        for loc in placed_locations:
            print(f"    {loc}")
            
        return note, placed_locations
    
    def simulate_network_propagation(self):
        """ネットワーク横展開シミュレーション"""
        print("\n[*] ネットワーク横展開シミュレーション:")
        
        propagation_methods = [
            "SMB プロトコル経由での共有フォルダスキャン",
            "PsExec を使用したリモート実行",
            "WMI (Windows Management Instrumentation) 経由",
            "PowerShell Remoting",
            "RDP ブルートフォース攻撃"
        ]
        
        for method in propagation_methods:
            print(f"    [SIMULATED] {method}")
            
        print("\n    [*] ネットワーク共有スキャン:")
        network_drives = ["\\\\192.168.1.10\\shared", "\\\\NAS\\backup", "Z:\\\\"]
        for drive in network_drives:
            print(f"        スキャン: {drive}")
            
        return propagation_methods
    
    def generate_forensic_report(self):
        """フォレンジックレポート生成"""
        report = {
            "simulation_type": "Windows Ransomware Behavior Analysis",
            "platform": platform.platform(),
            "timestamp": datetime.now().isoformat(),
            "indicators_of_compromise": {
                "file_extensions_changed": [".locked", ".encrypted"],
                "ransom_note_files": ["README.txt", "HOW_TO_DECRYPT.html"],
                "registry_modifications": [
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
                ],
                "deleted_shadow_copies": True,
                "disabled_defender": True
            },
            "affected_files": self.simulated_encrypted,
            "mitigation_recommendations": [
                "3-2-1 バックアップ戦略の実施",
                "Windows Defender リアルタイム保護の有効化",
                "AppLocker/Windows Defender Application Control の導入",
                "SMBv1 の無効化",
                "PowerShell Constrained Language Mode の有効化",
                "定期的なセキュリティ更新の適用"
            ]
        }
        
        with open(self.log_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            
        print(f"\n[+] フォレンジックレポートを保存: {self.log_file}")
        return report

def demonstrate_windows_defense():
    """Windows 防御策デモ"""
    print("\n" + "="*70)
    print("Windows ランサムウェア防御策")
    print("="*70)
    
    defenses = {
        "予防策": [
            "Windows Defender リアルタイム保護を有効化",
            "SmartScreen フィルターを有効化",
            "UAC（ユーザーアカウント制御）を最大レベルに設定",
            "AppLocker で許可リスト方式を導入",
            "PowerShell Execution Policy を Restricted に設定"
        ],
        "検知策": [
            "Sysmon でプロセス作成・ネットワーク接続を監視",
            "Windows Event Log の異常監視",
            "ファイル整合性監視（Tripwire 等）",
            "EDR（Endpoint Detection and Response）導入"
        ],
        "復旧策": [
            "ファイル履歴の有効化",
            "システムイメージバックアップの定期作成",
            "シャドウコピーの保護（vssadmin 制限）",
            "オフライン・オフサイトバックアップ"
        ]
    }
    
    for category, items in defenses.items():
        print(f"\n📋 {category}:")
        for item in items:
            print(f"   • {item}")

def main():
    print("="*70)
    print("  Windows ランサムウェア動作シミュレータ（教育用）")
    print("  実際の暗号化・システム変更は行われません")
    print("="*70)
    
    sim = WindowsRansomwareSimulator()
    
    # テスト環境作成
    directories = sim.create_test_environment()
    
    # Windows 特有の攻撃シミュレーション
    sim.simulate_registry_persistence()
    sim.simulate_shadow_copy_deletion()
    sim.simulate_defender_bypass()
    
    # ファイルスキャン
    targets = sim.scan_targets(directories)
    
    # 暗号化シミュレーション
    print(f"\n[*] 暗号化シミュレーション実行 ({len(targets)} ファイル):")
    for target in targets[:10]:
        sim.simulate_encryption(target)
    
    if len(targets) > 10:
        print(f"    ... 他 {len(targets) - 10} ファイル")
    
    # 身代金要求メモ
    sim.generate_ransom_note_windows()
    
    # ネットワーク横展開
    sim.simulate_network_propagation()
    
    # レポート生成
    sim.generate_forensic_report()
    
    # 防御策
    demonstrate_windows_defense()
    
    print("\n" + "="*70)
    print("シミュレーション完了")
    print("="*70)

if __name__ == "__main__":
    main()
\`\`\`

---

## 動作内容

### シミュレーション項目
| 項目 | 内容 |
|------|------|
| レジストリ永続化 | Run キーへの書き込み動作を表示 |
| シャドウコピー削除 | vssadmin/wmic/bcdedit コマンドを表示 |
| Defender 無効化 | PowerShell/registry 変更を表示 |
| ファイルスキャン | Documents/Desktop/Pictures をスキャン |
| 暗号化 | 実際には暗号化せず、ログ出力のみ |
| 身代金要求メモ | 複数の場所にテキストファイル生成 |
| ネットワーク横展開 | SMB/WMI/PsExec/RDP のシミュレーション |

---

## 実行方法

### Python スクリプトとして実行
```bash
python windows_ransomware_simulator.py
```

### exe ファイル化（PyInstaller）
```bash
# PyInstaller インストール
pip install pyinstaller

# 基本的な変換
pyinstaller --onefile windows_ransomware_simulator.py

# 本物っぽく見せる場合
pyinstaller --onefile --noconsole --name "SystemUpdate" windows_ransomware_simulator.py

# 出力先: dist/SystemUpdate.exe
```

---

## 安全性

### ✅ 実際に行うこと
- テスト用ダミーファイルの作成（`~/Windows_Simulation/` 以下）
- ファイルの読み取り（ハッシュ計算用）
- ログファイルの出力
- コンソールへのテキスト表示

### ❌ 行わないこと
- 既存ファイルの暗号化
- レジストリの実際の変更
- シャドウコピーの削除
- Defender の無効化
- システム設定の変更

---

## 検知・防御の学習ポイント

### IOC（侵害指標）
- 拡張子の変更（`.locked`, `.encrypted`）
- 身代金要求メモファイルの出現
- vssadmin / wmic / bcdedit の異常実行
- レジストリ Run キーの変更

### 推奨防御策
1. **3-2-1 バックアップ**（3 コピー、2 メディア、1 オフサイト）
2. **Windows Defender** リアルタイム保護の有効化
3. **AppLocker** による許可リスト方式
4. **SMBv1** の無効化
5. **PowerShell** Constrained Language Mode

---

## 注意事項

- **教育目的のみ**で使用
- 実際の悪意あるコードへの改変は違法
- アンチウイルスソフトが誤検知する可能性あり
- 実行前にバックアップを推奨

---

## 参考リソース

- [No More Ransom Project](https://www.nomoreransom.org/)
- [Microsoft Sysinternals](https://docs.microsoft.com/sysinternals/)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
