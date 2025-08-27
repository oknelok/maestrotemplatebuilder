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
  let css = '';

  // Create an offscreen canvas for text measurement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 18;
  const fontFamily = 'Arial, sans-serif';
  ctx.font = `${fontSize}px ${fontFamily}`;

  Object.keys(Maestro.taskTypes).forEach(pluginId => {
    const colour = Maestro.maestroTaskColours[pluginId];
    const label = Maestro.taskTypes[pluginId];
    // Create SVG markup
    let svg;
    if(pluginId == 'MaestroEnd') { // Circle shape
      // Truncate the label into 5 characters max
      var displayLabel = label.slice(0, 5);
      if(displayLabel != label) {
        displayLabel = displayLabel + '...';
      }
      let tspans = '';
      tspans += `<tspan x="50%" dy="1em">${displayLabel}</tspan>`;
      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="140" height="80">
          <circle cx="70" cy="40" r="38" fill="none" stroke="${colour}" stroke-width="5" />
          <text x="50%" y="30%" dominant-baseline="middle" text-anchor="middle"
                font-size="${fontSize}" font-family="${fontFamily}" fill="#000">
            ${tspans}
          </text>
        </svg>
      `;
    }
    else if (pluginId == 'MaestroIf') { // Diamond shape
      // Truncate the label into 13 characters max
      var displayLabel = label.slice(0, 13);
      if (displayLabel != label) {
        displayLabel = displayLabel + '...';
      }
      let tspans = '';
      tspans += `<tspan x="50%" dy="0">${displayLabel}</tspan>`;

      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="70" height="80" viewBox="0 0 70 80">
          <polygon points="35,0 70,40 35,80 0,40"
                  fill="none" stroke="${colour}" stroke-width="2" />
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                font-size="${fontSize}" font-family="${fontFamily}" fill="#000">
            ${tspans}
          </text>
        </svg>
      `;
    }
    else { // Rectangle shape
      // Truncate the label into 13 characters max
      var displayLabel = label.slice(0, 13);
      if(displayLabel != label) {
        displayLabel = displayLabel + '...';
      }
      let tspans = '';
      tspans += `<tspan x="50%" dy="1em">${displayLabel}</tspan>`;
      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="140" height="80">
          <rect width="140" height="80" fill="none" stroke="${colour}" stroke-width="5" rx="20" ry="20" />
          <text x="50%" y="30%" dominant-baseline="middle" text-anchor="middle"
                font-size="${fontSize}" font-family="${fontFamily}" fill="#000">
            ${tspans}
          </text>
        </svg>
      `;
    }
    
    // Encode as data URI
    const encodedSvg = encodeURIComponent(svg)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');

    // Inject CSS for palette icon
    css += `.palette-icon-${pluginId.toLowerCase()} {
      background-image: url("data:image/svg+xml,${encodedSvg}");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      width: 120px;
      height: 40px;
      stroke-width: 15px;
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