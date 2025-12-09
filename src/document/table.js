export class WarhammerRollTable extends RollTable
{

    async toEmbed(config, options={})
    {
        let noCenter = config.noCenter;
        let inline = config.inline;
        let separator = config.separator || "";

        let columns = (await Promise.all(config.columns?.split(",").map(i => fromUuid(i.trim())) || [])).map(t => t);

        let resultToText = (r) => 
        {
            let description = inline ? r.description.replace(/^<[p>]+>|<[^>]+p>$/g, '') : r.description; // Remove opening and closing <p> tags if inline
            return (r.description && r.name) 
                ? `<p><strong>${r.name}</strong>${separator} ${description.replace("<p>", "")}</p>`.trim()
                : r.name || description;
        };

        return $(await foundry.applications.ux.TextEditor.implementation.enrichHTML(`<div class="table-container">${config.description == "top" ? this.description : ""}<table class="${game.system.id} embedded">
        <thead>
        <tr class="title"><td colspan="${columns.length + 2}">@UUID[${this.uuid}]{${columns.length ? this.name.split("-")[0].trim() : this.name}}</td></tr>
        <tr class="subheader">
            <td class="formula">${this.formula}</td>
            ${columns.length 
        ? [this].concat(columns).map(c => `@UUID[${c.uuid}]{${c.name.split("-")[1].trim()}}`).map(i => `<td class="label">${i}</td>`).join("") // If columns, column headers should be table names, otherwise use provided label
        : `<td class="label">${config.label}</td>`}
        </tr>
        </thead>
        <tbody class="${noCenter ? "no-center" : ""}">
    ${this.results.contents.sort((a, b) => a.range[0] - b.range[0]).map(r => 
    {
        let results = columns.length ? [r].concat(columns.map(i => i.results.find(other => other.range[0] == r.range[0]))) : [r];

        return `<tr>
            <td>${r.range[0] == r.range[1] ? r.range[0] : `${r.range[0]} – ${r.range[1]}`}</td>
            ${results.map(result => `<td>${["pack","document"].includes(result.type) ? `<p>@UUID[${result.documentUuid}]</p>${result.description && "<p>" + result.description + "</p>"}` : resultToText(result)}</td>`).join("")}
            
            </tr>`;
    }).join("")}

        </tbody>
    </table>${config.description == "bottom" ? this.description : ""}</div>`, options))[0];
    }
}
