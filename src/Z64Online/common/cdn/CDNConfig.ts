export default interface CDNConfig{
    url: string;
    port: number;
    reverseProxy: boolean;
    reverseProxyPort: number;
}

export const CDNConfigTag: string = "CDN_Config";