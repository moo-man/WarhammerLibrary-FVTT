export class WarhammerRollTable extends RollTable
{

    async toEmbed(config, options={})
    {
        let noCenter = config.noCenter;
        console.log(config, options);

        return $(await TextEditor.enrichHTML(`<table class="${game.system.id} embedded">
        <thead>
        <tr class="title"><td colspan="2">@UUID[${this.uuid}]{${this.name}}</td></tr>
        <tr class="subheader">
            <td class="formula">${this.formula}</td>
            <td class="label">${config.label}</td>
        </tr>
        </thead>
        <tbody class="${noCenter ? "no-center" : ""}">
    ${this.results.map(r => 
    {
        let uuid;

        if (r.type == "document")
        {
            uuid = `${r.documentCollection}.${r.documentId}`;
        }
        else if (r.type == "pack")
        {
            uuid = `Compendium.${r.documentCollection}.${r.documentId}`;
        }

        return `<tr>
            <td>${r.range[0] == r.range[1] ? r.range[0] : `${r.range[0]} – ${r.range[1]}`}</td>
            <td>${["pack","document"].includes(r.type) ? `@UUID[${uuid}]` : r.text}</td>
            </tr>`;
    }).join("")}

        </tbody>
    </table>`, options))[0];
    }
}
