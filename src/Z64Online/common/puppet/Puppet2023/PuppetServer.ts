import { IZ64Master } from '@Z64Online/common/api/InternalAPI';
import { Z64O_PuppetPacket } from '@Z64Online/common/network/Z64OPackets';
import { ServerNetworkHandler } from 'modloader64_api/NetworkHandler';
import { ParentReference } from 'modloader64_api/SidedProxy/SidedProxy';

export default class PuppetServer{

    @ParentReference()
    parent!: IZ64Master;

    @ServerNetworkHandler('Z64O_PuppetPacket')
    onPacket(packet: Z64O_PuppetPacket){
        this.parent.OOT.sendPacketToPlayersInScene(packet);
    }

}