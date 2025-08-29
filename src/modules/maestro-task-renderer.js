import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { append as svgAppend, create as svgCreate, attr as svgAttr } from 'tiny-svg';
const drupal = window.Drupal || Drupal; // Safely access global Drupal object
const maestro = window.Maestro || Maestro; // Safely access global Maestro object
class MaestroTaskRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'overlays'];
  
  constructor(eventBus, overlays) {
    super(eventBus, 2000); // high priority
    this._overlays = overlays;
    this._drupal = drupal;
    this._maestro = maestro;
    
  }
  
  canRender(element) {
    return element.type.startsWith('maestro:Task');
  }

  drawShape(parentNode, element) {
    const taskID = element.taskid;
    const taskName = element.taskName || '---'; // Provide a default blank name
    const taskType = element.taskType || null;
    const workflowStatusMessage = element.workflowStatusMessage || '';
    const workflowStatusNumber = element.workflowStatusNumber || '';

    const strokeColour = element.colour || '#333'; // Default colour of dark gray
    const { width, height } = element;
    
    // Create a group to hold both the rectangle and text
    const group = svgCreate('g');

    // Detect the task type.  If this is the start or end task, draw those as a circle
    if(taskType == 'MaestroStart' || taskType == 'MaestroEnd') {
      // Draw circle task shape
      const circle = svgCreate('circle');
      circle.setAttribute('cx', width / 2);   // center horizontally
      circle.setAttribute('cy', height / 2);  // center vertically
      circle.setAttribute('r', height / 2);   // radius = half the rectangle’s height
      circle.setAttribute('fill', '#eee');
      circle.setAttribute('stroke', strokeColour);
      circle.setAttribute('taskid', taskID);
      svgAppend(group, circle);
    } 
    else if(taskType == 'MaestroIf') {
      // Draw diamond task shape
      const diamond = svgCreate('polygon');
      const centerX = width / 2;
      const centerY = height / 2;
      const size = width / 2; // Using width as the diamond size
      
      // Define diamond points: top, right, bottom, left
      const points = [
        `${centerX},${centerY - size}`,     // top point
        `${centerX + size},${centerY}`,     // right point
        `${centerX},${centerY + size}`,     // bottom point
        `${centerX - size},${centerY}`      // left point
      ].join(' ');
      
      diamond.setAttribute('points', points);
      diamond.setAttribute('fill', '#eee');
      diamond.setAttribute('stroke', strokeColour);
      diamond.setAttribute('taskid', taskID);
      svgAppend(group, diamond);
    }
    else {
      // Draw rectangle task shape
      const rect = svgCreate('rect');
      rect.setAttribute('width', width);
      rect.setAttribute('height', height);
      rect.setAttribute('fill', '#eee');
      rect.setAttribute('stroke', strokeColour);
      rect.setAttribute('rx', 10);
      rect.setAttribute('ry', 10);
      rect.setAttribute('taskid', taskID);
      svgAppend(group, rect);
    }

    
    
    // Add label if it exists
    if (taskName) {
      const text = svgCreate('text');
      text.setAttribute('x', width / 2); // center horizontally
      text.setAttribute('y', height / 2); // center vertically
      text.setAttribute('text-anchor', 'middle'); // center horizontally
      text.setAttribute('dominant-baseline', 'middle'); // center vertically
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333');
      text.setAttribute('pointer-events', 'none'); // prevent interfering with shape interactions
      text.setAttribute('data-task-label', taskID); // adding an attribute that we use later to update the label.
      text.textContent = taskName;
      svgAppend(group, text);
    }
    
    if(workflowStatusNumber) {
      // Create background rectangle first
      const statusBg = svgCreate('rect');
      const textContent = workflowStatusNumber.toString();
      const textWidth = 24; // Always peg at 3 digits as we're rarely going to have 4 digits.
      const textHeight = 12;
      const padding = 2;

      statusBg.setAttribute('x', width - 15 - (textWidth/2 + padding));
      statusBg.setAttribute('y', height - 10 - (textHeight/2 + padding));
      statusBg.setAttribute('width', textWidth + padding);
      statusBg.setAttribute('height', textHeight + padding);
      statusBg.setAttribute('fill', '#909090'); // background color
      statusBg.setAttribute('stroke', '#cccccc'); // border color
      statusBg.setAttribute('stroke-width', '1');
      statusBg.setAttribute('rx', '6'); // rounded corners
      statusBg.setAttribute('ry', '6'); // rounded corners
      statusBg.setAttribute('pointer-events', 'all');
      statusBg.setAttribute('title', workflowStatusMessage);
      svgAppend(group, statusBg);

      // Text element which sits on top of the status background rectangle
      const statustext = svgCreate('text');
      statustext.setAttribute('x', width-(15 + padding));
      statustext.setAttribute('y', height-10);
      statustext.setAttribute('text-anchor', 'middle');
      statustext.setAttribute('dominant-baseline', 'middle');
      statustext.setAttribute('font-family', 'Arial, sans-serif');
      statustext.setAttribute('font-size', '10');
      statustext.setAttribute('fill', '#333');
      statustext.setAttribute('data-task-status-number', taskID);
      statustext.textContent = workflowStatusNumber;
      statustext.setAttribute('title', workflowStatusMessage);
      svgAppend(group, statustext);
    }

    svgAppend(parentNode, group);
    
    // Add the hamburger menu as an overlay
    this._overlays.add(element, 'maestro-hamburger', {
      position: {
        top: -10,
        left: 5
      },
      html: this._createHamburgerSVGOverlay(element)
    });
    
    return group; 
  }
  
 
  _createHamburgerSVGOverlay(element) {
    const container = document.createElement('div');
    container.style.width = '20px';
    container.style.height = '20px';
    container.style.cursor = 'pointer';
    container.setAttribute('data-taskid', element.taskid);

    // Create SVG root element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 20 20');

    // Background rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '20');
    rect.setAttribute('height', '20');
    rect.setAttribute('fill', '#fff');
    rect.setAttribute('stroke', '#333');
    rect.setAttribute('rx', '4');
    rect.setAttribute('ry', '4');
    svg.appendChild(rect);

    // Three bars
    for (let i = 0; i < 3; i++) {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', '4');
      bar.setAttribute('y', 4 + i * 5);
      bar.setAttribute('width', '12');
      bar.setAttribute('height', '2');
      bar.setAttribute('fill', '#555');
      svg.appendChild(bar);
    }

    container.appendChild(svg);

    container.addEventListener('click', e => {
      e.stopPropagation();
      this._maestro.maestroHandleEditClick(element.taskid, element.capabilities, e.pageX, e.pageY);
    });

    return container;
  }

}

export default {
  __init__: ['maestroTaskRenderer'],
  maestroTaskRenderer: ['type', MaestroTaskRenderer]
};