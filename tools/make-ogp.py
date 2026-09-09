#!/usr/bin/env python3
"""タイプごとのOGP画像 docs/images/ogp/<CODE>.jpg（1200×630）を作る。

   原寸 images/characters/*.png（非公開）と docs/assets/types.js の
   タイプ名・ひとことから組み立てる。SNSに貼ったときに
   「どのモンスターか」が絵で伝わるようにするのが目的。

   2026-09 のリデザインに合わせて、タイプページの見出しと同じ組みにしてある。
   ロゴ → 2px の罫 → 左に写真（2px枠・角丸24）／右に MONSTER TYPE・コード・
   タイプ名・ひとこと → 2px の罫 → サイト名。色は白と黒だけ。

   書体は tools/fonts/ に置いた実ファイルを使う（サイトと同じ書体にするため）。
   和文だけはシステムの Noto Sans CJK を使う。

   使い方: プロジェクト直下で  python3 tools/make-ogp.py
"""
import os, re, glob, io
from PIL import Image, ImageDraw, ImageFont

SRC   = "images/characters"
DST   = "docs/images/ogp"
TYPES = "docs/assets/types.js"
LOGO_SVG = "docs/assets/logo.svg"
LOGO_PNG = "tools/assets/logo-lockup.png"

W, H = 1200, 630
PAD  = 56
BW   = 2                      # --bw
R    = 24                     # .hero .thumb の角丸
PAPER = (0xFF, 0xFF, 0xFF)
INK   = (0x11, 0x11, 0x11)
INK2  = (0x3D, 0x41, 0x45)
INK3  = (0x71, 0x71, 0x6D)
SITE  = "64monsters.wonder-bros.com"
STRAP = "6 AXES / 90 QUESTIONS / 64 MONSTERS"

F_MONO = "tools/fonts/DMMono-Medium.ttf"
F_EN   = "tools/fonts/MontserratAlternates-Black.ttf"
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

def jp(size, bold=False):
    p, i = (NOTO_B, IDX_B) if bold else (NOTO_R, IDX_R)
    return ImageFont.truetype(p, size, index=i)

def mono(size): return ImageFont.truetype(F_MONO, size)
def en(size):   return ImageFont.truetype(F_EN, size)


# ---- 字送りつきの描画（CSS の letter-spacing にあたるもの）----
def ls_width(d, text, fnt, ls):
    return sum(d.textlength(c, font=fnt) + ls for c in text) - (ls if text else 0)

def ls_text(d, xy, text, fnt, fill, ls):
    x, y = xy
    for c in text:
        d.text((x, y), c, font=fnt, fill=fill)
        x += d.textlength(c, font=fnt) + ls
    return x


def parse_types():
    """types.js から BASE_TYPES の tagline と SUBTYPES の label を取り出す"""
    src = io.open(TYPES, encoding="utf-8").read()
    taglines = dict(re.findall(r'^(\w{4}):\{ name:"[^"]*", tagline:"([^"]*)"', src, re.M))
    labels = dict(re.findall(r'"([A-Z]{4}-[AO]-[HC])":\{ label:"([^"]*)"', src))
    if len(labels) != 64:
        raise SystemExit(f"タイプの読み取りに失敗しました（{len(labels)} 件）")
    return taglines, labels


def wrap(d, text, fnt, max_w, max_lines):
    lines, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=fnt) > max_w and cur:
            lines.append(cur); cur = ch
            if len(lines) == max_lines:
                return lines
        else:
            cur += ch
    if cur and len(lines) < max_lines:
        lines.append(cur)
    return lines


def fit_label(d, text, fnt, max_w):
    """タイプ名は2行までに収める。2行になるときは、語の途中で切れて見えないよう
       できるだけ均等な位置で折る（例：場を焚きつける／突破モンスター）"""
    if d.textlength(text, font=fnt) <= max_w:
        return [text]
    best, best_gap = None, None
    for i in range(2, len(text) - 1):
        a, b = text[:i], text[i:]
        wa, wb = d.textlength(a, font=fnt), d.textlength(b, font=fnt)
        if wa > max_w or wb > max_w:
            continue
        gap = abs(wa - wb)
        if best_gap is None or gap < best_gap:
            best, best_gap = [a, b], gap
    return best or wrap(d, text, fnt, max_w, 2)


