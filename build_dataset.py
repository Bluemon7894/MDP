import os, sys, io, re, zipfile, json
import cv2
import numpy as np

# 1. Load QuickDraw category dictionary
with open("src/constants/quickdraw.ts", "r", encoding="utf-8") as f:
    text = f.read()

pairs = re.findall(r"ko:\s*'([^']+)',\s*en:\s*'([^']+)'", text)
ko_to_en = {k: e for k, e in pairs}

# Manual synonyms/corrections for Korean typos/abbreviations
SYNONYMS = {
    "ufo": "flying saucer",
    "u.f.o": "flying saucer",
    "gun": "rifle",
    "qkf": "foot",
    "tv": "television",
    "xpsxm": "tent",
    "개": "dog",
    "개.리": "frog",
    "개구리": "frog",
    "견찬자": "police car",
    "경찰차": "police car",
    "교량": "bridge",
    "구.선": "zigzag",
    "구불구불선": "zigzag",
    "구.차": "ambulance",
    "구급차": "ambulance",
    "거북이": "sea turtle",
    "바다거북": "sea turtle",
    "넥타이": "bowtie",
    "나비넥타이": "bowtie",
    "벌": "bee",
    "꿀벌": "bee",
    "병": "wine bottle",
    "와인병": "wine bottle",
    "쇼파": "couch",
    "소파": "couch",
    "스케이드보드": "skateboard",
    "스케이트보드": "skateboard",
    "주전자": "teapot",
    "찻주전자": "teapot",
    "지퍼": "zipper",
    "하모니카": "harmonica",
    "노.북": "laptop",
    "노트북": "laptop",
    "농.공": "basketball",
    "농구공": "basketball",
    "다.몬": "diamond",
    "다이아몬드": "diamond",
    "다.빙": "diving board",
    "다.쥐": "squirrel",
    "다람쥐": "squirrel",
    "달팽": "snail",
    "달팽이": "snail",
    "동.미": "circle",
    "동그라미": "circle",
    "드.버": "screwdriver",
    "드라이버": "screwdriver",
    "뜨거운강아지": "hot dog",
    "핫도그": "hot dog",
    "롤.코": "roller coaster",
    "롤러코스터": "roller coaster",
    "립.틱": "lipstick",
    "립스틱": "lipstick",
    "모.시": "hourglass",
    "모래시계": "hourglass",
    "무.곰": "teddy-bear",
    "물.고": "fish",
    "물고기": "fish",
    "배개": "pillow",
    "베개": "pillow",
    "버.섯!": "mushroom",
    "버섯": "mushroom",
    "부.이": "submarine",
    "잠수함": "submarine",
    "부랑": "boomerang",
    "부메랑": "boomerang",
    "불.저": "bulldozer",
    "불도저": "bulldozer",
    "붕": "bandage",
    "붕대": "bandage",
    "브.콜": "broccoli",
    "브로콜리": "broccoli",
    "블.랙": "blackberry",
    "블랙베리": "blackberry",
    "블.베": "blueberry",
    "블루베리": "blueberry",
    "빗.자": "broom",
    "빗자루": "broom",
    "빵!": "bread",
    "빵": "bread",
    "색소!폰": "saxophone",
    "색소폰": "saxophone",
    "샹.에": "chandelier",
    "샹들리에": "chandelier",
    "선.기": "fan",
    "선풍기": "fan",
    "성": "castle",
    "손.전.등": "flashlight",
    "손전등": "flashlight",
    "숟.": "spoon",
    "숟가락": "spoon",
    "스! 노우매ㅐㄴ": "snowman",
    "눈사람": "snowman",
    "스.버": "school bus",
    "스쿨버스": "school bus",
    "스.보": "skateboard",
    "식.세": "dishwasher",
    "식기세척기": "dishwasher",
    "아.바": "popsicle",
    "아이스바": "popsicle",
    "아.파.스": "asparagus",
    "아스파라거스": "asparagus",
    "알.시": "alarm clock",
    "알람시계": "alarm clock",
    "야.방": "baseball bat",
    "야구방망이": "baseball bat",
    "와.잔": "wine glass",
    "와인잔": "wine glass",
    "울.리": "fence",
    "울타리": "fence",
    "웃.얼": "smiley face",
    "웃는얼굴": "smiley face",
    "자.넥": "bowtie",
    "자.차": "bicycle",
    "자전거": "bicycle",
    "잠.함": "submarine",
    "전.기": "telephone",
    "전화기": "telephone",
    "지.개": "eraser",
    "지우개": "eraser",
    "찻": "cup",
    "천.선.기": "ceiling fan",
    "천장선풍기": "ceiling fan",
    "축.공": "soccer ball",
    "축구공": "soccer ball",
    "치.": "toothbrush",
    "칫솔": "toothbrush",
    "치솔": "toothbrush",
    "케이": "cake",
    "케잌": "cake",
    "크.선": "cruise ship",
    "크.파": "crayon",
    "크레파스": "crayon",
    "클.넷": "clarinet",
    "클라리넷": "clarinet",
    "테.": "table",
    "테이블": "table",
    "토.기": "rabbit",
    "토끼": "rabbit",
    "토.도": "tornado",
    "토네이도": "tornado",
    "트.터": "tractor",
    "트랙터": "tractor",
    "티.츠": "t-shirt",
    "티셔츠": "t-shirt",
    "파.플": "pineapple",
    "파인애플": "pineapple",
    "팔.치": "bracelet",
    "팔찌": "bracelet",
    "페.통": "paint can",
    "페인트통": "paint can",
    "편.봉": "envelope",
    "편지봉투": "envelope",
    "하.니": "harmonica",
    "항.모": "aircraft carrier",
    "항공모함": "aircraft carrier",
    "핸드폰": "cell phone",
    "햄.거": "hamburger",
    "햄버거": "hamburger",
    "허.띠": "belt",
    "허리띠": "belt",
    "헬.콥": "helicopter",
    "헬리콥터": "helicopter",
    "후.팬": "frying pan",
    "후라이팬": "frying pan",
    "휴.폰": "cell phone",
}

