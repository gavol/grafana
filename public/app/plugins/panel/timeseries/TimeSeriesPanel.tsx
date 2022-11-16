import React, { useMemo } from 'react';

import { Field, PanelProps, getLinksSupplier } from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { TooltipDisplayMode } from '@grafana/schema';
import { usePanelContext, TimeSeries, TooltipPlugin, ZoomPlugin, KeyboardPlugin } from '@grafana/ui';
import { config } from 'app/core/config';
import { getFieldLinksForExplore } from 'app/features/explore/utils/links';

import { AnnotationEditorPlugin } from './plugins/AnnotationEditorPlugin';
import { AnnotationsPlugin } from './plugins/AnnotationsPlugin';
import { ContextMenuPlugin } from './plugins/ContextMenuPlugin';
import { ExemplarsPlugin } from './plugins/ExemplarsPlugin';
import { OutsideRangePlugin } from './plugins/OutsideRangePlugin';
import { ThresholdControlsPlugin } from './plugins/ThresholdControlsPlugin';
import { TimeSeriesOptions } from './types';
import { getTimezones, prepareGraphableFields } from './utils';

interface TimeSeriesPanelProps extends PanelProps<TimeSeriesOptions> {}

export const TimeSeriesPanel: React.FC<TimeSeriesPanelProps> = ({
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
}) => {
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

  const { sync, canAddAnnotations, onThresholdsChange, canEditThresholds, onSplitOpen } = usePanelContext();

  const getFieldLinks = (field: Field, rowIndex: number) => {
    return getFieldLinksForExplore({ field, rowIndex, splitOpenFn: onSplitOpen, range: timeRange });
  };

  const frames = useMemo(() => prepareGraphableFields(data.series, config.theme2, timeRange), [data, timeRange]);
  const timezones = useMemo(() => getTimezones(options.timezone, timeZone), [options.timezone, timeZone]);

  if (!frames) {
    return (
      <PanelDataErrorView
        panelId={id}
        fieldConfig={fieldConfig}
        data={data}
        needsTimeField={true}
        needsNumberField={true}
      />
    );
  }

  const enableAnnotationCreation = Boolean(canAddAnnotations && canAddAnnotations());

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
    >
      {(config, alignedDataFrame) => {
        alignedDataFrame.fields.forEach((field) => {
          field.getLinks = getLinksSupplier(
            alignedDataFrame,
            field,
            field.state!.scopedVars!,
            replaceVariables,
            timeZone
          );
        });

        return (
          <>
            <KeyboardPlugin config={config} />
            <ZoomPlugin config={config} onZoom={onChangeTimeRange} />
            {options.tooltip.mode === TooltipDisplayMode.None || (
              <TooltipPlugin
                frames={frames}
                data={alignedDataFrame}
                config={config}
                mode={options.tooltip.mode}
                sortOrder={options.tooltip.sort}
                sync={sync}
                timeZone={timeZone}
              />
            )}
            {/* Renders annotation markers*/}
            {data.annotations && (
              <AnnotationsPlugin annotations={data.annotations} config={config} timeZone={timeZone} />
            )}
            {/* Enables annotations creation*/}
            {enableAnnotationCreation ? (
              <AnnotationEditorPlugin data={alignedDataFrame} timeZone={timeZone} config={config}>
                {({ startAnnotating }) => {
                  return (
                    <ContextMenuPlugin
                      data={alignedDataFrame}
                      config={config}
                      timeZone={timeZone}
                      replaceVariables={replaceVariables}
                      defaultItems={[
                        {
                          items: [
                            {
                              label: 'Add annotation',
                              ariaLabel: 'Add annotation',
                              icon: 'comment-alt',
                              onClick: (e, p) => {
                                if (!p) {
                                  return;
                                }
                                startAnnotating({ coords: p.coords });
                              },
                            },
                          ],
                        },
                      ]}
                    />
                  );
                }}
              </AnnotationEditorPlugin>
            ) : (
              <ContextMenuPlugin
                data={alignedDataFrame}
                frames={frames}
                config={config}
                timeZone={timeZone}
                replaceVariables={replaceVariables}
                defaultItems={[]}
              />
            )}
            {data.annotations && (
              <ExemplarsPlugin
                config={config}
                exemplars={data.annotations}
                timeZone={timeZone}
                getFieldLinks={getFieldLinks}
              />
            )}

            {canEditThresholds && onThresholdsChange && (
              <ThresholdControlsPlugin
                config={config}
                fieldConfig={fieldConfig}
                onThresholdsChange={onThresholdsChange}
              />
            )}

            <OutsideRangePlugin config={config} onChangeTimeRange={onChangeTimeRange} />
          </>
        );
      }}
    </TimeSeries>
  );
};
