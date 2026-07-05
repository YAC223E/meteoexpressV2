#!/usr/bin/env python3
"""Download GeoNames cities1000 and convert to sorted cities.json.

Usage:
    python bin/build_cities.py

Output: backend/data/cities.json — ~130k entries, sorted by name.
Source: https://www.geonames.org/ (CC BY 4.0)
"""

import csv
import gzip
import json
import os
import urllib.request

CITIES_URL = "https://download.geonames.org/export/dump/cities1000.zip"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(BASE_DIR, "backend", "data", "cities.json")
ZIP_PATH = os.path.join(BASE_DIR, "backend", "data", "cities1000.zip")
TXT_PATH = os.path.join(BASE_DIR, "backend", "data", "cities1000.txt")


def download():
    """Download cities1000.zip if not already present."""
    if os.path.exists(TXT_PATH):
        print("cities1000.txt already exists, skipping download.")
        return
    print(f"Downloading {CITIES_URL} ...")
    urllib.request.urlretrieve(CITIES_URL, ZIP_PATH)
    print("Extracting ...")
    import zipfile
    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        zf.extractall(os.path.dirname(ZIP_PATH))
    os.remove(ZIP_PATH)


def convert():
    """Parse cities1000.txt → sorted cities.json."""
    print("Parsing cities1000.txt ...")
    cities = []
    with open(TXT_PATH, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 19:
                continue
            name = row[2] or row[1]  # asciiname preferred, fallback to name
            lat = float(row[4])
            lon = float(row[5])
            cc = row[8]
            if not name or not cc:
                continue
            pop = int(row[14]) if row[14] else 0
            cities.append({"name": f"{name}, {cc}", "lat": lat, "lon": lon, "pop": pop})
    print(f"  {len(cities)} entries parsed.")

    # Sort by name for fast prefix search
    cities.sort(key=lambda c: c["name"].lower())

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cities, f, ensure_ascii=False)
    print(f"Written to {OUT_PATH}")
    mb = os.path.getsize(OUT_PATH) / 1024 / 1024
    print(f"  File size: {mb:.1f} MB")


if __name__ == "__main__":
    download()
    convert()
