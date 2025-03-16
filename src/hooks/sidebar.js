import {systemConfig} from "../util/utility";
/**
 *
 */
export default function()
{
    Hooks.on("renderSettings", (app, html) => 
    {
        html = html instanceof HTMLElement ? html : html[0];
        if (systemConfig().badgeInfo.img)
        {
            renderSettings(html);
        }
    });
}



/**
 * Generate sidebar links.
 * @returns {HTMLUListElement}
 * @private
 */
function _generateLinks() 
{
    let badgeInfo = systemConfig().badgeInfo;
    const links = document.createElement("ul");
    links.classList.add("unlist", "links");
    links.innerHTML = `
      <li>
        <a href="${badgeInfo.notes}" target="_blank">
          ${game.i18n.localize("WH.Badge.Notes")}
        </a>
      </li>
      <li>
        <a href="${badgeInfo.issues}" target="_blank">${game.i18n.localize("WH.Badge.Issues")}</a>
      </li>
      <li>
        <a href="${badgeInfo.wiki}" target="_blank">${game.i18n.localize("WH.Badge.Wiki")}</a>
      </li>
      <li>
        <a href="${badgeInfo.discord}" target="_blank">
          ${game.i18n.localize("WH.Badge.Discord")}
        </a>
      </li>
    `;
    return links;
}
  
/* -------------------------------------------- */
  
/**
 * (Yoinked from D&D5e)
 * Render a custom entry for game details in the settings sidebar.
 * @param {HTMLElement} html  The settings sidebar HTML.
 */
export function renderSettings(html) 
{
    const pip = html.querySelector(".info .system .notification-pip");
    html.querySelector(".info .system").remove();
  
    const section = document.createElement("section");
    section.classList.add("warhammer", "sidebar-info");
    section.innerHTML = `
      <h4 class="divider">${game.i18n.localize("WORLD.GameSystem")}</h4>
      <div class="system-badge">
        <img src="${systemConfig().badgeInfo.img}" data-tooltip="${game.system.title}" alt="${game.system.title}">
        <span class="system-info">${game.system.version}</span>
      </div>
    `;
    section.append(_generateLinks());
    if ( pip ) {section.querySelector(".system-info").insertAdjacentElement("beforeend", pip);}
    html.querySelector(".info").insertAdjacentElement("afterend", section);
}
  