def logo_img(height):
    """ロゴは SVG が正。cairosvg があればそこから、なければ焼いておいた PNG を使う。
       PNG を作り直すには:
         python3 -c "import cairosvg; cairosvg.svg2png(url='docs/assets/logo.svg',
                     write_to='tools/assets/logo-lockup.png',
                     output_width=936, output_height=120)" """
    m = re.search(r'<svg[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"', io.open(LOGO_SVG, encoding="utf-8").read())
    ratio = (float(m.group(1)) / float(m.group(2))) if m else 234 / 30
    w = round(height * ratio)
    try:
        import cairosvg
        buf = cairosvg.svg2png(url=LOGO_SVG, output_width=w * 3, output_height=height * 3)
        im = Image.open(io.BytesIO(buf))
    except Exception:
        im = Image.open(LOGO_PNG)
    return im.convert("RGBA").resize((w, height), Image.LANCZOS)


def framed(src_png, size):
    """写真を角丸で切り抜き、2px の枠をつける（.hero .thumb と同じ見た目）"""
    ph = Image.open(src_png).convert("RGB").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], R, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(ph, (0, 0), mask)
    ImageDraw.Draw(out).rounded_rectangle(
        [BW / 2, BW / 2, size - 1 - BW / 2, size - 1 - BW / 2], R, outline=INK + (255,), width=BW)
    return out


def build(code, tagline, label, src_png, logo):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)

    # ヘッダー：ロゴ＋2pxの罫
    im.paste(logo, (PAD, 42), logo)
    rule_top = 104
    d.rectangle([PAD, rule_top, W - PAD - 1, rule_top + BW - 1], fill=INK)

    # フッター：2pxの罫＋惹句とサイト名
    rule_bot = H - 84
    d.rectangle([PAD, rule_bot, W - PAD - 1, rule_bot + BW - 1], fill=INK)
    fm = mono(18)
    ls_text(d, (PAD, rule_bot + 28), STRAP, fm, INK3, 2.6)
    d.text((W - PAD - d.textlength(SITE, font=fm), rule_bot + 28), SITE, font=fm, fill=INK3)

    # 左：写真
    band_top, band_bot = rule_top + BW, rule_bot
    cs = 392
    cy = band_top + (band_bot - band_top - cs) // 2
    ph = framed(src_png, cs)
    im.paste(ph, (PAD, cy), ph)

    # 右：MONSTER TYPE → コード → タイプ名 → ひとこと
    x = PAD + cs + 56
    maxw = W - PAD - x

    f_eye, f_code = mono(18), en(58)
    f_lab, f_tag = jp(42, bold=True), jp(23)
    lab_lines = fit_label(d, label, f_lab, maxw)
    tag_lines = wrap(d, tagline, f_tag, maxw, 2)

    h_eye, h_code, lead_lab, lead_tag = 24, 62, 56, 36
    total = h_eye + 18 + h_code + 20 + lead_lab * len(lab_lines) + 10 + lead_tag * len(tag_lines)
    y = band_top + (band_bot - band_top - total) // 2

    ls_text(d, (x, y), "MONSTER TYPE", f_eye, INK3, 7.6)
    y += h_eye + 18
    d.text((x, y - 12), code, font=f_code, fill=INK)
    y += h_code + 20
    for t in lab_lines:
        d.text((x, y), t, font=f_lab, fill=INK); y += lead_lab
    y += 10
    for t in tag_lines:
        d.text((x, y), t, font=f_tag, fill=INK2); y += lead_tag

    return im


def main():
    taglines, labels = parse_types()
    os.makedirs(DST, exist_ok=True)
    logo = logo_img(38)
    n = 0
    for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
        code = os.path.splitext(os.path.basename(f))[0]
        if code not in labels:
            print("  スキップ（types.js にないコード）:", code); continue
        img = build(code, taglines[code.split("-")[0]], labels[code], f, logo)
        img.save(os.path.join(DST, code + ".jpg"), "JPEG", quality=86, optimize=True, progressive=True)
        n += 1
    total = sum(os.path.getsize(os.path.join(DST, x)) for x in os.listdir(DST))
    print(f"OGP画像を生成しました: {n} 枚 → {DST}（合計 {total/1024/1024:.1f} MB）")


if __name__ == "__main__":
    main()
