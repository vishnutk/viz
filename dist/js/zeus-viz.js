'use strict';

angular.module( 'zeus.viz', [] );

'use strict';


/**
 *  @ngdoc directive
 *  @name zeus.viz.directive:zsBarGraph
 *  @restrict E
 *
 *  @description
 *  A directive for horizontal bar charts
 *
 *  @scope
 *
 *  @param {Array.<number>} values Values as array of numbers
 *  @param {function($val,$pos)=} tickFormatterY Callback function that accepts
 *  `value` and `position` of a data point and returns string
 *  @param {Array.<string>} seriesLabels Y axis labels for each of the bars
 *  @param {number=} leftMargin Optional left margin for text. Defaults to `80`
 *  @param {Object=} lastUpdate Can be used to refresh the graph
 *
 *  @example
 <example module="zeus.viz">
    <file name="index.html">
        <div ng-controller="myCtrl" style="height: 350px">
            <zs-bar-graph values="byFileGroup"
                last-update="lastUpdate"
                color-generator="fgColor($pos)"
                series-labels="seriesLabels"
                tooltip-formatter="fgTooltips($val,$pos)"
                tick-formatter-x="growthTickFormatter($val)">
            </zs-bar-graph>
        </div>
    </file>
    <file name="myCtrl.js">
        angular.module( 'zeus.viz' ).controller( 'myCtrl',
        function ( $scope, $interval ) {

            var colors = [ '#ff5722', '#8bc34a', '#ffc107', '#03a9f4',
                '#e91e63', '#009688' , '#ff9800' ],

                stop;

            $scope.byFileGroup = [
                100, 40, 50, 20, 10, 80
            ];

            $scope.seriesLabels = [
                'Men', 'Elves', 'Hobbits', 'Dwarves', 'Orcs', 'Goblins'
            ];

            $scope.fgColor = function ( pos ) {
                return colors[ pos ];
            };

            $scope.fgTooltips = function ( val, pos ) {
                return $scope.seriesLabels[ pos ] + ': ' + prettyNumberFilter( val );
            };

            $scope.growthTickFormatter = function ( val ) {
                return val;
            };

            stop = $interval( function () {
                $scope.byFileGroup = [
                    Math.random() * 1000, Math.random() * 1000, Math.random() * 1000,
                    Math.random() * 1000, Math.random() * 1000, Math.random() * 1000
                ];

                $scope.lastUpdate = ( new Date() ).getTime();

            }, 5000 );

            $scope.$on( '$destroy', function () {
                $interval.cancel( stop );
            } );

        } );
    </file>
 </example>
 **/
