/*todo improve:
*0."LIMIT" is ugly!!!
*1.chartData.group[].data.init improve, including LIMIT/temperature.data(y) init
*2.[done]icon
*/

/*todo function
*0.[done]avg value?
*1.brightness networkspeed current?
*2.dumpsys table
*3.parselog
*/

const { spawn, spawnSync, execFile } = require('child_process');
const d3 = require('d3');
const realTimeChart = require('./realtimechart');

let LIMIT = 30;
let connected = false;

let chartDataCPUFreq = new realTimeChart.ChartData({
    yMAX: 2000000,
    yAutoScale: true,
    graphid: "#graphfreq",
    groups: {
      cpufreq0 : {
        get: 'cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq',
        scale: 1,
        textId: 'cpufreq0',
        value: 0,
        color: 'orange',
        data: d3.range(LIMIT).map(function() {
          return 200;
        })
      },
      cpufreq4 : {
        get: 'cat /sys/devices/system/cpu/cpu4/cpufreq/scaling_cur_freq',
        scale: 1,
        textId: 'cpufreq4',
        value: 0,
        color: 'green',
        data: d3.range(LIMIT).map(function() {
          return 200;
        })
      },
      gpufreq : {
        get: 'cat /sys/devices/soc/1c00000.qcom,kgsl-3d0/kgsl/kgsl-3d0/gpuclk',
        scale: 0.001,
        textId: 'gpufreq',
        value: 0,
        color: 'blue',
        data: d3.range(LIMIT).map(function() {
          return 200;
        })
      }
    }
  });

let  chartDataCPUTop = new realTimeChart.ChartData({
    //duration: 5000,
    //limit: 12,
    yMAX: 100, //max cputop for temp
    yAutoScale: true,
    graphid: "#graphtop",
    groups: {
      user : {
        value: 0,
        color: 'blue',
        data: d3.range(LIMIT).map(function() {
          return 0;
        })
      },
      system : {
        value: 0,
        color: 'green',
        data: d3.range(LIMIT).map(function() {
          return 0;
        })
      },
      iow : {
        value: 0,
        color: 'yellow',
        data: d3.range(LIMIT).map(function() {
          return 0;
        })
      },
      irq : {
        value: 0,
        color: 'pink',
        data: d3.range(LIMIT).map(function() {
          return 0;
        })
      },
      total : {
        value: 0,
        color: 'red',
        data: d3.range(LIMIT).map(function() {
          return 0;
        })
      },
      avg : {
        value: 0,
        color: 'orange',
        data: d3.range(LIMIT).map(function() {
          return 0;
        })
      },
      //gpu is handled special!!!!
      gpu : {
        get: 'cat /sys/devices/soc/1c00000.qcom,kgsl-3d0/kgsl/kgsl-3d0/gpu_busy_percentage',
        scale: 1,
        textId: 'gputop',
        value: 0,
        color: 'gray',
        data: d3.range(LIMIT).map(function() {
          return 0;
        })
      }
    }
  });

let  chartDataTemp = new realTimeChart.ChartData({
    yMAX: 50,
    yMIN: 30,
    yAutoScale: true,
    graphid: "#graphtemp",
    groups: {
      batterytemp : {
        get: 'cat /sys/class/power_supply/battery/temp',
        scale: 1,
        scale: 0.1,
        textId: 'tempbatteryshow',
        value: 0,
        color: 'red',
        data: d3.range(LIMIT).map(function() {
          return 30; // equal to yMIN
        })
      },
      cpu0 : {
        get: 'cat /sys/devices/virtual/thermal/thermal_zone12/temp',
        scale: 1,
        textId: 'tempcpu0show',
        value: 0,
        color: 'green',
        data: d3.range(LIMIT).map(function() {
          return 30; // equal to yMIN
        })
      },
      cpu4 : {
        get: 'cat /sys/devices/virtual/thermal/thermal_zone16/temp',
        scale: 1,
        textId: 'tempcpu4show',
        value: 0,
        color: 'blue',
        data: d3.range(LIMIT).map(function() {
          return 30; // equal to yMIN
        })
      },
      gpu : {
        get: 'cat /sys/devices/virtual/thermal/thermal_zone17/temp',
        scale: 1,
        textId: 'tempgpushow',
        value: 0,
        color: 'orange',
        data: d3.range(LIMIT).map(function() {
          return 30; // equal to yMIN
        })
      }
    }
  });

let  chartDataBKL = new realTimeChart.ChartData({
  yMAX: 255,
  yMIN: 0,
  yAutoScale: false,
  graphid: "#graphbkl",
  groups: {
    bkl : {
      get: 'cat /sys/class/leds/lcd-backlight/brightness',
        scale: 1,
      textId: 'bklshow',
      value: 0,
      color: 'green',
      data: d3.range(LIMIT).map(function() {
        return 0; // equal to yMIN
      })
    }
  }
});

const charts = [
  chartDataCPUFreq,
  //chartDataCPUTop,
  chartDataTemp,
  chartDataBKL
]

function adbShellOnce(cmd) {
  const c = spawnSync('adb', ['shell', cmd]);
  return c.stdout.toString().trim();
}

