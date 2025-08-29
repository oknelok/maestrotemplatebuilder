/**
 *  Maestro.js
 *  This is the Maestro object which we use to manage and control all aspects of the TemplateBuilder.
 *  Use the TemplateBuilder object to create the canvas, draw tasks and connectors in your mainline code.
 * 
*/
(function (window, $) {
  'use strict';

  window.Maestro = window.Maestro || {};

  // Properties

  //Canvas properties
  Maestro.maestroDiagram = {}; // Diagram-js object
  Maestro.maestroDisplayedTasks = {}; // The tasks which have been drawn on the Diagram
  Maestro.maestroLineFrom = null; // When drawing connections, this is where the line starts from
  Maestro.maestroFalseLineFrom = null; // When drawing connections, this is where the FALSE line starts from
  Maestro.canvas = {}; // The canvas used by Diagram-js
  Maestro.canvasRoot = {}; // The root element of the Diagram
  Maestro.panZoomTimeout = null; // The timeout reference variable used during canvas.viewbox.changed eventBus to debounce panning/zooming
  Maestro.canvasZoom = 1; // Default canvas zoom
  Maestro.panLeft = 0; // Default canvas top left coordinate
  Maestro.panTop = 0; // Default canvas top coordinate
  Maestro.panZoomDelay = 1500; // Default delay for the pan/zoom debounce.

  // Task drawing properties
  Maestro.taskTypes = {}; // The types of tasks (legend of tasks)
  Maestro.maestroTaskColours = []; // The available Maestro task colours
  Maestro.taskWidth = 100; // Default task width
  Maestro.taskHeight = 50; // Default task height
  Maestro.taskRadius = 50; // For round task shapes, the default radius.

  /**
   * Draw one task
   * @param {Object} task 
   */
  Maestro.maestroDrawOneTask = function(task) {
    const elementFactory = Maestro.maestroDiagram.get('elementFactory');
    var taskLabel = task.taskname;

    // cut the task label down to 16 max chars. 13 chars + ...
    taskLabel = taskLabel.slice(0,13);
    if(taskLabel !=  task.taskname) {
      taskLabel = taskLabel + '...';
    }

    let newtask = elementFactory.createShape({
      id: task.id,
      taskType: task.type,
      parent: Maestro.canvasRoot,
      x: parseInt(task.left),
      y: parseInt(task.top),
      width: Maestro.taskWidth,
      height: Maestro.taskHeight,
      type: 'maestro:Task',
      draggable: true,
      taskid: task.id,
      colour: Maestro.maestroTaskColours[task.type],
      uiLabel: task.uilabel,
      taskName: taskLabel,
      longTaskName: task.taskname,
      capabilities: task.capabilities,
      to: task.to || [],
      falsebranch: task.falsebranch || [],
      workflowStatusMessage: task.workflow_status_stage_message,
      workflowStatusNumber: task.workflow_status_stage_number
    });
    Maestro.canvas.addShape(newtask, Maestro.canvasRoot);
    Maestro.maestroDisplayedTasks[task.id] = newtask;
  }

  /**
   * Draw connectors that exist on a given task by its task ID.
   * @param {string} taskID - that Maestro Template's Task unique ID.
   */
  Maestro.maestroDrawConnectors = function(taskID) {
    const elementFactory = Maestro.maestroDiagram.get('elementFactory');
    var waypoints = [], target;
    var source = Maestro.maestroDisplayedTasks[taskID];
    var to = source.to; // This could be one or more tasks this task points to
    to.forEach((targetTaskId) => {
      // This task may not have a TO pointer (like the end task or unfinished flow task)
      if(targetTaskId != '') {
        target = Maestro.maestroDisplayedTasks[targetTaskId];
        waypoints = Maestro.maestroCalculateClosestEdgePointsFromShapes(source, target);
        let connection = elementFactory.createConnection({
          type: 'connection',
          waypoints: waypoints,
          source: source,
          target: target,
          businessObject: {
            connectionType: 'MaestroNormal' // MaestroFalse for the red arrow
          }
        });
        Maestro.canvas.addConnection(connection, Maestro.canvasRoot);
      }
    });
    var falseBranch = source.falsebranch;
    falseBranch.forEach((targetTaskId) => {
      // This task may not have a FALSE TO pointer (like all tasks other than IFs)
      if(targetTaskId != '') {
        target = Maestro.maestroDisplayedTasks[targetTaskId];
        waypoints = Maestro.maestroCalculateClosestEdgePointsFromShapes(source, target);
        let connection = elementFactory.createConnection({
          type: 'connection',
          waypoints: waypoints,
          source: source,
          target: target,
          businessObject: {
            connectionType: 'MaestroFalse' 
          }
        });
        Maestro.canvas.addConnection(connection, Maestro.canvasRoot);
      }
    });
  }

  /**
   * Handle the hamburger menu click.
   * Called from maestro-task-renderer.js' _createHamburgerSVGOverlay
   * @param {string} taskid - The task's ID
   * @param {Array} capabilities - array of capabilities available in Maestro (Seeded by the Template Builder)
   * @param {string|number} absx - 
   * @param {string|number} absy - 
   * 
   */
  Maestro.maestroHandleEditClick = function(taskid, capabilities, absx, absy) {
    //hide all capabilities in the menu first:
    $('#edit-menu > div').children().each(function() {
      let capabilities_id = this.getAttribute('maestro_capabilities_id');
      if(capabilities_id != null && capabilities_id.startsWith('maestro_template_')) {
        $('#' + this.id).hide();
      }
    });
    //now show the ones for this task
    $('#edit-menu > div').children().each(function() {
      capabilities_id = this.getAttribute('maestro_capabilities_id');
      if(capabilities_id != null && capabilities_id.startsWith('maestro_template_')) {
        for(let i=0; i < capabilities.length; i++) {
          if(capabilities_id == capabilities[i]) $('#' + this.id).show();
        }
      }
    });

    $('#maestro-task-menu').css('top', absy + 'px');
    $('#maestro-task-menu').css('left', absx + 'px');
    $('#maestro-task-menu').css('display', 'block');
    $('[name="task_clicked"]').val(taskid);
  }

  /**
   * Calculate the centre-to-centre closest points from the provided source and target shapes.
   * This uses a simple hypotenuse calculation to determine the centre-to-centre proximity and selects the closest.
   * @param {Object} source - source shape
   * @param {Object} target - target shape
   * @returns {Array} - returns an array of from/to points
   */
  Maestro.maestroCalculateClosestEdgePointsFromShapes = function(source, target) {
    let sourceX = source.x ;
    let sourceY = source.y ;
    let sourceWidth = source.width;
    let sourceHeight = source.height;

    let destX = target.x ;
    let destY = target.y ;
    let destWidth = target.width;
    let destHeight = target.height;

    let sourceCentreX = sourceX + (sourceWidth / 2);
    let sourceCentreY = sourceY + (sourceHeight / 2);
    let targetCentreX = destX + (destWidth / 2);
    let targetCentreY = destY + (destHeight / 2);

    let diamondSize = destWidth / 2;
    let circleSize = destHeight / 2;
    
    var calc, hypotenuse = [], hypotoffsets = [], pointsboxFrom = [], pointsboxTo = [], points = [];
    
    // Calculate the 4 points for the source, based on task type
    if(source.taskType == "MaestroStart" || source.taskType == "MaestroEnd") {
      // Circle
       pointsboxFrom.push( [sourceCentreX, sourceY] ); // top centre source
       pointsboxFrom.push( [sourceCentreX, sourceY + sourceHeight] ); // botton centre source
       pointsboxFrom.push( [sourceX + sourceHeight, sourceY + sourceHeight/2] ); // source right side
       pointsboxFrom.push( [sourceX + sourceHeight/2, sourceY + sourceHeight/2] ); // source left side
    }
    else if(source.taskType == 'MaestroIf') {
      // Diamond.  Diamond currently has outbound connections at each vertex. 
      pointsboxFrom.push( [sourceCentreX, sourceCentreY - diamondSize] ); // top centre source
      pointsboxFrom.push( [sourceCentreX, sourceCentreY + diamondSize] ); // botton centre source
      pointsboxFrom.push( [sourceX + sourceWidth, sourceY + sourceHeight/2] ); // source right side
      pointsboxFrom.push( [sourceX, sourceY + sourceHeight/2] );  // source left side
    }
    else {
      // Default Rectangle
      pointsboxFrom.push( [sourceCentreX, sourceY] ); // top centre source
      pointsboxFrom.push( [sourceCentreX, sourceY + sourceHeight] ); // botton centre source
      pointsboxFrom.push( [sourceX + sourceWidth, sourceY + sourceHeight/2] ); // source right side
      pointsboxFrom.push( [sourceX, sourceY + sourceHeight/2] );  // source left side
    }

    // Calculate the 4 points for the target, based on task type
    if(target.taskType == "MaestroStart" || target.taskType == "MaestroEnd") {
      // Circle
      pointsboxTo.push( [targetCentreX, destY] ); // top centre destination
      pointsboxTo.push( [targetCentreX, destY + destHeight] ); // bottom centre destination
      pointsboxTo.push( [targetCentreX + destHeight/2, destY + destHeight/2] ); //right of destination
      pointsboxTo.push( [destX + destHeight/2, destY + destHeight/2] ); //left of destination
    }
    else if(target.taskType == 'MaestroIf') {
      // Diamond
      pointsboxTo.push( [targetCentreX, targetCentreY - diamondSize ] ); // top centre destination
      pointsboxTo.push( [targetCentreX, targetCentreY + diamondSize] ); // bottom centre destination
      pointsboxTo.push( [destX + destWidth, destY + destHeight/2] ); //right of destination
      pointsboxTo.push( [destX, destY + destHeight/2] ); //left of destination
    }
    else {
      // Rectangle 
      pointsboxTo.push( [targetCentreX, destY] ); // top centre destination
      pointsboxTo.push( [targetCentreX, destY + destHeight] ); // bottom centre destination
      pointsboxTo.push( [destX + destWidth, destY + destHeight/2] ); //right of destination
      pointsboxTo.push( [destX, destY + destHeight/2] ); //left of destination
    }

    // Loop thru the FROM points, comparing each point to the TO points, 
    // calculating the hypotenuse, recording which hypotenuse is shortest
    for(let i=0; i<pointsboxFrom.length; i++) {
      for(let x=0; x<pointsboxTo.length; x++) {
        let deltax = Math.abs(pointsboxTo[x][0] - pointsboxFrom[i][0]);
        let deltay = Math.abs(pointsboxFrom[i][1] - pointsboxTo[x][1]);
        calc = Math.pow( deltax,2) + Math.pow(deltay , 2);
        hypotenuse.push(calc);
        hypotoffsets.push( [i,x] );
      }
    }
    calc = 0;
    // For each hypotenuse, see which is shortest, then THAT becomes the point set to use
    for(let i=0; i<hypotenuse.length; i++) {
      if(hypotenuse[i] < calc || calc == 0) {
        calc = hypotenuse[i];
        points = hypotoffsets[i];
      }
    }
    
    var fromPoint = {x: pointsboxFrom[points[0]][0], y: pointsboxFrom[points[0]][1]};
    var toPoint = {x: pointsboxTo[points[1]][0], y:  pointsboxTo[points[1]][1]};

    return [fromPoint, toPoint];
  }

  /**
   * Provide a connection, this calculates the source/destination start/end points for the connection
   * @param {Object} connection - the connection we're calculating edge connections for
   * @returns {Array} - from/to points array
   */
  Maestro.maestroCalculateClosestEdgePointsFromConnection = function(connection) {
    const source = connection.source;
    const target = connection.target;
    return Maestro.maestroCalculateClosestEdgePointsFromShapes(source, target);
  }

  /**
   * Clear the canvas' selected element (turns off the selection).
   */
  Maestro.maestroClearCanvasSeletedElement = function() {
    const selection = Maestro.maestroDiagram.get('selection');
    // Clear all selections
    selection.select(null);
    selection.deselect();
  }

  /**
   * Return the task object reference when providing a unique Task ID.
   * @param {string} taskid - the unique task ID
   * @returns {Object} - returns the JS task object
   */
  Maestro.maestroGetTaskReference = function(taskid) {
    return Maestro.maestroDisplayedTasks[taskid];
  }

  /**
   * Remove the incoming and outgoing connection lines from a task given the unique Task ID.
   * 
   * @param {string} taskid - the unique task ID.
   */
  Maestro.maestroRemoveTaskLines = function(taskid) {
    task = Maestro.maestroGetTaskReference(taskid) || null;

    if(task) {
      // Clone the outgoing and incoming task connection arrays to avoid modification during iteration
      // These arrays are created and maintained by Diagram.js
      const outgoingCopy = [...task.outgoing] || [];
      const incomingCopy = [...task.incoming] || [];
      
      // Process outgoing connections
      outgoingCopy.forEach(function(connection) {
        let connectionID = connection.id;
        let targetTask = connection.target;
        
        // Remove from canvas
        Maestro.canvas.removeConnection(connection);
        
        // Clean up target's incoming connections
        if (targetTask && targetTask.incoming) {
          const targetIncomingCopy = [...targetTask.incoming];
          targetIncomingCopy.forEach(function(targetConnection) {
            if (targetConnection.id == connectionID) {
              targetTask.incoming.remove(targetConnection);
            }
          });
        }
        
        // Remove from current task's outgoing array
        task.outgoing.remove(connection);
      });
      
      // Process incoming connections
      incomingCopy.forEach(function(connection) {
        let connectionID = connection.id;
        let sourceTask = connection.source;
        
        // Remove from canvas
        Maestro.canvas.removeConnection(connection);
        
        // Clean up source's outgoing connections
        if (sourceTask && sourceTask.outgoing) {
          const sourceOutgoingCopy = [...sourceTask.outgoing];
          sourceOutgoingCopy.forEach(function(sourceConnection) {
            if (sourceConnection.id == connectionID) {
              sourceTask.outgoing.remove(sourceConnection);
            }
          });
        }
        
        // Remove from current task's incoming array
        task.incoming.remove(connection);
      });
    }
    // Remove the canvas selected element
    // Careful!  This can cause a recursion look as this will fire events over and over.
    Maestro.maestroClearCanvasSeletedElement();
}

})(window, jQuery);