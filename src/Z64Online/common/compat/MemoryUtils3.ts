import { bus } from "modloader64_api/EventHandler"

export class MemoryUtils3Events {
    static AddTab = "MemoryUtils3_MemoryViewer_AddTab"
}

export class MemoryUtils3Events_AddTabEvent {
    address: number

    constructor(address: number) {
        this.address = address
    }
}

export function openMemoryUtils3Tab(addr: number) {
    bus.emit(MemoryUtils3Events.AddTab, new MemoryUtils3Events_AddTabEvent(addr));
}