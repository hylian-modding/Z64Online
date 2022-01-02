import { IZ64GameMain } from "../types/Types";

export function GameParent() {
    return function (
        target: any,
        propertyKey: string
    ) {
        if (target.Z64O === undefined) {
            target['Z64O'] = {};
        }
        if (target.Z64O.GameParent === undefined) {
            target.Z64O['GameParent'] = new Map<string, string>();
        }
        target.Z64O.GameParent.set(propertyKey, propertyKey);
    };
}

export function setupGameParentReference(instance: any, parent: IZ64GameMain) {
    if (instance === undefined) return;
    let p = Object.getPrototypeOf(instance);
    if (p.hasOwnProperty('Z64O')) {
        if (p.Z64O.hasOwnProperty('GameParent')) {
            p.Z64O.GameParent.forEach(function (value: string, key: string) {
                instance[key] = parent;
            });
        }
    }
}