export default function () 
{
    Hooks.on("dropCanvasData", (canvas, data, event) => 
    {
        if (data.type == "ActiveEffect")
        {
            fromUuid(data.uuid).then(effect => effect.handleCanvasDrop(data));
            return false;
        }
    });
}