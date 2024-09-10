import TokenHelpers from "../util/token-helpers";

/**
 *
 */
export default function () 
{
    Hooks.on("createToken", TokenHelpers.updateAuras.bind(TokenHelpers));
    Hooks.on("updateToken", TokenHelpers.moveAuras.bind(TokenHelpers));
    Hooks.on("deleteToken", TokenHelpers.updateAuras.bind(TokenHelpers));
}