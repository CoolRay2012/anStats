const d3 = require('d3');

const LIMIT = 30;//ugly, todo

function ChartData(props) {
  this.count = props.count || 0;
  this.cntid = props.cntid || '';
  this.limit = props.limit || LIMIT;
  this.duration = props.duration || 2000;//not only the update freqency, but both the monitor freqency
  this.now = function(){return new Date(Date.now() - this.duration)};
  this.margin = props.margin || {
    top: 10,
    right: 0,
    bottom: 15,
    left: 50
  };
  this.width = props.width || (850 - this.margin.left - this.margin.right);
  this.height = props.height || (150 - this.margin.top - this.margin.bottom);
  this.yMAX = props.yMAX || 2000000;
  this.yMIN = props.yMIN || 0;
  this.yAutoScale = props.yAutoScale || true;
  this.graphid = props.graphid || null;
  this.groups = props.groups || null;
}

function realTimeChart(chartData) {
  //function makeXGrid() {
    //return d3.svg.axis()
    //.scale(chartData.xScale)
    //.orient("bottom")
    //.ticks(5)
  //}

  function makeYGrid() {
    return d3.svg.axis()
    .scale(chartData.yScale)
    .orient("left")
    .ticks(10)
  }

  chartData.xScale = d3.time.scale().domain([chartData.now()-(chartData.limit-2), chartData.now()-chartData.duration]).range([0, chartData.width]);
  chartData.yScale = d3.scale.linear().domain([chartData.yMIN, chartData.yMAX]).range([chartData.height, 0]);

  chartData.line = d3.svg.line()
  //.interpolate('basis')
  .interpolate('monotone')
  .x(function(d, i) {
    return chartData.xScale(chartData.now() - (chartData.limit - 1 -i) * chartData.duration);
  })
  .y(function(d) {
    return chartData.yScale(d);
  });
  chartData.svg = d3.select(chartData.graphid).append('svg')
  .attr('class', 'chart')
  .attr('width', chartData.width + chartData.margin.left + chartData.margin.right)
  .attr('height', chartData.height + chartData.margin.top + chartData.margin.bottom)
  .append("g")
  .attr("transform", "translate(" + chartData.margin.left + "," + chartData.margin.top + ")");
  chartData.xAxis = d3.svg.axis().scale(chartData.xScale).orient('bottom').ticks(10);
  chartData.yAxis = d3.svg.axis().scale(chartData.yScale).orient('left').ticks(10);
  chartData.axis = chartData.svg.append('g')
  .attr('class', 'x axis')
  .attr('transform', 'translate(0,' + chartData.height + ')')
  .call(chartData.xAxis);
  chartData.yxis = chartData.svg.append('g')
  .attr('class', 'y axis')
  //.attr('transform', 'translate(' + chartData.margin.left + ',' + '0)')
  .call(chartData.yAxis);
  chartData.paths = chartData.svg.append('g');

  //grid
  //chartData.svg.append("g")
  //.attr("class", "grid")
  //.attr("transform", "translate(0," + chartData.height + ")")
  //.call(makeXGrid()
  //.tickSize(-chartData.height, 0, 0)
  //.tickFormat("")
  //);
  chartData.svg.append("g")
          .attr("class", "grid")
          .call(makeYGrid()
          .tickSize(-chartData.width, 0, 0)
          .tickFormat("")
                );

  for (var name in chartData.groups) {
    var group = chartData.groups[name];
    group.path = chartData.paths.append('path')
    .data([group.data])
    .attr('class', name + ' group')
    .style('stroke', group.color);
  }
}

function tick(chartData) {
  // Shift X domain
  now = new Date()
  //chartData.xScale.domain([now - (chartData.limit - 2) * chartData.duration, now - chartData.duration])
  chartData.xScale.domain([now - (chartData.limit - 1) * chartData.duration, now])
  // Slide x-axis left
  chartData.axis.transition()
  .duration(chartData.duration)
  .ease('linear')
  .call(chartData.xAxis)

  //if(chartData.yAutoScale === true) {
    //shift Y domain
    var adMax = [];
    var adMin = [];
    for (var name in chartData.groups) {
      var group = chartData.groups[name];
      var dataMax = Math.max(...group.data);// The new spread operator is a shorter way of writing the *apply* solution to get the maximum of an array
      var dataMin = Math.min(...group.data);
      adMax.push(dataMax);
      adMin.push(dataMin);
    }
    chartData.yScale.domain([Math.min(...adMin), Math.max(...adMax)]);
    //chartData.yScale.domain([chartData.yMIN, Math.max(...adMax)]);
    // Slide y-axis left
    chartData.yxis.transition()
    .duration(chartData.duration)
    .ease('linear')
    .call(chartData.yAxis)
  //}

  // Slide paths left
  chartData.paths.attr('transform', null)
  .transition()
  .duration(chartData.duration)
  .ease('linear')
  .attr('transform', 'translate(' + chartData.xScale(now - (chartData.limit - 1) * chartData.duration) + ')')
  //.each('end', tick)
}

module.exports = {
  ChartData: ChartData,
  realTimeChart: realTimeChart,
  tick: tick,
  LIMIT: LIMIT
}
