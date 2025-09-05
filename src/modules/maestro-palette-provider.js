/**
 * Maestro Palette Provider
 * 
 * This module provides the palette entries for the left sidebar shape selector.
 * It integrates with diagram-js's native palette system.
 */

/**
 * A provider for palette entries.
 */
export default function MaestroPaletteProvider(palette, create, elementFactory) {
    this._palette = palette;
    this._create = create;
    this._elementFactory = elementFactory;
    palette.registerProvider(this);
    // Inject task colors into CSS
    this.injectTaskColors();
}

MaestroPaletteProvider.$inject = [
    'palette',
    'create',
    'elementFactory'
];

/**
 * Create palette entries for Maestro task types
 */
MaestroPaletteProvider.prototype.createTaskTypeEntries = function(createAction) {
    const entries = {};
    
    // Check if our object types are set up
    if (!Maestro.taskTypes || 
        !Maestro.maestroTaskColours) {
        console.warn('Maestro task types or colors not found');
        return entries;
    }

    // Generate palette entries for each task type
    Object.keys(Maestro.taskTypes).forEach(pluginId => {
        const label = Maestro.taskTypes[pluginId];
        const colour = Maestro.maestroTaskColours[pluginId] || '#cccccc'; // fallback color
        const taskWidth = Maestro.taskWidth || 100;
        const taskHeight = Maestro.taskHeight || 50;
        // Create a unique entry ID
        const entryId = `create-${pluginId.toLowerCase()}`;
        const dt = new Date();
        const time = dt.getTime();

        // Each task type has its own capabilities. Let's pick that off from our Maestro.taskCapabilities object.
        const capabilitiesObj = Maestro.taskCapabilities[pluginId] || {};
        const capabilities = Object.values(capabilitiesObj);
        // Create the palette entry
        entries[entryId] = createAction(
          `maestro:Task`,
          'maestro-tasks',
          `palette-icon-${pluginId.toLowerCase()}`,
          `Create ${label}`,
          {
            businessObject: { 
              $type: 'maestro:Task',
              taskType: pluginId 
            },
            createdWithPalette: true,
            width: 100,
            height: 80,
            taskType: pluginId,
            taskColor: colour,
            id: `${pluginId.toLowerCase()}${time}`,
            x: 10,
            y: 10,
            width: taskWidth,
            height: taskHeight,
            type: 'maestro:Task',
            draggable: true,
            taskid: `${pluginId.toLowerCase()}${time}`,
            colour: colour,
            uiLabel: `${label}`,
            taskName: `${label}`,
            capabilities: [...capabilities],
            to: [],
            falsebranch: [],
            workflowStatusMessage: '',
            workflowStatusNumber: ''
          }
        );
    });

    return entries;
};

/**
 * Inject task colors as CSS variables
 */
MaestroPaletteProvider.prototype.injectTaskColors = function() {
  if (!Maestro.maestroTaskColours) {
    return;
  }

  const style = document.createElement('style');
  let css = '', shapeCss = '', textCss = '';
  Object.keys(Maestro.taskTypes).forEach(pluginId => {
    shapeCss = '';
    textCss = '';
    const colour = Maestro.maestroTaskColours[pluginId];
    const label = Maestro.taskTypes[pluginId];
    // Create SVG markup
    let svg;
    if(pluginId == 'MaestroEnd') { // Circle shape
      // Truncate the label into 8 characters max
      var displayLabel = label.slice(0, 8);
      if(displayLabel != label) {
        displayLabel = displayLabel + '...';
      }

      css += `.palette-icon-${pluginId.toLowerCase()}:after {
        content: "";
        display: block;
        background: none;
        position: relative;   
        width: 50px;
        height: 50px;
        border: solid ${colour} 2px;
        border-radius: 30px;
        top: -45px;
        left: 10px;
      }`;

      shapeCss = `
        width: 75px !important;
        height: 50px !important;
        margin: 2px;
        border: none;
        padding: 3px;
        line-height: 38px !important;
      `;
    }
    else if (pluginId == 'MaestroIf') { // Diamond shape
      // Truncate the label into 12 characters max
      var displayLabel = label.slice(0, 12);
      if (displayLabel != label) {
        displayLabel = displayLabel + '...';
      }

      css += `.palette-icon-${pluginId.toLowerCase()}:after {
        content: "";
        display: block;
        background: none;
        position: relative;   
        width: 35px;
        height: 35px;
        border: solid ${colour} 2px;
        transform: rotate(45deg);
        top: -27px;
      }`;

      shapeCss = `
        border-radius: 0px;
        margin-left: 20px;
        margin-right: 10px;
        margin-top: 10px;
        padding: 3px;
        line-height: 17px !important;
      `;

      textCss = `
        position: relative;
        left: -2px;
      `;

    }
    else { // Rectangle shape
      // Truncate the label into 12 characters max
      var displayLabel = label.slice(0, 12);
      if(displayLabel != label) {
        displayLabel = displayLabel + '...';
      }

      shapeCss = `
        border: solid ${colour} 2px;
        width: 75px !important;
        height: 50px !important;
        margin: 2px;
        border-radius: 12px;
        padding: 3px;
        line-height: 38px !important;
      `;
      
    }
    // Inject CSS for palette icon
    css += `.palette-icon-${pluginId.toLowerCase()} {
      ${shapeCss}
    }\n
    .palette-icon-${pluginId.toLowerCase()}:before {
      content: "${displayLabel}";
      font-size: 7pt;
      ${textCss}
    }\n`;
  });

  style.textContent = css;
  document.head.appendChild(style);
};




/**
 * Return palette entries.
 */
MaestroPaletteProvider.prototype.getPaletteEntries = function(element) {
    const {
        _create: create,
        _elementFactory: elementFactory

    } = this;

    function createAction(type, group, className, title, options = {}) {
        function createListener(event) {
            const shape = elementFactory.createShape(Object.assign({ type: type }, options));
            
            if (options) {
                Object.assign(shape, options);
            }
            
            create.start(event, shape);
        }

        return {
            group: group,
            className: className,
            title: (title),
            action: {
                dragstart: createListener,
                click: createListener
            }
        };


    }

    return {
        

        // Dynamically create task type entries
        ...this.createTaskTypeEntries(createAction)
    };
};

// Export the provider as a diagram-js module
export const maestroPaletteProvider = {
    __init__: ['maestroPaletteProvider'],
    maestroPaletteProvider: ['type', MaestroPaletteProvider]
};