var _ = require('lodash');
var wxUtil = require('./wxutil');
var crypto = require("crypto");
var request = require('request');
var fs = require('fs');
var cert;//微信支付商户证书cert
var key;//微信支付商户证书key
var appid;//商户公众号appid
var appsecret;//商户公众号appsecret
var state;//服务模式，normal普通商户，server服务商，默认为普通商户
var mch_id;//微信商户号

var wxconfig = {
	unifiedorder_url : 'https://api.mch.weixin.qq.com/pay/unifiedorder',//微信统一下单接口
	orderquery_url : 'https://api.mch.weixin.qq.com/pay/orderquery',//微信订单查询
	closeorder_url : 'https://api.mch.weixin.qq.com/pay/closeorder',//微信订单关闭
	micropay_url : 'https://api.mch.weixin.qq.com/pay/micropay',//微信扫码支付接口（扫码枪）
	reverse_url : 'https://api.mch.weixin.qq.com/secapi/pay/reverse',//微信订单撤销
	refund_url : 'https://api.mch.weixin.qq.com/secapi/pay/refund',//微信订单撤销
	lastTime : 30,//微信请求超时时间，单位为秒，用于扫码支付
	onlineLastTime : 360//微信请求超时时间，单位为秒，用于h5公众号线上统一下单支付

};

var promise = new Promise((resolve,reject) => {
	resolve();
})
//时间格式化
var dealDate=function (date,value){
    var date=new Date(date);
    var year=date.getFullYear();
    var month=(date.getMonth()+1)>9?(date.getMonth()+1):'0'+(date.getMonth()+1);
    var day=date.getDate()>9?date.getDate():'0'+date.getDate();
    var hour = date.getHours() > 9 ? date.getHours() : '0' + date.getHours();
    var minute = date.getMinutes() > 9 ? date.getMinutes() : '0' + date.getMinutes();
    var second = date.getSeconds() > 9 ? date.getSeconds() : '0' + date.getSeconds();

    switch (value) {
        case 'hour':
            return year + month + day + hour;
            break;
        case 'min':
            return year + month + day + hour + minute;
            break;
        case 'second':
            return year + month + day + hour + minute + second;
            break;
        case 'month':
            return year + month;
            break;
        case 'chinaese':
            return year + '年' + month + '月' + day + '日';
            break;
        default:
            return year + month + day;
            break;
    };
};


//微信扫码（扫码枪）支付，获取结果
var doMicropay = function(micropay){
	var options = {
		url:wxconfig.micropay_url,
		method:"post",
		headers:{"Content-Type":"application/xml"},
		body:wxUtil.xmlHelper.parseToXML(micropay,"xml")
	};
	return new Promise(function(resolve,reject){
		request(options,function(error, response, body){
			if(error){
				return reject(error);
			}
			resolve(body);
		});
	});
}

//微信统一下单执行，获取结果
var getPrepay_id = function(unifiedorder){
	var options = {
		url:wxconfig.unifiedorder_url,
		method:"post",
		headers:{"Content-Type":"application/xml"},
		body:wxUtil.xmlHelper.parseToXML(unifiedorder,"xml")
	};
	return new Promise(function(resolve,reject){
		request(options,function(error, response, body){
			if(error){
				return reject(error);
			}
			resolve(body);
		});
	});
}

