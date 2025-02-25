// ==========================================================================
//                            DG.UnivariateAdornmentBaseModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2023 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

sc_require('components/graph/plots/univariate_plot_model');
/*global pluralize:true*/

/** @class  DG.DotPlotModel The model for a dot plot.

 @extends SC.PlotModel
 */
DG.UnivariateAdornmentBaseModel = DG.UnivariatePlotModel.extend(
    /** @scope DG.UnivariateAdornmentBaseModel.prototype */
    {
      multipleMovableValuesModel: function () {
        var tMultipleMovableValues = this.getAdornmentModel('multipleMovableValues');
        if (!tMultipleMovableValues) {
          tMultipleMovableValues = DG.MultipleMovableValuesModel.create({
            plotModel: this,
            axisModel: this.get('primaryAxisModel')
          });
          tMultipleMovableValues.addObserver('values', this, 'valuesDidChange');
          this.setAdornmentModel('multipleMovableValues', tMultipleMovableValues);
        }
        return tMultipleMovableValues;
      }.property(),

      /**
       * @property {Boolean}
       */
      isShowingMovableValues: function () {
        return this.getPath('multipleMovableValuesModel.valueModels').length > 0;
      }.property(),

      /**
       * True because we can display percents with movable values
       * @property {Boolean}
       */
      wantsPercentCheckbox: function() {
        return this.get('isShowingMovableValues') || this.get('enableMeasuresForSelection');
      }.property(),

      /** If true, labels for mean, median, std dev and MAD will show and persist
       * @property {boolean}
       */
      showMeasureLabels: false,

      destroy: function () {
        var tMultipleMovableValues = this.getAdornmentModel('multipleMovableValues');
        if (tMultipleMovableValues) {
          tMultipleMovableValues.removeObserver('valueModels', this, 'valuesDidChange');
        }
        sc_super();
      },

      /**
       We override our base class because we want to handle display of counts and percents
       in our multipleMovableValues adornment.
       However, if we have no movable values, we defer to our base class.
       */
      togglePlottedCount: function (iWhat) {

        if (!this.get('isShowingMovableValues')) {
          sc_super();
          return;
        }

        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            var tMultipleMovableValues = iPlot.get('multipleMovableValuesModel'),
                tCurrentValue = tMultipleMovableValues.get('isShowing' + iWhat);
            tMultipleMovableValues.setComputingNeeded();
            tMultipleMovableValues.set('isShowing' + iWhat, !tCurrentValue);
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var tInitialValue = this.getPath('multipleMovableValuesModel.isShowing' + iWhat),
            tUndo = tInitialValue ? ('DG.Undo.graph.hide' + iWhat) : ('DG.Undo.graph.show' + iWhat),
            tRedo = tInitialValue ? ('DG.Redo.graph.hide' + iWhat) : ('DG.Redo.graph.show' + iWhat);
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleCount",
          undoString: tUndo,
          redoString: tRedo,
          log: ("togglePlotted" + iWhat + ": %@").fmt(tInitialValue ? "hide" : "show"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle movable value',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
          }.bind(this),
          undo: function () {
            toggle();
          }.bind(this),
        }));
      },

      /**
       * Override base class to refer to multipleMovableValuesModel
       @return { Boolean }
       */
      shouldPlottedCountBeChecked: function (iWhat) {
        if( this.get('isShowingMovableValues'))
          return this.getPath('multipleMovableValuesModel.isShowing' + iWhat);
        else
          return sc_super();
      },

      /**
       * Add another movable value.
       * If it's the first one, we may have to deal with counts showing via the base class adornment.
       */
      addMovableValue: function () {
        var this_ = this,
            tAddedValues = [];

            function doAddMovableValue() {

              function addMovableValueToPlot( iPlot, iIndexMinusOne) {
                var tIndex = iIndexMinusOne + 1,
                    tMultipleMovableValues = iPlot.get('multipleMovableValuesModel'),
                    tNumAlreadyShowing = tMultipleMovableValues.get('valueModels').length,
                    tPlottedCount = iPlot.get('plottedCount'), // from base class
                    tBaseClassCountIsShowing = (tNumAlreadyShowing === 0) && tPlottedCount &&
                        tPlottedCount.get('isShowingCount'),
                    tBaseClassPercentIsShowing = (tNumAlreadyShowing === 0) && tPlottedCount &&
                        tPlottedCount.get('isShowingPercent'),
                    tAddedValue = tAddedValues[ tIndex];
                if (tAddedValue) {
                  tMultipleMovableValues.addThisValue(tAddedValue);
                  tAddedValues[ tIndex] = null;
                }
                else {
                  tAddedValue = tMultipleMovableValues.addValue();
                  tAddedValues[ tIndex] = tAddedValue;
                }
                if (tBaseClassCountIsShowing) {
                  tPlottedCount.set('isShowingCount', false);
                  tMultipleMovableValues.set('isShowingCount', true);
                }
                if (tBaseClassPercentIsShowing) {
                  tPlottedCount.set('isShowingPercent', false);
                  tMultipleMovableValues.set('isShowingPercent', true);
                }
                iPlot.notifyPropertyChange('movableValueChange');
              }

              addMovableValueToPlot( this_, -1);
              this_.get('siblingPlots').forEach( addMovableValueToPlot);
            }

            function doUndoAddMovableValue() {

              function undoAddMovableValueFromPlot( iPlot, iIndexMinusOne) {
                var tIndex = iIndexMinusOne + 1,
                    tAddedValue = tAddedValues[ tIndex];
                iPlot.getAdornmentModel('multipleMovableValues').removeThisValue(tAddedValue);
              }

              undoAddMovableValueFromPlot( this_, -1);
              this_.get('siblingPlots').forEach( undoAddMovableValueFromPlot);
            }

        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.addMovableValue",
          undoString: 'DG.Undo.graph.addMovableValue',
          redoString: 'DG.Redo.graph.addMovableValue',
          log: "Added Movable Value",
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'add movable value',
              type: 'DG.GraphView'
            }
          },
          execute: doAddMovableValue,
          undo: doUndoAddMovableValue
        }));

      },

      /**
       * Add another movable value
       */
      removeMovableValue: function () {
        var this_ = this,
            tRootMMVs = this.getAdornmentModel('multipleMovableValues'),
            tShowing = { count: tRootMMVs.get('isShowingCount'),
              percent: tRootMMVs.get('isShowingPercent')},
            tNumShowing = tRootMMVs.get('valueModels').length,
            tRemovedValues = [];

            function doRemoveMovableValue() {

              function removeMovableValueFromPlot( iPlot, iIndexMinusOne) {
                var tIndex = iIndexMinusOne + 1,
                    tMultipleMovableValues = iPlot.getAdornmentModel('multipleMovableValues'),
                    tPlottedCount,
                    tRemovedValue = tRemovedValues[ tIndex];
                if( !tMultipleMovableValues)
                  return;

                if( tNumShowing === 1 && (tShowing.count || tShowing.percents) ) {
                  tPlottedCount = iPlot.get('plottedCount');
                  tPlottedCount.set('isShowingCount', tShowing.count);
                  tPlottedCount.set('isShowingPercent', tShowing.percent);
                }
                if( tRemovedValue)
                  tMultipleMovableValues.removeThisValue( tRemovedValue);
                else
                  tRemovedValues[ tIndex] = tMultipleMovableValues.removeValue();
                iPlot.notifyPropertyChange('movableValueChange');
              }

              removeMovableValueFromPlot( this_, -1);
              this_.get('siblingPlots').forEach( removeMovableValueFromPlot);
            }

            function doUndoRemoveMovableValue() {

              function undoRemoveMovableValueFromPlot( iPlot, iIndexMinusOne) {
                var tIndex = iIndexMinusOne + 1,
                    tMultipleMovableValues = iPlot.getAdornmentModel('multipleMovableValues'),
                    tRemovedValue = tRemovedValues[ tIndex];
                if( tNumShowing === 1 && (tShowing.count || tShowing.percents) ) {
                  tMultipleMovableValues.set('isShowingCount', tShowing.count);
                  tMultipleMovableValues.set('isShowingPercent', tShowing.percent);
                  iPlot.setPath('plottedCount.isShowingCount', false);
                  iPlot.setPath('plottedCount.isShowingPercent', false);
                }
                tMultipleMovableValues.addThisValue(tRemovedValue);
                tRemovedValues[ tIndex] = null;
                iPlot.notifyPropertyChange('movableValueChange');
              }

              undoRemoveMovableValueFromPlot( this_, -1);
              this_.get('siblingPlots').forEach( undoRemoveMovableValueFromPlot);
            }

        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.removeMovableValue",
          undoString: 'DG.Undo.graph.removeMovableValue',
          redoString: 'DG.Redo.graph.removeMovableValue',
          log: "Added Movable Value",
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'remove movable value',
              type: 'DG.GraphView'
            }
          },
          execute: doRemoveMovableValue,
          undo: doUndoRemoveMovableValue
        }));
      },

      valuesDidChange: function () {
        this.notifyPropertyChange('valuesDidChange');
      },

      /**
       Toggle the visibility of the specified DG.PlottedAverageModel.
       Will create the adornment the first time it's shown.
       @param    {String}    iAdornmentKey -- e.g. 'plottedMean'
       @param    {String}    iToggleLogString -- Name of action logged to server
       */
      toggleAverage: function (iAdornmentKey, iToggleLogString) {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            var avg = iPlot.toggleAdornmentVisibility(iAdornmentKey, iToggleLogString);
            if (avg) {
              if (avg.get('isVisible')) {
                avg.recomputeValue();     // initialize
              } else {
                avg.setComputingNeeded(); // make sure we recompute when made visible again
              }
            }
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);

          return this_.getAdornmentModel( iAdornmentKey).get('isVisible');
        }

        DG.UndoHistory.execute(DG.Command.create({
          name: "graph." + iToggleLogString,  // e.g. graph.togglePlottedMean
          undoString: null,
          log: iToggleLogString,
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: iToggleLogString,
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            var wasShown = toggle(),

                verb = wasShown ? "show" : "hide",
                action = iToggleLogString.replace("toggle", verb);

            this.set('undoString', 'DG.Undo.graph.' + action); // e.g. DG.Undo.graph.showPlottedMean
            this.set('redoString', 'DG.Redo.graph.' + action);
          },
          undo: function () {
            toggle();
          },
        }));
      },

      /**
       Assume the PlottedStErrModel exists and set its number of standard errors in an undable way.
       @param    {Number}    iNewNumStdErrs
       */
      setNumStdErrs: function (iNewNumStdErrs) {
        var this_ = this,
            logString = 'graph.setNumStdErrs: %@'.fmt(iNewNumStdErrs);

        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.setNumStdErrs',
          undoString: 'DG.Undo.graph.setNumStErrs',
          redoString: 'DG.Redo.graph.setNumStErrs',
          log: logString,
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'setNumStdErrs',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            this._numStdErrs = this_.getAdornmentModel('plottedStErr').get('numberOfStdErrs');
            this_.getAdornmentModel('plottedStErr').set('numberOfStdErrs', iNewNumStdErrs);
          },
          undo: function () {
            var stashedNumStdErrs = this_.getAdornmentModel('plottedStErr').get('numberOfStdErrs');
            this_.getAdornmentModel('plottedStErr').set('numberOfStdErrs', this._numStdErrs);
            this._numStdErrs = stashedNumStdErrs;
          },
          redo: function () {
            this.undo();
          }
        }));
     },

      /**
       Toggle the visibility of the mean.
       */
      togglePlottedMean: function () {
        this.toggleAverage('plottedMean', 'togglePlottedMean');
      },

      /**
       Toggle the visibility of the median.
       */
      togglePlottedMedian: function () {
        this.toggleAverage('plottedMedian', 'togglePlottedMedian');
      },

      /**
       Toggle the visibility of the Standard Deviation.
       */
      togglePlottedStDev: function () {
        this.toggleAverage('plottedStDev', 'togglePlottedStDev');
      },

      /**
       Toggle the visibility of the Standard Error.
       */
      togglePlottedStErr: function () {
        this.toggleAverage('plottedStErr', 'togglePlottedStErr');
      },

      /**
       Toggle the visibility of the Standard Deviation.
       */
      togglePlottedMad: function () {
        this.toggleAverage('plottedMad', 'togglePlottedMad');
      },

      /**
       Toggle the visibility of the IQR.
       */
      togglePlottedIQR: function () {
        this.toggleAverage('plottedIQR', 'togglePlottedIQR');
      },

      /**
       Toggle the visibility of the Normal Curve.
       */
      togglePlottedNormal: function () {
        this.toggleAverage('plottedNormal', 'togglePlottedNormal');
      },

      /**
       Toggle the visibility of the Box Plot.
       */
      togglePlottedBoxPlot: function () {
        this.toggleAverage('plottedBoxPlot', 'togglePlottedBoxPlot');
      },

      /**
       Toggle whether boxplot outliers are showing.
       */
      toggleShowOutliers: function () {
        var this_ = this;

        function toggle() {

          function doToggle(iPlot) {
            var tBoxPlotModel = iPlot.getAdornmentModel('plottedBoxPlot');
            if (tBoxPlotModel) {
              tBoxPlotModel.toggleProperty('showOutliers');
              tBoxPlotModel.setComputingNeeded();
            }
          }

          doToggle(this_);
          this_.get('siblingPlots').forEach(doToggle);
          return this_.getAdornmentModel('plottedBoxPlot').get('showOutliers');
        }


        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.boxPlot.showOutliers",
          undoString: null,
          log: "graph.boxPlot.showOutliers",
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle show outliers',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            var wasShown = toggle(),

                verb = wasShown ? "show" : "hide",
                action = "toggleOutliers".replace("toggle", verb);

            this.set('undoString', 'DG.Undo.graph.' + action); // e.g. DG.Undo.graph.showPlottedMean
            this.set('redoString', 'DG.Redo.graph.' + action);
          },
          undo: function () {
            toggle();
          }
        }));
      },

      /**
       Toggle whether boxplot informal confidence interval is showing.
       */
      toggleShowICI: function () {
        var this_ = this;

        function toggle() {

          function doToggle(iPlot) {
            var tBoxPlotModel = iPlot.getAdornmentModel('plottedBoxPlot');
            if (tBoxPlotModel) {
              tBoxPlotModel.toggleProperty('showICI');
              tBoxPlotModel.setComputingNeeded();
            }
          }

          doToggle(this_);
          this_.get('siblingPlots').forEach(doToggle);
          return this_.getAdornmentModel('plottedBoxPlot').get('showICI');
        }


        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.boxPlot.showICI",
          undoString: null,
          log: "graph.boxPlot.showICI",
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle show outliers',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            var wasShown = toggle(),

               verb = wasShown ? "show" : "hide",
               action = "toggleICI".replace("toggle", verb);

            this.set('undoString', 'DG.Undo.graph.' + action); // e.g. DG.Undo.graph.showPlottedMean
            this.set('redoString', 'DG.Redo.graph.' + action);
          },
          undo: function () {
            toggle();
          }
        }));
      },

      updateAdornmentsModels: function() {
        sc_super();
        ['multipleMovableValues', 'plottedMean', 'plottedMedian', 'plottedStDev', 'plottedStErr', 'plottedNormal',
          'plottedBoxPlot', 'plottedCount'].forEach(function (iAdornmentKey) {
          var adornmentModel = this.getAdornmentModel(iAdornmentKey);
          if (adornmentModel) {
            if (adornmentModel.setComputingNeeded)
              adornmentModel.setComputingNeeded();  // invalidate if axis model/attribute change
            if (iAdornmentKey === 'multipleMovableValues') {
              adornmentModel.recomputeValueIfNeeded(this.get('primaryAxisModel'));
            }
            else {
              adornmentModel.recomputeValueIfNeeded(); // recompute only if/when visible
            }
          }
        }.bind(this));
      },

      /**
       * Pass to my multipleMovableValues. We do this only after axis bounds have changed
       */
      onRescaleIsComplete: function() {
        this.get('multipleMovableValuesModel').handleChangedAxisAttribute();
      },

      createStorage: function () {
        var tStorage = sc_super();
        tStorage.showMeasureLabels = this.get('showMeasureLabels');
        return tStorage;
      },

      restoreStorage: function (iStorage) {
        sc_super();
        this.showMeasureLabels = iStorage.showMeasureLabels || false;
        var tMultipleMovable = this.getAdornmentModel('multipleMovableValues');
        if (tMultipleMovable)
          tMultipleMovable.set('axisModel', this.get('primaryAxisModel'));
      },

      /**
       * Return a list of objects { key, class, useAdornmentModelsArray, storage }
       * Subclasses should override calling sc_super first.
       * @return {[Object]}
       */
      getAdornmentSpecs: function() {
        var tSpecs = sc_super();
        DG.ObjectMap.forEach( this._adornmentModels, function( iKey, iAdorn) {
          tSpecs.push( {
            key: iKey,
            "class": iAdorn.constructor,
            useAdornmentModelsArray: true,
            storage: iAdorn.createStorage()
          });
        });
        return tSpecs;
      },

      /**
       * Base class will do most of the work. We just have to finish up the multipleMovableValues model.
       * @param {DG.PlotModel} iSourcePlot
       */
      installAdornmentModelsFrom: function( iSourcePlot) {
        sc_super();
        var tMultipleMovable = this.getAdornmentModel('multipleMovableValues');
        if (tMultipleMovable)
          tMultipleMovable.set('axisModel', this.get('primaryAxisModel'));
      },

      createStdErrorOption: function() {
        function isStdErrVisible() {
          return this_.isAdornmentVisible('plottedStErr');
        }

        var this_ = this,
           kMargin = 20,
           kLeading = 5,
           kPadding = 5,
           kRowHeight = 20,
           tStdErrModel = this.getAdornmentModel('plottedStErr'),
           tNumStdErrs = tStdErrModel ? tStdErrModel.get('numberOfStdErrs') : 1,
           tLabel = tNumStdErrs === 1 ? 'DG.Inspector.graphPlottedStErr'.loc()
                                      : pluralize('DG.Inspector.graphPlottedStErr'.loc()),
           tShowStdErrCheckbox = SC.CheckboxView.create( {
             layout: {left: 0, top: 3, height: kRowHeight, width: 25 },
             localize: true,
             flowSpacing: { left: kMargin, top: kLeading },
             title: '',
             value: this.isAdornmentVisible('plottedStErr'),
             classNames: 'dg-graph-plottedStErr-check dg-ruler-check'.w(),
             valueDidChange: function () {
               this_.togglePlottedStErr();
               tNumberEditField.set('isEnabled', isStdErrVisible());
             }.observes('value')
           }),
           tNumberEditField = SC.TextFieldView.create({
             layout: { height: kRowHeight + kLeading, width : 50 },
             isEnabled: isStdErrVisible(),
             flowSpacing: { left: 0, top: 0 },
             supportsAutoResize: true,
             type: 'number',
             value: tNumStdErrs,
             maxLength: 5,
             valueDidChange: function () {
               var tProposedValue = Number(this.get('value'));
               if( DG.isFinite( tProposedValue)) {
                 if (tProposedValue >= 0)
                   this_.setNumStdErrs(tProposedValue);
                 else
                   this.set('value', tNumStdErrs);
               }
             }.observes('value')
           }),
           tLabelView = SC.LabelView.create({
             layout: { height: kRowHeight, width : 100 },
             value: tLabel,
             localize: true
           });
        this.invokeLater( function() {
          document.getElementById(tNumberEditField.get('layerId')).style.background = 'white';
        }, 100);
        return SC.View.create( SC.FlowedLayout,
           {
             layoutDirection: SC.LAYOUT_HORIZONTAL,
             isResizable: false,
             isClosable: false,
             layout: {left: 0, height: kRowHeight + kLeading},
             defaultFlowSpacing: {left: kPadding, top: kLeading},
             shouldResizeWidth: false,
             canWrap: false,
             flowSpacing: {left: 0},
             init: function() {
               sc_super();
               this.appendChild( tShowStdErrCheckbox);
               this.appendChild(tNumberEditField);
               this.appendChild(tLabelView);
             }
           });
      },

      checkboxDescriptions: function () {
        var this_ = this,
            tShowLabelsCheckbox = [],
            kRowHeight = 20;

        function toggleShowMeasureLabels() {
          var tString = this_.get('showMeasureLabels') ? 'hide' : 'show';
          DG.UndoHistory.execute(DG.Command.create({
            name: 'toggle show measure labels',
            undoString: 'DG.Undo.graph.'+ tString + 'MeasureLabels',
            redoString: 'DG.Redo.graph.'+ tString + 'MeasureLabels',
            log: tString + ' measure labels',
            _redoValue: null,
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: tString + ' measure labels',
                type: 'DG.Graph'
              }
            },
            execute: function() {
              this_.toggleProperty('showMeasureLabels');
            },
            undo: function() {
              this.execute();
            }
          }));
        }

        function createRadioGroupWithControls( iTitle, iVisibilityProperty, iControls) {
          var tGroupView = DG.RulerGroupView.create( {
            title: iTitle.loc(),
            visibilityStateProperty: iVisibilityProperty,
          });
          iControls.forEach( function( iDesc) {
            if( iDesc.control) {
              tGroupView.appendChild(iDesc.control);
            }
            else {
              iDesc.classNames.push('dg-ruler-check');
              iDesc.layout = { height: kRowHeight };
              iDesc.localize = true;
              tGroupView.appendChild(SC.CheckboxView.create(iDesc));
            }
          }.bind( this));
          tGroupView.syncChildViewVisibility();
          return tGroupView;
        }

        function createBoxPlotToggle() {
          var kMargin = 20,
              kLeading = 5,
              kRowHeight = 20,
             tBoxPlotModel = this_.getAdornmentModel('plottedBoxPlot'),
             kIciEnabled = DG.get('informalConfidenceIntervalEnabled')==='yes' ||
                           (tBoxPlotModel && this_.getAdornmentModel('plottedBoxPlot').get('showICI')),
              tShowOutliersCheckbox = SC.CheckboxView.create( {
                layout: { height: kRowHeight },
                localize: true,
                flowSpacing: { left: 2 * kMargin },
                title: 'DG.Inspector.graphBoxPlotShowOutliers',
                value: this_.getAdornmentModel('plottedBoxPlot') ?
                    this_.getAdornmentModel('plottedBoxPlot').get('showOutliers') : false,
                classNames: 'dg-graph-boxPlotShowOutliers-check'.w(),
                valueDidChange: function () {
                  this_.toggleShowOutliers();
                }.observes('value')
              }),
             tShowIciCheckbox = SC.CheckboxView.create( {
               layout: { height: kRowHeight },
               localize: true,
               flowSpacing: { left: 2 * kMargin },
               title: 'DG.Inspector.graphBoxPlotShowICI',
               value: tBoxPlotModel ? tBoxPlotModel.get('showICI') : false,
               classNames: 'dg-graph-boxPlotShowICI-check'.w(),
               valueDidChange: function () {
                 this_.toggleShowICI();
               }.observes('value')
             }),
              tBoxPlotCheckbox = SC.CheckboxView.create( {
                layout: { left: kMargin, height: kRowHeight },
                localize: true,
                title: 'DG.Inspector.graphPlottedBoxPlot',
                value: this_.isAdornmentVisible('plottedBoxPlot'),
                classNames: 'dg-graph-plottedBoxPlot-check'.w(),
                valueDidChange: function () {
                  this_.togglePlottedBoxPlot();
                  tShowOutliersCheckbox.set('isEnabled', isBoxPlotVisible());
                  tShowIciCheckbox.set('isEnabled', isBoxPlotVisible());
                }.observes('value')
              });

          function isBoxPlotVisible() {
            return this_.isAdornmentVisible('plottedBoxPlot');
          }

          var tComposite =  SC.View.create( SC.FlowedLayout,
              {
                layoutDirection: SC.LAYOUT_VERTICAL,
                isResizable: false,
                isClosable: false,
                layout: {left: kMargin, height: 2 * (kRowHeight + kLeading)},
                defaultFlowSpacing: {left: kMargin, bottom: kLeading},
                canWrap: false,
                align: SC.ALIGN_TOP,
                // layout: {right: 22},
                boxplot: null,
                showOutliers: null,
                init: function() {
                  sc_super();
                  tShowOutliersCheckbox.set('isEnabled', this_.isAdornmentVisible('plottedBoxPlot'));
                  this.appendChild( tBoxPlotCheckbox);
                  this.appendChild(tShowOutliersCheckbox);
                  if( kIciEnabled) {
                    tShowIciCheckbox.set('isEnabled', this_.isAdornmentVisible('plottedBoxPlot'));
                    this.appendChild(tShowIciCheckbox);
                  }
                }
              });
          return tComposite;
        }

        function createMeasuresOfCenterGroup() {
          return createRadioGroupWithControls('DG.Inspector.graphCenterOptions', 'measuresOfCenter',
          [{
              title: 'DG.Inspector.graphPlottedMean',
              value: this_.isAdornmentVisible('plottedMean'),
              classNames: 'dg-graph-plottedMean-check'.w(),
              valueDidChange: function () {
              this_.togglePlottedMean();
            }.observes('value')
           },
            {
              title: 'DG.Inspector.graphPlottedMedian',
              value: this_.isAdornmentVisible('plottedMedian'),
              classNames: 'dg-graph-plottedMedian-check'.w(),
              valueDidChange: function () {
                this_.togglePlottedMedian();
              }.observes('value')
            }
          ]);
        }

        function createMeasuresOfSpreadGroup() {
          return createRadioGroupWithControls('DG.Inspector.graphSpreadOptions', 'measuresOfSpread',
          [
            {
              title: 'DG.Inspector.graphPlottedStDev',
              value: this_.isAdornmentVisible('plottedStDev'),
              classNames: 'dg-graph-plottedStDev-check'.w(),
              valueDidChange: function () {
                this_.togglePlottedStDev();
              }.observes('value')
            },
            {
              control: this_.createStdErrorOption()
            },
            {
              title: 'DG.Inspector.graphPlottedMeanAbsDev',
              value: this_.isAdornmentVisible('plottedMad'),
              classNames: 'dg-graph-plottedMad-check'.w(),
              valueDidChange: function () {
                this_.togglePlottedMad();
              }.observes('value')
            }
          ]);
        }

        function createBoxPlotAndNormalCurveGroup() {
          var kGaussianFitEnabled = DG.get('gaussianFitEnabled')==='yes',
              tDotsAreFused = this_.get('dotsAreFused'),
              groupTitle = kGaussianFitEnabled && tDotsAreFused ? 'DG.Inspector.graphBoxPlotGaussianFitOptions'
                       : 'DG.Inspector.graphBoxPlotNormalCurveOptions';
          return createRadioGroupWithControls(groupTitle.loc(), 'boxPlotAndNormalCurve',
          [
            {
              control: createBoxPlotToggle()
            },
            {
              title: (tDotsAreFused && kGaussianFitEnabled) ? 'DG.Inspector.graphPlottedGaussianFit'
                                                                        :'DG.Inspector.graphPlottedNormal',
              value: this_.isAdornmentVisible('plottedNormal'),
              classNames: 'dg-graph-plottedNormal-check'.w(),
              valueDidChange: function () {
                this_.togglePlottedNormal();
              }.observes('value')
            }
          ]);
        }

        function createOtherValuesGroup() {
          var kMargin = 20,
              kLeading = 5;
          return createRadioGroupWithControls('DG.Inspector.graphOtherValuesOptions', 'otherValues',
             [
               {
                 title: 'DG.Inspector.graphPlottedValue',
                 value: this_.isAdornmentVisible('plottedValue'),
                 classNames: 'dg-graph-plottedValue-check'.w(),
                 valueDidChange: function () {
                   this_.togglePlotValue();
                 }.observes('value')
               },
               {
                 control: SC.ButtonView.create({
                   classNames: 'dg-movable-value-button'.w(),
                   defaultFlowSpacing: {left: kMargin, bottom: kLeading},
                   themeName: 'capsule',
                   title: 'DG.Inspector.graphAdd',
                   localize: YES,
                   action: this_.addMovableValue.bind(this_),
                 })
               },
               {
                 control: SC.ButtonView.create({
                   classNames: 'dg-movable-value-button',
                   defaultFlowSpacing: {left: kMargin, bottom: kLeading},
                   title: 'DG.Inspector.graphRemove',
                   themeName: 'capsule',
                   localize: YES,
                   action: this_.removeMovableValue.bind(this_),
                 })
               }
             ]);
        }

        if( !SC.platform.touch) { // We don't show this option on a touch system
          tShowLabelsCheckbox.push(
             {
               title: 'DG.Inspector.showLabels',
               value: this_.get('showMeasureLabels'),
               classNames: 'dg-graph-showLabels-check'.w(),
               valueDidChange: function () {
                 toggleShowMeasureLabels();
               }.observes('value')
             }
          );
        }

        return sc_super().concat(tShowLabelsCheckbox.concat([
          { control: createMeasuresOfCenterGroup() },
          { control: createMeasuresOfSpreadGroup() },
          { control: createBoxPlotAndNormalCurveGroup() },
          { control: createOtherValuesGroup() }
        ]));
      }.property(),

    });

DG.UnivariateAdornmentBaseModel.rulerState = {
  measuresOfCenter: true, // is visible by default
  measuresOfSpread: false, // not visible by default
  boxPlotAndNormalCurve: false, // not visible by default
  otherValues: false, // not visible by default
};
