/* eslint-disable */
import path from "path";
import fs from "fs-extra";

export default function foundryConfig() 
{
    const configPath = path.resolve(process.cwd(), "foundryconfig.json");
    let config;

    if (fs.existsSync(configPath)) 
    {
        config = fs.readJSONSync(configPath);
    }

    let foundryPath;
    if (process.env.NODE_ENV == "production")
    {
        foundryPath = "./build";
    }
    else if (config?.path)
    {
        foundryPath = path.join(config.path, "modules", "warhammer-lib");
    }

    console.log("Foundry Path: " + foundryPath);
    return foundryPath;
}
