//el：选择器   vm：MVVM的实例对象
function Compile(el, vm) {
	//this：Compile的实例对象
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

	//除非el选择器能选中元素  或者 你传的本来技术dom对象 这时才进if判断
    if (this.$el) {
    	//把$el掏空  $fragment装满  性能极高，最大限度的减少了重绘重排
        this.$fragment = this.node2Fragment(this.$el);
        this.init();
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
	//将el所对应的节点中所有子节点全部移到文档碎片中去
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        var childNodes = el.childNodes,
            me = this;

        [].slice.call(childNodes).forEach(function(node) {
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/;

            if (me.isElementNode(node)) {
                me.compile(node);

            } else if (me.isTextNode(node) && reg.test(text)) {
                me.compileText(node, RegExp.$1);
            }

            if (node.childNodes && node.childNodes.length) {
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;

        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            if (me.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                // 事件指令
                if (me.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                // 普通指令
                } else {
                	/*
	                	node:每一个子节点
	                	me.$vm:MVVM的实例对象
	                	exp:指令值
	                	
	                	compileUtil.text（node, me.$vm, exp）
                	*/
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

//	{{}}解析函数
    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

	//双向绑定
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

		//view - model
        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

	/*
		node:每一个子节点
		vm:MVVM实例对象
		exp:指令值
		dir:指令的简写形式(没有v-)
		
		普通指令肯定会来调用bind方法，事件指令不会
	*/
    bind: function(node, vm, exp, dir) {
    	//updater.textUpdater
        var updaterFn = updater[dir + 'Updater'];

        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

		//每一个普通指令都有一个Watcher对象
		//每一个劫持属性都有一个Dep对象
		/*
			vm:MVVM的实例对象
			exp:指令值
			回调函数
			
			指令的解析最后一步，构造watcher和dep的关系
		*/
        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
	/*
		node:子节点
	    vm:MVVM实例对象
	    exp:指令值
	    dir:简写指令(没有v-)
    */
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
        	//dom2
        	//采用了硬绑定  修改了fn中this的指向vm  并且返回了一个函数
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

	//去拿指令值在data中所对应的数据
    _getVMVal: function(vm, exp) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

	//
    _setVMVal: function(vm, exp, value) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

//更新器
var updater = {
	/*
		node:子节点
		value:对应节点的指令所对应得数据
	*/
	//v-text  {{}}
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

	//v-html
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

	//v-class
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },
	
	//v-model
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};