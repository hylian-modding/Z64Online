import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import fs from 'fs';
import path from 'path';
import { bus } from 'modloader64_api/EventHandler';
import Vector3 from 'modloader64_api/math/Vector3';
import { Z64OnlineEvents, Z64_AnimationBank } from '@Z64Online/common/api/Z64API';
import { Z64LibSupportedGames } from 'Z64Lib/API/Utilities/Z64LibSupportedGames';
import { Z64RomTools } from 'Z64Lib/API/Utilities/Z64RomTools';
import { Z64_GAME } from 'Z64Lib/src/Common/types/GameAliases';

export class Animation {

    SourceFile!: string;
    SourceLine!: number;
    Name!: string;
    FrameCount!: number;

    public Animation(file: string, name: string) {
        this.Name = name;
        this.SourceFile = file;
        let fileArr = file.split("\n");
        //fs.writeFileSync("./" + "_l.txt", _l.toString())
        // Detrmine Line Position and Frame Count of Animation `name`
        for (let i = 0; i < fileArr.length; i++) {
            let _s: string[] = fileArr[i].split(' ');
            if (_s.length < 4) {
                if (_s[0] == "frames") {
                    if (_s[2] == this.Name) {
                        this.SourceLine = i;
                        this.FrameCount = parseInt(_s[1]);
                        break;
                    }
                }
            }
        }
    }
}

export class Anim2Link {
    private ModLoader: IModLoaderAPI;
    private floorPlane: boolean = false;
    private Animations: Animation[] = [];
    private rom: Buffer = Buffer.alloc(0);

    constructor(ModLoader: IModLoaderAPI) {
        this.ModLoader = ModLoader;
    }

    public RadianToEuler(_rad: number) {
        let _eul = ((180 / Math.PI) * _rad);
        return _eul;
    }
    public EncodeRotation(angle: number) {
        let _const = 182.044444444444;
        let _rot = ((angle * _const) & 0xFFFF);
        return _rot;
    }

    public RotationFromString(_r: string[]) {
        let VectorRot = new Vector3(
            this.RadianToEuler(parseFloat(_r[1])),
            this.RadianToEuler(parseFloat(_r[2])),
            this.RadianToEuler(parseFloat(_r[3]))
        );

        let ShortRot = new Array(
            this.EncodeRotation(VectorRot.x),
            this.EncodeRotation(VectorRot.y),
            this.EncodeRotation(VectorRot.z)
        );

        let ByteArrayRot = new Array(
            ((ShortRot[0] >> 8) & 0xFF),
            ((ShortRot[0]) & 0xFF),
            ((ShortRot[1] >> 8) & 0xFF),
            ((ShortRot[1]) & 0xFF),
            ((ShortRot[2] >> 8) & 0xFF),
            ((ShortRot[2]) & 0xFF),
        );

        return ByteArrayRot;
    }
    public TranslationFromString(_l: string[]) {
        let _m = 1;
        if (this.floorPlane)
            _m = 1000;
        else
            _m = 1;

        let VectorPos = new Vector3(
            parseFloat(_l[1]) * _m,
            parseFloat(_l[2]) * _m,
            parseFloat(_l[3]) * _m
        );
        let ShortPos = new Array(
            (VectorPos.x),
            (VectorPos.y),
            (VectorPos.z)
        );
        let ByteArrayPos = new Array(
            ((ShortPos[0] >> 8) & 0xFF),
            ((ShortPos[0]) & 0xFF),
            ((ShortPos[1] >> 8) & 0xFF),
            ((ShortPos[1]) & 0xFF),
            ((ShortPos[2] >> 8) & 0xFF),
            ((ShortPos[2]) & 0xFF),
        );

        return ByteArrayPos;
    }

    public OverwriteByteArray(src: number[], pos: number, data: number[]) {
        for (let i = 0; i < data.length; i++) {
            src[pos + i] = data[i];
        }
        return src;
    }