angular.module( 'zeus.viz' )
.directive( 'zsBarGraph', [ '$timeout', function ( $timeout ) {

        var postLink, renderChart, wrapLabel,
            margin = { top: 20, right: 20, bottom: 30, left: 80 };

        wrapLabel = function ( text, width ) {

            text.each( function () {
            var text = d3.select( this ),
                words = text.text().trim().split( /\s+/ ).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr( 'y' ),
                dy = parseFloat( text.attr( 'dy' ) ),
                tspan = text.text( null ).append( 'tspan' ).
                        attr( 'x', 0 ).attr( 'y', y ).attr( 'dy', dy + 'em' );

                word = words.pop();
                while ( word ) {
                    line.push( word );
                    tspan.text( line.join( ' ' ) );
                    if ( tspan.node().getComputedTextLength() > width && line.length > 1 ) {
                        line.pop();
                        tspan.text( line.join( ' ' ) );
                        line = [ word ];
                        tspan = text.append( 'tspan' ).
                                attr( 'x', 0 ).
                                attr( 'y', y ).
                                attr( 'dy', ++lineNumber * lineHeight + dy + 'em' ).
                                text( word );
                    }
                    word = words.pop();
                }
            } );
        };
        renderChart = function ( scope, element, tip ) {

            // Early exit
            if ( !scope.values || !scope.values.length ) {
                return;
            }

            // Reset height of parent
            var parentEl = element[ 0 ].parentElement,
                leftMargin = +scope.leftMargin || margin.left,
                width, height,
                svg, graphCanvas, bars, xAxis, yAxis,
                x, y, xAxisLabels, xMax;

            svg = d3.select( element[ 0 ] );
            graphCanvas = svg.select( 'g' );


            svg.attr( 'width', 0 ).
                attr( 'height', 0 );

            width = parentEl.clientWidth - leftMargin - margin.right;
            height = scope.graphHeight ? +scope.graphHeight : parentEl.clientHeight;

            height = height - margin.top - margin.bottom;

            svg.attr( 'width', width + leftMargin + margin.right ).
                attr( 'height', height + margin.top + margin.bottom );

            y = d3.scale.ordinal().
                domain( scope.seriesLabels ).
                rangeRoundBands( [ height, 0 ], 0.2 );


            x = d3.scale.linear().rangeRound( [ 0, width ] );

            if ( scope.clampX ) {
                x.clamp( true ).domain( [ 0, scope.clampX ] );

            } else {
                xMax = d3.max( scope.values, function ( d ) {
                    return d;
                } );

                x.domain( [ 0, xMax ] );
            }

            xAxis = d3.svg.axis().scale( x ).orient( 'bottom' ).
                    tickFormat( function ( v ) {
                        return scope.tickFormatterX( { $val: v } );
                    } ).
                    innerTickSize( -height );

            yAxis = d3.svg.axis().
                    scale( y ).orient( 'left' ).
                    innerTickSize( -width );


            graphCanvas.attr( 'transform', 'translate(' + leftMargin + ',' + margin.top + ')' );
            graphCanvas.select( 'g.x-axis' ).
                attr( 'transform', 'translate(0,' + height + ')' ).
                transition().
                duration( 800 ).
                call( xAxis );

            xAxisLabels = graphCanvas.selectAll( 'g.x-axis .tick text' );
            xAxisLabels.call( wrapLabel, width / xAxisLabels.size() );

            graphCanvas.select( 'g.y-axis' ).
                transition().
                duration( 800 ).
                call( yAxis );

            bars = graphCanvas.select( 'g.chart-holder' ).
                    selectAll( 'rect.bar' ).data( scope.values );

            bars.attr( 'class', 'bar' ).
                transition().
                duration( 800 ).
                attr( 'fill', function ( d, i ) {
                    return scope.colorGenerator( { $pos: i } );
                } ).
                attr( 'y', function ( d, i ) {
                    return y( scope.seriesLabels[ i ] );
                } ).
                attr( 'x', function () { return 0; } ).
                attr( 'height', function () { return y.rangeBand(); } ).
                attr( 'width', function ( d ) {
                    return x( d );
                } ).
                attr( 'opacity', 0.75 );

            bars.enter().
                append( 'rect' ).
                attr( 'class', 'bar' ).
                attr( 'fill', function ( d, i ) {
                    return scope.colorGenerator( { $pos: i } );
                } ).
                transition().
                duration( 800 ).
                attr( 'y', function ( d, i ) {
                    return y( scope.seriesLabels[ i ] );
                } ).
                attr( 'x', function () { return 0; } ).
                attr( 'height', function () { return y.rangeBand(); } ).
                attr( 'width', function ( d ) {
                    return x( d );
                } ).
                attr( 'opacity', 0.75 );

            bars.exit().
                transition().
                attr( 'width', function () { return 0; } ).
                remove();

            bars.on( 'mouseover', function () {
                    tip.show.apply( this, arguments );
                    $( this ).attr( 'opacity', 1 );
                } ).
                on( 'mouseout', function () {
                        tip.hide.apply( this, arguments );
                        $( this ).attr( 'opacity', 0.75 );
                } );
        };

        postLink = function ( scope, element, attrs ) {

            var parent = $( element ).parent(),
                win = $( window ),
                svg, graphCanvas, resizeWait, tip;

            scope.leftMargin = attrs.leftMargin;

            svg = d3.select( element[ 0 ] ).attr( 'class', 'bar-graph' );

            tip = d3.tip().
                    attr( 'class', 'd3-tip' ).
                    offset( [ -10, 0 ] ).
                    html( function ( d, i ) {
                        console.log( d, i );
                        return scope.tooltipFormatter( {
                            $val: d,
                            $pos: i
                        } );
                    } );

            svg.call( tip );

            graphCanvas = svg.append( 'g' );

            graphCanvas.append( 'g' ).attr( 'class', 'axis x-axis' );
            graphCanvas.append( 'g' ).attr( 'class', 'axis y-axis' );
            graphCanvas.append( 'g' ).attr( 'class', 'chart-holder' );

            if ( parent.is( ':visible' ) ) {
                renderChart( scope, element, tip );
            }

            scope.$watch( function () {
                var isVisible = parent.is( ':visible' );
                return isVisible;
            }, function () {
                if ( parent.is( ':visible' ) ) {
                    renderChart( scope, element, tip );
                }
            } );

            win.on( 'resize.bar_graph_' + scope.$id, function () {
                var isVisible = parent.is( ':visible' );
                if ( resizeWait ) {
                    $timeout.cancel( resizeWait );
                }

                if ( !isVisible ) {
                    return;
                }
                resizeWait = $timeout( function () {
                    renderChart( scope, element, tip );
                }, 500 );
            } );

            scope.$on( '$destroy', function () {
                win.off( 'resize.bar_graph_' + scope.$id );
            } );

            scope.$watch( 'lastUpdate', function () {
                if ( parent.is( ':visible' ) ) {
                    renderChart( scope, element, tip );
                }
            } );
        };

        return {
            templateNamespace: 'svg',
            template: '<svg></svg>',
            restrict: 'E',
            replace: true,
            link: postLink,
            scope: {
                values: '=',
                tickFormatterX: '&',
                lastUpdate: '=',
                seriesLabels: '=',
                colorGenerator: '&',
                graphHeight: '=',
                tooltipFormatter: '&',
                clampX: '=?'
            }
        };

    }
] );

'use strict';

/**
 *  @ngdoc directive
 *  @name zeus.viz.directive:zsDonut
 *  @restrict E
 *
 *  @description
 *  A directive for rendering single valued( percentage based ) donuts as well as
 *  multi series donut
 *
 *  @scope
 *
 *  @param {number} percentage Percentage
 *  @param {Array.<object>} values Values as array of objects {label: 'tooltip text', value: 100}
 *  @param {function($val,$index)=} segmentColor Callback function that accepts
 *  `value` and `index` of a segment and returns its hex color as `string`
 *  @param {string=} title Title
 *  @param {string=} subtitle Subtitle
 *
 *  @example
 <example module="zeus.viz">
    <file name="index.html">
        <div ng-controller="myCtrl">
            <zs-donut values="val" text="45"
                subtitle="people" segment-color="paints($index)">
            </zs-donut>
        </div>
    </file>
    <file name="myCtrl.js">
        angular.module( 'zeus.viz' ).controller( 'myCtrl', function ( $scope ) {
            var cols = [ '#ff9800', '#8bc34a', '#e91e63', '#03a9f4'  ];
            $scope.perc = 99.999999;

            $scope.val = [
                { label: 'This is test data', value: 10 },
                { label: 'This is test data', value: 20 },
                { label: 'This is sample data', value: 30 },
                { label: 'This is dummy data', value: 40 }
            ];

            $scope.paints = function ( idx ) {
                return cols[ idx ];
            }
        } );
    </file>
 </example>
 */

