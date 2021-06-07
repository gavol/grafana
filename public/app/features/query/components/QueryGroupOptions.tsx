// Libraries
import React, { PureComponent, ChangeEvent, FocusEvent } from 'react';

// Utils
import { rangeUtil, PanelData, DataSourceApi } from '@grafana/data';

// Components
import { Switch, Input, InlineField, InlineFormLabel, stylesFactory } from '@grafana/ui';

// Types
import { QueryOperationRow } from 'app/core/components/QueryOperationRow/QueryOperationRow';
import { config } from 'app/core/config';
import { css } from 'emotion';
import { QueryGroupOptions } from 'app/types';

interface Props {
  options: QueryGroupOptions;
  dataSource: DataSourceApi;
  data: PanelData;
  onChange: (options: QueryGroupOptions) => void;
}

interface State {
  timeRangeFrom: string;
  timeRangeShift: string;
  timeRangeHide: boolean;
  isOpen: boolean;
  relativeTimeIsValid: boolean;
  timeShiftIsValid: boolean;
}

export class QueryGroupOptionsEditor extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const { options } = props;

    this.state = {
      timeRangeFrom: options.timeRange?.from || '',
      timeRangeShift: options.timeRange?.shift || '',
      timeRangeHide: options.timeRange?.hide ?? false,
      isOpen: false,
      relativeTimeIsValid: true,
      timeShiftIsValid: true,
    };
  }

  onRelativeTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      timeRangeFrom: event.target.value,
    });
  };

  onTimeShiftChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      timeRangeShift: event.target.value,
    });
  };

  onOverrideTime = (event: FocusEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;

    const newValue = emptyToNull(event.target.value);
    const isValid = timeRangeValidation(newValue);

    if (isValid && options.timeRange?.from !== newValue) {
      onChange({
        ...options,
        timeRange: {
          ...(options.timeRange ?? {}),
          from: newValue,
        },
      });
    }

    this.setState({ relativeTimeIsValid: isValid });
  };

  onTimeShift = (event: FocusEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;

    const newValue = emptyToNull(event.target.value);
    const isValid = timeRangeValidation(newValue);

    if (isValid && options.timeRange?.shift !== newValue) {
      onChange({
        ...options,
        timeRange: {
          ...(options.timeRange ?? {}),
          shift: newValue,
        },
      });
    }

    this.setState({ timeShiftIsValid: isValid });
  };

  onToggleTimeOverride = () => {
    const { onChange, options } = this.props;

    this.setState({ timeRangeHide: !this.state.timeRangeHide }, () => {
      onChange({
        ...options,
        timeRange: {
          ...(options.timeRange ?? {}),
          hide: this.state.timeRangeHide,
        },
      });
    });
  };

  onToggleBarChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onChange, options } = this.props;
    let errorBar = event.target.value === 'true' ? true : false;
    onChange({
      ...options,
      errorBar,
    });
  };

  onCacheTimeoutBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;
    onChange({
      ...options,
      cacheTimeout: emptyToNull(event.target.value),
    });
  };

  onMaxDataPointsBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;

    let maxDataPoints: number | null = parseInt(event.target.value as string, 10);

    if (isNaN(maxDataPoints) || maxDataPoints === 0) {
      maxDataPoints = null;
    }

    if (maxDataPoints !== options.maxDataPoints) {
      onChange({
        ...options,
        maxDataPoints,
      });
    }
  };

  onMinIntervalBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;
    const minInterval = emptyToNull(event.target.value);
    if (minInterval !== options.minInterval) {
      onChange({
        ...options,
        minInterval,
      });
    }
  };

  onRefStringBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;
    let refString = event.target.value;
    onChange({
      ...options,
      refString,
    });
  };

  onBeforeBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;
    let beforeInterval = event.target.value;
    onChange({
      ...options,
      beforeInterval,
    });
  };

  onAfterBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;
    let afterInterval = event.target.value;
    onChange({
      ...options,
      afterInterval,
    });
  };

  onFillGapBlur = (event: ChangeEvent<HTMLSelectElement>) => {
    const { options, onChange } = this.props;
    let fillGap = emptyToNull(event.target.value);
    onChange({
      ...options,
      fillGap,
    });
  };

  renderFillGapOption() {
    const { dataSource, options } = this.props; //, options } = this.props;

    const tooltip = `The default value is Near`;
    let fillGap = options.fillGap ?? 'near';

    if (!dataSource.meta.queryOptions?.fillGap) {
      return null;
    }

    return (
      <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel width={9} tooltip={tooltip}>
            Fill Gaps
          </InlineFormLabel>
          <select value={fillGap} className="width-6" onChange={this.onFillGapBlur}>
            <option value="near">Near</option>
            <option value="all">All</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>
    );
  }

  renderErrorBarOption() {
    const { dataSource, options } = this.props;

    let errorBar = options.errorBar === true ? 'true' : 'false';

    if (!dataSource.meta.queryOptions?.errorBar) {
      return null;
    }

    return (
      <div className="gf-form">
        <InlineFormLabel width={9} tooltip={<>Enable/Disable Error Bars</>}>
          Error Bar
        </InlineFormLabel>
        <select value={errorBar} className="width-6" onChange={this.onToggleBarChange}>
          <option value="true">Show</option>
          <option value="false">Hide</option>
        </select>
      </div>
    );
  }

  renderRefStringOption() {
    const { dataSource, options } = this.props;

    let refString = options.refString ?? '';

    if (!dataSource.meta.queryOptions?.refString) {
      return null;
    }

    return (
      <div className="gf-form">
        <InlineFormLabel width={9} tooltip={<>The default value is empty</>}>
          Reference String
        </InlineFormLabel>
        <Input
          type="text"
          className="width-6"
          placeholder=""
          spellCheck={false}
          onBlur={this.onRefStringBlur}
          defaultValue={refString}
        />
      </div>
    );
  }

  renderBeforeIntervalOption() {
    const { dataSource, options } = this.props;

    let beforeInterval = options.beforeInterval ?? '60';

    if (!dataSource.meta.queryOptions?.beforeInterval) {
      return null;
    }

    return (
      <div className="gf-form">
        <InlineFormLabel width={12} tooltip={<>The default value is 60 seconds</>}>
          Lookup before time interval
        </InlineFormLabel>
        <Input
          type="text"
          className="width-6"
          placeholder="60"
          spellCheck={false}
          onBlur={this.onBeforeBlur}
          defaultValue={beforeInterval}
        />
      </div>
    );
  }

  renderAfterIntervalOption() {
    const { dataSource, options } = this.props;

    let afterInterval = options.afterInterval ?? '60';

    if (!dataSource.meta.queryOptions?.afterInterval) {
      return null;
    }

    return (
      <div className="gf-form">
        <InlineFormLabel width={12} tooltip={<>The default value is 60 seconds</>}>
          Lookup after time interval
        </InlineFormLabel>
        <Input
          type="text"
          className="width-6"
          placeholder="60"
          spellCheck={false}
          onBlur={this.onAfterBlur}
          defaultValue={afterInterval}
        />
      </div>
    );
  }

  renderCacheTimeoutOption() {
    const { dataSource, options } = this.props;

    const tooltip = `If your time series store has a query cache this option can override the default cache timeout. Specify a
    numeric value in seconds.`;

    if (!dataSource.meta.queryOptions?.cacheTimeout) {
      return null;
    }

    return (
      <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel width={9} tooltip={tooltip}>
            Cache timeout
          </InlineFormLabel>
          <Input
            type="text"
            className="width-6"
            placeholder="60"
            spellCheck={false}
            onBlur={this.onCacheTimeoutBlur}
            defaultValue={options.cacheTimeout ?? ''}
          />
        </div>
      </div>
    );
  }

  renderMaxDataPointsOption() {
    const { data, options } = this.props;
    const realMd = data.request?.maxDataPoints;
    const value = options.maxDataPoints ?? '';
    const isAuto = value === '';

    return (
      <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel
            width={9}
            tooltip={
              <>
                The maximum data points per series. Used directly by some data sources and used in calculation of auto
                interval. With streaming data this value is used for the rolling buffer.
              </>
            }
          >
            Max data points
          </InlineFormLabel>
          <Input
            type="number"
            className="width-6"
            placeholder={`${realMd}`}
            spellCheck={false}
            onBlur={this.onMaxDataPointsBlur}
            defaultValue={value}
          />
          {isAuto && (
            <>
              <div className="gf-form-label query-segment-operator">=</div>
              <div className="gf-form-label">Width of panel</div>
            </>
          )}
        </div>
      </div>
    );
  }

  renderIntervalOption() {
    //const { data, dataSource, options } = this.props;
    const { data } = this.props;
    const realInterval = data.request?.interval;
    //const minIntervalOnDs = dataSource.interval ?? 'No limit';

    return (
      <>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel
              width={9}
              tooltip={
                <>
                  The evaluated Interval that is sent to data source and is used in <code>$__interval</code> and{' '}
                  <code>$__interval_ms</code>
                </>
              }
            >
              Interval
            </InlineFormLabel>
            <InlineFormLabel width={6}>{realInterval}</InlineFormLabel>
            <div className="gf-form-label query-segment-operator">=</div>
            <div className="gf-form-label">Max data points / time range</div>
          </div>
        </div>
      </>
    );
  }

  onOpenOptions = () => {
    this.setState({ isOpen: true });
  };

  onCloseOptions = () => {
    this.setState({ isOpen: false });
  };

  renderCollapsedText(styles: StylesType): React.ReactNode | undefined {
    const { data, options } = this.props;
    const { isOpen } = this.state;

    if (isOpen) {
      return undefined;
    }

    let mdDesc = options.maxDataPoints ?? '';
    if (mdDesc === '' && data.request) {
      mdDesc = `auto = ${data.request.maxDataPoints}`;
    }

    let intervalDesc = options.minInterval;
    if (data.request) {
      intervalDesc = `${data.request.interval}`;
    }

    return (
      <>
        {<div className={styles.collapsedText}>MD = {mdDesc}</div>}
        {<div className={styles.collapsedText}>Interval = {intervalDesc}</div>}
      </>
    );
  }

  render() {
    const { timeRangeHide: hideTimeOverride, relativeTimeIsValid, timeShiftIsValid } = this.state;
    const { timeRangeFrom: relativeTime, timeRangeShift: timeShift, isOpen } = this.state;
    const styles = getStyles();

    return (
      <QueryOperationRow
        id="Query options"
        index={0}
        title="Query options"
        headerElement={this.renderCollapsedText(styles)}
        isOpen={isOpen}
        onOpen={this.onOpenOptions}
        onClose={this.onCloseOptions}
      >
        {this.renderMaxDataPointsOption()}
        {this.renderIntervalOption()}
        {this.renderCacheTimeoutOption()}
        {this.renderRefStringOption()}
        {this.renderErrorBarOption()}
        {this.renderFillGapOption()}
        {this.renderBeforeIntervalOption()}
        {this.renderAfterIntervalOption()}

        <div className="gf-form">
          <InlineFormLabel width={9}>Relative time</InlineFormLabel>
          <Input
            type="text"
            className="width-6"
            placeholder="1h"
            onChange={this.onRelativeTimeChange}
            onBlur={this.onOverrideTime}
            invalid={!relativeTimeIsValid}
            value={relativeTime}
          />
        </div>

        <div className="gf-form">
          <span className="gf-form-label width-9">Time shift</span>
          <Input
            type="text"
            className="width-6"
            placeholder="1h"
            onChange={this.onTimeShiftChange}
            onBlur={this.onTimeShift}
            invalid={!timeShiftIsValid}
            value={timeShift}
          />
        </div>
        {(timeShift || relativeTime) && (
          <div className="gf-form-inline">
            <InlineField label="Hide time info" labelWidth={18}>
              <Switch value={hideTimeOverride} onChange={this.onToggleTimeOverride} />
            </InlineField>
          </div>
        )}
      </QueryOperationRow>
    );
  }
}

const timeRangeValidation = (value: string | null) => {
  if (!value) {
    return true;
  }

  return rangeUtil.isValidTimeSpan(value);
};

const emptyToNull = (value: string) => {
  return value === '' ? null : value;
};

const getStyles = stylesFactory(() => {
  const { theme } = config;

  return {
    collapsedText: css`
      margin-left: ${theme.spacing.md};
      font-size: ${theme.typography.size.sm};
      color: ${theme.colors.textWeak};
    `,
  };
});

type StylesType = ReturnType<typeof getStyles>;
