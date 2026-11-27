import { systemConfig } from "../util/utility";

export default function() 
{
    // Easily create a table from items and list various properties
    // @ToTable[headers="Weapon:uuid Price:system.price Enc:system.encumbrance Range:system.range:rangeConfig" rows="Item.uuid,Item.uuid,separator:Test,Item.uuid" style="margin: 5px" classes="custom-class"]
    CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
        {
            pattern : /@ToTable\[(?<data>.+?)\](?:{(?<title>.+?)})?/gm,
            enricher : async (match, options) => 
            {
                let rgx = /headers="(?<headers>.+?)"\s*rows="(?<rows>.+?)"\s*(?:style="(?<style>.+?)")*\s*(?:classes="(?<classes>.+?)")*/gm;
                let parsed = Array.from(match.groups.data.matchAll(rgx))[0];
            
                let headers = {};
                let configLookup = {};

                // Headers define the name (column header) the path for the value, and optionally the config object to lookup the value for a localized version
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

                    // If no document found, and includes colon, assume it's a separator
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
                                // Calling enrichHTML on the table seems to remove the table itself so we have to do links manually
                                return `<a class="content-link ${!document ? '' : 'broken'}" data-link data-id="${document?.id}" data-type="${document?.documentName}" data-uuid="${document?.uuid}">${document?.name || "Not Found"}</a>`;
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

                table.cssText = parsed.groups.style || "";
                table.classList.add("generated");
                table.classList.add(...(parsed.groups.classes?.split(" ") || []));

                return table;
            }
        }
    ]);

}