angular.module( 'zeus.viz' )
    .directive( 'zsDonut', [ '$timeout',
        function ( $timeout ) {

        var postLink, renderChart;

        renderChart = function ( scope, element, svg, tip ) {

            // Early exit
            if ( !scope.values || !scope.values.length ) {
                return;
            }

            svg.attr( 'width', 0 ).
                attr( 'height', 0 );

            var parent = element[ 0 ].parentElement,
                width = parent.clientWidth - 20,
                height = parent.clientHeight - 20,
                legendHeight = scope.showLegend ? 20 : 0,
                bottomPadding = scope.showLegend ? 10 : 0,
                radius, arc, pie, arcTween,
                labelOffset = [],
                legendRightExtent = 0,
                cx, cy,
                donut, legendLabels, donutFragment, legendFragment, title;


            if ( 0.5 * width > height ) {
                height = 0.5 * width + legendHeight + bottomPadding;
            }


            svg.attr( 'width', width ).
                attr( 'height', height );

            radius = Math.min( width, height - legendHeight - bottomPadding ) / 2;

            cx = Math.max( width, radius * 2 ) / 2;
            cy = Math.max( height - legendHeight - bottomPadding, radius * 2 ) / 2;

            donutFragment = svg.select( 'g.donut-fragment' ).
                attr( 'transform', 'translate(' + cx + ',' + cy + ')' );

            title = scope.title;

            donutFragment.select( 'text.donut-title' ).
                attr( 'x', 0 ).
                attr( 'y', 0 ).
                style( 'font-size', radius / 2 + 'px' ).
                text( title );

            donutFragment.select( 'text.donut-subtitle' ).
                attr( 'x', 0 ).
                attr( 'y', radius / 4 ).
                style( 'font-size', radius / 6 + 'px' ).
                text( scope.subtitle );


            legendFragment = svg.select( 'g g.legend-fragment' );

            arc = d3.svg.arc()
                    .outerRadius( radius * 0.95 )
                    .innerRadius( radius * 0.75 );


            arcTween = function ( a ) {
                var i = d3.interpolate( this._current, a );
                this._current = i( 0 );

                return function ( t ) {
                    return arc( i( t ) );
                };
            };

            pie = d3.layout.pie().
                    sort( null ).
                    value( function ( d ) { return d.value; } );


            donut = donutFragment.selectAll( 'path' ).
                    data( pie( scope.values ) );


            donut.attr( 'fill', function ( d, i ) {
                    return scope.segmentColor( { $val: d.data, $index: i } );

                } ).
                each( function ( d ) {
                    this._current = {
                        startAngle: d.startAngle,
                        endAngle: d.startAngle,
                        value: 0
                    };
                } ).
                transition().
                duration( 800 ).
                attrTween( 'd', arcTween );

            donut.enter().append( 'path' ).
                attr( 'fill', function ( d, i ) {
                    return scope.segmentColor( { $val: d.data, $index: i } );

                } ).
                each( function ( d ) {
                    this._current = {
                        startAngle: d.startAngle,
                        endAngle: d.startAngle,
                        value: 0
                    };
                } ).
                transition().
                duration( 800 ).
                attrTween( 'd', arcTween );


            donut.exit().
                each( function ( d ) {
                    d.startAngle = 2 * Math.PI - 0.001;
                    d.endAngle = 2 * Math.PI;
                } ).
                transition().
                duration( 800 ).
                attrTween( 'd', arcTween ).
                remove();


            donut.on( 'mouseover', tip.show ).
            on( 'mouseout', tip.hide );


            if ( scope.showLegend ) {

                legendFragment.selectAll( 'g.legend-label text' ).remove();
                legendFragment.selectAll( 'g.legend-label circle' ).remove();

                legendLabels = legendFragment.selectAll( 'g.legend-label' ).
                    data( scope.values );

                legendLabels.enter().
                    append( 'g' ).
                    attr( 'class', 'legend-label' ).
                    attr( 'transform', function ( d, i ) {
                        return 'translate(' + ( ( width / scope.values.length ) * i ) + ', 0)';
                    } );

                legendLabels.
                    attr( 'transform', function ( d, i ) {
                        return 'translate(' + ( ( width / scope.values.length ) * i ) + ', 0)';
                    } );

                legendLabels.exit().remove();


                legendLabels = legendFragment.selectAll( 'g.legend-label' );
                window.legendLabels = legendLabels;

                legendLabels.append( 'circle' ).
                        attr( 'cx', '8' ).
                        attr( 'cy', '8' ).
                        attr( 'r', '5' ).
                        attr( 'fill', function ( d, i ) {
                            return scope.segmentColor( { $val: d, $index: i } );

                        } );

                legendLabels.append( 'text' ).
                        attr( 'x', '17' ).
                        text( function ( d ) {
                            return d.label;
                        } ).
                        attr( 'y', function ( d, i ) {
                            var size = this.getComputedTextLength(),
                                offset = 30 + size;
                            if ( i === 0 ) {
                                labelOffset.push( offset );
                            } else {
                                labelOffset.push( labelOffset[ i - 1 ] + offset );
                            }

                            return 8;
                        } ).
                        attr( 'dy', 5 ).
                        attr( 'text-anchor', 'start' );

                legendLabels.attr( 'transform', function ( d, i ) {
                    if ( i === 0 ) {
                        return 'translate(0, 0)';
                    } else {
                        return 'translate(' + labelOffset[ i -  1 ] + ', 0)';
                    }
                } );

                legendRightExtent = labelOffset[ labelOffset.length - 1 ];

                legendFragment.
                    attr( 'transform', 'translate(' + ( ( width - legendRightExtent ) / 2 ) +
                    ',' + ( height - legendHeight ) + ')' );
            } else {
                legendLabels = legendFragment.selectAll( 'g.legend-label' ).
                    remove();
            }
        };

        postLink = function ( scope, element, attrs ) {

            var parent = $( element ).parent(),
                win = $( window ),
                svg, graphCanvas, donut, resizeWait, tip;

            scope.showLegend = !!attrs.showLegend;

            svg = d3.select( element[ 0 ] ).
                    attr( 'class', 'zs-donut' );

            tip = d3.tip().
                    attr( 'class', 'd3-tip' ).
                    html( function ( d ) {
                        return d.data.label + ': ' + d.data.value;
                    } );

            svg.call( tip );

            graphCanvas = svg.append( 'g' );

            donut = graphCanvas.append( 'g' )
                .attr( 'class', 'donut-fragment' );

            donut.append( 'text' ).
                attr( 'class', 'donut-title' ).
                attr( 'text-anchor', 'middle' );

            donut.append( 'text' ).
                attr( 'class', 'donut-subtitle' ).
                attr( 'text-anchor', 'middle' );

            graphCanvas.append( 'g' ).attr( 'class', 'legend-fragment' );

            if ( parent.is( ':visible' ) ) {
                renderChart( scope, element, svg, tip );
            }

            scope.$watch( function () {
                var isVisible = parent.is( ':visible' );
                return isVisible;
            }, function () {
                if ( parent.is( ':visible' ) ) {
                    renderChart( scope, element, svg, tip );
                }
            } );

            win.on( 'resize.donut_' + scope.$id, function () {
                var isVisible = parent.is( ':visible' );
                if ( resizeWait ) {
                    $timeout.cancel( resizeWait );
                }

                if ( !isVisible ) {
                    return;
                }
                resizeWait = $timeout( function () {
                    renderChart( scope, element, svg, tip );
                }, 500 );
            } );

            scope.$on( '$destroy', function () {
                win.off( 'resize.donut_' + scope.$id );
            } );

            scope.$watch( 'lastUpdate', function () {
                if ( parent.is( ':visible' ) ) {
                    renderChart( scope, element, svg, tip );
                }
            } );
        };

        return {
            templateNamespace: 'svg',
            template: '<svg></svg>',
            replace: true,
            restrict: 'E',
            scope: {
                percentage: '=?',
                segmentColor: '&',
                values: '=?',
                total: '=?',
                title: '@text',
                subtitle: '@',
                lastUpdate: '=?'
            },
            link: postLink
        };
    }
] );

