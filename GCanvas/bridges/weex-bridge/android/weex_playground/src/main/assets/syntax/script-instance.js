/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/***/ function(module, exports, __webpack_require__) {

	var __weex_template__ = __webpack_require__(342)
	var __weex_style__ = __webpack_require__(343)
	var __weex_script__ = __webpack_require__(344)

	__weex_define__('@weex-component/e463d05fb45b7117577286bed2b723ab', [], function(__weex_require__, __weex_exports__, __weex_module__) {

	    __weex_script__(__weex_module__, __weex_exports__, __weex_require__)
	    if (__weex_exports__.__esModule && __weex_exports__.default) {
	      __weex_module__.exports = __weex_exports__.default
	    }

	    __weex_module__.exports.template = __weex_template__

	    __weex_module__.exports.style = __weex_style__

	})

	__weex_bootstrap__('@weex-component/e463d05fb45b7117577286bed2b723ab',undefined,undefined)

/***/ },

/***/ 342:
/***/ function(module, exports) {

	module.exports = {
	  "type": "div",
	  "children": [
	    {
	      "type": "text",
	      "id": "title",
	      "classList": [
	        "title"
	      ],
	      "attr": {
	        "value": "Please check out the source code."
	      }
	    }
	  ]
	}

/***/ },

/***/ 343:
/***/ function(module, exports) {

	module.exports = {
	  "title": {
	    "fontSize": 48
	  }
	}

/***/ },

/***/ 344:
/***/ function(module, exports) {

	module.exports = function(module, exports, __weex_require__){'use strict';

	module.exports = {
	  data: function () {return {
	    x: 1,
	    y: 2
	  }},
	  methods: {
	    foo: function foo() {
	      console.log('foo');
	    },
	    test: function test() {
	      console.log(this.x);

	      console.log(this.z);

	      this.foo();

	      console.log(this.$getConfig());

	      this.$emit('custom');
	      this.$dispatch('custom');
	      this.$broadcast('custom');
	      this.$on('custom', this.foo);
	      this.$off('custom', this.foo);
	    }
	  },
	  computed: {
	    z: function z() {
	      return this.x + this.y;
	    }
	  },
	  ready: function ready() {
	    this.test();
	  }
	};}
	/* generated by weex-loader */


/***/ }

/******/ });