// Libraries
import React, { PureComponent } from 'react';
import classNames from 'classnames';
import _ from 'lodash';
// Utils & Services
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';
import { AngularComponent, getAngularLoader } from '@grafana/runtime';
import { getTimeSrv } from 'app/features/dashboard/services/TimeSrv';
import {
  DataQuery,
  DataSourceApi,
  DataSourceInstanceSettings,
  EventBusExtended,
  EventBusSrv,
  LoadingState,
  PanelData,
  TimeRange,
} from '@grafana/data';
import { DashboardModel } from '../../dashboard/state/DashboardModel';
import { PanelModel } from 'app/features/dashboard/state';

interface Props {
  data: PanelData;
  query: DataQuery;
  queries: DataQuery[];
  dsSettings: DataSourceInstanceSettings;
  id: string;
  index: number;
  onAddQuery: (query?: DataQuery) => void;
  onRemoveQuery: (query: DataQuery) => void;
  onChange: (query: DataQuery) => void;
  onRunQuery: () => void;
}

interface State {
  loadedDataSourceIdentifier?: string | null;
  datasource: DataSourceApi | null;
  hasTextEditMode: boolean;
  data?: PanelData;
  isOpen?: boolean;
  showingHelp: boolean;
  isCollapsed: boolean;
}

export class QueryEditorOptions extends PureComponent<Props, State> {
  element: HTMLElement | null = null;
  angularScope: AngularQueryComponentScope | null;
  angularQueryEditor: AngularComponent | null = null;

  state: State = {
    datasource: null,
    hasTextEditMode: false,
    data: undefined,
    isOpen: true,
    showingHelp: false,
    isCollapsed: false,
  };

  componentDidMount() {
    this.loadDatasource();
  }

  componentWillUnmount() {
    if (this.angularQueryEditor) {
      this.angularQueryEditor.destroy();
    }
  }

  getAngularQueryComponentScope(): AngularQueryComponentScope {
    const { query, queries } = this.props;
    const { datasource } = this.state;
    const panel = new PanelModel({ targets: queries });
    const dashboard = {} as DashboardModel;

    return {
      datasource: datasource,
      target: query,
      panel: panel,
      dashboard: dashboard,
      refresh: () => panel.refresh(),
      render: () => panel.render(),
      events: new EventBusSrv(),
      range: getTimeSrv().timeRange(),
    };
  }

  getQueryDataSourceIdentifier(): string | null | undefined {
    const { query, dsSettings } = this.props;
    return query.datasource ?? dsSettings.name;
  }

  async loadDatasource() {
    const dataSourceSrv = getDatasourceSrv();
    const dataSourceIdentifier = this.getQueryDataSourceIdentifier();
    const datasource = await dataSourceSrv.get(dataSourceIdentifier);

    this.setState({
      datasource,
      loadedDataSourceIdentifier: dataSourceIdentifier,
      hasTextEditMode: false,
    });
  }

  componentDidUpdate(prevProps: Props) {
    const { datasource, loadedDataSourceIdentifier } = this.state;
    const { data, query } = this.props;

    if (data !== prevProps.data) {
      const dataFilteredByRefId = filterPanelDataToQuery(data, query.refId);

      this.setState({ data: dataFilteredByRefId });

      if (this.angularScope) {
        this.angularScope.range = getTimeSrv().timeRange();
      }

      if (this.angularQueryEditor) {
        // Some query controllers listen to data error events and need a digest
        // for some reason this needs to be done in next tick
        setTimeout(this.angularQueryEditor.digest);
      }
    }

    // check if we need to load another datasource
    if (datasource && loadedDataSourceIdentifier !== this.getQueryDataSourceIdentifier()) {
      if (this.angularQueryEditor) {
        this.angularQueryEditor.destroy();
        this.angularQueryEditor = null;
      }
      this.loadDatasource();
      return;
    }

    if (!this.element || this.angularQueryEditor) {
      return;
    }

    const loader = getAngularLoader();
    const template = '<plugin-component type="query-options-ctrl" />';
    const scopeProps = { ctrl: this.getAngularQueryComponentScope() };
    this.angularQueryEditor = loader.load(this.element, scopeProps, template);
    this.angularScope = scopeProps.ctrl;
  }

  onToggleCollapse = () => {
    this.setState({ isCollapsed: !this.state.isCollapsed });
  };

  renderPluginEditor() {
    //const { query, data, onChange } = this.props;
    //const { datasource, queryResponse } = this.state;
    const { datasource } = this.state;

    if (datasource && datasource.components && datasource.components.QueryOptionsCtrl) {
      return <div ref={(element) => (this.element = element)} />;
    }

    return <div />;
  }

  onToggleEditMode = () => {
    if (this.angularScope && this.angularQueryEditor && this.angularScope.toggleEditorMode) {
      this.angularScope.toggleEditorMode();
      this.angularQueryEditor.digest();
    }

    if (this.state.isCollapsed) {
      this.setState({ isCollapsed: false });
    }
  };

  onRemoveQuery = () => {
    this.props.onRemoveQuery(this.props.query);
  };

  onCopyQuery = () => {
    const copy = _.cloneDeep(this.props.query);
    this.props.onAddQuery(copy);
  };

  onDisableQuery = () => {
    const { query } = this.props;
    this.props.onChange({ ...query, hide: !query.hide });
    this.props.onRunQuery();
    this.forceUpdate();
  };

  renderCollapsedText(): string | null {
    const { datasource } = this.state;
    if (datasource && datasource.getQueryDisplayText) {
      return datasource.getQueryDisplayText(this.props.query);
    }

    if (this.angularScope && this.angularScope.getCollapsedText) {
      return this.angularScope.getCollapsedText();
    }
    return null;
  }

  render() {
    const { query } = this.props;
    const { datasource, isCollapsed } = this.state;
    const isDisabled = query.hide;

    const bodyClasses = classNames('query-editor-options__body gf-form-query', {
      'query-editor-options__body--collapsed': isCollapsed,
    });

    const rowClasses = classNames('query-editor-options', {
      'query-editor-options--disabled': isDisabled,
      'gf-form-disabled': isDisabled,
    });

    if (!datasource) {
      return null;
    }

    return (
      <div className={rowClasses}>
        <div className={bodyClasses}>{this.renderPluginEditor()}</div>
      </div>
    );
  }
}

export interface AngularQueryComponentScope {
  target: DataQuery;
  panel: PanelModel;
  dashboard: DashboardModel;
  events: EventBusExtended;
  refresh: () => void;
  render: () => void;
  datasource: DataSourceApi | null;
  toggleEditorMode?: () => void;
  getCollapsedText?: () => string;
  range: TimeRange;
}

/**
 * Get a version of the PanelData limited to the query we are looking at
 */
export function filterPanelDataToQuery(data: PanelData, refId: string): PanelData | undefined {
  const series = data.series.filter((series) => series.refId === refId);

  // No matching series
  if (!series.length) {
    // If there was an error with no data, pass it to the QueryEditors
    if (data.error && !data.series.length) {
      return {
        ...data,
        state: LoadingState.Error,
      };
    }
    return undefined;
  }

  // Only say this is an error if the error links to the query
  let state = LoadingState.Done;
  const error = data.error && data.error.refId === refId ? data.error : undefined;
  if (error) {
    state = LoadingState.Error;
  }

  const timeRange = data.timeRange;

  return {
    ...data,
    state,
    series,
    error,
    timeRange,
  };
}
