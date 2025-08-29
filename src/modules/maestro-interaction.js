/**
 * We configure our Diagram JS interation modules here so that our main.js is clean and easier to follow.
 */

import alignModule from 'diagram-js/lib/features/align-elements';
import CanvasModule from 'diagram-js/lib/core/Canvas';
import CreateModule from 'diagram-js/lib/features/create';
import EventBusModule from 'diagram-js/lib/core/EventBus';
import ElementFactoryModule from 'diagram-js/lib/core/ElementFactory';
import GraphicsFactoryModule from 'diagram-js/lib/core/GraphicsFactory';
import GridSnapping from 'diagram-js/lib/features/grid-snapping';
import OverlaysModule from 'diagram-js/lib/features/overlays';
import ConnectModule from 'diagram-js/lib/features/connect';
import ModelingModule from 'diagram-js/lib/features/modeling';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import MoveModule from 'diagram-js/lib/features/move';
import PaletteModule from 'diagram-js/lib/features/palette';
import RulesModule from 'diagram-js/lib/features/rules';
import snappingModule from 'diagram-js/lib/features/snapping';
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
import 'diagram-js/assets/diagram-js.css';

// Our custom renderer and events
import maestroTaskRenderer from './maestro-task-renderer';
import maestroTaskEvents from './maestro-task-events';
import { maestroPaletteProvider } from './maestro-palette-provider';


/**
 * A module that changes the default diagram look.
 */
const OverrideElementStyleModule = {
  __init__: [
    [ 'defaultRenderer', function(defaultRenderer) {
      // Override CONNECTION_STYLE to produce the base black, 3 width line.
      defaultRenderer.CONNECTION_STYLE = { fill: 'none', strokeWidth: 3, stroke: '#000' };
    } ]
  ]
};

export default {
  __depends__: [
    alignModule,
    CanvasModule,
    ConnectModule,
    CreateModule,
    EventBusModule,
    ElementFactoryModule,
    GraphicsFactoryModule,
    GridSnapping,
    ModelingModule,
    MoveCanvasModule,
    MoveModule,
    OverlaysModule,
    OverrideElementStyleModule,
    PaletteModule,
    RulesModule,
    snappingModule,
    ZoomScrollModule,
    maestroTaskEvents,
    maestroTaskRenderer,
    maestroPaletteProvider
  ]
};
