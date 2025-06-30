import { format, localize } from "../util/utility";

export default class ChatCommands
{
    commands = {

    };
    prefix = "/";

    constructor(commands={})
    {
        this._addCommands({
            help : {

                args : [],
                callback : this.printHelp.bind(this),
                description : localize("WH.Chat.Commands.HelpDescription")
            }
        });
        this._addCommands(commands);
        this._callHook();
    }

    add(commands)
    {
        this._addCommands(commands);
    }

    _addCommands(commands)
    {
        for(let command in commands)
        {
            this.commands[command] = {
                pattern : new RegExp(`^${command.prefix || this.prefix}(?<command>${command})\\s?(?<args>.*)`),
                callback : commands[command].callback,
                args : commands[command].args,
                defaultArg : commands[command].defaultArg,
                description : commands[command].description,
                notes : commands[command].notes,
                examples : commands[command].examples,
            };
        }
    }

    match(text)
    {
        for (let command in this.commands)
        {
            let match = this.commands[command].pattern.exec(text);
            if(match)
            {
                return match;
            }
        }
    }

    call(command, text)
    {
        let args = this.parseArgs(command, text);
        this.commands[command].callback(...args);
    }



    parseArgs(command, text)   
    {
        let commandData = this.commands[command];
        let foundArgs = [];
        let foundDefault;
        if (commandData.defaultArg)
        {
            let first = text.split(" ")[0];
            if (!first.includes("="))
            {
                foundDefault = first;
            }
        }
        for(let commandArg of commandData.args)
        {
            if (commandArg == commandData.defaultArg && foundDefault)
            {
                foundArgs.push(foundDefault);
            }
            else 
            {
                
                let regex = new RegExp(`${commandArg}=(?<data>.+?)(?:\\s+[A-Za-z]+=|$)+`);
                let found = regex.exec(text);
                if (found)
                {
                    foundArgs.push(found.groups.data);
                }
                else 
                {
                    foundArgs.push(null);
                }
            }
        }
        return foundArgs;
    }

    printHelp()
    {
        let content = format("WH.Chat.Commands.PrintCommand", {prefix: this.prefix}); 
        for(let command in this.commands)
        {
            if (command != "help")
            {
                let commandData = this.commands[command];
                content += `<p><strong>${commandData.description}</strong></p>
                <p><span style='font-family:monospaced'>${this.prefix}${command}</span></p>
                <p><strong>Arguments</strong>: ${commandData.args?.length == 0 ? "None" : "<span style='font-family:monospaced'>" + commandData.args.join("</span>, <span style='font-family:monospaced'>")}</span></p>
                ${commandData.defaultArg ? "<p><strong>" + localize("WH.Chat.Commands.DefaultArgument") + "</strong>: " + commandData.defaultArg +  "</p>" : ""}
                ${commandData.notes ? "<p><strong>" + localize("WH.Chat.Commands.Notes") + "</strong>: " + commandData.notes +  "</p>" : ""}
                ${commandData.examples ? "<p><strong>" + localize("WH.Chat.Commands.Examples") + "</strong>: " + commandData.examples +  "</p>" : ""}
                <hr>
            `;
            }
        }

        ChatMessage.implementation.create(ChatMessage.applyRollMode({content, speaker : {alias : localize("WH.Chat.Commands.HelpAlias")}}, "selfroll"));
    }

    _callHook()
    {
        Hooks.on("chatMessage", (log, text) => 
        {
            let match = this.match(text);
            if (match)
            {
                this.call(match.groups.command, match.groups.args);
                return false;
            }
        });
    }
}