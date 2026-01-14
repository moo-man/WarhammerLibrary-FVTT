import TokenHelpers from "../util/token-helpers";

/**
 *
 */
export default function () 
{
    Hooks.on("createToken", TokenHelpers.updateAuras.bind(TokenHelpers));
    Hooks.on("updateToken", TokenHelpers.moveAuras.bind(TokenHelpers));
    Hooks.on("deleteToken", TokenHelpers.updateAuras.bind(TokenHelpers));

    Hooks.on("createToken", async (token, data, user) => 
    {
        if (game.user.id == user)
        {
            token.actor.runScripts("createToken", token);
        }
    });
}