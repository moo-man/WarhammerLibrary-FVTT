/* eslint-disable */
import path from "path";
import fs from "fs-extra";

export default function foundryConfig() 
{
    const configPath = path.resolve(process.cwd(), "foundryconfig.json");
    const manifestPath = path.resolve(process.cwd(), "module.json");
    let version;
    let config;

    if (fs.existsSync(configPath)) 
    {
        config = fs.readJSONSync(configPath);
    }

    if (fs.existsSync(manifestPath))
    {
        version = fs.readJSONSync(manifestPath).compatibility.verified;
    }

    let foundryPath;
    if (process.env.NODE_ENV == "production")
    {
        foundryPath = "./build";
    }
    else if (config?.path)
    {
        foundryPath = path.join(config.path, "modules", "warhammer-lib").replace("{version}", version);
    }

    console.log("Foundry Path: " + foundryPath);
    return foundryPath;
}
