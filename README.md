## Install 安装

> use npm isntall
>
> 使用npm安装 

```
npm install node-wxpay2
```

> [download](https://github.com/ice-penguin/node_alipay_face2face/) from github
>
> 从github[下载](https://github.com/ice-penguin/node-wxpay)

## Introduce 模块说明 

> 该模块支持微信支付常用支付方式，包含当面付，公众号支付，h5支付等，请求结果返回promise对象。参数规则参照[微信支付文档](<https://pay.weixin.qq.com/wiki/doc/api/sl.html>)

## Sample example  使用说明

### init Client 初始化支付客户端

```
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
var wxpay = require('../index').initClient({
	cert:cert,//公钥文件
	key:key,//私钥文件
	state:state,//客户端模式,normal普通商户，server服务商，默认为普通商户
	appid:appid,//微信公众号appid
	appsecret:appsecret,//微信公众号appsecret
	mch_id:mch_id//微信商户号
});
```

### micropay 条码支付

```
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
var micropay = function(){
	wxpay.micropay({
		sub_mch_id:"1494502962",
		body:"刷卡支付测试",
		out_trade_no:"134710918825082582",
		total_fee:"1",
		spbill_create_ip:"14.17.22.52",
		auth_code:"134710918825082582"
	})
	.then(function(obj){
		console.log(obj);
	})
	.catch(function(err){
		console.log(err);
	})
}
```

### precreate 统一下单接口

```
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
var precreate = function(){
	wxpay.precreate({
		sub_mch_id:"1494502962",
		body:"刷卡支付测试",
		out_trade_no:"134768271160424787",
		total_fee:"1",
		spbill_create_ip:"14.17.22.52",
		notify_url:"http://www.baidu.com",
		trade_type:"JSAPI",
		time_expire:new Date(Date.now()+100000),
		openid:"oZO1N0nTV_scfUcV6XJtojHFSNM8"
	})
	.then(function(obj){
		console.log(obj);
	})
	.catch(function(err){
		console.log(err);
	})
}
```

### query 订单查询

```
/**
 * 订单查询
 * @author penguinhj
 * @DateTime 2019-09-25T16:07:32+0800
 * @param    {[String]}                 out_trade_no    [商户系统内部订单号]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var query = function(){
	wxpay.query({
		sub_mch_id:"1494502962",
		out_trade_no:"134527277372873274"
	})
	.then(function(obj){
		console.log(obj);
	})
	.catch(function(err){
		console.log(err);
	})
}
```

### close 订单关闭

```
/**
 * 订单关闭
 * @author penguinhj
 * @DateTime 2019-09-25T16:07:32+0800
 * @param    {[String]}                 out_trade_no    [商户系统内部订单号]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var close = function(){
	wxpay.close({
		sub_mch_id:"1494502962",
		out_trade_no:"134768271160424787"
	})
	.then(function(obj){
		console.log(obj);
	})
	.catch(function(err){
		console.log(err);
	})
}
```

### reverse 订单撤销

```
/**
 * 订单撤销
 * @author penguinhj
 * @DateTime 2019-09-25T16:07:32+0800
 * @param    {[String]}                 out_trade_no    [商户系统内部订单号]
 * @param    {[String]}                 sub_mch_id [子商户号，服务商模式下需传]
 */
var reverse = function(){
	wxpay.reverse({
		sub_mch_id:"1494502962",
		out_trade_no:"134527277372873274"
	})
	.then(function(obj){
		console.log(obj);
	})
	.catch(function(err){
		console.log(err);
	})
}
```

### refund 订单退款

```
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
var refund = function(){
	wxpay.refund({
		sub_mch_id:"1494502962",
		out_trade_no:"134710918825082582",
		out_refund_no:"22",
		total_fee:1,
		refund_fee:1
	})
	.then(function(obj){
		console.log(obj);
	})
	.catch(function(err){
		console.log(err);
	})
}
```

