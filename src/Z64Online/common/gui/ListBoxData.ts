import path from 'path';

export class ListBoxData {
    name: string;
    _path: string;

    constructor(_path: string) {
        this.name = path.parse(_path).name;
        this._path = _path;
    }

    toString() {
        return this.name;
    }
}
