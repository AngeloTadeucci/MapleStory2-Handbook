"""Extract original slot tiles from the user's uncompressed BGRA DDS atlas."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zlib

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
data = args.source.read_bytes()
assert data[:4] == b'DDS ', 'Expected DDS'
height, width = struct.unpack_from('<II', data, 12)
flags, fourcc, bits, red, green, blue, alpha = struct.unpack_from('<7I', data, 80)
assert (width, height) == (1024, 833), 'Unexpected atlas size'
assert (flags, fourcc, bits, red, green, blue, alpha) == (65, 0, 32, 0xff0000, 0xff00, 0xff, 0xff000000), 'Expected uncompressed BGRA8'
pixels = bytearray(data[128:128 + width * height * 4])
pixels[0::4], pixels[2::4] = pixels[2::4], pixels[0::4]
regions = {
    'slots/hats': [488, 525, 68, 68],
    'slots/eyewear': [624, 661, 68, 68],
    'slots/tops': [902, 281, 68, 68],
    'slots/pants': [896, 525, 68, 68],
    'slots/back': [624, 525, 68, 68],
    'slots/weapon': [692, 593, 68, 68],
    'slots/earrings': [692, 661, 68, 68],
    'slots/face-accessories': [556, 661, 68, 68],
    'slots/gloves': [896, 593, 68, 68],
    'slots/shoes': [624, 593, 68, 68],
    'character-background': [484, 4, 412, 448]
}

def chunk(kind, content):
    return struct.pack('>I', len(content)) + kind + content + struct.pack('>I', zlib.crc32(kind + content))

output = Path(__file__).resolve().parent.parent / 'static/outfits'
for name, (x, y, w, h) in regions.items():
    rows = b''.join(b'\0' + pixels[((y + row) * width + x) * 4:((y + row) * width + x + w) * 4] for row in range(h))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')
    target = output / f'{name}.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(png)
(output / 'source.json').write_text(json.dumps({'source': 'LithMS2-XML/Gfx/uimyinfodialog_i1.dds', 'sha256': hashlib.sha256(data).hexdigest(), 'regions': regions}, indent=2) + '\n')
print(f'Extracted {len(regions)} original regions to {output}')
