/**
 * TemplateBuilder.js
 * This is the wrapper object used in template_builder.js.  
 * 
 * Used for creating the template canvas and drawing the initial tasks and connections.
 */

import './Maestro.js';
import Diagram from 'diagram-js';
import maestroInteractionModule from '../modules/maestro-interaction.js';

window.TemplateBuilder = window.TemplateBuilder || {};

(function (window, $, drupalSettings, Maestro) {
  'use strict';

  TemplateBuilder.setup = function() {
    Maestro.tasks = drupalSettings.maestro || {};
    Maestro.maestroTaskColours = drupalSettings.maestroTaskColours || [];
    Maestro.taskTypes = drupalSettings.task_types;
    Maestro.taskCapabilities = drupalSettings.taskCapabilities || {}
    Maestro.taskWidth = drupalSettings.taskWidth || 100;
    Maestro.taskHeight = drupalSettings.taskHeight || 50;
    Maestro.taskRadius = drupalSettings.taskRadius || 50;

    Maestro.canvasZoom = drupalSettings.zoom || 1;
    Maestro.panLeft = drupalSettings.pan_left || 0;
    Maestro.panTop = drupalSettings.pan_top || 0;
    Maestro.panZoomDelay = drupalSettings.panZoomDelay || 1500;
    
  };

  TemplateBuilder.createTemplateCanvas = function(container) {
    Maestro.maestroDiagram = new Diagram({
      canvas: {
        container: container
      },
      modules: [
        maestroInteractionModule
      ]
    });

    Maestro.canvas = Maestro.maestroDiagram.get('canvas');
    const elementFactory = Maestro.maestroDiagram.get('elementFactory');
    Maestro.canvasRoot = elementFactory.createRoot();
    Maestro.canvas.setRootElement(Maestro.canvasRoot);
  }

  TemplateBuilder.drawOneTask = function(task) {
    Maestro.maestroDrawOneTask(task);
  }

  TemplateBuilder.drawConnectors = function(taskID) {
    Maestro.maestroDrawConnectors(taskID);
  }




})(window, jQuery, drupalSettings, Maestro);