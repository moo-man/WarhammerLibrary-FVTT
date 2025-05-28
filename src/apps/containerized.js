const ContainerizedApp = (cls) => class extends cls  
{
    async _onFirstRender(context, options)
    {
        await super._onFirstRender(context, options);
        this._handleContainers();
    }

    _handleContainers(context, options)
    {
        const containers = {};
        for (const [part, config] of Object.entries(this.constructor.PARTS)) 
        {
            if (!config.container?.id) {continue;}
            const element = this.element.querySelector(`[data-application-part="${part}"]`);
            if (!element) {continue;}
            if (!containers[config.container.id]) 
            {
                const div = document.createElement("div");
                div.dataset.containerId = config.container.id;
                div.classList.add(...config.container.classes ?? []);
                containers[config.container.id] = div;
                element.replaceWith(div);
            }
            containers[config.container.id].append(element);
        }
    }

    
};

export default ContainerizedApp;