'use strict';

/**
 *  @ngdoc directive
 *  @name zeus.viz.directive:zsMultiColumnGraph
 *  @restrict E
 *
 *  @description
 *  A directive for a time based area polt
 *
 *  @scope
 *
 *  @param {Array.<Array<number>>} values Samples. Each subarray contains contains samples
 *  from all series for a given `x` value
 *
 *  @param {function($pos)=} tickFormatterY Callback function that accepts
 *  `position` of a data point and returns string
 *
 *  @param {function($pos)=} tickFormatterX Callback function that accepts
 *  `position` of a data point and returns string
 *
 *  @param {number=} leftMargin Optional left margin for text. Defaults to `80`
 *  @param {Object=} lastUpdate Can be used to refresh the graph
 *  @param {string=} mode whether graph is stacked or grouped. Grouped by default
 *  @param {function($series)} colorGenerator returns a hex color value for
 *  a particular series index
 *
 *  @param {function($val,$pos,$series,$samples)} tooltipFormatter returns html.
 *  Accepts ($samples, $pos) for stacked and ($val,$series) for grouped
 *  @param {string=} labelAxisY Label for Y axis
 *  @param {number=} clampY Clamp Y max value
 *
 *  @example
 <example module="zeus.viz">
    <file name="index.html">
        <div ng-controller="myCtrl" style="height: 350px">
            <div class="alert alert-info pull-left">
                Current mode is <b>{{ activity.graphMode }}</b>
            </div>
            <button class="btn btn-info pull-right" ng-click="changeMode()">
                Toggle mode
            </button>

            <div style="height: 300px">
            <zs-multi-column-graph
                color-generator="activity.colors($series)"
                left-margin="150"
                last-update="lastUpdate"
                values="activity.samples"
                mode="{{ activity.graphMode }}"
                tooltip-formatter="activity.tooltips($samples,$pos,$series,$val)"
                tick-formatter-x="activity.xTickFormatter($pos)"
                tick-formatter-y="activity.yTickFormatter($val)">
            </zs-multi-column-graph>
            </div>
        </div>
    </file>
    <file name="myCtrl.js">
        angular.module( 'zeus.viz' ).controller( 'myCtrl',
        function ( $scope ) {

            var colors = [ '#ff5722', '#8bc34a', '#ffc107', '#03a9f4',
                '#e91e63', '#009688' , '#ff9800' ],

                labels = [ 'Create', 'Rename', 'Reads', 'Writes', 'Deletes', 'List', 'Open' ];

            $scope.changeMode = function () {
                if ( $scope.activity.graphMode === 'stack' ) {
                    $scope.activity.graphMode = 'group'
                } else {
                    $scope.activity.graphMode = 'stack'
                }
            };

            $scope.activity = {
                samples: [ [ Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000 ],
                            [ Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000 ],
                            [ Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000 ],
                            [ Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000 ],
                            [ Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000, Math.random() * 10000,
                            Math.random() * 10000 ] ],

                xTickFormatter: function ( pos ) {

                    return pos;
                },

                yTickFormatter: function ( val ) {
                    return val;
                },

                colors: function ( pos ) {
                    return colors[ pos ];
                },
                tooltips: function ( samples, pos, series, val ) {
                    var text = [],
                        i;

                    if ( !angular.isDefined( val ) ) {
                        for ( i = 0; i < samples.length; i++ ) {
                            text.push( labels[ i ] + ': ' + samples[ i ] );
                        }

                        return text.join( '<br/>' );
                    } else {
                        return labels[ series ] + ': ' + val;
                    }
                },

                graphMode: 'group',
                graphModeStack: 'stack'
            };

        } );
    </file>
 </example>
 **/
