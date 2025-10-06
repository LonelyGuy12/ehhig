import { SmazCompress } from '../../../smaz-compress/dist/esm/index.js';
import { SmazDecompress, SmazDecompressRaw } from '../../../smaz-decompress/dist/esm/index.js';

class Smaz {
    constructor(codebook, maxSize = 30000) {
        this.codebook = codebook;
        this.compressor = new SmazCompress(codebook, maxSize);
        this.decompressor = new SmazDecompress(codebook);
        this.rawDecompressor = SmazDecompressRaw.fromStringCodebook(codebook);
    }
    compress(buffer) {
        return this.compressor.compress(buffer);
    }
    getCompressedSize(buffer) {
        return this.compressor.getCompressedSize(buffer);
    }
    decompress(buffer) {
        return this.decompressor.decompress(buffer);
    }
    decompressRaw(buffer) {
        return this.rawDecompressor.decompress(buffer);
    }
}

export { Smaz };