/**
 * 条码支付
 * @author penguinhj
 * @DateTime 2019-09-25T14:29:47+0800
 * @param    {[String]}                 body [商品描述]
 * @param    {[String]}                 out_trade_no [商户系统内部订单号]
 * @param    {[Number]}                 total_fee [订单总金额，单位为分]
 * @param    {[String]}                 spbill_create_ip [终端IP,APP和网页支付提交用户端ip]
 * @param    {[String]}                 auth_code [授权码]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var micropay = function(opt){

	var params = {
		appid:appid,//公众账号ID
		mch_id:mch_id,//默认先使用商户号
		nonce_str:wxUtil.randomString(20),//随机字符串
		body:opt.body,//商品描述
		out_trade_no:opt.out_trade_no,//商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一（订单_id）
		total_fee:opt.total_fee,//订单总金额，单位为分
		spbill_create_ip:opt.spbill_create_ip,//终端IP,APP和网页支付提交用户端ip
		auth_code:opt.auth_code//授权码
	}

	//如果是服务商模式检查参数sub_mch_id，
	if(state == "server"){
		if(!opt.sub_mch_id){
			return promise
			.then(() => {
				throw "sub_mch_id absent. 缺少子商户号"
			});
		}
		params.sub_mch_id = opt.sub_mch_id;
	}

	params.sign = wxUtil.objMd5UpperCase(params,appsecret);
	
	return doMicropay(params)
	.then(function(params){
		var obj = wxUtil.xmlStringToJson(params);
		return obj;
	})
}

/**
 * 发起微信统一下单，返回下单结果
 * @author penguinhj
 * @DateTime 2019-09-25T15:04:09+0800
 * @param    {[String]}                 body [商品描述]
 * @param    {[String]}                 out_trade_no [商户系统内部订单号]
 * @param    {[Number]}                 total_fee [订单总金额，单位为分]
 * @param    {[String]}                 spbill_create_ip [终端IP,APP和网页支付提交用户端ip]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 * @param    {[String]}                 notify_url [通知地址]
 * @param    {[String]}                 trade_type [交易类型，公众号小程序支付为JSAPI,网页支付为MWEB，NATIVE支付，APP支付，默认JSAPI]
 * @param    {[String]}                 time_expire [过期时间，微信要求间隔在1分钟以上]
 * @param    {[String]}                 openid [用户openid，trade_type为JSAPI需要]
 */
var precreate = function(opt){
	//商户，发起预支付参数
	var params = {
		appid:appid,//公众账号ID
		mch_id:mch_id,//商户号
		device_info:"web",//设备号
		nonce_str:wxUtil.randomString(20),//随机字符串
		sign_type:"MD5",//签名类型
		body:opt.body,//商品描述
		out_trade_no:opt.out_trade_no,//商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一（订单_id）
		total_fee:opt.total_fee,//订单总金额，单位为分
		spbill_create_ip:opt.spbill_create_ip,//终端IP,APP和网页支付提交用户端ip
		trade_type:opt.trade_type?opt.trade_type:"JSAPI",//交易类型，公众号小程序支付为JSAPI,网页支付为MWEB，默认JSAPI
		time_expire:dealDate(opt.time_expire,'second'),
		notify_url:opt.notify_url
	}

	if(params.trade_type == "JSAPI"){
		if(state == "server"){
			params.sub_openid = opt.openid;
		}else{
			params.openid = opt.openid
		}
	}

	//如果是服务商模式检查参数sub_mch_id，
	if(state == "server"){
		if(!opt.sub_mch_id){
			return promise
			.then(() => {
				throw "sub_mch_id absent. 缺少子商户号"
			});
		}
		params.sub_mch_id = opt.sub_mch_id;
	}

	// //如果是h5支付，增加参数,文档显示需要，实际测试可以不传
	// if(opt.trade_type == "MWEB"){
	// 	delete params.device_info;
	// 	var scene_info = {
	// 		"h5_info": {
	// 			"type": "Wap",  //场景类型
	// 	   		"wap_url": "http://testfield.hulasports.com",//WAP网站URL地址
	// 	    	"wap_name": "场馆消费"  //WAP 网站名
	// 	    }//h5支付固定传"h5_info" 
	// 	};
	// 	// params.scene_info = JSON.stringify(scene_info);

	// }

	params.sign = wxUtil.objMd5UpperCase(params,appsecret);
	
	return getPrepay_id(params)
	.then(function(params){
		var obj = wxUtil.xmlStringToJson(params);
		return obj;
	})
}

