import yfinance as yf
from datetime import datetime, timedelta
import calendar
import os
import logging
import pickle
from pathlib import Path
import time
import pandas as pd

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('stock_analysis.log'),
        logging.StreamHandler()
    ]
)

CONFIG = {
    'RETRY_COUNT': 3,
    'SLEEP_TIME': 1,
    'CACHE_ENABLED': True,
    'YF_CACHE_FILE': 'yf_cache.pkl',
    'COLOR_THRESHOLDS': {
        80: 'below80',
        90: 'below90',
        100: 'below100',
        110: 'below110',
        120: 'below120'
    }
}

def get_cached_data(file_path):
    if Path(file_path).exists():
        try:
            with open(file_path, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            logging.warning(f"キャッシュの読み込みに失敗: {str(e)}")
    return None

def save_cached_data(data, file_path):
    try:
        with open(file_path, 'wb') as f:
            pickle.dump(data, f)
    except Exception as e:
        logging.warning(f"キャッシュの保存に失敗: {str(e)}")

def load_name_dict_from_excel(file_path="data_j.xls"):
    df = pd.read_excel(file_path, engine="xlrd", dtype=str)
    df = df[["コード", "銘柄名"]].dropna()
    return dict(zip(df["コード"], df["銘柄名"]))

def get_company_name(ticker, name_dict):
    return name_dict.get(ticker, ticker)

def get_average_price(ticker, year, month, is_first_decade=True):
    if is_first_decade:
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year}-{month:02d}-10"
    else:
        last_day = calendar.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        start_date = datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=7)
        start_date = start_date.strftime("%Y-%m-%d")

    for attempt in range(CONFIG['RETRY_COUNT']):
        try:
            stock = yf.Ticker(f"{ticker}.T")
            df = stock.history(start=start_date, end=end_date)
            if df.empty:
                return None
            return df['Close'].mean()
        except Exception as e:
            if attempt == CONFIG['RETRY_COUNT'] - 1:
                logging.warning(f"警告: {ticker}の株価取得に失敗 - {str(e)}")
                return None
            time.sleep(CONFIG['SLEEP_TIME'])

def get_css_class(percentage):
    for threshold, css in CONFIG['COLOR_THRESHOLDS'].items():
        if percentage < threshold:
            return css
    return "above120"