angular.module( 'zeus.viz' )
.directive( 'zsMultiColumnGraph', [ '$timeout', function ( $timeout ) {

        var concat = Array.prototype.concat, // Cache reference for fast access
            postLink, renderChart, makeStackedColmuns, makeGroupedColumns,
            wrapLabel,
            margin = { top: 20, right: 20, bottom: 30, left: 80 };

        wrapLabel = function ( text, width ) {
            text.each( function () {
            var text = d3.select( this ),
                words = text.text().trim().split( /\s+/ ).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr( 'y' ),
                dy = parseFloat( text.attr( 'dy' ) ),
                tspan = text.text( null ).append( 'tspan' ).
                        attr( 'x', 0 ).attr( 'y', y ).attr( 'dy', dy + 'em' );

                word = words.pop();
                while ( word ) {
                    line.push( word );
                    tspan.text( line.join( ' ' ) );
                    if ( tspan.node().getComputedTextLength() > width && line.length > 1 ) {
                        line.pop();
                        tspan.text( line.join( ' ' ) );
                        line = [ word ];
                        tspan = text.append( 'tspan' ).
                                attr( 'x', 0 ).
                                attr( 'y', y ).
                                attr( 'dy', ++lineNumber * lineHeight + dy + 'em' ).
                                text( word );
                    }
                    word = words.pop();
                }
            } );
        };

        makeGroupedColumns = function ( scope, x, y, height, bars ) {
            var seriesCount = 0;
            seriesCount = scope.values[ 0 ].length;

            bars.attr( 'class', 'bar' ).
                transition().
                duration( 800 ).
                attr( 'fill', function ( d ) {
                    return scope.colorGenerator( { $series: d.z } );
                } ).
                attr( 'y', function ( d ) {
                    return y( d.y );
                } ).
                attr( 'x', function ( d ) {
                    return x( d.x ) + x.rangeBand() / seriesCount * d.z;
                } ).
                attr( 'width', function () { return x.rangeBand() / seriesCount; } ).
                attr( 'height', function ( d ) {
                    return height - y( d.y );
                } ).
                attr( 'opacity', 0.9 );

            bars.enter().
                append( 'rect' ).
                attr( 'class', 'bar' ).
                attr( 'fill', function ( d ) {
                    return scope.colorGenerator( { $series: d.z } );
                } ).
                transition().
                duration( 800 ).
                attr( 'y', function ( d ) {
                    return y( d.y );
                } ).
                attr( 'x', function ( d ) {
                    return x( d.x ) + x.rangeBand() / seriesCount * d.z;
                } ).
                attr( 'width', function () { return x.rangeBand() / seriesCount; } ).
                attr( 'height', function ( d ) {
                    return height - y( d.y );
                } ).
                attr( 'opacity', 0.9 );

            bars.exit().
                transition().
                attr( 'height', function () { return 0; } ).
                remove();
        };

        makeStackedColmuns = function ( scope, x, y, bars ) {
            bars.attr( 'class', 'bar' ).
                transition().
                duration( 800 ).
                attr( 'fill', function ( d ) {
                    return scope.colorGenerator( { $series: d.z } );
                } ).
                attr( 'y', function ( d ) {
                    return y( d.y0 + d.y );
                } ).
                attr( 'x', function ( d ) { return x( d.x ); } ).
                attr( 'width', function () { return x.rangeBand(); } ).
                attr( 'height', function ( d ) {
                    return y( d.y0 ) - y( d.y0 + d.y );
                } ).
                attr( 'opacity', 0.9 );

            bars.enter().
                append( 'rect' ).
                attr( 'class', 'bar' ).
                transition().
                duration( 800 ).
                attr( 'fill', function ( d ) {
                    return scope.colorGenerator( { $series: d.z } );
                } ).
                attr( 'y', function ( d ) {
                    return y( d.y0 + d.y );
                } ).
                attr( 'x', function ( d ) { return x( d.x ); } ).
                attr( 'width', function () { return x.rangeBand(); } ).
                attr( 'height', function ( d ) {
                    return y( d.y0 ) - y( d.y0 + d.y );
                } ).
                attr( 'opacity', 0.9 );

            bars.exit().
                transition().
                attr( 'height', function () { return 0; } ).
                remove();
        };

        renderChart = function ( scope, element, tip ) {

            // Early exit
            if ( !scope.values || !scope.values.length ) {
                return;
            }

            var parentEl = element[ 0 ].parentElement,
                leftMargin = +scope.leftMargin || margin.left,
                width, height,
                svg, graphCanvas,
                transformedData = [],
                seriesCount = 0,
                barsData,
                bars, x, y, xAxis, yAxis, i, j, vArr, yMax;

            svg = d3.select( element[ 0 ] );
            graphCanvas = svg.select( 'g' );


            svg.attr( 'width', 0 ).
                attr( 'height', 0 );

            width = parentEl.clientWidth - leftMargin - margin.right;
            height = parentEl.clientHeight - margin.top - margin.bottom;

            svg.attr( 'width', width + leftMargin + margin.right ).
                attr( 'height', height + margin.top + margin.bottom );

            seriesCount = scope.values[ 0 ].length;
            for ( i = 0; i < seriesCount; i++ ) {
                transformedData.push( [] );

            }


            for ( i = 0; i < scope.values.length; i++ ) {
                vArr = scope.values[ i ];
                for ( j = 0; j < vArr.length; j++ ) {
                    transformedData[ j ].push( {
                        x: i,
                        y: vArr[ j ],
                        z: j,
                        y0: 0
                    } );
                }

            }


            x = d3.scale.ordinal().
                rangeRoundBands( [ 0, width ], 0.33 ).
                domain( d3.range( scope.values.length ) );

            y = d3.scale.linear().range( [ height, 0 ] );


            if ( scope.mode === 'stack' ) {

                barsData = concat.apply( [], d3.layout.stack()( transformedData ) );

            } else {

                barsData = concat.apply( [], transformedData );
            }

            if ( scope.clampY ) {
                y.clamp( true ).domain( [ 0, scope.clampY ] );

            } else {

                yMax = d3.max( barsData, function ( d ) { return d.y0 + d.y; } );
                y.domain( [ 0, yMax ] );
            }

            xAxis = d3.svg.axis().scale( x ).orient( 'bottom' ).
                    tickFormat( function ( d ) {
                        return scope.tickFormatterX( { $pos: d } );
                    } ).
                    innerTickSize( -height );

            yAxis = d3.svg.axis().
                    scale( y ).orient( 'left' ).
                    tickFormat( function ( d ) {
                        return scope.tickFormatterY( { $val: d } );
                    } ).
                    innerTickSize( -width ).
                    tickPadding( 10 );


            graphCanvas.attr( 'transform', 'translate(' + leftMargin + ',' + margin.top + ')' );

            graphCanvas.select( 'g.x-axis' ).
                attr( 'transform', 'translate(0,' + height + ')' ).
                transition().
                duration( 800 ).
                call( xAxis ).
            selectAll( '.tick text' ).
                call( wrapLabel, x.rangeBand() );


            graphCanvas.select( 'g.y-axis' ).
                transition().
                duration( 800 ).
                call( yAxis );

            if ( scope.labelAxisY && !scope.renderAxixLable ) {
                graphCanvas.select( 'g.y-axis' )
                    .append( 'text' )
                    .attr( 'transform', 'rotate(-90)' )
                    .attr( 'y', 6 )
                    .attr( 'dy', '.71em' )
                    .style( 'text-anchor', 'end' )
                    .text( scope.labelAxisY );
                scope.renderAxixLable = true;
            }

            bars = graphCanvas.select( 'g.chart-holder' ).
                    selectAll( 'rect' ).data( barsData );

            if ( scope.mode === 'stack' ) {
                makeStackedColmuns( scope, x, y, bars );
            } else {
                makeGroupedColumns( scope, x, y, height, bars );
            }

            bars.on( 'mouseover', function () {
                    tip.show.apply( this, arguments );
                    $( this ).attr( 'opacity', 1 );
                } ).
                on( 'mouseout', function () {
                        tip.hide.apply( this, arguments );
                        $( this ).attr( 'opacity', 0.9 );
                } );

        };

        postLink = function ( scope, element, attrs ) {

            var parent = $( element ).parent(),
                win = $( window ),
                svg, graphCanvas, resizeWait, tip;

            scope.leftMargin = attrs.leftMargin;
            scope.renderAxixLable = false;
            scope.clampY = +attrs.clampY;

            svg = d3.select( element[ 0 ] ).attr( 'class', 'multi-column-graph' );
            console.log( svg, element );
            tip = d3.tip().
                    attr( 'class', 'd3-tip' ).
                    offset( [ -10, 0 ] ).
                    html( function ( d ) {
                        if ( scope.mode === 'stack' ) {
                            return scope.tooltipFormatter( {
                                $pos: d.x,
                                $samples: scope.values[ d.x ]
                            } );
                        } else {
                            return scope.tooltipFormatter( {
                                $series: d.z,
                                $pos: d.x,
                                $val: d.y
                            } );
                        }
                    } );

            svg.call( tip );

            graphCanvas = svg.append( 'g' );

            graphCanvas.append( 'g' ).attr( 'class', 'axis x-axis' );
            graphCanvas.append( 'g' ).attr( 'class', 'axis y-axis' );
            graphCanvas.append( 'g' ).attr( 'class', 'chart-holder' );

            if ( parent.is( ':visible' ) ) {
                renderChart( scope, element, tip );
            }

            scope.$watch( function () {
                var isVisible = parent.is( ':visible' );
                return isVisible;
            }, function () {
                if ( parent.is( ':visible' ) ) {
                    renderChart( scope, element, tip );
                }
            } );

            win.on( 'resize.multi_column_' + scope.$id, function () {
                var isVisible = parent.is( ':visible' );
                if ( resizeWait ) {
                    $timeout.cancel( resizeWait );
                }

                if ( !isVisible ) {
                    return;
                }
                resizeWait = $timeout( function () {
                    renderChart( scope, element, tip );
                }, 500 );
            } );

            scope.$on( '$destroy', function () {
                win.off( 'resize.multi_column_' + scope.$id );
            } );

            scope.$watch( 'lastUpdate', function () {
                if ( parent.is( ':visible' ) ) {
                    renderChart( scope, element, tip );
                }
            } );

            scope.$watch( 'mode', function () {
                if ( parent.is( ':visible' ) ) {
                    renderChart( scope, element, tip );
                }
            } );
        };

        return {
            templateNamespace: 'svg',
            template: '<svg></svg>',
            replace: true,
            restrict: 'E',
            link: postLink,
            scope: {
                values: '=',
                tickFormatterX: '&',
                tickFormatterY: '&',
                lastUpdate: '=',
                colorGenerator: '&',
                tooltipFormatter: '&',
                mode: '@',
                labelAxisY: '@'
            }
        };

    }
] );

