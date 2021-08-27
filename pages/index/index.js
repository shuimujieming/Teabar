const app = getApp()

Page({
  data:{
    _deviceId:'',
    _serviceId:'',
    _characteristicId:'',
    _isConnected:false,
    _isOpenbluetooth:false,
    sendMsg: 'ming',
    receivedMsg:'温度'

  },

  onHide: function () {
    console.log('onHide');
    let that = this;
    wx.offBluetoothDeviceFound();
    that.closeBLEConnection();
  },
  onUnload: function () {
    console.log('onUnload');
    wx.closeBluetoothAdapter();
  },
  onLoad() {
    console.log('onLoad');
  },
  onShow() {
    console.log('onShow');
    // let that = this;
    // that.initBLE();
  },

  onReady(){
    console.log('onReady');

    let that = this;
    that.initBLE();
  },
  /**
   * 初始化蓝牙设备
   */
  initBLE() {
    let that = this;
    // 连接前先断开上一次的连接
    // that.closeBLEConnection();
    // 打开蓝牙适配器
    wx.openBluetoothAdapter({
      // 打开蓝牙适配器成功
      success(res) {
        console.log('打开蓝牙适配器成功');
        that.setData({
          _isOpenbluetooth : true
        })
        that.onBluetoothDeviceFound();
        that.startBluetoothDevicesDiscovery();
      },
      // 打开蓝牙适配器失败
      fail(res) {
        console.log('打开蓝牙适配器失败',res);
        that.setData({
          _isOpenbluetooth : false
        })
        if(res.errCode == 10001)
        {
          wx.showToast({
            title: '请打开蓝牙',
            duration:1000,
            icon:'none'
          });
        }
        //监听蓝牙适配器状态变化事件
        wx.onBluetoothAdapterStateChange(function (res) {
          console.log('蓝牙适配器状态更改结果:  ', res)
          if (res.available) {
            console.log('蓝牙可用，搜索设备:--》 ')
            that.onBluetoothDeviceFound();
            that.startBluetoothDevicesDiscovery();
          }
        })

      }
    })

  },
    /**
   * 发现蓝牙设备
   */
  onBluetoothDeviceFound(){
    let that = this;
    wx.onBluetoothDeviceFound(function(res) {

      console.log('监听蓝牙设备事件');

      //监听到的蓝牙设备
      var devices = res.devices;
      
      devices.forEach(device=>{
        // 判断是否未未知设备
        if(!device.name && !device.localName)
        {
          //判断是否过滤未知设备
          if(false)//不过滤未知设备
          {
            return;
          }
          device.name = '未知设备';
        }
        let deviceName = device.name.toUpperCase();
        console.log('find device ' + deviceName);
        that.createBLEConnection(device.deviceId);

        console.log(device)
      });


      });

  },
    /**
   * 创建BLE连接
   */
  createBLEConnection(deviceId){
    let that = this;

    wx.createBLEConnection({
      deviceId: deviceId,
      success(res){
        // 获取蓝牙设备服务
        wx.getBLEDeviceServices({
          deviceId: deviceId,
          success(res){
            let services = res.services;
            for(let i =0;i<services.length;i++)
            {
              let uuid = services[i].uuid.toUpperCase();
              let serviceUUID = services[i];
              
              //查找主UUID，以及是否为主服务
              if((uuid.indexOf('0000FFF0')!=-1) && (services[i].isPrimary))
              { 
                let serviceId = uuid;
                // 获取蓝牙设备特征
                wx.getBLEDeviceCharacteristics({
                  deviceId: deviceId,
                  serviceId: serviceId,
                  success(res){

                    let characteristics = res.characteristics;

                    // 查找WRITE READ NOTIFY特征UUID
                    for(let i=0;i<characteristics.length;i++)
                    {
                      let uuid = characteristics[i].uuid.toUpperCase();

                      console.log('特征码 ',uuid,uuid.indexOf('0000FFF1')!=-1);

                      //查找到WRITE特征UUID
                      if(uuid.indexOf('0000FFF1')!=-1)
                      {
                        let obj = {
                          characteristicsUUID:characteristics[i],
                          deviceId:deviceId,
                          serviceUUID:serviceUUID,
                        }
                        //该特征支持WRITE
                        if(characteristics[i].properties.write)
                        {
                          console.log('find write ' + characteristics[i].uuid);
                          that.setData({
                            _deviceId:deviceId,
                            _serviceId:serviceId,
                            _characteristicId:characteristics[i].uuid,
                            _isConnected :true
                          })
                        }
                        if(characteristics[i].properties.notify)
                        {
                          wx.notifyBLECharacteristicValueChange({
                            characteristicId: characteristics[i].uuid,
                            deviceId: deviceId,
                            serviceId: serviceId,
                            state: true,
                            success (res) {
                              console.log('notifyBLECharacteristicValueChange success', res.errMsg)
                              }
                          })
                        }

                        wx.showToast({
                          title: '设备连接成功',
                          icon:'none',
                          duration:1000
                        });

                        return;
                      }
                    }

                  }
                  ,
                  fail(res){
                    console.log('getBLEDeviceCharacteristics fail'+res);
                  }
                })

              }


            }
            
          },
          fail(res){
            console.log(res);
          }
        });


        wx.onBLECharacteristicValueChange((res) => {
          console.log(`characteristic ${res.characteristicId} has changed`)
          let recint = that.hex2int(that.ab2hex(res.value)) ;
          
          //存储接收到的数据
          that.setData({
            receivedMsg:recint.toString()
          });

        });

      },

      fail(res){
        console.log('createBLEConnection fail' + res);      
        wx.hideLoading({
          success: (res) => {},
        });
        wx.showToast({
          title: '连接失败'+ res,
          icon:'none',
          duration:1000
        })
        return; 
      }
    })
  },
    /**
   * 开始搜索蓝牙设备
   */
  startBluetoothDevicesDiscovery(){
    console.log('开启蓝牙设备查找');

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success(res){
        console.log('启动蓝牙搜索，结果：',res);

      },fail(res){
        console.log('启动蓝牙搜索失败');
      }
    });

  },
  /**
   * 停止搜寻附近的蓝牙外围设备。
   */
  stopBluetoothDevicesDiscovery() {
    wx.stopBluetoothDevicesDiscovery();
  },
  /**
   * 关闭BLE连接
   */
  closeBLEConnection() {
    let that = this;
    that.stopBluetoothDevicesDiscovery();
    console.log('断开与低功耗蓝牙设备的连接。');
  },
  /**
   *  匹配规则: 取名称后面的mac地址
   *  mac地址: 假设C7:E2:90:17:1A:40
   * 	len: 截取长度为
   */
  getNameMac: function (macAddress, len, name) {
    let clearColonMac = this.clearSymbol(macAddress);
    let lastFourMac = clearColonMac.substring(clearColonMac.length - len);
    let strName = name.toUpperCase();
    strName = strName + lastFourMac.toUpperCase(); //转大写
    console.log('拼接后的' + strName); //abc_171A40
    return strName
  },
  /**
   * 去掉 冒号
   */
  clearSymbol: function (str) {
    str = str.replace(/:/g, ""); //取消字符串中出现的所有冒号
    return str;
  },

  /**
   * arrayBuffer转16进度字符串
   */
  ab2hex: function (buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  }
