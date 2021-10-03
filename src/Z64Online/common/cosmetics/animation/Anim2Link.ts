import fs from 'fs';
import Vector3 from 'modloader64_api/math/Vector3';

export class Anim2Link {
    SourceFile: string;
    SourceLine!: number;
    Name: string;
    FrameCount!: number;

    constructor(name: string, file: string) {
        this.Name = "";
        this.SourceFile = file;
        let _l = fs.readFileSync(file).toString().split('\n');

        for (let i = 0; i < _l.length; i++) {
            let _s = _l[i].replace(/['"]+/g, '').split(' ');
            if (_s.length < 4) {
                if (_s[0] === "frames") {
                    if (_s[2] === name) {
                        this.SourceLine = i;
                        this.FrameCount = parseInt(_s[1]);
                    }
                }
            }
        }
    }

    public RadianToEuler(_rad: number) {
        let _eul: number = (180 / Math.PI) * _rad;
        return _eul;
    }

    public EncodeRotation(angle: number) {
        const _const: number = 182.044444444444;
        let _rot: number = angle * _const as number;
        return _rot;
    }

    public GetByteArray(src: Buffer, start: number, size: number) {
        let bytes: Buffer = Buffer.alloc(size);

        for (let i = 0; i < size; i++) {
            bytes[i] = src[start + i];
        }

        return bytes;
    }

    public OverwriteByteArray(src: Buffer, pos: number, data: Buffer) {
        for (let i = 0; i < data.byteLength; i++) {
            src[pos + i] = data[i];
        }
    }

    public RotationFromString(_r: string[]) {
        let VectorRot = new Vector3(
            this.RadianToEuler(parseFloat(_r[1])),
            this.RadianToEuler(parseFloat(_r[2])),
            this.RadianToEuler(parseFloat(_r[3]))
        );

        let ShortRot: number[] = [
            this.EncodeRotation(VectorRot.x),
            this.EncodeRotation(VectorRot.y),
            this.EncodeRotation(VectorRot.z)
        ];

        let ByteArrayRot: Buffer = Buffer.from([
            ((ShortRot[0] >> 8) & 0xFF),
            ((ShortRot[0]) & 0xFF),
            ((ShortRot[1] >> 8) & 0xFF),
            ((ShortRot[1]) & 0xFF),
            ((ShortRot[2] >> 8) & 0xFF),
            ((ShortRot[2]) & 0xFF),
        ]);

        return ByteArrayRot;
    }

    public TranslationFromString(_l: string[]) {
        let _m: number = 1;
        _m = 1000;

        let VectorPos: Vector3 = new Vector3(
            parseFloat(_l[1]) * _m,
            parseFloat(_l[2]) * _m,
            parseFloat(_l[3]) * _m
        );

        let ShortPos: number[] = [
            (VectorPos.x),
            (VectorPos.y),
            (VectorPos.z)
        ];

        let ByteArrayPos: Buffer = Buffer.from([
            ((ShortPos[0] >> 8) & 0xFF),
            ((ShortPos[0]) & 0xFF),
            ((ShortPos[1] >> 8) & 0xFF),
            ((ShortPos[1]) & 0xFF),
            ((ShortPos[2] >> 8) & 0xFF),
            ((ShortPos[2]) & 0xFF),
        ]);

        return ByteArrayPos;
    }

    public GetRaw() {
        let _line = fs.readFileSync(this.SourceFile).toString().split('\n');
        let _linepos: number = this.SourceLine;
        let _fc: number = this.FrameCount;
        let frames: Array<Buffer> = [];
        // Initialize New Byte Array (Link's Frame Length * Frame Count)
        let _out: Buffer = Buffer.alloc(_fc * 0x86);

        // Start Parsing; Initiailize Line Buffer
        let _buf: number = _linepos + 1;

        // For Each Frame
        for (let i = 0; i < _fc; i++) {
            // Initiailize New Frame Array and Write Buffer Position
            let _frame: Buffer = Buffer.alloc(0x86);
            let _writepos = 0;

            // Parse 1 Translation and 21 Rotations
            for (let j = _buf; j < _buf + 22; j++) {
                // Split Current Line
                let _s: string[] = _line[j].split(' ');

                // If Translation
                if (_s[0] == "l") {
                    let _l = this.TranslationFromString(_s);
                    this.OverwriteByteArray(_frame, _writepos, _l);
                }

                // If Rotation
                if (_s[0] == "r") {
                    let _r = this.RotationFromString(_s);
                    this.OverwriteByteArray(_frame, _writepos, _r);
                }

                _writepos += 6;
            }

            // Write Expression Bytes (Hardcoded to Automatic for now)
            this.OverwriteByteArray(_frame, _writepos, Buffer.from([0x00, 0x00]));
            _writepos += 2;
            frames.push(_frame);

            // Reset and Advance Parse Buffer
            _buf += 22;
        }

        let _outbuf = 0;
        for (let i = 0; i < frames.length; i++) {
            this.OverwriteByteArray(_out, _outbuf, frames[i]);
            _outbuf += frames[i].length;
        }

        return _out;
    }


}