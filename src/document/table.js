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



    /** @override */

    // If the table formula specifies some inputs (e.g. `@modifier`), prompt for those values
    async roll({roll, recursive=true}={})
    {
        let inputs = this.formula.match(/@([a-z.0-9_-]+)/gi);

        if (inputs?.length || roll)
        {
            return await foundry.applications.api.Dialog.wait({
                window: {title: this.name + " Formula"},
                content: `
                <div>
                    <p style="text-align: center"><strong>Table formula requires inputs</strong></p>
                    <p style="text-align: center">${this.formula}</p>
                </div>
                    ` + inputs.map(i => 
                {
                    let name = i.replaceAll("@", "");
                    return `<div class="form-group"><label>${name}</label><div class="form-fields"><input type="number" name=${name}></div></div>`;
                }).join(""),
                buttons: [
                    {
                        action: "confirm",
                        label : "Confirm",
                        callback: async (event, button, dialog) =>
                        {
                            try 
                            {
                                let rollData = {};
                                for(let input of inputs)
                                {
                                    let name = input.replaceAll("@", "");
                                    rollData[name] = button.form.elements[name].value || 0;
                                }
                                
                                let filledRoll = new Roll(this.formula, rollData);
                                return super.roll({roll: filledRoll, recursive});
                            }
                            catch(e)
                            {
                                return super.roll();
                            }
                        }
                    }
                ],
                close: () => 
                {
                    // Need to return to ensure the action listener re-enables the sheet button (if rolling from the sheet)
                    return {roll: {}};
                }
            });
        }
        else 
        {
            return super.roll({roll, recursive});
        }
    }
}