/**
 * 订单查询
 * @author penguinhj
 * @DateTime 2019-09-25T16:07:32+0800
 * @param    {[String]}                 out_trade_no    [商户系统内部订单号]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var query = function(opt){
	var params={
		appid:appid,//公众账号ID
		mch_id:mch_id,//商户号
		out_trade_no:opt.out_trade_no,//商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一（订单_id）
		nonce_str:wxUtil.randomString(20),//随机字符串
		sign_type:"MD5"//签名类型
	};

	//如果是服务商模式检查参数sub_mch_id，
	if(state == "server"){
		if(!opt.sub_mch_id){
			return promise
			.then(() => {
				throw "sub_mch_id absent. 缺少子商户号"
			});
		}
		params.sub_mch_id = opt.sub_mch_id;
	}

	params.sign = wxUtil.objMd5UpperCase(params,appsecret);
	// console.log(params);

	var options = {
		url:wxconfig.orderquery_url,
		method:"post",
		headers:{"Content-Type":"application/xml"},
		body:wxUtil.xmlHelper.parseToXML(params,"xml")
	};

	return new Promise(function(resolve,reject){
		request(options,function(error, response, preporder){
			if(error){
				return reject(error);
			}

			preporder=wxUtil.xmlStringToJson(preporder);
			console.log(preporder);
			resolve(preporder.trade_state);

		});
	})
}

/**
 * 订单关闭
 * @author penguinhj
 * @DateTime 2019-09-25T16:07:32+0800
 * @param    {[String]}                 out_trade_no    [商户系统内部订单号]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var close = function(opt){

	var params={
		appid:appid,//公众账号ID
		mch_id:mch_id,//商户号
		out_trade_no:opt.out_trade_no,//商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一（订单_id）
		nonce_str:wxUtil.randomString(20),//随机字符串
		sign_type:"MD5"//签名类型
	};

	//如果是服务商模式检查参数sub_mch_id，
	if(state == "server"){
		if(!opt.sub_mch_id){
			return promise
			.then(() => {
				throw "sub_mch_id absent. 缺少子商户号"
			});
		}
		params.sub_mch_id = opt.sub_mch_id;
	}

	params.sign = wxUtil.objMd5UpperCase(params,appsecret);
	// console.log(params);

	var options = {
		url:wxconfig.closeorder_url,
		method:"post",
		headers:{"Content-Type":"application/xml"},
		body:wxUtil.xmlHelper.parseToXML(params,"xml")
	};

	return new Promise(function(resolve,reject){
		request(options,function(error, response, preporder){
			if(error){
				return reject(error);
			}
			preporder=wxUtil.xmlStringToJson(preporder);

			resolve(preporder);
		});
	})
}

/**
 * 订单撤销
 * @author penguinhj
 * @DateTime 2019-09-25T16:07:32+0800
 * @param    {[String]}                 out_trade_no    [商户系统内部订单号]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var reverse = function (opt){
	//如果检查证书是否传入
	if(!cert || !key){
		return promise
		.then(() => {
			throw "cert or key absent. 缺少证书(密钥)"
		});
	}
	var params={
		appid:appid,//公众账号ID
		mch_id:mch_id,//商户号
		out_trade_no:opt.out_trade_no,//商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一（订单_id）
		nonce_str:wxUtil.randomString(20)//随机字符串
	};
	//如果是服务商模式检查参数sub_mch_id，
	if(state == "server"){
		if(!opt.sub_mch_id){
			return promise
			.then(() => {
				throw "sub_mch_id absent. 缺少子商户号"
			});
		}
		params.sub_mch_id = opt.sub_mch_id;
	}

	params.sign = wxUtil.objMd5UpperCase(params,appsecret);
	// console.log(params);

	var options = {
		url:wxconfig.reverse_url,
		method:"post",
		headers:{
			"Content-Type":"application/xml"
		},
		body:wxUtil.xmlHelper.parseToXML(params,"xml"),
		agentOptions: {
			cert: cert, //微信商户平台证书,
			key: key,
			passphrase: params.mch_id // 商家id
		}
	};


	return new Promise(function(resolve,reject){
		request(options,function(error, response, body){
			if(error){
				return reject(error);
			}

			body=wxUtil.xmlStringToJson(body);
			resolve(body);

		});
	})
}

/**
 * 订单退款
 * @author penguinhj
 * @DateTime 2019-09-25T16:29:49+0800
 * @param    {[String]}                 out_trade_no    [商户系统内部订单号]
 * @param    {[String]}                 out_refund_no    [商户退款单号]
 * @param    {[String]}                 total_fee    [订单金额，单位分]
 * @param    {[String]}                 refund_fee    [退款金额，单位分]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var refund = function (opt){
	//如果检查证书是否传入
	if(!cert || !key){
		return promise
		.then(() => {
			throw "cert or key absent. 缺少证书(密钥)"
		});
	}
	var params={
		appid:appid,//公众账号ID
		mch_id:mch_id,//商户号
		out_trade_no:opt.out_trade_no,//商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一（订单_id）
		nonce_str:wxUtil.randomString(20),//随机字符串
		out_refund_no:opt.out_refund_no,//商户退款单号
		total_fee:opt.total_fee,
		refund_fee:opt.refund_fee
	};

	//如果是服务商模式检查参数sub_mch_id，
	if(state == "server"){
		if(!opt.sub_mch_id){
			return promise
			.then(() => {
				throw "sub_mch_id absent. 缺少子商户号"
			});
		}
		params.sub_mch_id = opt.sub_mch_id;
	}

	params.sign = wxUtil.objMd5UpperCase(params,appsecret);
	// console.log(params);
	
	var options = {
		url:wxconfig.refund_url,
		method:"post",
		headers:{
			"Content-Type":"application/xml"
		},
		body:wxUtil.xmlHelper.parseToXML(params,"xml"),
		agentOptions: {
			cert: cert, //微信商户平台证书,
			key: key,
			passphrase: params.mch_id // 商家id
		}
	};


	return new Promise(function(resolve,reject){
		request(options,function(error, response, body){
			if(error){
				return reject(error);
			}
			
			body=wxUtil.xmlStringToJson(body);

			resolve(body);

		});
	})
}


/**
 * 初始化微信支付客户端
 * @author penguinhj
 * @DateTime 2019-09-25T13:57:46+0800
 * @param    {[object]}                 params [初始化参数]
 * @param    {[String]}                 cert [公钥文件，调用部分接口需传]
 * @param    {[String]}                 key [私钥文件，调用部分接口需传]
 * @param    {[String]}                 state [客户端模式,normal普通商户，server服务商，默认为普通商户]
 * @param    {[String]}                 appid [微信公众号appid]
 * @param    {[String]}                 appsecret [微信公众号appsecret]
 * @param    {[String]}                 mch_id [微信商户号]
 */
