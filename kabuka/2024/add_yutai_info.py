import requests
from bs4 import BeautifulSoup
import re
import pickle
from pathlib import Path
import os

CACHE_FILE = "yutai_cache.pkl"


def load_yutai_cache():
    if Path(CACHE_FILE).exists():
        try:
            with open(CACHE_FILE, "rb") as f:
                return pickle.load(f)
        except:
            return {}
    return {}

def save_yutai_cache(cache):
    with open(CACHE_FILE, "wb") as f:
        pickle.dump(cache, f)

def extract_yutai_info(code):
    url = f"https://minkabu.jp/stock/{code}/yutai"
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"[{code}] ページ取得失敗: {response.status_code}")
        return None

    soup = BeautifulSoup(response.text, "html.parser")

    result = {
        "優待内容": "-",
        "優待利回り": "-",
        "配当利回り": "-",
        "最低投資金額": "-",
        "優待発生株数": "-",
        "優待権利確定月": "-",
        "権利確定日": "-"
    }

    try:
        # 優待内容
        summary_tag = soup.find("h3", id="yutai_summary")
        if summary_tag:
            result["優待内容"] = summary_tag.text.strip()

        # 優待利回り
        yutai_rate = soup.find("td", id="yutai_valuations_yutai")
        if yutai_rate:
            result["優待利回り"] = yutai_rate.text.strip()

        # 配当利回り
        haito_rate = soup.find("td", id="yutai_valuations_haito")
        if haito_rate:
            result["配当利回り"] = haito_rate.text.strip()

        # 最低投資金額
        kin = soup.find("th", string="最低投資金額")
        if kin and kin.find_next_sibling("td"):
            result["最低投資金額"] = kin.find_next_sibling("td").text.strip()

        # 優待発生株数
        unit = soup.find("th", string="優待発生株数")
        if unit and unit.find_next_sibling("td"):
            result["優待発生株数"] = unit.find_next_sibling("td").text.strip()

        # 優待権利確定月
        month = soup.find("th", string="優待権利確定月")
        if month and month.find_next_sibling("td"):
            result["優待権利確定月"] = month.find_next_sibling("td").text.strip()

        # 権利確定日
        date = soup.find_all("th", string="権利確定日")
        if date:
            result["権利確定日"] = date[-1].find_next_sibling("td").text.strip()

    except Exception as e:
        print(f"[{code}] パースエラー: {e}")

    return result


def insert_info_into_html(input_path, output_path):
    with open(input_path, encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    companies = soup.find_all("div", class_="company-name")
    cache = load_yutai_cache()
    updated = False

    for company_div in companies:
        match = re.search(r"\((\d{4})\)", company_div.text)
        if not match:
            continue
        code = match.group(1)
        print(f"[{code}] 優待情報取得中...")

        if code in cache:
            info = cache[code]
        else:
            info = extract_yutai_info(code)
            if not info:
                continue
            cache[code] = info
            updated = True

        # 表形式で出力（3行構成）
        table = soup.new_tag("table", **{"class": "yutai-info-table", "border": "1", "style": "margin-bottom: 1em; border-collapse: collapse;"})

        # 優待内容行
        tr1 = soup.new_tag("tr")
        th1 = soup.new_tag("th")
        th1.string = "優待内容"
        td1 = soup.new_tag("td", colspan="3")
        td1.string = f"{info['優待内容']}（{info['優待利回り']}）"
        tr1.append(th1)
        tr1.append(td1)
        table.append(tr1)

        # 配当利回りと最低投資金額
        tr2 = soup.new_tag("tr")
        th2a = soup.new_tag("th")
        th2a.string = "配当利回り"
        td2a = soup.new_tag("td")
        td2a.string = info["配当利回り"]
        th2b = soup.new_tag("th")
        th2b.string = "最低投資金額"
        td2b = soup.new_tag("td")
        td2b.string = info["最低投資金額"]
        for tag in [th2a, td2a, th2b, td2b]:
            tr2.append(tag)
        table.append(tr2)

        # 優待発生株数・権利確定月・日
        tr3 = soup.new_tag("tr")
        th3a = soup.new_tag("th")
        th3a.string = "優待発生株数"
        td3a = soup.new_tag("td")
        td3a.string = info["優待発生株数"]
        th3b = soup.new_tag("th")
        th3b.string = "優待権利確定月・日"
        td3b = soup.new_tag("td")
        td3b.string = f"{info['優待権利確定月']}／{info['権利確定日']}"
        for tag in [th3a, td3a, th3b, td3b]:
            tr3.append(tag)
        table.append(tr3)

        company_div.insert_after(table)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(str(soup))

    if updated:
        save_yutai_cache(cache)

    print(f"処理が完了しました：{output_path}")


if __name__ == "__main__":
    input_file = input("元のHTMLファイル名を入力してください: ")
    output_file = input("出力するHTMLファイル名を入力してください: ")
    insert_info_into_html(input_file, output_file)