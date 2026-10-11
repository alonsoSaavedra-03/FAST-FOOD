const fs = require('fs');
const zlib = require('zlib');

function createSimplePNG(width, height, r, g, b) {
    // Generate raw uncompressed scanlines
    const rawData = Buffer.alloc(height * (1 + width * 4));
    let pos = 0;
    for (let y = 0; y < height; y++) {
        rawData[pos++] = 0; // Filter: None
        for (let x = 0; x < width; x++) {
            // Draw a rounded card in center
            const dx = x - width / 2;
            const dy = y - height / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < width * 0.4) {
                // Amber/gold center
                rawData[pos++] = 245; // R
                rawData[pos++] = 158; // G
                rawData[pos++] = 11;  // B
                rawData[pos++] = 255; // A
            } else {
                // Navy blue bg
                rawData[pos++] = r;
                rawData[pos++] = g;
                rawData[pos++] = b;
                rawData[pos++] = 255;
            }
        }
    }

    const compressed = zlib.deflateSync(rawData);

    function crc32(buf) {
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        table[i] = c;
    }

    function makeChunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeBuf = Buffer.from(type, 'ascii');
        const crcInput = Buffer.concat([typeBuf, data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(crcInput), 0);
        return Buffer.concat([len, typeBuf, data, crc]);
    }

    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // 8-bit depth
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0; // Deflate
    ihdr[11] = 0; // Filter
    ihdr[12] = 0; // Interlace

    const ihdrChunk = makeChunk('IHDR', ihdr);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const png192 = createSimplePNG(192, 192, 30, 58, 138);
const png512 = createSimplePNG(512, 512, 30, 58, 138);

fs.writeFileSync('C:/Users/likin/fastorder-pwa/public/icons/icon-192.png', png192);
fs.writeFileSync('C:/Users/likin/fastorder-pwa/public/icons/icon-512.png', png512);
console.log('PNG icons created successfully!');
