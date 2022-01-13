import fs from 'fs';
import Vector3 from 'modloader64_api/math/Vector3';
import { SmartBuffer } from 'smart-buffer';

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

    static getAllNames(file: string) {
        let _l = fs.readFileSync(file).toString().split('\n');
        let names: string[] = [];

        for (let i = 0; i < _l.length; i++) {
            let _s = _l[i].replace(/['"]+/g, '').split(' ');
            if (_s.length < 4) {
                if (_s[0] === "frames") {
                    names.push(_s[2]);
                }
            }
        }
        return names;
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

    private cloneBuffer(buf: Buffer){
        let copy = Buffer.alloc(buf.byteLength);
        buf.copy(copy);
        return copy;
    }

    public GetRaw() {
        let _line = fs.readFileSync(this.SourceFile).toString().split('\n');
        let frames: Array<Buffer> = [];
        // Initialize New Byte Array (Link's Frame Length * Frame Count)
        let _out: SmartBuffer = new SmartBuffer();

        let _frame: SmartBuffer = new SmartBuffer();
        for (let i = 0; i < _line.length; i++) {
            let _s: string[] = _line[i].split(' ');
            console.log(_s);
            if ((_s[0] == "loc" || _s[0] === "l") && _frame.length === 0) {
                // This is the start.
                console.log(`${i} start`);
                let _l = this.TranslationFromString(_s);
                console.log(`l ${_l.toString('hex')}`);
                _frame.writeBuffer(_l);
            } else if ((_s[0] == "loc" || _s[0] === "l") && _frame.length > 0) {
                // This is the end
                console.log(`${i} end`);
                _frame.writeBuffer(Buffer.from([0x00, 0x00]));
                frames.push(this.cloneBuffer(_frame.toBuffer()));
                _frame.clear();
                i--;
            }else if ((_s[0] == "rot" || _s[0] === "r")){
                let _r = this.RotationFromString(_s);
                _frame.writeBuffer(_r);
                console.log("r");
            }
        }
        frames.push(this.cloneBuffer(_frame.toBuffer()));
        _frame.clear();

        console.log(frames[0]);

        let _outbuf = 0;
        for (let i = 0; i < frames.length; i++) {
            _out.writeBuffer(frames[i]);
            _outbuf += frames[i].length;
        }

        console.log(`Frame size: ${frames[0].byteLength.toString(16)}`);
        return _out.toBuffer();
    }


}