def resolve_english_label(korean_name):
    clean = korean_name.strip()
    # 1. Exact match in QuickDraw
    if clean in ko_to_en:
        return ko_to_en[clean]
    # 2. Match in synonyms
    clean_lower = clean.lower()
    if clean_lower in SYNONYMS:
        return SYNONYMS[clean_lower]
    # 3. Direct english match
    for k, v in ko_to_en.items():
        if v.lower() == clean_lower:
            return v
    return None

def process_drawing(img_bytes):
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if img is None: return None
    
    # Extract ink grayscale
    if len(img.shape) == 3 and img.shape[2] == 4:
        alpha = img[:, :, 3] / 255.0
        gray = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2GRAY)
        white_bg = np.ones_like(gray) * 255
        comp = (gray * alpha + white_bg * (1 - alpha)).astype(np.uint8)
    elif len(img.shape) == 3:
        comp = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        comp = img

    # Invert so ink is white (>50), background is black (0)
    ink_mask = (comp < 200).astype(np.uint8) * 255
    coords = np.argwhere(ink_mask > 0)
    if len(coords) < 50:
        return None

    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)
    
    crop = ink_mask[y0:y1+1, x0:x1+1]
    ch, cw = crop.shape
    
    # Square canvas with 15% padding
    max_dim = max(ch, cw)
    pad = int(max_dim * 0.15)
    canvas_size = max_dim + 2 * pad
    square = np.zeros((canvas_size, canvas_size), dtype=np.uint8)
    
    oy = pad + (max_dim - ch) // 2
    ox = pad + (max_dim - cw) // 2
    square[oy:oy+ch, ox:ox+cw] = crop
    
    # Resize to canonical 128x128 binary/grayscale
    norm128 = cv2.resize(square, (128, 128), interpolation=cv2.INTER_AREA)
    norm256 = cv2.resize(square, (256, 256), interpolation=cv2.INTER_AREA)
    return norm128, norm256

print("Processing complete test setup.")
