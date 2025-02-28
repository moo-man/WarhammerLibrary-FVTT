export default function() 
{

    Hooks.on("renderApplication", (app, html, data) => 
    {
        warhammer.utility.log(`Rendering ${app.constructor.name}`, {args : data});
    });

    Hooks.on("ready", () => 
    {
    });
}