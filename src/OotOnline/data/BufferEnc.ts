import crypto from 'crypto';
import zlib from 'zlib';

export class BufferEnc {
    algorithm = 'aes-256-cbc';
    key = crypto.randomBytes(32);
    iv = crypto.randomBytes(16);

    encrypt(buf: Buffer): Buffer{
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.key), this.iv);
        let encrypted = cipher.update(zlib.deflateSync(buf));
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        let d = { iv: this.iv.toString('hex'), encryptedData: encrypted.toString('hex') };
        return Buffer.from(JSON.stringify(d));
    }

    decrypt(buf: Buffer): Buffer{
        let txt = buf.toString();
        let obj = JSON.parse(txt);
        let iv = Buffer.from(obj.iv, 'hex');
        let encryptedText = Buffer.from(obj.encryptedData, 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return zlib.inflateSync(decrypted);
    }

}