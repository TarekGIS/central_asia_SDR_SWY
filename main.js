import $ from 'jquery';
import { pan } from 'ol/interaction/Interaction';

const actionBarHandler = ({ target }) => {
  const actionID = target.id;

  if (actionID === 'areaOfInterest') {
    return;
  }

  const panelID = `${actionID}Panel`;
  const panel = $(`calcite-shell-panel#${panelID}`);

  console.log(actionID);

  // If the clicked panel has the 'showData' class, set its class to 'hideData' and return
  if (panel.hasClass('showData')) {
    panel.attr('class', 'hideData');
    return;
  }

  // Hide all 'calcite-shell-panel' elements whose 'id' ends with 'Panel'
  $('calcite-shell-panel[id$="Panel"]').attr('class', 'hideData');

  // Set the class of the clicked panel to 'showData'
  panel.attr('class', 'showData');
};

$('calcite-action').on('click', actionBarHandler);
