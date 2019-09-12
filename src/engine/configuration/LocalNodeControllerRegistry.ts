import { BitcoinController } from "../../application/localnodes/Bitcoin/BitcoinController";
import { BitcoinCashController } from "../../application/localnodes/BitcoinCash/BitcoinCashController";
import { CapricoinController } from "../../application/localnodes/Capricoin/CapricoinController";
import { EthereumController } from "../../application/localnodes/Ethereum/EthereumController";
import { LitecoinController } from "../../application/localnodes/Litecoin/LitecoinController";
import { RippleController } from "../../application/localnodes/Ripple/RippleController";
import { TronController } from "../../application/localnodes/TRON/TronController";
import { EosioController } from "../../application/localnodes/EOSIO/EosioController";

/**
 * Contains all local node api's controllers which are implemented.
 */

export class LocalNodeControllerRegistry {

    /**
     * List of local node APIs of the system.
     * Please keep this list updated.
     */
    private static readonly elements: Object = {
        Bitcoin: BitcoinController,
        BitcoinCash: BitcoinCashController,
        Litecoin: LitecoinController,
        Ethereum: EthereumController,
        Capricoin: CapricoinController,
        Ripple: RippleController,
        TRON: TronController,
        EOSIO: EosioController
    };

    /**
     * Returns components.
     */
    public static getElements(): Object {
        return LocalNodeControllerRegistry.elements;
    }

}
