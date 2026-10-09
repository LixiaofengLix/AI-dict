# AI-dict 应用图标：砖红圆角方块 + 米白衬线 "A" + 词条式下划线
# 用法：python3 app-icon.py app-icon.png（然后 pnpm tauri icon src-tauri/app-icon.png 生成全套）
import sys
from PIL import Image, ImageDraw, ImageFont

SS = 4                      # 超采样倍数，先画大的再缩小，圆角才不会有锯齿
SIZE = 1024 * SS
BRICK = (168, 70, 47, 255)    # #A8462F
CREAM = (247, 240, 230, 255)  # #F7F0E6
FONT = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"

out = sys.argv[1]
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
radius = int(SIZE * 0.2237)
draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=BRICK)

font = ImageFont.truetype(FONT, int(SIZE * 0.70))
bbox = draw.textbbox((0, 0), "A", font=font)  # 墨迹相对原点的边界
w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
gap = int(SIZE * 0.048)
bar_w, bar_h = int(SIZE * 0.28), int(SIZE * 0.024)

# "A" + 下划线当成一整块，垂直居中；水平按墨迹居中
block_h = h + gap + bar_h
top = (SIZE - block_h) / 2
x = (SIZE - w) / 2 - bbox[0]
draw.text((x, top - bbox[1]), "A", font=font, fill=CREAM)

bar_x = (SIZE - bar_w) / 2
bar_y = top + h + gap
draw.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=bar_h // 2, fill=CREAM)

img.resize((1024, 1024), Image.LANCZOS).save(out)
print("wrote", out)
