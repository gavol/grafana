import angular from 'angular';
//*** START_OF_CHANGE ***
import { GlobeCtrl } from 'app/plugins/globe';
//*** END_OF_CHANGE ***

const module = angular.module('grafana.directives');

export class QueryRowCtrl {
  target: any;
  queryCtrl: any;
  panelCtrl: any;
  panel: any;
  hasTextEditMode: boolean;

  $onInit() {
    this.panelCtrl = this.queryCtrl.panelCtrl;
    this.target = this.queryCtrl.target;
    this.panel = this.panelCtrl.panel;
    //*** START_OF_CHANGE ***
    GlobeCtrl.prototype.changeGlobe(this.queryCtrl);
    //*** END_OF_CHANGE ***
    if (this.hasTextEditMode && this.queryCtrl.toggleEditorMode) {
      // expose this function to react parent component
      this.panelCtrl.toggleEditorMode = this.queryCtrl.toggleEditorMode.bind(this.queryCtrl);
    }

    if (this.queryCtrl.getCollapsedText) {
      // expose this function to react parent component
      this.panelCtrl.getCollapsedText = this.queryCtrl.getCollapsedText.bind(this.queryCtrl);
    }
  }
}

/** @ngInject */
function queryEditorRowDirective() {
  return {
    restrict: 'E',
    controller: QueryRowCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    templateUrl: 'public/app/features/panel/partials/query_editor_row.html',
    transclude: true,
    scope: {
      queryCtrl: '=',
      canCollapse: '=',
      hasTextEditMode: '=',
    },
  };
}

module.directive('queryEditorRow', queryEditorRowDirective);
