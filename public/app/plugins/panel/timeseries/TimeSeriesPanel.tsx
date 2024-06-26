import React, { useMemo, useState } from 'react';

import { PanelProps, DataFrameType, DashboardCursorSync } from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { TooltipDisplayMode, VizOrientation } from '@grafana/schema';
import { EventBusPlugin, KeyboardPlugin, TooltipPlugin2, usePanelContext } from '@grafana/ui';
import { TimeRange2, TooltipHoverMode } from '@grafana/ui/src/components/uPlot/plugins/TooltipPlugin2';
import { TimeSeries } from 'app/core/components/TimeSeries/TimeSeries';
import { config } from 'app/core/config';

import { TimeSeriesTooltip } from './TimeSeriesTooltip';
import { Options } from './panelcfg.gen';
import { AnnotationsPlugin2 } from './plugins/AnnotationsPlugin2';
import { ExemplarsPlugin, getVisibleLabels } from './plugins/ExemplarsPlugin';
import { OutsideRangePlugin } from './plugins/OutsideRangePlugin';
import { ThresholdControlsPlugin } from './plugins/ThresholdControlsPlugin';
import { getPrepareTimeseriesSuggestion } from './suggestions';
import { getTimezones, prepareGraphableFields } from './utils';

interface TimeSeriesPanelProps extends PanelProps<Options> {}

