export default interface CDNConfig{
    url: string;
    port: number;
    reverseProxy: boolean;
}

export const CDNConfigTag: string = "CDN_Config";