def create_html_output(companies_data, year, month, name_dict, display_order):
    html_content = """
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            table {
                border-collapse: collapse;
                margin: 20px 0;
                width: 100%;
                max-width: 1000px;
            }
            th, td {
                border: 1px solid black;
                padding: 8px;
                text-align: center;
            }
            th {
                background-color: #f2f2f2;
            }
            .below80 { background-color: #99D9EA; }
            .below90 { background-color: #BFE4ED; }
            .below100 { background-color: #E5F4F7; }
            .below110 { background-color: #FFE5E5; }
            .below120 { background-color: #FFB3B3; }
            .above120 { background-color: #FF8080; }
            .company-name {
                font-size: 18px;
                margin: 20px 0 10px 0;
            }
        </style>
    </head>
    <body>
    """

    company_map = {company["code"]: company for company in companies_data}

    for code in display_order:
        company = company_map.get(code)
        if not company:
            continue

        name = get_company_name(company["code"], name_dict)
        html_content += f'<div class="company-name">{name}({company["code"]})</div>\n'
        html_content += "<table>\n<tr>\n<th>年</th>\n"
        for m in range(month-3, month+1):
            adj_month = m if 1 <= m <= 12 else (m + 12 if m <= 0 else m - 12)
            html_content += f"<th>{adj_month:02d}</th>\n"
        html_content += "<th>基準</th>\n"
        html_content += f"<th>{(month+1 if month < 12 else 1):02d}</th>\n"
        html_content += "</tr>\n"

        percentages = [[] for _ in range(5)]
        years = list(range(year-3, year+1))
        years.reverse()

        for y in years:
            html_content += f"<tr>\n<td>{y}</td>\n"
            yearly_data = company.get(str(y), [])
            rights_price = company.get(f"{y}_rights_price")

            if not yearly_data or rights_price is None:
                html_content += "<td colspan='6'>データなし</td>\n</tr>\n"
                continue

            for i in range(3):
                if i < len(yearly_data):
                    price_data = yearly_data[i]
                    percentage = price_data["percentage"]
                    price = price_data["price"]
                    css_class = get_css_class(percentage)
                    html_content += f'<td class="{css_class}">{price:.2f}({percentage:.1f}%)</td>\n'
                    percentages[i].append(percentage)
                else:
                    html_content += "<td>-</td>\n"

            if len(yearly_data) > 3:
                march_data = yearly_data[3]
                percentage = march_data["percentage"]
                price = march_data["price"]
                css_class = get_css_class(percentage)
                html_content += f'<td class="{css_class}">{price:.2f}({percentage:.1f}%)</td>\n'
                percentages[3].append(percentage)
            else:
                html_content += "<td>-</td>\n"

            html_content += f'<td>{rights_price:.2f}</td>\n'

            if len(yearly_data) > 4:
                april_data = yearly_data[4]
                percentage = april_data["percentage"]
                price = april_data["price"]
                css_class = get_css_class(percentage)
                html_content += f'<td class="{css_class}">{price:.2f}({percentage:.1f}%)</td>\n'
                percentages[4].append(percentage)
            else:
                html_content += "<td>-</td>\n"

            html_content += "</tr>\n"

        html_content += "<tr>\n<td>平均</td>\n"
        for month_percentages in percentages[:4]:
            if month_percentages:
                avg_percentage = sum(month_percentages) / len(month_percentages)
                css_class = get_css_class(avg_percentage)
                html_content += f'<td class="{css_class}">({avg_percentage:.1f}%)</td>\n'
            else:
                html_content += "<td>-</td>\n"

        html_content += "<td>基準</td>\n"
        if percentages[4]:
            avg_percentage = sum(percentages[4]) / len(percentages[4])
            css_class = get_css_class(avg_percentage)
            html_content += f'<td class="{css_class}">({avg_percentage:.1f}%)</td>\n'
        else:
            html_content += "<td>-</td>\n"

        html_content += "</tr>\n</table>\n"

    html_content += "</body></html>"
    return html_content

def main():
    input_file = input("入力ファイル名を入力してください: ")
    year = int(input("年を入力してください (例: 2024): "))
    month = int(input("月を入力してください (1-12): "))

    name_dict = load_name_dict_from_excel()

    output_dir = str(year)
    os.makedirs(output_dir, exist_ok=True)
    output_file = f"{output_dir}/{month:02d}_output.html"

    with open(input_file, 'r') as f:
        codes = [line.strip() for line in f if line.strip()]

    yf_cache = get_cached_data(CONFIG['YF_CACHE_FILE']) or []
    existing_codes = {entry['code']: entry for entry in yf_cache}

    total_codes = len(codes)
    updated = False

    for i, code in enumerate(codes, 1):
        if code in existing_codes:
            logging.info(f"スキップ: {code} (キャッシュ済み)")
            continue

        logging.info(f"処理中: {code} ({i}/{total_codes})")
        company_data = {"code": code, "name": get_company_name(code, name_dict)}

        for y in range(year-3, year+1):
            yearly_data = []
            rights_price = get_average_price(code, y, month, False)
            if rights_price is None:
                continue

            company_data[f"{y}_rights_price"] = rights_price

            for m in range(month-3, month+2):
                target_year = y
                target_month = m

                if m <= 0:
                    target_month += 12
                    target_year -= 1
                elif m > 12:
                    target_month -= 12
                    target_year += 1

                avg_price = get_average_price(code, target_year, target_month)
                if avg_price is not None:
                    percentage = (avg_price / rights_price) * 100
                    yearly_data.append({
                        "price": avg_price,
                        "percentage": percentage
                    })

            if yearly_data:
                company_data[str(y)] = yearly_data

        if len(company_data) > 1:
            yf_cache.append(company_data)
            updated = True

    if updated:
        save_cached_data(yf_cache, CONFIG['YF_CACHE_FILE'])

    companies_data = [entry for entry in yf_cache if entry['code'] in codes]

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(create_html_output(companies_data, year, month, name_dict, codes))

    print(f"処理が完了しました。{output_file} を確認してください。")

if __name__ == "__main__":
    main()
