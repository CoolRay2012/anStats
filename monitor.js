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

let connected = false;

let outrx_old = 0;
let outtx_old = 0;
let outtotal_old = 0;

let chartDataCPUTop = new realTimeChart.ChartData({
  //duration: 5000,
  //limit: 12,
  yMAX: 100, //max cputop for temp
  yAutoScale: true,
  graphid: "#graphtop",
  cntid: "cnt_loading",
  groups: {
    user : {
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    system : {
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    iow : {
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    irq : {
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    total : {
      textId: 'toptotal',
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    avg : {
      textId: 'toptotalavg',
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    //gpu is handled special!!!!
    gpu : {
      get: 'cat /sys/devices/soc/1c00000.qcom,kgsl-3d0/kgsl/kgsl-3d0/gpu_busy_percentage',
      scale: 1,
      textId: 'gputop',
      data: new Array(realTimeChart.LIMIT).fill(0)
    }
  }
});

let chartDataCPUFreq = new realTimeChart.ChartData({
  yMAX: 2000000,
  yAutoScale: true,
  graphid: "#graphfreq",
  cntid: "cnt_freq",
  groups: {
    cpufreq0 : {
      get: 'cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq',
      scale: 1,
      textId: 'cpufreq0',
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    cpufreq4 : {
      get: 'cat /sys/devices/system/cpu/cpu4/cpufreq/scaling_cur_freq',
      scale: 1,
      textId: 'cpufreq4',
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    gpufreq : {
      get: 'cat /sys/devices/soc/1c00000.qcom,kgsl-3d0/kgsl/kgsl-3d0/gpuclk',
      scale: 0.001,
      textId: 'gpufreq',
      data: new Array(realTimeChart.LIMIT).fill(0)
    }
  }
});

let chartDataTemp = new realTimeChart.ChartData({
  yMAX: 50,
  yMIN: 30,
  yAutoScale: true,
  graphid: "#graphtemp",
  cntid: "cnt_temp",
  groups: {
    batterytemp : {
      get: 'cat /sys/class/power_supply/battery/temp',
      scale: 0.1,
      textId: 'tempbatteryshow',
      data: new Array(realTimeChart.LIMIT).fill(20)
    },
    cpu0temp : {
      get: 'cat /sys/devices/virtual/thermal/thermal_zone12/temp',
      scale: 1,
      textId: 'tempcpu0show',
      data: new Array(realTimeChart.LIMIT).fill(20)
    },
    cpu4temp : {
      get: 'cat /sys/devices/virtual/thermal/thermal_zone16/temp',
      scale: 1,
      textId: 'tempcpu4show',
      data: new Array(realTimeChart.LIMIT).fill(20)
    },
    gputemp : {
      get: 'cat /sys/devices/virtual/thermal/thermal_zone17/temp',
      scale: 1,
      textId: 'tempgpushow',
      data: new Array(realTimeChart.LIMIT).fill(20)
    }
  }
});

let chartDataWlan = new realTimeChart.ChartData({
  yAutoScale: true,
  graphid: "#graphwlan",
  cntid: "cnt_wlan",
  groups: {
    wlanrx : {
      get: 'cat /sys/class/net/wlan0/statistics/rx_bytes',
      scale: 0.001,
      textId: 'speedwlanrxshow',
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    wlantx : {
      get: 'cat /sys/class/net/wlan0/statistics/tx_bytes',
      scale: 0.001,
      textId: 'speedwlantxshow',
      data: new Array(realTimeChart.LIMIT).fill(0)
    },
    wlantotal : {
      textId: 'speedwlantotalshow',
      data: new Array(realTimeChart.LIMIT).fill(0)
    }
  }
});

let  chartDataBKL = new realTimeChart.ChartData({
  yMAX: 255,
  yMIN: 0,
  yAutoScale: false,
  graphid: "#graphbkl",
  cntid: "cnt_bright",
  groups: {
    bkl : {
      get: 'cat /sys/class/leds/lcd-backlight/brightness',
      scale: 1,
      textId: 'bklshow',
      data: new Array(realTimeChart.LIMIT).fill(0)
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
    //ugly
    chartDataCPUTop.groups.user.data.push(Number(topFound[1]));
    chartDataCPUTop.groups.system.data.push(Number(topFound[2]));
    chartDataCPUTop.groups.iow.data.push(Number(topFound[3]));
    chartDataCPUTop.groups.irq.data.push(Number(topFound[4]));
    //total top
    var toptotal = Number(topFound[1])+
      Number(topFound[2])+
      Number(topFound[3])+
      Number(topFound[4]);
    document.getElementById(chartDataCPUTop.groups.total.textId).innerText = toptotal + '%';
    chartDataCPUTop.groups.total.data.push(toptotal);

    var avgToptotal = Math.ceil(chartDataCPUTop.groups.total.data.reduce(function(sum, a){
      return sum + a;
    }, 0) / (chartDataCPUTop.groups.total.data.length || 1));
    document.getElementById(chartDataCPUTop.groups.avg.textId).innerText = avgToptotal + '%';
    chartDataCPUTop.groups.avg.data.push(avgToptotal);

    //gpu top is handled special here
    var out = adbShellOnce(chartDataCPUTop.groups.gpu.get);
    out = out.match(/^(\d+)\s/);
    document.getElementById(chartDataCPUTop.groups.gpu.textId).innerText = out[1] + '%';
    chartDataCPUTop.groups.gpu.data.push(out[1]);

    //update chart
    realTimeChart.tick(chartDataCPUTop);

    document.getElementById(chartDataCPUTop.cntid).innerText = chartDataCPUTop.count++;

    monitorCycle();
  });
}

function monitorCycle(){
  //cycle monitor
  //setTimeout(monitorCycle, charts[1].duration);

  charts.forEach(function(chart, index, array) {
    for (var name in chart.groups) {
      var group = chart.groups[name];
      //update cpufreq, push to path
      var out = adbShellOnce(group.get);
      out = Math.ceil(out * group.scale);
      document.getElementById(group.textId).innerText = out;
      group.data.push(out);
    }
    //update chart
    realTimeChart.tick(chart);

    document.getElementById(chart.cntid).innerText = chart.count++;
  })

  //Wlan
  var speed = 0;

  var outrx = adbShellOnce(chartDataWlan.groups.wlanrx.get);
  outrx = Math.ceil(outrx * chartDataWlan.groups.wlanrx.scale);
  if(chartDataWlan.count !== 0) {//drop first read
    speed = outrx - outrx_old;
  }
  document.getElementById(chartDataWlan.groups.wlanrx.textId).innerText = speed;
  chartDataWlan.groups.wlanrx.data.push(speed);
  outrx_old = outrx;

  var outtx = adbShellOnce(chartDataWlan.groups.wlantx.get);
  outtx = Math.ceil(outtx * chartDataWlan.groups.wlantx.scale);
  if(chartDataWlan.count !== 0) {//drop first read
    speed = outtx - outtx_old;
  }
  document.getElementById(chartDataWlan.groups.wlantx.textId).innerText = speed;
  chartDataWlan.groups.wlantx.data.push(speed);
  outtx_old = outtx;

  var outtotal = outrx + outtx;
  if(chartDataWlan.count !== 0) {//drop first read
    speed = outtotal - outtotal_old;
  }
  document.getElementById(chartDataWlan.groups.wlantotal.textId).innerText = speed;
  chartDataWlan.groups.wlantotal.data.push(speed);
  outtotal_old = outtotal;

  //update chart
  realTimeChart.tick(chartDataWlan);
  document.getElementById(chartDataWlan.cntid).innerText = chartDataWlan.count++;
}

function monitor() {
  //topchart is special
  monitorCPUTop();

  //monitorCycle();
}

function initChart(){
  charts.forEach(function(chart, index, array) {
    realTimeChart.realTimeChart(chart);
    realTimeChart.tick(chart);
  })
  //topchart is special
  realTimeChart.realTimeChart(chartDataCPUTop);
  realTimeChart.tick(chartDataCPUTop);
  realTimeChart.realTimeChart(chartDataWlan);
  realTimeChart.tick(chartDataWlan);
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
    alert("Function limited on production build");
  }

  c = spawnSync('adb', ['devices']);
  d = c.stdout.toString().match(/(.+)\s+\bdevice\b/);
  if (!d) {
  //device offline, do nothing
    alert("Do device found");
    return;
  }

  c = spawnSync('adb', ['shell', 'cat /proc/cpuinfo']);
  d = c.stdout.toString().match(/Device\s+:\s(\b\w+\b)/);
  if (!d) {
  //device offline, do nothing
    alert("Do device name found");
    return;
  }
  //device online
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

  initChart();//todo: how to init chart in UI ready
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