    GetRaw(_anim: Animation) {
        let _line = _anim.SourceFile.split("\n");
        let _linepos = _anim.SourceLine;
        let _fc = _anim.FrameCount;
        let Frames: number[][] = [];
        // Initialize New Byte Array (Link's Frame Length * Frame Count)
        if (_fc === undefined) {
            return Buffer.alloc(0);
        }
        let _out: number[] = Array<number>(0x86 * _fc);

        // Start Parsing; Initiailize Line Buffer
        let _buf = _linepos + 1;

        // For Each Frame
        for (let i = 0; i < _fc; i++) {
            // Initiailize New Frame Array and Write Buffer Position
            let _frame: number[] = Array<number>(0x86);
            let _writepos = 0;

            // Parse 1 Translation and 21 Rotations
            for (let j = _buf; j < _buf + 22; j++) {
                // Split Current Line
                let _s = _line[j].split(' ');

                // If Translation
                if (_s[0] == "l") {
                    let _l = this.TranslationFromString(_s);
                    _frame = this.OverwriteByteArray(_frame, _writepos, _l);
                }

                // If Rotation
                if (_s[0] == "r") {
                    let _r = this.RotationFromString(_s);
                    _frame = this.OverwriteByteArray(_frame, _writepos, _r);
                }

                _writepos += 6;
            }

            // Write Expression Bytes (Hardcoded to Automatic for now)
            _frame = this.OverwriteByteArray(_frame, _writepos, [0x00, 0x00]);
            _writepos += 2;
            Frames.push(_frame);
            //console.log(Buffer.from(Frames).toString('hex'));
            // Reset and Advance Parse Buffer
            _frame = Array<number>(0x86);
            _buf += 22;
        }

        let _outbuf = 0;
        for (let i = 0; i < Frames.length; i++) {
            this.OverwriteByteArray(_out, _outbuf, Frames[i]);
            _outbuf += Frames[i].length;
        }

        return Buffer.from(_out);
    }

    replaceAnim(anim: Animation, gpkOffset: number, lkIndex: number, gpkIndex: number, gpk: Buffer, link_animetion: Buffer) {
        let animBuf = this.GetRaw(anim);
        if (lkIndex === -1 || gpkIndex === -1) return animBuf;

        let lk_fc = gpk.readUInt16BE(gpkOffset);
        let lk_ofs = (gpk.readUInt32BE(gpkOffset + 4) & 0xFFFFFF);

        if (anim.FrameCount <= lk_fc) {
            //console.log(`Replacing Animation 0x${lk_ofs.toString(16)}, FC: ${lk_fc} -> ${anim.FrameCount} | size: 0x${animBuf.length.toString(0x16)}`);
            gpk.writeUInt16BE(anim.FrameCount, gpkOffset);
            animBuf.copy(link_animetion, lk_ofs, 0);
        } else console.log(`Animation ${anim.Name} is ${(anim.FrameCount - lk_fc)} frames too many!`)
        return animBuf;
    }

    getAnimNameArray(input: string[]) {
        let regexp = /"(\\.|[^"\\])*"/g;
        let nameArray: string[] = [];
        for (let i = 0; i < input.length; i++) {
            let _s: string[] = input[i].split(' ');
            if (_s[0] == "frames") {
                if (_s[2].match(regexp) !== null) {
                    nameArray.push(_s[2]);
                    //console.log("_s[2]: " + _s[2]);
                }
            }
        }
        return nameArray;
    }

    processAnims(animFile: string, floorPlane: boolean) {
        this.rom = this.ModLoader.rom.romReadBuffer(0x0, (32 * 1024 * 1024));
        if (this.rom.equals(Buffer.alloc(0))) {
            console.log('Rom Empty!');
            return
        }
        let tools = new Z64RomTools(this.ModLoader, Z64_GAME);
        let lkIndex = -1;
        let gpkIndex = -1;
        this.floorPlane = floorPlane;
        
        if (Z64_GAME === Z64LibSupportedGames.OCARINA_OF_TIME) {
            lkIndex = 0x7;
            gpkIndex = 0x1F2;
        }
        else if (Z64_GAME === Z64LibSupportedGames.MAJORAS_MASK) {
            lkIndex = 0x7;
            gpkIndex = 0x289;
        }
        let link_animetion = tools.decompressDMAFileFromRom(this.rom, lkIndex);
        let gpk = tools.decompressDMAFileFromRom(this.rom, gpkIndex);
        let nameArray = this.getAnimNameArray(animFile.split("\n"));
        let anim: Animation = new Animation;
        for (let i = 0; i < nameArray.length; i++) {
            if (nameArray[i].slice(1, 3) == "0x") {
                let offset = nameArray[i].slice(3, 7);
                //console.log(`${nameArray[i]} gpk offset: 0x${offset}`)
                anim.Animation(animFile, nameArray[i]);
                let AnimationRaw = this.replaceAnim(anim, parseInt(offset, 16), lkIndex, gpkIndex, gpk, link_animetion);
                //fs.writeFileSync(`./${nameArray[i].replace(/['"]+/g, '')}.bin`, AnimationRaw);
            }
        }

        if (link_animetion.length <= 0) return;
        return link_animetion;
    }
}