,
hex2int(hex) {
      var len = hex.length, a = new Array(len), code;
      for (var i = 0; i < len; i++) {
          code = hex.charCodeAt(i);
          if (48<=code && code < 58) {
              code -= 48;
          } else {
              code = (code & 0xdf) - 65 + 10;
          }
          a[i] = code;
      }
      
      return a.reduce(function(acc, c) {
          acc = 16 * acc + c;
          return acc;
      }, 0);
  },
sendData(hex){

  let that = this;
  //未连接上
  if(!that.data._isOpenbluetooth)
  {
    wx.showToast({
      title: '请打开蓝牙',
      icon:'none',
      duration:2000
    });   
    setTimeout(() => {
      wx.hideLoading({
        success: (res) => {},
      })
    }, 1000);
  }
  else if(!(that.data._isConnected))
  {
    wx.showToast({
      title: '当前未连接上设备',
      icon:'none',
      duration:2000
    });
    setTimeout(() => {
      wx.hideLoading({
        success: (res) => {},
      })
    }, 1000);
  }
  else
  {
    this.setData({
      sendMsg:hex
    });


    let senddata = that.data.sendMsg;

      senddata = senddata.toLocaleUpperCase();
      console.log('senddata',senddata);

      try{
        var typedArray = new Uint8Array(senddata.match(/[\da-f]{2}/gi).map(function (h) {
          return parseInt(h, 16)
        }))
     
    
        wx.writeBLECharacteristicValue({
          // 这里的 deviceId 需要在 getBluetoothDevices 或 onBluetoothDeviceFound 接口中获取
          deviceId: that.data._deviceId,
          // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
          serviceId: that.data._serviceId,
          // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
          characteristicId: that.data._characteristicId,
          // 这里的value是ArrayBuffer类型
          value: typedArray.buffer,
          success(res) {
            console.log('writeBLECharacteristicValue success', res.errMsg)
            wx.showToast({
              title: '已发送',
              icon: 'none',
              duration: 1000
            })
          },
          fail(res) {
            wx.showToast({
              title: '发送失败',
              icon: 'none',
              duration: 1000
            })
          }
        })
      }catch(error){
        wx.showToast({
          title: '请输入16进制字符串:EE',
          icon: 'none',
          duration: 1000
        })

      }
      return;
  }
}
,
dianyuan(){
 let that = this;
  that.sendData('0B');
}
,qulengshui(){
  let that = this;
 
  that.sendData('81');
},
jiare(){
  let that = this;
 
  that.sendData('C3');
},
tiaowen(){
  let that = this;
 
  that.sendData('41');
},
baowen(){
  let that = this;
 
  that.sendData('11');
},
qushui(){
  let that = this;
 
  that.sendData('21');
},
temperature(){
  let that = this;
  console.log(that.data._isConnected + that.data._deviceId + that.data._serviceId + that.data._characteristicId);
}
})