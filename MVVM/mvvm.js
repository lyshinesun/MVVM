function MVVM(options) {
	// this：MVVM的实例对象  vm
	// options：配置对象
    this.$options = options;
    //data：配置对象的数据
    var data = this._data = this.$options.data;
    //this的转绑
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    //keys返回的是对象中的所有可枚举属性
    Object.keys(data).forEach(function(key) {
        me._proxy(key);
    });

	//数据劫持
    observe(data, this);

	//指令解析
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

	//数据代理
    _proxy: function(key) {
    	//this的转绑  MVVM的实例对象  vm
        var me = this;
        
        //使用defineProperty为vm新增访问描述符（提供属性的数据源是data对象）
        Object.defineProperty(me, key, {
        	//修改了可配置权限
            configurable: false,
            //可枚举
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    }
};