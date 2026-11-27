import { systemConfig } from "../util/utility";

export default function() 
{

    CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
        {
        // @ToTable[headers="Weapon:uuid Price:system.price Enc:system.encumbrance.value" rows="Item.uuid,Item.uuid,separator:Test,Item.uuid" style="margin: 5px"]
            pattern : /@ToTable\[(?<data>.+?)\](?:{(?<title>.+?)})?/gm,
            enricher : async (match, options) => 
            {
                let rgx = /headers="(?<headers>.+?)"\s*rows="(?<rows>.+?)"\s*(?:style="(?<style>.+?)")*\s*(?:classes="(?<classes>.+?)")*/gm;

            
                let parsed = Array.from(match.groups.data.matchAll(rgx))[0];
            
                let headers = {};
                let configLookup = {};

                let headerRgx = /(?<name>.+?):(?<path>[a-zA-Z0-9.]+):?(?<config>[a-zA-Z0-9]+)*\s*/gm;

                parsed.groups.headers.matchAll(headerRgx).forEach(i => 
                {
                    headers[i.groups.name] = i.groups.path;
                    if (i.groups.config)
                    {
                        configLookup[i.groups.path] = systemConfig()[i.groups.config];
                    }
                });


                let cols = Object.values(headers).length;

                let header = `
                <tr class="title"><th colspan="${cols}">${match.groups.title}</th></tr>
                <tr class="subheader">`;

                header += `<th>${Object.keys(headers).join("</th><th>")}</th></tr>`;


                let rows = [];
                for(let item of parsed.groups.rows.split(","))
                {
                    let document = await fromUuid(item);
                    let row = "<tr>";

                    if (!document && item.includes(":"))
                    {
                        row += `<td colspan="${cols}" class="separator">${item.split(":")[1]}</td>`;
                    }
                    else 
                    {
                        row += `<td>${Object.values(headers).map(path => 
                        {
                            
                            if (path == "link")
                            {
                                return `<a class="content-link ${!document ? '' : 'broken'}" data-uuid="${document?.uuid}">${document?.name || "Not Found"}</a>`;
                            }
                            else if (configLookup[path])
                            {
                                return configLookup[path][foundry.utils.getProperty(document, path)];
                            }
                            else
                            {
                                return foundry.utils.getProperty(document, path);
                            }
                            
                        
                        }).join("</td><td>")}</td>`;
                    }
                    row += "</tr>";
                    rows.push(row);
                }





                let table = document.createElement("table");
                table.innerHTML = `<thead>${header}</thead>
                <tbody class="no-center onlyleft">${rows.join("")}</tbody>`;

                // await foundry.applications.ux.TextEditor.enrichHTML(, options);

                table.cssText = parsed.groups.style || "";
                table.classList.add("generated");
                table.classList.add(...(parsed.groups.classes?.split(" ") || []));

                return table;
            }
        }
    ]);

}
