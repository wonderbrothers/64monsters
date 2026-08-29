#!/usr/bin/env python3
"""images/characters/*.png（非公開）から公開用サムネイル docs/images/thumbs/*.webp を作り直す。
   使い方: プロジェクト直下で  python3 tools/make-thumbs.py"""
import os, glob
from PIL import Image

SRC, DST, SIZE = "images/characters", "docs/images/thumbs", 440
os.makedirs(DST, exist_ok=True)
n = 0
for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    code = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert("RGB")
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    im.save(os.path.join(DST, code + ".webp"), "WEBP", quality=84, method=6)
    n += 1
print("サムネイルを生成しました:", n, "枚 →", DST)
