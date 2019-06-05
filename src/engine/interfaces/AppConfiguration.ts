import { ILocalNodeConfig as BitcoinConfig } from "../../application/localnodes/Bitcoin/ILocalNodeConfig";
import { ILocalNodeConfig as BitcoinCashConfig } from "../../application/localnodes/BitcoinCash/ILocalNodeConfig";
import { ILocalNodeConfig as CapricoinConfig } from "../../application/localnodes/Capricoin/ILocalNodeConfig";
import { ILocalNodeConfig as EthereumConfig } from "../../application/localnodes/Ethereum/ILocalNodeConfig";
import { ILocalNodeConfig as LitecoinConfig } from "../../application/localnodes/Litecoin/ILocalNodeConfig";
import { ILocalNodeConfig as RippleConfig } from "../../application/localnodes/Ripple/ILocalNodeConfig";
import { ILocalNodeConfig as TRONConfig } from "../../application/localnodes/TRON/ILocalNodeConfig";
export interface AppConfiguration {
    /**
     * Is the environment production?
     */
    production: boolean;

    /**
     * Sets the hostname or IP address the server will listen on.
     * Use '0.0.0.0' to listen on all available network interfaces
     */
    host: string;

    /**
     * The TCP port the server will listen to.
     */
    port: string;

    /**
     * To create an HTTPS server, include the tls object in the server configuration.
     * The tls object is passed unchanged to the node.js HTTPS server and described in the node.js HTTPS documentation.
     * (OPTIONAL) Remove it completely if you want to use simple HTTP protocol.
     */
    tls?: {
        key: string;
        cert: string;
    };

     localnodes: Array<LocalNodeMapping>;

     localnodeConfigs: {
         Ethereum?: EthereumConfig;
         Bitcoin?: BitcoinConfig;
         BitcoinCash?: BitcoinCashConfig;
         Capricoin?: CapricoinConfig;
         Litecoin?: LitecoinConfig;
         Ripple?: RippleConfig;
         TRON?: TRONConfig;
     };
}

export interface LocalNodeMapping {
    route: string;
    class: string;
}

export interface TokenMapping {
    route: string;
    transporterClass: string;
}
