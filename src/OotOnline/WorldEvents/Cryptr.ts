import crypto from 'crypto';


export class Cryptr {
    crypto = require('crypto');
    secret: string;
    algorithm = 'aes-256-gcm';
    ivLength = 16;
    saltLength = 64;
    tagLength = 16;
    tagPosition = this.saltLength + this.ivLength;
    encryptedPosition = this.tagPosition + this.tagLength;

    constructor(secret: string) {
        if (!secret || typeof secret !== 'string') {
            throw new Error('Cryptr: secret must be a non-0-length string');
        }
        this.secret = secret;
    }

    getKey(salt: any) {
        return crypto.pbkdf2Sync(this.secret, salt, 100000, 32, 'sha512');
    }

    encrypt(value: string) {
        if (value == null) {
            throw new Error('value must not be null or undefined');
        }

        const iv = crypto.randomBytes(this.ivLength);
        const salt = crypto.randomBytes(this.saltLength);

        const key = this.getKey(salt);

        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        
        const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);

        //@ts-ignore
        const tag = cipher.getAuthTag();

        return Buffer.concat([salt, iv, tag, encrypted]).toString('hex');
    };

    decrypt(value: string) {
        if (value == null) {
            throw new Error('value must not be null or undefined');
        }

        const stringValue = Buffer.from(String(value), 'hex');

        const salt = stringValue.slice(0, this.saltLength);
        const iv = stringValue.slice(this.saltLength, this.tagPosition);
        const tag = stringValue.slice(this.tagPosition, this.encryptedPosition);
        const encrypted = stringValue.slice(this.encryptedPosition);

        const key = this.getKey(salt);

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

        //@ts-ignore
        decipher.setAuthTag(tag);

        return decipher.update(encrypted) + decipher.final('utf8');
    };
}