'use strict';

/**
 *  @ngdoc directive
 *  @name zeus.viz.directive:zsPunchCard
 *  @restrict E
 *
 *  @description
 *  A directive for a time based area polt
 *
 *  @scope
 *
 *  @param {Array.<number>} values Values as array of numbers
 *  @param {function($val,$pos)=} tickFormatterY Callback function that accepts
 *  `value` and `position` of a data point and returns string
 *  @param {string=} dateFormat Optional date format string
 *
 *  @example
 <example module="zeus.viz">
    <file name="index.html">
        <div ng-controller="myCtrl" style="height:400px;">
            <zs-punch-card punch-data="activityData"
                tick-formatter-y="tickFormatter($val)"
                tick-formatter-x="xTickFormatter($pos)"
                punch-color="punchColor($pos)"
                last-update="lastUpdate"
                tooltip-formatter="tooltips($val,$pos)">
            </zs-punch-card>
        </div>
    </file>
    <file name="myCtrl.js">
        angular.module( 'zeus.viz' ).controller( 'myCtrl',
        function ( $scope, $interval ) {

            var OPERATIONS = [ 'Reads', 'Writes', 'Delete', 'Create', 'List' ],
                stop;

            $scope.activityData = [
                {
                    samples: [
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                    ]
                },
                {
                    samples: [
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                    ]
                },
                {
                    samples: [
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                    ]
                },
                {
                    samples: [
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                    ]
                },
                {
                    samples: [
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                        Math.random(), Math.random(), Math.random(), Math.random(),
                    ]
                }
            ];
            $scope.tickFormatter = function ( v ) {
                return OPERATIONS[ v ];
            };

            $scope.punchColor = function ( pos ) {
                var colors = [ '#ff5722', '#8bc34a', '#ffc107', '#03a9f4', '#e91e63' ];

                return colors[ pos[ 0 ] ];
            };


            $scope.xTickFormatter = function ( v ) {
                return '' + v[ 1 ];
            };

            $scope.tooltips = function ( val, pos ) {
                return OPERATIONS[ pos[ 0 ] ]+ ': ' + val;
            };

            stop = $interval( function () {
                $scope.activityData = [
                    {
                        samples: [
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                        ]
                    },
                    {
                        samples: [
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                        ]
                    },
                    {
                        samples: [
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                        ]
                    },
                    {
                        samples: [
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                        ]
                    },
                    {
                        samples: [
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                            Math.random(), Math.random(), Math.random(), Math.random(),
                        ]
                    }
                ];
                $scope.lastUpdate = ( new Date() ).getTime();
            }, 4000 );

            $scope.$on( '$destroy', function () {
                $interval.cancel( stop );
            } );

        } );
    </file>
 </example>
 **/