function adbShellCon(cmd, outHandler) {
  //spawn is an EventEmmiter object which can be listend
  const c = spawn('adb', ['shell', cmd]);
  c.stdout.on('data', outHandler);
  c.stderr.on('data', function (data) {
    console.log('stderr: ' + data.toString());
  });
  c.on('exit', function (code) {
    console.log('child process exited with code ' + code.toString());
  });
}

function monitorCPUTop() {
  adbShellCon('top -m 5 -d 2', function(data) {
    //console.log('stdout: ' + data.toString());
    var stdout = data.toString().trim();
    document.getElementById('topshow').innerText = stdout;

    var topFound = stdout.match(/^User\s(\d+)%,\sSystem\s(\d+)%,\sIOW\s(\d+)%,\sIRQ\s(\d+)%/);
    //console.log(topFound);
    //console.log(topFound[1], topFound[2], topFound[3], topFound[4]);
    //push top
    chartDataCPUTop.groups.user.data.push(Number(topFound[1]));
    chartDataCPUTop.groups.system.data.push(Number(topFound[2]));
    chartDataCPUTop.groups.iow.data.push(Number(topFound[3]));
    chartDataCPUTop.groups.irq.data.push(Number(topFound[4]));
    //total top
    var toptotal = Number(topFound[1])+
      Number(topFound[2])+
      Number(topFound[3])+
      Number(topFound[4]);
    document.getElementById('toptotal').innerText = toptotal + '%';
    chartDataCPUTop.groups.total.data.push(toptotal);

    var avgToptotal = Math.ceil(chartDataCPUTop.groups.total.data.reduce(function(sum, a){
      return sum + a;
    }, 0) / (chartDataCPUTop.groups.total.data.length || 1));
    document.getElementById('toptotalavg').innerText = avgToptotal + '%';
    chartDataCPUTop.groups.avg.data.push(avgToptotal);

    //gpu top is handled special here
    var out = adbShellOnce(chartDataCPUTop.groups.gpu.get);
    out = out.match(/^(\d+)\s/);
    document.getElementById('gputop').innerText = out[1] + '%';
    chartDataCPUTop.groups.gpu.data.push(out[1]);

    for (var name in chartDataCPUTop.groups) {
      var group = chartDataCPUTop.groups[name];
      // Remove oldest data point from each group
      group.data.shift();
      group.path.attr('d', chartDataCPUTop.line);
    }
    //update chart
    realTimeChart.tick(chartDataCPUTop);
  });
}

function monitor() {
  function monitorCycle(){
    charts.forEach(function(chart, index, array) {
      for (var name in chart.groups) {
        var group = chart.groups[name];
        //update cpufreq, push to path
        var out = adbShellOnce(group.get);
        out = Math.ceil(out * group.scale);
        document.getElementById(group.textId).innerText = out;
        group.data.push(out);
        // Remove oldest data point from each group
        group.data.shift();
        group.path.attr('d', chart.line);
      }
      //update chart
      realTimeChart.tick(chart);
    })
    //cycle monitor
    setTimeout(monitorCycle, charts[1].duration);
  }
  monitorCycle();
  //topchart is special
  monitorCPUTop();
}

function initChart(){
  charts.forEach(function(item, index, array) {
    realTimeChart.realTimeChart(item);
  })
  //topchart is special
  realTimeChart.realTimeChart(chartDataCPUTop);
}

function connect(){
  if (connected === true) {
    alert ("Connected already!")
    return;
  }
  let c,d;
  c = spawnSync('adb', ['root']);
  d = c.stdout.toString().match(/adbd cannot run as root in production builds/);
  //if device offline, do nothing
  if (d) {
    alert("Function limiated on production build");
  }

  c = spawnSync('adb', ['devices']);
  d = c.stdout.toString().match(/(.+)\s+\bdevice\b/);
  if (!d) {
  //if device offline, do nothing
    alert("Do device found");
    return;
  }

  //if device online
  document.getElementById('btnConnectState').className = "btn btn-positive";
  document.getElementById('btnConnectState').innerHTML = d[1];
  //check charging state
  var out = adbShellOnce("cat /sys/class/power_supply/battery/charging_enabled")
  console.log(out)
  if (out === '1') {
    document.getElementById('btnCharging').className = "btn btn-negative";
    document.getElementById('btnCharging').innerHTML = "charging";
  } else {
    document.getElementById('btnCharging').className = "btn btn-positive";
    document.getElementById('btnCharging').innerHTML = "NOcharging";
  }

  initChart();
  monitor();
  connected = true;
}

function toggleCharging(){
  var out = adbShellOnce("cat /sys/class/power_supply/battery/charging_enabled")
  if (out === '1') {
    //make it discharging
    adbShellOnce("echo 0 > /sys/class/power_supply/battery/charging_enabled")
    document.getElementById('btnCharging').className = "btn btn-positive";
    document.getElementById('btnCharging').innerHTML = "NOcharging";
  } else {
    //make it charging
    adbShellOnce("echo 1 > /sys/class/power_supply/battery/charging_enabled")
    document.getElementById('btnCharging').className = "btn btn-negative";
    document.getElementById('btnCharging').innerHTML = "charging";
  }
}

module.exports = {
  initChart : initChart
}
