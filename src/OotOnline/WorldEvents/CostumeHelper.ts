export class CostumeHelper {
    static getCostumeName(costume: Buffer): string {
        let str = "";
        let cur = -1;
        let o = 0x53C0;
        let equipment_name_header = Buffer.from('45515549504D454E544E414D45000000', 'hex');
        if (costume.indexOf(equipment_name_header) > -1) {
            o = costume.indexOf(equipment_name_header) + 0x10;
        }
        while (cur !== 0) {
            cur = costume.readUInt8(o);
            str += costume.slice(o, o + 1).toString();
            o++;
        }
        return str.substring(0, str.length - 1).trim();
    }

    static getEquipmentCategory(equipment: Buffer): string {
        let str = "";
        let cur = -1;
        let o = 0x53C0;
        let equipment_cat_header = Buffer.from('45515549504D454E5443415400000000', 'hex');
        if (equipment.indexOf(equipment_cat_header) > -1) {
            o = equipment.indexOf(equipment_cat_header) + 0x10;
        }
        while (cur !== 0) {
            cur = equipment.readUInt8(o);
            str += equipment.slice(o, o + 1).toString();
            o++;
        }
        return str.substring(0, str.length - 1).trim();
    }
}