import * as tinySVG from 'tiny-svg';
import Canvas from 'diagram-js/lib/core/Canvas';

function MaestroTaskEvents(canvas, eventBus, modeling) {

    const margin = 0; // optional padding inside canvas

    // Track drag state so element.changed DOM work is deferred during drag.
    let isDragging = false;
    let deferredChangedElements = new Set();

    eventBus.on('drag.start', function() {
      isDragging = true;
    });

    eventBus.on('drag.end', function() {
      isDragging = false;
      deferredChangedElements.forEach(el => _applyConnectionStyle(el));
      deferredChangedElements.clear();
    });

    // Initialize the diagram with our custom arrowhead SVGs, zoom level and pan.
    eventBus.on('diagram.init', () => {
      // First set zoom
      canvas.zoom(parseFloat(Maestro.canvasZoom) || 1.0);
      
      // Get current viewbox to preserve width/height
      const currentViewbox = canvas.viewbox();
      
      // Set complete viewbox with all properties
      canvas.viewbox({
        x: parseFloat(Maestro.panLeft) || 0,
        y: parseFloat(Maestro.panTop) || 0,
        width: currentViewbox.width,
        height: currentViewbox.height,
        scale: parseFloat(Maestro.canvasZoom) || 1.0
      });
      _injectArrowhead(canvas);
    });

    // Prevent the dragging of shapes that have a property that explicitly states draggable = false
    eventBus.on('drag.start', 1500, function(event) {
      const shape = event.shape;
      if (shape && shape.draggable === false) {
        event.preventDefault();  // cancels drag start
      }
    });

    eventBus.on('shape.added', function(event) {
      const element = event.element;
      // Only fire this when the element being added has our special property
      // This property is only present on our palette items
      const createdWithPalette = element.createdWithPalette || false;
      if(createdWithPalette) {
        // Seed our hidden form elements with the bare minimum task information
        document.querySelector('[name="palette_task_type"]').value = element.taskType;
        document.querySelector('[name="palette_task_id"]').value = element.id;
        document.querySelector('[name="palette_task_label"]').value = element.taskName;
        document.querySelector('[name="task_clicked"]').value = element.id;
        document.querySelector('[name="task_top"]').value = element.y;
        document.querySelector('[name="task_left"]').value = element.x;
        // Fire the new task completion button
        jQuery('#edit-create-new-task-from-palette-complete').trigger('mousedown');
        // Clear our hidden form elements
        document.querySelector('[name="palette_task_type"]').value = '';
        document.querySelector('[name="palette_task_id"]').value = '';
        document.querySelector('[name="palette_task_label"]').value = '';
        document.querySelector('[name="task_clicked"]').value = '';
        document.querySelector('[name="task_top"]').value = '';
        document.querySelector('[name="task_left"]').value = '';
        // Add to our list of tasks
        Maestro.maestroDisplayedTasks[element.id] = element;
        // Clear the selection
        Maestro.maestroClearCanvasSeletedElement();

        
      }
      const gfx = event.gfx;   // the <g> for this element
      if (element.type.startsWith('maestro:Task')) {
        let title = tinySVG.create('title');
        let content = element.longTaskName || '';
        content +=`\n${element.taskType}`;
        content += `\nID: ${element.taskid}`;
        if(parseInt(element.workflowStatusNumber) > 0) {
          content += `\n${element.workflowStatusMessage}`;
        }
        title.textContent = content;
        tinySVG.append(gfx, title);
      }

    });

    // When a shape has completed moving, we recalculate the edges and waypoints
    eventBus.on('commandStack.shape.move.postExecuted', function(event) {
      const context = event.context;
      const shape = context.shape;
      
      // Small delay to ensure all automatic adjustments are complete
      setTimeout(() => {
        const connections = shape.incoming.concat(shape.outgoing);
        connections.forEach(connection => {
          let points = Maestro.maestroCalculateClosestEdgePointsFromConnection(connection);
          modeling.updateWaypoints(connection, points);
        });
        // Now that we're done dragging and recalculating connections, let's fire
        // the save routine to save the position of the task
        jQuery('[name="task_clicked"]').val(shape.id);
        jQuery('[name="task_top"]').val(shape.y);
        jQuery('[name="task_left"]').val(shape.x);
        jQuery('#edit-move-task-complete').trigger('mousedown'); //trigger the ajax event wired to this button
        Maestro.maestroClearCanvasSeletedElement();
      }, 0);
    });

    // When a connection is added, alter its marker and colour based on the connection type.
    eventBus.on('connection.added', function(event) {
      _applyConnectionStyle(event.element);
    });

    // When a shape is moved, so too are the connections.
    // We update the connections with their appropriate colours and markers.
    // During an active drag we defer all work until drag.end to avoid
    // running N synchronous DOM updates for every intermediate waypoint change.
    eventBus.on('element.changed', function(event) {
      const element = event.element;
      if (!element.waypoints) return;
      if (isDragging) {
        deferredChangedElements.add(element);
        return;
      }
      _applyConnectionStyle(element);
    });

    // When we click on a task
    eventBus.on('selection.changed', function(event) {
      const canvas = Maestro.maestroDiagram.get('canvas');
      const elementFactory = Maestro.maestroDiagram.get('elementFactory');
      const root = canvas.getRootElement();
      var 
        connection, 
        waypoints,
        sourceTask, 
        targetTask, 
        connectionType = 'maestroNormal', 
        completionButton = '#edit-draw-line-complete';
      // In the event we are drawing connections between tasks
      if((Maestro.maestroLineFrom != null || Maestro.maestroFalseLineFrom != null) && event.newSelection.length) {
        sourceTask, connectionType = 'MaestroNormal';
        targetTask = event.newSelection[0] || null;
        if(Maestro.maestroLineFrom) {
          // Regular connection line
          sourceTask = Maestro.maestroGetTaskReference(Maestro.maestroLineFrom);
        }
        else {
          // False connection line
          connectionType = 'MaestroFalse';
          sourceTask = Maestro.maestroGetTaskReference(Maestro.maestroFalseLineFrom);
          completionButton = '#edit-draw-false-line-complete';
        }
        
        waypoints = Maestro.maestroCalculateClosestEdgePointsFromShapes(sourceTask, targetTask);
        connection = elementFactory.createConnection({
          type: 'connection',
          waypoints: waypoints,
          source: sourceTask,
          target: targetTask,
          businessObject: {
            connectionType: connectionType 
          }
        });
        canvas.addConnection(connection, root);

        // Remove the canvas selected element
        // Careful!  This can cause a recursion look as this will fire events over and over.
        event.stopPropagation();
        event.preventDefault();
        Maestro.maestroClearCanvasSeletedElement();

        // Clear the message area
        jQuery('.maestro-template-message-area').css('display', 'none');

        // Fire our ajax that's wired to the hidden form button to update our Template
        jQuery('[name="task_line_from"]').val(sourceTask.id);
        jQuery('[name="task_line_to"]').val(targetTask.id);
        jQuery(completionButton).trigger('mousedown');  //fires the ajax event wired to this button

        // Finally, clear the line and falseline settings
        Maestro.maestroLineFrom = null;
        Maestro.maestroFalseLineFrom = null;
      }
 
    });

    // When we slide the entire canvas viewbox, we need to update the Template with the new top/left offset.
    // Same goes when we zoom in/out, we update the Template.
    eventBus.on('canvas.viewbox.changed', function(event) {
      const viewbox = event.viewbox;
      jQuery('[name="pan_top"]').val(viewbox.y);
      jQuery('[name="pan_left"]').val(viewbox.x);
      jQuery('[name="zoom"]').val(viewbox.scale);
      
      // Debounce the changed event as this continuously fires. 
      clearTimeout(Maestro.panZoomTimeout);
      // Set a new timeout - only fires if user stops for 2 seconds
      Maestro.panZoomTimeout = setTimeout(function() {
        // This only runs when user has stopped panning/zooming for 2 seconds
        jQuery('#edit-pan-zoom-complete').trigger('mousedown'); // fires the ajax event
      }, Maestro.panZoomDelay);

    });

    /**
     * Apply stroke colour and arrowhead marker to a connection element's SVG path.
     * Extracted so it can be called from both element.changed and the drag.end flush.
     *
     * @param {Object} element
     */
    function _applyConnectionStyle(element) {
      const baseUrl = window.location.href.split('#')[0];
      const gfx = canvas.getGraphics(element);
      const path = gfx && gfx.querySelector('path');
      if (!path) return;
      const connectionType = element.businessObject.connectionType || false;
      const color = connectionType === 'MaestroFalse' ? '#f00' : '#000';
      const svgColor = connectionType === 'MaestroFalse' ? 'red' : 'black';
      path.style.color = color;
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', 3);
      tinySVG.attr(path, 'color', color);
      tinySVG.attr(path, 'stroke', color);
      tinySVG.attr(path, 'stroke-width', 3);
      tinySVG.attr(path, 'marker-end', `url(${baseUrl}#arrowhead-${svgColor})`);
    }

    /**
     * During canvas init, we inject the two arrowhead markers into the canvas defs.
     * We use those arrowhead markers at the end of each connection path we draw.
     * Black for regular path and red for false branches.
     * 
     * @param {Canvas} canvas 
     */
    function _injectArrowhead(canvas) {
      const svg = canvas.getContainer().querySelector('svg');

      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }

      var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'arrowhead-black');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('markerWidth', '12');  
      marker.setAttribute('markerHeight', '12');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '5');
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('markerUnits', 'userSpaceOnUse');  
      marker.setAttribute('strokeWidth', 1);
      var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 5, 0 10');
      polygon.setAttribute('fill', 'currentColor');  // this will now inherit stroke color
      polygon.setAttribute('stroke', 'none');  // this will now inherit stroke color
      marker.appendChild(polygon);
      defs.appendChild(marker);

      marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'arrowhead-red');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('markerWidth', '12');  
      marker.setAttribute('markerHeight', '12');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '5');
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('markerUnits', 'userSpaceOnUse');  
      marker.setAttribute('strokeWidth', 1);
      polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 5, 0 10');
      polygon.setAttribute('fill', '#f00');  // this will force red
      polygon.setAttribute('stroke', 'none');  
      marker.appendChild(polygon);
      defs.appendChild(marker);

    }

}


MaestroTaskEvents.$inject = [ 'canvas', 'eventBus', 'modeling' ];

export default {
  __init__: ['maestroTaskEvents'],
  maestroTaskEvents: ['type', MaestroTaskEvents]
};



