//data:配置对象中的data数据
function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var me = this;
        Object.keys(data).forEach(function(key) {
        	//配置对象中的data数据里的每一个可枚举属性都会调用convert（数据劫持）
            me.convert(key, data[key]);
        });
    },
//  key:data数据中的属性名
//  val:对应得属性值
    convert: function(key, val) {
    	//数据劫持开始
        this.defineReactive(this.data, key, val);
    },

//  data:配置对象中的data数据
//  key:data数据中的属性名
//  val:对应得属性值
    defineReactive: function(data, key, val) {
    	//data中每一个可枚举属性都有一个dep，dep是一个defineReactive闭包管理的数据
        var dep = new Dep();
        //劫持更深层次的属性  递归！！
        var childObj = observe(val);

		//真正的来做劫持   重定义
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                if (Dep.target) {
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

//	value:data数据
//	vm:MVVM实例对象
function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    //dep中对应得watcher
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};


//watcher 观察者
Dep.target = null;