angular.module( 'zeus.viz' )
.directive( 'zsPunchCard', [ '$timeout', function ( $timeout ) {
        var PADDING = 30,
            LEFT_PADDING = 85,
            BOTTOM_PADDING = 30,
            RIGHT_PADDING = 20,
            postLink, repaint;

        repaint = function ( scope, element, tip ) {

            // Early exit
            if ( !scope.punchData || !scope.punchData.length ) {
                return;
            }

            var parentEl = element[ 0 ].parentElement,
                width, height,
                svg,
                aggregateData = [],
                leftMargin = +scope.leftMargin || LEFT_PADDING,
                samplesLen = scope.punchData[ 0 ].samples.length,
                x, y, xAxis, yAxis, maxR, maxRadius, radiusFn, dots;

            svg = d3.select( element[ 0 ] );

            svg.attr( 'width', 0 ).attr( 'height', 0 );

            width = parentEl.clientWidth;
            height = parentEl.clientHeight;


            maxRadius = Math.min( ( width - PADDING -
                leftMargin - RIGHT_PADDING ) / samplesLen - 2, 12 );

            svg.attr( 'width', width ).
                attr( 'height', height );


            // massage data
            aggregateData = [];
            maxR = 0;
            angular.forEach( scope.punchData, function ( punches, pos ) {
                aggregateData = aggregateData.concat( punches.samples.map( function ( s, i ) {
                        if ( s > maxR ) {
                            maxR = s;
                        }
                        return {
                            punchPosition: [ pos, i ],
                            value: s
                        };

                } ) );

            } );

            x = d3.scale.linear().
                domain( [ 0, samplesLen - 1 ] ).
                rangeRound( [ leftMargin, width - PADDING - RIGHT_PADDING ] );

             xAxis = d3.svg.axis().scale( x ).
                orient( 'bottom' ).ticks( samplesLen ).
                tickFormat( function ( v, i ) {
                    var t = aggregateData[ i ].punchPosition;
                    return scope.tickFormatterX( { $pos: t } );

                } );

            y = d3.scale.ordinal().
                    domain( scope.punchData.map( function ( d, i ) {
                        return i;
                    } ) ).
                    rangePoints( [ PADDING, height - PADDING * 2 - BOTTOM_PADDING ], 0, 1 );

            yAxis = d3.svg.axis().scale( y ).
                orient( 'left' ).
                tickFormat( function ( i, v ) {
                    return scope.tickFormatterY( { $val: v, $pos: i } );
                } );

            svg.select( 'g.x-axis' )
                .attr( 'class', 'axis x-axis' )
                .attr( 'transform', 'translate(0, ' + ( height - PADDING - BOTTOM_PADDING ) + ')' )
                .call( xAxis );

            svg.select( 'g.y-axis' ).
                attr( 'transform', 'translate(' +
                    ( leftMargin - PADDING ) + ', -' + 0 + ')' ).
                call( yAxis );

            radiusFn = d3.scale.linear().
                    domain( [ 0, maxR ] ).
                    range( [ 0, maxRadius ] );


            dots = svg.selectAll( 'circle' ).data( aggregateData );

            dots.exit().
                transition().
                attr( 'r', function () { return '0'; } ).
                remove();

            dots.attr( 'class', 'punch-dot' ).
                transition().
                duration( 800 ).
                attr( 'cx', function ( d ) {
                    return x( d.punchPosition[ 1 ] );

                } ).
                attr( 'cy', function ( d ) {
                    return y( d.punchPosition[ 0 ] );
                } ).
                attr( 'fill', function ( d ) {
                    return scope.punchColor( { $pos: d.punchPosition } );
                } ).
                attr( 'r', function ( d ) {
                    var r = radiusFn( d.value );
                    return r;
                } );

            dots.enter().
                append( 'circle' ).
                attr( 'class', 'punch-dot' ).
                attr( 'cx', function ( d ) {
                    return x( d.punchPosition[ 1 ] );
                } ).
                attr( 'cy', function ( d ) {
                    return y( d.punchPosition[ 0 ] );
                } ).
                attr( 'fill', function ( d ) {
                    return scope.punchColor( { $pos: d.punchPosition } );
                } ).
                transition().
                duration( 800 ).
                attr( 'r', function ( d ) {
                    var r = radiusFn( d.value );
                    return r;
                } );


            dots.on( 'mouseover', tip.show )
                .on( 'mouseout', tip.hide );


        };

        postLink = function ( scope, element, attrs ) {

            var parent = $( element ).parent(),
                win = $( window ),
                resizeWait,
                svg, tip;

            scope.leftMargin = attrs.leftMargin;

            svg = d3.select( element[ 0 ] ).attr( 'class', 'punch-card' );

            svg.append( 'g' ).
                attr( 'class', 'axis y-axis' );

            svg.append( 'g' ).
                attr( 'class', 'axis x-axis' );

            tip = d3.tip().
                    attr( 'class', 'd3-tip' ).
                    offset( [ -10, 0 ] ).
                    html( function ( d ) {
                        return scope.tooltipFormatter( {
                            $val: d.value,
                            $pos: d.punchPosition
                        } );
                    } );


            svg.call( tip );

            if ( parent.is( ':visible' ) ) {
                repaint( scope, element, tip );
            }

            scope.$watch( function () {
                var isVisible = parent.is( ':visible' );
                return isVisible;
            }, function () {
                if ( parent.is( ':visible' ) ) {
                    repaint( scope, element, tip );
                }
            } );

            win.on( 'resize.punch_card_' + scope.$id, function () {
                var isVisible = parent.is( ':visible' );
                if ( resizeWait ) {
                    $timeout.cancel( resizeWait );
                }

                if ( !isVisible ) {
                    return;
                }
                resizeWait = $timeout( function () {
                    repaint( scope, element, tip );
                }, 500 );
            } );

            scope.$on( '$destroy', function () {
                win.off( 'resize.punch_card_' + scope.$id );
            } );

            scope.$watch( 'lastUpdate', function () {

                if ( parent.is( ':visible' ) ) {
                    repaint( scope, element, tip );
                }
            } );
        };

        return {
            templateNamespace: 'svg',
            template: '<svg></svg>',
            replace: true,
            restrict: 'E',
            link: postLink,
            scope: {
                punchData: '=',
                tickFormatterY: '&',
                tickFormatterX: '&',
                punchColor: '&',
                lastUpdate: '=',
                tooltipFormatter: '&'
            }
        };
    }
] );