export const TimeSeriesPanel = ({
  data,
  timeRange,
  timeZone,
  width,
  height,
  options,
  fieldConfig,
  onChangeTimeRange,
  replaceVariables,
  id,
}: TimeSeriesPanelProps) => {
  //*** START_OF_CHANGE ****
  let allSeries = data.series;
  let mainSeries = {};

  // Check the properties of the "main" series
  for(let i = 0; i < allSeries.length; ++i) {
      let s = allSeries[i];
      // The "main" series have no "meta" attribute
      if(s.meta === undefined || s.hasOwnProperty("meta") === false) {
          let sName = s.name;
          for(let j = 0; j < s.fields.length; ++j) {
              let f = s.fields[j];
              if(f.name === "Value") {
                  mainSeries[sName] = {
                      viz: undefined,
                      axisPlacement: undefined,
                      scaleDistribution: undefined,
                  };
                  // The "low" and "high" series must have the same visibility and Y-axis of the
                  // corresponding main series
                  mainSeries[sName]['viz'] = f.config.custom.hideFrom['viz'];
                  mainSeries[sName]['axisPlacement'] = f.config.custom['axisPlacement'];
                  mainSeries[sName]['scaleDistribution'] = f.config.custom['scaleDistribution'];
              }
          }
      }
  }

  // Loop over the "not-main" series in order to add the "meta" attributes
  let hasKeys = !!Object.keys(mainSeries).length;
  if(hasKeys === true) {
      for(let i = 0; i < allSeries.length; ++i) {
          let s = allSeries[i];
          if(s.meta !== undefined && s.hasOwnProperty("meta") === true) {
              let extraOpts = s.meta.v2;
              for(let j = 0; j < s.fields.length; ++j) {
                  let f = s.fields[j];
                  if(f.name === "Value") {
                      for(let opt in extraOpts) {
                          if(extraOpts.hasOwnProperty(opt) === true) {
                              f.config.custom[opt] = extraOpts[opt];
                          }
                      }
                      let ms = extraOpts.mainSeries;
                      let v = mainSeries[ms];
                      if(v !== undefined) {
                          f.config.custom.hideFrom.viz = v['viz'];
                          f.config.custom.axisPlacement = v['axisPlacement'];
                          f.config.custom.scaleDistribution = v['scaleDistribution'];
                      }
                  }
              }
          }
      }
  }
  //*** END_OF_CHANGE ****
  const {
    sync,
    eventsScope,
    canAddAnnotations,
    onThresholdsChange,
    canEditThresholds,
    showThresholds,
    dataLinkPostProcessor,
    eventBus,
  } = usePanelContext();
  // Vertical orientation is not available for users through config.
  // It is simplified version of horizontal time series panel and it does not support all plugins.
  const isVerticallyOriented = options.orientation === VizOrientation.Vertical;
  const frames = useMemo(() => prepareGraphableFields(data.series, config.theme2, timeRange), [data.series, timeRange]);
  const timezones = useMemo(() => getTimezones(options.timezone, timeZone), [options.timezone, timeZone]);
  const suggestions = useMemo(() => {
    if (frames?.length && frames.every((df) => df.meta?.type === DataFrameType.TimeSeriesLong)) {
      const s = getPrepareTimeseriesSuggestion(id);
      return {
        message: 'Long data must be converted to wide',
        suggestions: s ? [s] : undefined,
      };
    }
    return undefined;
  }, [frames, id]);

  const enableAnnotationCreation = Boolean(canAddAnnotations && canAddAnnotations());
  const [newAnnotationRange, setNewAnnotationRange] = useState<TimeRange2 | null>(null);
  const cursorSync = sync?.() ?? DashboardCursorSync.Off;

  if (!frames || suggestions) {
    return (
      <PanelDataErrorView
        panelId={id}
        message={suggestions?.message}
        fieldConfig={fieldConfig}
        data={data}
        needsTimeField={true}
        needsNumberField={true}
        suggestions={suggestions?.suggestions}
      />
    );
  }

  return (
    <TimeSeries
      frames={frames}
      structureRev={data.structureRev}
      timeRange={timeRange}
      timeZone={timezones}
      width={width}
      height={height}
      legend={options.legend}
      options={options}
      replaceVariables={replaceVariables}
      dataLinkPostProcessor={dataLinkPostProcessor}
      cursorSync={cursorSync}
    >
      {(uplotConfig, alignedFrame) => {
        return (
          <>
            <KeyboardPlugin config={uplotConfig} />
            {cursorSync !== DashboardCursorSync.Off && (
              <EventBusPlugin config={uplotConfig} eventBus={eventBus} frame={alignedFrame} />
            )}
            {options.tooltip.mode !== TooltipDisplayMode.None && (
              <TooltipPlugin2
                config={uplotConfig}
                hoverMode={
                  options.tooltip.mode === TooltipDisplayMode.Single ? TooltipHoverMode.xOne : TooltipHoverMode.xAll
                }
                queryZoom={onChangeTimeRange}
                clientZoom={true}
                syncMode={cursorSync}
                syncScope={eventsScope}
                render={(u, dataIdxs, seriesIdx, isPinned = false, dismiss, timeRange2, viaSync) => {
                  if (enableAnnotationCreation && timeRange2 != null) {
                    setNewAnnotationRange(timeRange2);
                    dismiss();
                    return;
                  }

                  const annotate = () => {
                    let xVal = u.posToVal(u.cursor.left!, 'x');

                    setNewAnnotationRange({ from: xVal, to: xVal });
                    dismiss();
                  };

                  return (
                    // not sure it header time here works for annotations, since it's taken from nearest datapoint index
                    <TimeSeriesTooltip
                      series={alignedFrame}
                      dataIdxs={dataIdxs}
                      seriesIdx={seriesIdx}
                      mode={viaSync ? TooltipDisplayMode.Multi : options.tooltip.mode}
                      sortOrder={options.tooltip.sort}
                      isPinned={isPinned}
                      annotate={enableAnnotationCreation ? annotate : undefined}
                      maxHeight={options.tooltip.maxHeight}
                    />
                  );
                }}
                maxWidth={options.tooltip.maxWidth}
              />
            )}
            {!isVerticallyOriented && (
              <>
                <AnnotationsPlugin2
                  annotations={data.annotations ?? []}
                  config={uplotConfig}
                  timeZone={timeZone}
                  newRange={newAnnotationRange}
                  setNewRange={setNewAnnotationRange}
                />
                <OutsideRangePlugin config={uplotConfig} onChangeTimeRange={onChangeTimeRange} />
                {data.annotations && (
                  <ExemplarsPlugin
                    visibleSeries={getVisibleLabels(uplotConfig, frames)}
                    config={uplotConfig}
                    exemplars={data.annotations}
                    timeZone={timeZone}
                  />
                )}
                {((canEditThresholds && onThresholdsChange) || showThresholds) && (
                  <ThresholdControlsPlugin
                    config={uplotConfig}
                    fieldConfig={fieldConfig}
                    onThresholdsChange={canEditThresholds ? onThresholdsChange : undefined}
                  />
                )}
              </>
            )}
          </>
        );
      }}
    </TimeSeries>
  );
};
