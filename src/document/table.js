export class WarhammerRollTable extends RollTable
{

    async toEmbed(config, options={})
    {
        let noCenter = config.noCenter;
        let inline = config.inline;
        let separator = config.separator || "";
        console.log(config, options);

        return $(await foundry.applications.ux.TextEditor.implementation.enrichHTML(`<div class="table-container">${config.description == "top" ? this.description : ""}<table class="${game.system.id} embedded">
        <thead>
        <tr class="title"><td colspan="2">@UUID[${this.uuid}]{${this.name}}</td></tr>
        <tr class="subheader">
            <td class="formula">${this.formula}</td>
            <td class="label">${config.label}</td>
        </tr>
        </thead>
        <tbody class="${noCenter ? "no-center" : ""}">
    ${this.results.contents.sort((a, b) => a.range[0] - b.range[0]).map(r => 
    {
        let uuid;
        let description = inline ? r.description.replace(/^<[p>]+>|<[^>]+p>$/g, '') : r.description; // Remove opening and closing <p> tags if inline
        let text = (r.description && r.name) 
            ? `<p><strong>${r.name}</strong>${separator} ${description.replace("<p>", "")}</p>`.trim()
            : r.name || description;


        return `<tr>
            <td>${r.range[0] == r.range[1] ? r.range[0] : `${r.range[0]} – ${r.range[1]}`}</td>
            <td>${["pack","document"].includes(r.type) ? `@UUID[${r.documentUuid}]` : text}</td>
            </tr>`;
    }).join("")}

        </tbody>
    </table>${config.description == "bottom" ? this.description : ""}</div>`, options))[0];
    }
}
