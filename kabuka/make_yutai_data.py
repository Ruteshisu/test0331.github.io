import requests
from bs4 import BeautifulSoup
import re
import time
import pickle
from pathlib import Path

CACHE_FILE = "yutai_all_cache.pkl"


def save_cache(data):
    with open(CACHE_FILE, "wb") as f:
        pickle.dump(data, f)


def load_cache():
    if Path(CACHE_FILE).exists():
        with open(CACHE_FILE, "rb") as f:
            return pickle.load(f)
    return None


def fetch_all_yutai_data():
    headers = {"User-Agent": "Mozilla/5.0"}
    base_url = "https://minkabu.jp/yutai/search"
    page = 2  # ページ1は無効なデータの可能性があるためスキップ
    result = {}

    while True:
        print(f"ページ {page} を取得中...")
        res = requests.get(f"{base_url}?page={page}", headers=headers)
        if res.status_code != 200:
            print(f"ページ {page} の取得失敗: {res.status_code}")
            break

        soup = BeautifulSoup(res.text, "html.parser")
        items = soup.find_all("li", class_="yutai_rank_style")
        if not items:
            break

        for item in items:
            try:
                link_tag = item.find("a", href=re.compile("^/stock/\\d+/yutai"))
                if not link_tag:
                    continue
                code_match = re.search(r"/stock/(\d+)/yutai", link_tag["href"])
                if not code_match:
                    continue
                code = code_match.group(1)

                name_tag = item.select_one("a.fwb")
                name = name_tag.text.strip().split("(")[0] if name_tag else "-"

                rate = 0.0
                rate_divs = item.find_all("div", class_="mr8")
                for div in rate_divs:
                    if "株主優待利回り" in div.text:
                        rate_span = div.find("span", class_="fsn fwb fcrd")
                        if rate_span and rate_span.text.strip() != "---":
                            try:
                                rate = float(rate_span.text.strip())
                            except ValueError:
                                rate = 0.0
                        break

                month_box = item.find("span", class_="md_ico_tx", string="権利確定月")
                month_text = month_box.find_next("span", class_="fsm fwb").text.strip() if month_box else ""
                months = [m.strip() for m in month_text.split(",") if m.strip()]

                result[code] = {
                    "code": code,
                    "name": name,
                    "rate": rate,
                    "months": months
                }
            except Exception as e:
                print(f"スキップ: {e}")
                continue

        page += 1
        time.sleep(1)

    # 無効なデータを除去（特にページ1のゴミデータ対策）
    cleaned_result = {
        code: val for code, val in result.items()
        if val["rate"] > 0 or val["months"]
    }

    print(f"{len(cleaned_result)} 件の有効なデータを取得しました。")
    return cleaned_result


def main():
    try:
        month = input("優待権利確定月を入力してください（例：4）: ")
        top_n = int(input("上位何件を抽出しますか？（例：50）: "))
        filename = f"{int(month):02d}yutai.txt"

        print("キャッシュを確認中...")
        cache = load_cache()

        if not cache:
            print("キャッシュが見つかりません。全銘柄を取得します...")
            cache = fetch_all_yutai_data()
            save_cache(cache)

        filtered = [(code, info["rate"]) for code, info in cache.items() if month + "月" in info["months"]]
        filtered.sort(key=lambda x: x[1], reverse=True)

        if not filtered:
            print(f"{month}月の優待銘柄が見つかりませんでした。")
            return

        with open(filename, "w", encoding="utf-8") as f:
            for code, rate in filtered[:top_n]:
                f.write(code + "\n")

        print(f"{filename} を作成しました（優待利回り順）")

    except Exception as e:
        print(f"エラー: {e}")


if __name__ == "__main__":
    main()