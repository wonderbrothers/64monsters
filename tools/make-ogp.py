#!/usr/bin/env python3
"""タイプごとのOGP画像 docs/images/ogp/<CODE>.jpg（1200×630）を作る。

   原寸 images/characters/*.png（非公開）と docs/assets/types.js の
   タイプ名・ひとことから組み立てる。SNSに貼ったときに
   「どのモンスターか」が絵で伝わるようにするのが目的。

   使い方: プロジェクト直下で  python3 tools/make-ogp.py
"""
import os, re, glob, json, io
from PIL import Image, ImageDraw, ImageFont

SRC   = "images/characters"
DST   = "docs/images/ogp"
TYPES = "docs/assets/types.js"
W, H  = 1200, 630
PAD   = 64
G1, G2 = (0x6D, 0x4A, 0xC8), (0xC2, 0x2E, 0x6C)
INK, INK2, INK3 = (0x14, 0x17, 0x1A), (0x4C, 0x54, 0x5B), (0x8A, 0x92, 0x99)
SITE = "64monsters.wonder-bros.com"

NOTO_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
NOTO_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"


def jp_index(path):
    """ttc の中から 'Noto Sans CJK JP'（Mono ではないほう）の面を探す"""
    for i in range(12):
        try:
            f = ImageFont.truetype(path, 20, index=i)
        except Exception:
            break
        name = " ".join(str(x) for x in f.getname())
        if "JP" in name and "Mono" not in name:
            return i
    return 0

IDX_R, IDX_B = jp_index(NOTO_R), jp_index(NOTO_B)
def font(size, bold=False):
    p, i = (NOTO_B, IDX_B) if bold else (NOTO_R, IDX_R)
    return ImageFont.truetype(p, size, index=i)


def parse_types():
    """types.js から BASE_TYPES の tagline と SUBTYPES の label を取り出す"""
    src = io.open(TYPES, encoding="utf-8").read()
    taglines = dict(re.findall(r'^(\w{4}):\{ name:"[^"]*", tagline:"([^"]*)"', src, re.M))
    labels = dict(re.findall(r'"([A-Z]{4}-[AO]-[HC])":\{ label:"([^"]*)"', src))
    if len(labels) != 64:
        raise SystemExit(f"タイプの読み取りに失敗しました（{len(labels)} 件）")
    return taglines, labels


def grad_h(w, h, c1, c2):
    g = Image.new("RGB", (w, 1))
    px = g.load()
    for x in range(w):
        t = x / max(w - 1, 1)
        px[x, 0] = tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return g.resize((w, h), Image.BILINEAR)


def wrap(draw, text, fnt, max_w, max_lines):
    lines, cur = [], ""
    for ch in text:
        if draw.textlength(cur + ch, font=fnt) > max_w and cur:
            lines.append(cur); cur = ch
            if len(lines) == max_lines:
                return lines
        else:
            cur += ch
    if cur and len(lines) < max_lines:
        lines.append(cur)
    return lines


def fit_label(draw, text, fnt, max_w):
    """タイプ名は2行までに収める。2行になるときは、語の途中で切れて見えないよう
       できるだけ均等な位置で折る（例：場を焚きつける／突破モンスター）"""
    if draw.textlength(text, font=fnt) <= max_w:
        return [text]
    n = len(text)
    best, best_gap = None, None
    for i in range(2, n - 1):
        a, b = text[:i], text[i:]
        wa, wb = draw.textlength(a, font=fnt), draw.textlength(b, font=fnt)
        if wa > max_w or wb > max_w:
            continue
        gap = abs(wa - wb)
        if best_gap is None or gap < best_gap:
            best, best_gap = [a, b], gap
    return best or wrap(draw, text, fnt, max_w, 2)


def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = Image.new("RGBA", im.size)
    out.paste(im, (0, 0), mask)
    return out


def build(code, tagline, label, src_png):
    im = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)

    # 上部のグラデーション帯
    im.paste(grad_h(W, 8, G1, G2), (0, 0))

    # 左：キャラクター
    cs = H - PAD * 2 - 2           # 500
    ch = Image.open(src_png).convert("RGB").resize((cs, cs), Image.LANCZOS)
    cx, cy = PAD, (H - cs) // 2 + 4
    im.paste(rounded(ch, 14), (cx, cy), rounded(ch, 14))

    # 右：テキスト
    x = cx + cs + 50
    maxw = W - x - PAD

    d.text((x, 118), "64モンスターズ", font=font(24), fill=INK3)

    # コードはグラデーションで塗る（マスク合成）
    fc = font(38, bold=True)
    tw = int(d.textlength(code, font=fc)) + 6
    m = Image.new("L", (tw, 60), 0)
    ImageDraw.Draw(m).text((0, 0), code, font=fc, fill=255)
    im.paste(grad_h(tw, 60, G1, G2), (x, 166), m)

    y = 236
    fl = font(46, bold=True)
    for line in fit_label(d, label, fl, maxw):
        d.text((x, y), line, font=fl, fill=INK)
        y += 62

    y += 12
    ft = font(24)
    for line in wrap(d, tagline, ft, maxw, 2):
        d.text((x, y), line, font=ft, fill=INK2)
        y += 38

    d.line([(x, H - PAD - 44), (W - PAD, H - PAD - 44)], fill=(22, 25, 28, 30), width=1)
    d.text((x, H - PAD - 30), SITE, font=font(22), fill=INK3)
    return im


def main():
    taglines, labels = parse_types()
    os.makedirs(DST, exist_ok=True)
    n = 0
    for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
        code = os.path.splitext(os.path.basename(f))[0]
        if code not in labels:
            print("  スキップ（types.js にないコード）:", code); continue
        img = build(code, taglines[code.split("-")[0]], labels[code], f)
        img.save(os.path.join(DST, code + ".jpg"), "JPEG", quality=86, optimize=True, progressive=True)
        n += 1
    total = sum(os.path.getsize(os.path.join(DST, x)) for x in os.listdir(DST))
    print(f"OGP画像を生成しました: {n} 枚 → {DST}（合計 {total/1024/1024:.1f} MB）")


if __name__ == "__main__":
    main()
