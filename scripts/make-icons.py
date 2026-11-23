"""Generate the app icons (run: python3 scripts/make-icons.py). Needs Pillow."""
from PIL import Image, ImageDraw

S = 1024

def icon(maskable: bool) -> Image.Image:
    img = Image.new("RGBA", (S, S))
    top, bottom = (95, 75, 139), (233, 150, 74)  # plum -> dawn
    d = ImageDraw.Draw(img)
    for y in range(S):
        t = y / S
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (S, y)], fill=c + (255,))
    if not maskable:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=230, fill=255)
        img.putalpha(mask)
    d = ImageDraw.Draw(img)
    scale = 0.72 if maskable else 1.0
    cx, cy = S / 2, S * 0.60
    r = 210 * scale
    # rising sun
    d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=(251, 246, 238, 255))
    # rays
    import math
    for ang in (-150, -120, -90, -60, -30):
        a = math.radians(ang)
        r1, r2 = r + 60 * scale, r + 150 * scale
        d.line([(cx + r1 * math.cos(a), cy + r1 * math.sin(a)),
                (cx + r2 * math.cos(a), cy + r2 * math.sin(a))],
               fill=(251, 246, 238, 255), width=int(44 * scale))
    # horizon / page lines
    w = 560 * scale
    for i, k in enumerate((0, 1, 2)):
        y = cy + 40 * scale + i * 80 * scale
        ww = w * (1 - 0.22 * i)
        d.rounded_rectangle([cx - ww / 2, y, cx + ww / 2, y + 36 * scale], radius=18 * scale,
                            fill=(251, 246, 238, 255 if i == 0 else 200 - i * 40))
    return img

base = icon(False)
for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
    base.resize((size, size), Image.LANCZOS).save(f"public/icons/{name}")
icon(True).resize((512, 512), Image.LANCZOS).save("public/icons/maskable-512.png")
base.resize((64, 64), Image.LANCZOS).save("src/app/icon.png")
print("icons written")
