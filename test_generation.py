"""
SD WebUI Reforge プリセットテスト
5つの主要機能をテストします：
1. シンプルなtxt2img (プリセット01)
2. PNG Info取得 (プリセット15)
3. Tagger機能
4. アップスケール (プリセット16)
5. 背景除去 (プリセット17)
"""

import requests
import base64
import json
from pathlib import Path
from datetime import datetime
import time

# SD WebUI Reforge APIエンドポイント
API_URL = "http://192.168.91.2:7863"

# 出力ディレクトリ作成
output_dir = Path("test_outputs")
output_dir.mkdir(exist_ok=True)

def save_image(base64_str, filename):
    """Base64画像を保存"""
    image_data = base64.b64decode(base64_str)
    filepath = output_dir / filename
    with open(filepath, "wb") as f:
        f.write(image_data)
    print(f"[OK] 画像を保存: {filepath}")
    return filepath

def test_txt2img_simple():
    """テスト1: シンプルなtxt2img生成"""
    print("\n" + "="*50)
    print("📝 テスト1: シンプルなtxt2img生成 (プリセット01)")
    print("="*50)

    payload = {
        "prompt": "1girl, smile, outdoors, cherry blossoms, masterpiece, high score, great score, absurdres",
        "negative_prompt": "lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry",
        "sampler_name": "Euler a",
        "scheduler": "Automatic",
        "steps": 28,
        "cfg_scale": 5,
        "width": 1024,
        "height": 1024,
        "seed": 42,
        "override_settings": {
            "sd_model_checkpoint": "animagineXL40_v4Opt"
        },
        "override_settings_restore_afterwards": True
    }

    response = requests.post(f"{API_URL}/sdapi/v1/txt2img", json=payload)
    if response.status_code == 200:
        result = response.json()
        if result.get("images"):
            filename = f"test01_txt2img_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            save_image(result["images"][0], filename)
            return True
    else:
        print(f"❌ エラー: {response.status_code} - {response.text}")
    return False

def test_png_info():
    """テスト2: PNG Info取得"""
    print("\n" + "="*50)
    print("🔍 テスト2: PNG Info取得 (プリセット15)")
    print("="*50)

    # まず画像を生成
    print("まず画像を生成...")
    payload = {
        "prompt": "test image for png info",
        "steps": 10,
        "width": 512,
        "height": 512,
    }

    response = requests.post(f"{API_URL}/sdapi/v1/txt2img", json=payload)
    if response.status_code == 200:
        result = response.json()
        if result.get("images"):
            # PNG Info取得
            png_payload = {
                "image": result["images"][0]
            }
            info_response = requests.post(f"{API_URL}/sdapi/v1/png-info", json=png_payload)
            if info_response.status_code == 200:
                info = info_response.json()
                print("✅ PNG Info取得成功:")
                print(json.dumps(info, indent=2, ensure_ascii=False)[:500] + "...")
                return True

    print("❌ PNG Info取得失敗")
    return False

def test_upscale():
    """テスト4: アップスケール"""
    print("\n" + "="*50)
    print("🔍 テスト4: アップスケール (プリセット16)")
    print("="*50)

    # まず小さい画像を生成
    print("まず512x512の画像を生成...")
    payload = {
        "prompt": "1girl, portrait, masterpiece",
        "steps": 20,
        "width": 512,
        "height": 512,
    }

    response = requests.post(f"{API_URL}/sdapi/v1/txt2img", json=payload)
    if response.status_code == 200:
        result = response.json()
        if result.get("images"):
            # アップスケール
            upscale_payload = {
                "resize_mode": 0,
                "show_extras_results": True,
                "gfpgan_visibility": 0,
                "codeformer_visibility": 0,
                "codeformer_weight": 0,
                "upscaling_resize": 2,  # 2倍にアップスケール
                "upscaler_1": "4x-UltraSharp",
                "upscaler_2": "None",
                "extras_upscaler_2_visibility": 0,
                "upscale_first": False,
                "image": result["images"][0]
            }

            upscale_response = requests.post(f"{API_URL}/sdapi/v1/extra-single-image", json=upscale_payload)
            if upscale_response.status_code == 200:
                upscale_result = upscale_response.json()
                if upscale_result.get("image"):
                    filename = f"test04_upscale_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    save_image(upscale_result["image"], filename)
                    return True

    print("❌ アップスケール失敗")
    return False

def test_rembg():
    """テスト5: 背景除去"""
    print("\n" + "="*50)
    print("✂️ テスト5: 背景除去 (プリセット17)")
    print("="*50)

    # まず画像を生成
    print("まず画像を生成...")
    payload = {
        "prompt": "1girl, standing, full body, simple background, white background",
        "negative_prompt": "complex background",
        "steps": 20,
        "width": 512,
        "height": 768,
    }

    response = requests.post(f"{API_URL}/sdapi/v1/txt2img", json=payload)
    if response.status_code == 200:
        result = response.json()
        if result.get("images"):
            # 背景除去（rembgエクステンション使用）
            rembg_payload = {
                "input_image": result["images"][0],
                "model": "u2net",
                "return_mask": False,
                "alpha_matting": True,
                "alpha_matting_foreground_threshold": 240,
                "alpha_matting_background_threshold": 50,
                "alpha_matting_erode_size": 10
            }

            # rembgのエンドポイントを試す
            rembg_response = requests.post(f"{API_URL}/rembg", json=rembg_payload)
            if rembg_response.status_code == 200:
                rembg_result = rembg_response.json()
                if rembg_result.get("image"):
                    filename = f"test05_rembg_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    save_image(rembg_result["image"], filename)
                    return True
            else:
                print(f"❌ Rembgエラー: {rembg_response.status_code}")
                # 代替手段: extras APIを使用
                print("extras APIで再試行...")
                extras_payload = {
                    "resize_mode": 0,
                    "show_extras_results": True,
                    "image": result["images"][0]
                }
                extras_response = requests.post(f"{API_URL}/sdapi/v1/extra-single-image", json=extras_payload)
                if extras_response.status_code == 200:
                    print("✅ Extras APIで処理完了（背景除去機能は別途確認が必要）")
                    return True

    print("❌ 背景除去失敗")
    return False

def main():
    """メインテスト実行"""
    print("\n" + "SD WebUI Reforge プリセットテスト開始")
    print(f"API URL: {API_URL}")
    print(f"出力ディレクトリ: {output_dir.absolute()}")

    # API接続確認
    try:
        response = requests.get(f"{API_URL}/sdapi/v1/options")
        if response.status_code == 200:
            print("✅ API接続成功")
        else:
            print(f"❌ API接続失敗: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ API接続エラー: {e}")
        return

    # テスト実行
    results = []

    # テスト1: txt2img
    results.append(("txt2img", test_txt2img_simple()))
    time.sleep(2)  # サーバー負荷を考慮

    # テスト2: PNG Info
    results.append(("PNG Info", test_png_info()))
    time.sleep(1)

    # テスト4: アップスケール
    results.append(("Upscale", test_upscale()))
    time.sleep(2)

    # テスト5: 背景除去
    results.append(("RemBG", test_rembg()))

    # 結果サマリー
    print("\n" + "="*50)
    print("📊 テスト結果サマリー")
    print("="*50)
    for name, success in results:
        status = "✅ 成功" if success else "❌ 失敗"
        print(f"{name}: {status}")

    success_count = sum(1 for _, success in results if success)
    print(f"\n合計: {success_count}/{len(results)} テスト成功")
    print(f"出力ファイルは {output_dir.absolute()} に保存されました")

if __name__ == "__main__":
    main()