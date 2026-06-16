from PIL import Image
from collections import Counter

img_path = r'c:\repos\Zubaida Diagnostics\Zubaida Diagnostics Frontend\src\assets\Glassmorphism Logo ZD.png'
img = Image.open(img_path).convert('RGB')
colors = img.getcolors(maxcolors=1000000)
colors.sort(reverse=True)
for count, color in colors[:10]:
    print(f"#{color[0]:02x}{color[1]:02x}{color[2]:02x} - count: {count}")