exports.initClient = function (params){
	if(!params){
		console.log("can't found params. 缺少初始化参数");
		return ;
	}
	// if(!params.cert){
	// 	console.log("can't found cert. 缺少加密公钥文件");
	// 	return ;
	// }
	// if(!params.key){
	// 	console.log("can't found key. 缺少加密私钥文件");
	// 	return ;
	// }
	state = params.state == "server" ? "server":"normal";
	if(!params.appid){
		console.log("can't found appid. 缺少公众号appid");
		return ;
	}
	if(!params.appsecret){
		console.log("can't found appsecret. 缺少应用appsecret");
		return ;
	}
	if(!params.mch_id){
		console.log("can't found mch_id. 缺少公众号mch_id");
		return ;
	}
	var isFile = /.*\.pem$/;
	try{
		if(params.cert){
			cert = isFile.test(params.cert)?fs.readFileSync(params.cert):params.cert;
		}
		if(params.key){
			key = isFile.test(params.key)?fs.readFileSync(params.key):params.key;
		}
	}catch (err){
		console.log(err);
		return;
	}

	appid = params.appid;
	appsecret = params.appsecret;
	mch_id = params.mch_id;

	return {
		micropay:micropay,
		precreate:precreate,
		query:query,
		close:close,
		reverse:reverse,
		refund:refund
	};
};
