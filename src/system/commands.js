export default class ChatCommands
{
    commands = {};
    prefix = "/";

    constructor(commands={})
    {
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
                description : commands[command].description
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
        this.commands[command].callback(...args);;
    }



    parseArgs(command, text)   
    {
        let commandData = this.commands[command];
        let foundArgs = [];
        for(let commandArg of commandData.args)
        {
            let regex = new RegExp(`${commandArg}=(?<data>.+?)(?:\\s+[A-Za-z]+=|$)+`);
            let found = regex.exec(text);
            if (found)
            {
                foundArgs.push(found.groups.data);
            }
            else {
                foundArgs.push(null);
            }
        }
        return foundArgs;
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