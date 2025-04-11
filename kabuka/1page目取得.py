import requests
from bs4 import BeautifulSoup
import re
import time
import pickle
from pathlib import Path

CACHE_FILE = "yutai_master_cache.pkl"


def save_cache(data):
    with open(CACHE_FILE, "wb") as f:
        pickle.dump(data, f)


def fetch_all_yutai_data(max_pages=3):
    headers = {"User-Agent": "Mozilla/5.0"}
    base_url = "https://minkabu.jp/yutai/search"
    page = 1
    result = {}

    while True:
        if max_pages and page > max_pages:
            break

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
                if not link_tag or not link_tag.get("href"):
                    continue
                code_match = re.search(r"/stock/(\d+)/yutai", link_tag["href"])
                if not code_match:
                    continue
                code = code_match.group(1)

                name_tag = item.select_one("div.fwb a")
                name = name_tag.text.strip().split("(")[0] if name_tag else "-"

                summary = item.find("div", class_="yutai_item")
                yutai_summary = summary.text.strip() if summary else "-"

                rate_span = item.find("span", class_="fcrd fwb")
                yutai_rate = float(rate_span.text.strip()) if rate_span else 0.0

                month_span = item.find("span", string=re.compile(r"\d+月"))
                months = month_span.text.strip().split(",") if month_span else []

                extra_info = item.find_all("span", class_="fsm")
                investment = unit = "-"
                if len(extra_info) >= 1:
                    investment = extra_info[0].text.strip() + "万"

                result[code] = {
                    "code": code,
                    "name": name,
                    "yutai_summary": yutai_summary,
                    "yutai_rate": yutai_rate,
                    "investment": investment,
                    "months": months,
                    "unit": unit,
                    "day": "月末",
                    "source": "minkabu"
                }
            except Exception as e:
                print(f"スキップ: {e}")
                continue

        page += 1
        time.sleep(1)

    print(f"{len(result)} 件のデータを取得しました。")
    return result


def main():
    print("みんかぶから株主優待情報を取得中（3ページまで）...")
    data = fetch_all_yutai_data(max_pages=3)
    save_cache(data)
    print(f"キャッシュに保存しました → {CACHE_FILE}")


if __name__ == "__main__":
    main()